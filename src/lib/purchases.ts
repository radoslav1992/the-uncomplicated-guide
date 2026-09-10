/**
 * Single-guide purchases and their download tokens (table `purchases`).
 */
import type Stripe from 'stripe';
import { getGuide, guides, type Guide } from '../data/guides';
import { getStripe } from './stripe';
import { site } from '../data/site';
import { randomToken } from './tokens';
import { sendEmail } from './email';
import { formatDate } from './http';
import { now, type PurchaseRow } from './db';

export type Purchase = PurchaseRow;

const DAY = 24 * 60 * 60 * 1000;
export const LINK_TTL_MS = site.downloadLinkDays * DAY;

export const linkExpiresAt = (p: Purchase) =>
  new Date(new Date(p.token_issued_at ?? 0).getTime() + LINK_TTL_MS);
export const linkExpired = (p: Purchase) => !p.token || Date.now() > linkExpiresAt(p).getTime();
export const activePurchase = (p: Purchase | null): p is Purchase => Boolean(p && !p.refunded_at && !p.session_id.startsWith('cs_seed_') && !p.email.endsWith('.test'));

export async function getPurchase(env: Env, sessionId: string): Promise<Purchase | null> {
  return env.DB.prepare('SELECT * FROM purchases WHERE session_id = ?1').bind(sessionId).first<Purchase>();
}

export async function getPurchaseByToken(env: Env, token: string): Promise<Purchase | null> {
  return env.DB.prepare('SELECT * FROM purchases WHERE token = ?1').bind(token).first<Purchase>();
}

export async function listPurchasesByEmail(env: Env, email: string): Promise<Purchase[]> {
  const r = await env.DB.prepare(
    'SELECT * FROM purchases WHERE email = ?1 AND refunded_at IS NULL ORDER BY created_at DESC',
  )
    .bind(email.toLowerCase())
    .all<Purchase>();
  return r.results.filter(activePurchase);
}

/** Renew expired tokens atomically; concurrent callers receive the same token. */
export async function reissueToken(env: Env, p: Purchase): Promise<Purchase> {
  if (!activePurchase(p)) throw new Error('Purchase is not eligible for a download');
  await env.DB.prepare(
    `UPDATE purchases SET token = ?2, token_issued_at = ?3, reissues = reissues + 1
     WHERE session_id = ?1 AND refunded_at IS NULL
     AND (token IS NULL OR token_issued_at IS NULL OR token_issued_at < ?4)`,
  )
    .bind(p.session_id, randomToken(), now(), new Date(Date.now() - LINK_TTL_MS).toISOString())
    .run();
  const fresh = await getPurchase(env, p.session_id);
  if (!activePurchase(fresh)) throw new Error('Purchase is not eligible for a download');
  return fresh;
}

/**
 * Which guide a Checkout Session paid for.
 *   1. `metadata.guide` — set by sessions the site creates itself.
 *   2. The product/price ids of the line items — the only signal a Payment Link made in
 *      the Stripe dashboard carries. Line items are fetched when the session lacks them.
 * Returns null for sessions that are not ours (the Stripe account is shared with kova.bg).
 */
export async function resolveGuide(env: Env, session: Stripe.Checkout.Session): Promise<Guide | null> {
  const bySlug = getGuide(session.metadata?.guide);
  if (bySlug) return bySlug;
  let items = session.line_items?.data;
  if (!items) {
    try {
      items = (await getStripe(env).checkout.sessions.listLineItems(session.id, { limit: 10 })).data;
    } catch (err) {
      console.error('[purchases] could not list line items', session.id, err);
      throw err;
    }
  }
  const ids = new Set<string>();
  for (const li of items) {
    if (li.price?.id) ids.add(li.price.id);
    const product = li.price?.product;
    if (typeof product === 'string') ids.add(product);
    else if (product && 'id' in product) ids.add(product.id);
  }
  return guides.find((g) => g.stripeIds?.some((id) => ids.has(id))) ?? null;
}

/**
 * Make sure a purchase row exists for a paid one-off Checkout Session and that it has
 * a valid token. Safe to call from both the webhook and the thank-you page.
 * Returns null when the session is unpaid, or when it did not buy one of our guides.
 */
export async function ensurePurchase(env: Env, session: Stripe.Checkout.Session): Promise<Purchase | null> {
  if (session.mode !== 'payment') return null;
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;
  const email = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase();
  if (!email) return null;
  const guide = (await resolveGuide(env, session))?.slug;
  if (!guide) return null;
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (intent && await env.DB.prepare('SELECT 1 FROM refunded_payments WHERE payment_intent = ?1').bind(intent).first()) return null;

  let p = await getPurchase(env, session.id);
  if (!p) {
    const pi =
      typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO purchases
         (session_id, payment_intent, guide, email, name, country, amount_total, currency, created_at, reissues)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, -1)`,
    )
      .bind(
        session.id,
        pi,
        guide,
        email,
        session.customer_details?.name ?? null,
        session.customer_details?.address?.country ?? null,
        session.amount_total ?? 0,
        (session.currency ?? 'eur').toUpperCase(),
        new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
      )
      .run();
    p = await getPurchase(env, session.id);
    if (!p) return null;
  }
  if (!activePurchase(p) || p.email !== email || p.guide !== guide) return null;
  if (intent && await env.DB.prepare('SELECT 1 FROM refunded_payments WHERE payment_intent = ?1').bind(intent).first()) {
    await markRefunded(env, session.id);
    return null;
  }
  await env.DB.prepare(`UPDATE purchases SET verified_at = ?2, livemode = ?3, consent_at = COALESCE(consent_at, ?4), terms_version = COALESCE(terms_version, ?5) WHERE session_id = ?1`)
    .bind(p.session_id, now(), session.livemode ? 1 : 0, session.metadata?.consent_at ?? null, session.metadata?.terms_version ?? null).run();
  p = (await getPurchase(env, p.session_id))!;
  if (linkExpired(p)) p = await reissueToken(env, p);
  return p;
}

export async function markRefunded(env: Env, sessionId: string) {
  await env.DB.batch([
    env.DB.prepare('UPDATE purchases SET refunded_at = ?2, token = NULL, token_issued_at = NULL WHERE session_id = ?1').bind(sessionId, now()),
    env.DB.prepare('UPDATE delivery_jobs SET completed_at = ?2 WHERE session_id = ?1').bind(sessionId, now()),
  ]);
}

export async function findPurchaseByPaymentIntent(env: Env, paymentIntent: string) {
  return env.DB.prepare('SELECT * FROM purchases WHERE payment_intent = ?1').bind(paymentIntent).first<Purchase>();
}

/** Returns false when a resend happened less than a minute ago. */
export async function claimResend(env: Env, p: Purchase): Promise<boolean> {
  if (!activePurchase(p)) return false;
  const r = await env.DB.prepare(`UPDATE purchases SET last_resend_at = ?2 WHERE session_id = ?1 AND refunded_at IS NULL
    AND (last_resend_at IS NULL OR last_resend_at < ?3)`)
    .bind(p.session_id, now(), new Date(Date.now() - 60_000).toISOString()).run();
  return r.meta.changes === 1;
}

export const downloadUrl = (origin: string, p: Purchase) => `${origin}/download/${p.token}`;
export const thankYouUrl = (origin: string, p: Purchase) =>
  `${origin}/thank-you?session_id=${encodeURIComponent(p.session_id)}`;

/** Send (or re-send) the delivery email with the current download link. */
export async function sendDeliveryEmail(env: Env, origin: string, p: Purchase, guide?: Guide) {
  if (!activePurchase(p)) return {ok: false, error: 'Purchase is not eligible for delivery'};
  const g = guide ?? getGuide(p.guide);
  const title = g?.title ?? 'your guide';
  const text = `Thank you for buying ${title}.

Your download link:
${downloadUrl(origin, p)}

It is valid until ${formatDate(linkExpiresAt(p))}. If it expires, open this page to get a fresh one:
${origin}/account

Sign in with the email used for this purchase. The link opens your personal download library.

${p.consent_at ? 'You requested immediate digital delivery and acknowledged that your withdrawal right ends when delivery begins. Terms: ' + origin + '/terms' : 'Your statutory consumer rights are preserved. Terms: ' + origin + '/terms'}

The receipt comes separately from Stripe. If anything about the download does not work, reply to this email — I fix links the same day.

${site.author.name}
${site.name}`;
  const result = await sendEmail(env, {
    to: p.email,
    subject: `Your download: ${title}`,
    text,
    replyTo: env.CONTACT_TO || env.EMAIL_FROM,
  });
  if (result.ok) {
    p.emailed_at = now();
    await env.DB.prepare('UPDATE purchases SET emailed_at = ?2 WHERE session_id = ?1').bind(p.session_id, p.emailed_at).run();
  }
  return result;
}

/** Reconcile legacy purchase provenance against Stripe before displaying review badges. */
export async function reconcilePurchases(env: Env, limit = 25) {
  const rows = await env.DB.prepare(`SELECT * FROM purchases WHERE verified_at IS NULL AND refunded_at IS NULL
    AND session_id NOT LIKE 'cs_seed_%' AND email NOT LIKE '%.test' ORDER BY created_at LIMIT ?1`).bind(limit).all<Purchase>();
  let verified = 0; let failed = 0;
  for (const p of rows.results) {
    try {
      const stripe = getStripe(env);
      const session = await stripe.checkout.sessions.retrieve(p.session_id, {expand:['line_items']});
      const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      if (pi) {
        const payment = await stripe.paymentIntents.retrieve(pi, {expand:['latest_charge']});
        const charge = payment.latest_charge;
        if (charge && typeof charge !== 'string' && charge.refunded) { await markRefunded(env, p.session_id); continue; }
      }
      if (await ensurePurchase(env, session)) verified++; else failed++;
    } catch { failed++; }
  }
  return {verified, failed, checked:rows.results.length};
}
