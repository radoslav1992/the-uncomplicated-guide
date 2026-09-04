/**
 * Purchase records and download tokens, stored in the PURCHASES KV namespace.
 *
 *   purchase:<stripe session id>  → Purchase (JSON)
 *   token:<download token>        → stripe session id  (expires with the link)
 */
import type Stripe from 'stripe';
import { getGuide, type Guide } from '../data/guides';
import { site } from '../data/site';
import { randomToken } from './tokens';
import { sendEmail } from './email';
import { formatDate } from './http';

export interface Purchase {
  sessionId: string;
  paymentIntent?: string;
  guide: string;
  email: string;
  name?: string;
  country?: string;
  amountTotal: number;
  currency: string;
  createdAt: string;
  token: string;
  tokenIssuedAt: string;
  downloads: string[];
  emailedAt?: string;
  reissues: number;
  refundedAt?: string;
}

const DAY = 24 * 60 * 60 * 1000;
export const LINK_TTL_MS = site.downloadLinkDays * DAY;
/** KV expiry for the token index; a little longer than the link so expiry pages can still resolve it. */
const TOKEN_KV_TTL_S = (site.downloadLinkDays + 30) * 24 * 60 * 60;

const purchaseKey = (sessionId: string) => `purchase:${sessionId}`;
const tokenKey = (token: string) => `token:${token}`;

export const linkExpiresAt = (p: Purchase) => new Date(new Date(p.tokenIssuedAt).getTime() + LINK_TTL_MS);
export const linkExpired = (p: Purchase) => Date.now() > linkExpiresAt(p).getTime();

export async function getPurchase(env: Env, sessionId: string): Promise<Purchase | null> {
  return env.PURCHASES.get<Purchase>(purchaseKey(sessionId), 'json');
}

export async function getPurchaseByToken(env: Env, token: string): Promise<Purchase | null> {
  const sessionId = await env.PURCHASES.get(tokenKey(token));
  if (!sessionId) return null;
  return getPurchase(env, sessionId);
}

export async function savePurchase(env: Env, p: Purchase): Promise<void> {
  await env.PURCHASES.put(purchaseKey(p.sessionId), JSON.stringify(p));
}

/** Issue a fresh download token (revoking the previous one). */
export async function reissueToken(env: Env, p: Purchase): Promise<Purchase> {
  const old = p.token;
  p.token = randomToken();
  p.tokenIssuedAt = new Date().toISOString();
  p.reissues += 1;
  await env.PURCHASES.put(tokenKey(p.token), p.sessionId, { expirationTtl: TOKEN_KV_TTL_S });
  await savePurchase(env, p);
  if (old) await env.PURCHASES.delete(tokenKey(old));
  return p;
}

/** Build a purchase record from a paid Stripe Checkout Session. */
export function purchaseFromSession(session: Stripe.Checkout.Session): Purchase | null {
  const guide = session.metadata?.guide;
  const email = session.customer_details?.email ?? session.customer_email ?? undefined;
  if (!guide || !email) return null;
  return {
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    guide,
    email,
    name: session.customer_details?.name ?? undefined,
    country: session.customer_details?.address?.country ?? undefined,
    amountTotal: session.amount_total ?? 0,
    currency: (session.currency ?? 'eur').toUpperCase(),
    createdAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
    token: '',
    tokenIssuedAt: new Date(0).toISOString(),
    downloads: [],
    reissues: -1,
  };
}

/**
 * Make sure a purchase record exists for a paid session and that it has a valid token.
 * Safe to call from both the webhook and the thank-you page.
 */
export async function ensurePurchase(env: Env, session: Stripe.Checkout.Session): Promise<Purchase | null> {
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;
  let p = await getPurchase(env, session.id);
  if (!p) {
    p = purchaseFromSession(session);
    if (!p) return null;
    p = await reissueToken(env, p);
  } else if (linkExpired(p)) {
    p = await reissueToken(env, p);
  }
  return p;
}

export async function recordDownload(env: Env, p: Purchase): Promise<void> {
  p.downloads = [...p.downloads.slice(-49), new Date().toISOString()];
  await savePurchase(env, p);
}

export const downloadUrl = (origin: string, p: Purchase) => `${origin}/download/${p.token}`;
export const thankYouUrl = (origin: string, p: Purchase) =>
  `${origin}/thank-you?session_id=${encodeURIComponent(p.sessionId)}`;

/** Send (or re-send) the delivery email with the current download link. */
export async function sendDeliveryEmail(env: Env, origin: string, p: Purchase, guide?: Guide) {
  const g = guide ?? getGuide(p.guide);
  const title = g?.title ?? 'your guide';
  const link = downloadUrl(origin, p);
  const text = `Thank you for buying ${title}.

Your download link:
${link}

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
    p.emailedAt = new Date().toISOString();
    await savePurchase(env, p);
  }
  return result;
}
