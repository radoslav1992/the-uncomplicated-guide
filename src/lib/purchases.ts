/**
 * Single-guide purchases and their download tokens (table `purchases`).
 */
import type Stripe from 'stripe';
import { getGuide, type Guide } from '../data/guides';
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
  return r.results;
}

/** Issue a fresh download token (revoking the previous one). */
export async function reissueToken(env: Env, p: Purchase): Promise<Purchase> {
  p.token = randomToken();
  p.token_issued_at = now();
  p.reissues += 1;
  await env.DB.prepare(
    'UPDATE purchases SET token = ?2, token_issued_at = ?3, reissues = ?4 WHERE session_id = ?1',
  )
    .bind(p.session_id, p.token, p.token_issued_at, p.reissues)
    .run();
  return p;
}

/**
 * Make sure a purchase row exists for a paid one-off Checkout Session and that it has
 * a valid token. Safe to call from both the webhook and the thank-you page.
 */
export async function ensurePurchase(env: Env, session: Stripe.Checkout.Session): Promise<Purchase | null> {
  if (session.mode !== 'payment') return null;
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;
  const guide = session.metadata?.guide;
  const email = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase();
  if (!guide || !email) return null;

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
  if (linkExpired(p)) p = await reissueToken(env, p);
  return p;
}

export async function markRefunded(env: Env, sessionId: string) {
  await env.DB.prepare('UPDATE purchases SET refunded_at = ?2 WHERE session_id = ?1').bind(sessionId, now()).run();
}

export async function findPurchaseByPaymentIntent(env: Env, paymentIntent: string) {
  return env.DB.prepare('SELECT * FROM purchases WHERE payment_intent = ?1').bind(paymentIntent).first<Purchase>();
}

/** Returns false when a resend happened less than a minute ago. */
export async function claimResend(env: Env, p: Purchase): Promise<boolean> {
  const last = p.last_resend_at ? new Date(p.last_resend_at).getTime() : 0;
  if (Date.now() - last < 60_000) return false;
  await env.DB.prepare('UPDATE purchases SET last_resend_at = ?2 WHERE session_id = ?1').bind(p.session_id, now()).run();
  return true;
}

export const downloadUrl = (origin: string, p: Purchase) => `${origin}/download/${p.token}`;
export const thankYouUrl = (origin: string, p: Purchase) =>
  `${origin}/thank-you?session_id=${encodeURIComponent(p.session_id)}`;

/** Send (or re-send) the delivery email with the current download link. */
export async function sendDeliveryEmail(env: Env, origin: string, p: Purchase, guide?: Guide) {
  const g = guide ?? getGuide(p.guide);
  const title = g?.title ?? 'your guide';
  const text = `Thank you for buying ${title}.

Your download link:
${downloadUrl(origin, p)}

It is valid until ${formatDate(linkExpiresAt(p))}. If it expires, open this page to get a fresh one:
${thankYouUrl(origin, p)}

The receipt comes separately from Stripe. If anything about the download does not work, reply to this email — I fix links the same day.

Radoslav
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
