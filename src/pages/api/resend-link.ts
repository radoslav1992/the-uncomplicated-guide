import { canAccessOrder } from '../../lib/session';
import { queueDelivery, deliverPurchases } from '../../lib/delivery';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { activePurchase, claimResend, getPurchase, linkExpired, reissueToken } from '../../lib/purchases';
import { formResult, siteOrigin, str } from '../../lib/http';

export const prerender = false;

/** POST /api/resend-link (session_id) — emails the current download link again. */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const sessionId = str(form?.get('session_id') ?? null, 200);
  const back = `/thank-you?session_id=${encodeURIComponent(sessionId)}`;
  if (!sessionId) return formResult(ctx, false, { redirect: '/thank-you', error: 'Missing session.' });

  let purchase = await getPurchase(env, sessionId);
  if (!activePurchase(purchase) || !(await canAccessOrder(ctx, env, sessionId, purchase.email))) return formResult(ctx, false, { redirect: back, error: 'Purchase not found.', status: 404 });

  if (!(await claimResend(env, purchase))) {
    return formResult(ctx, false, { redirect: back, error: 'Already sent a moment ago. Check your inbox and spam folder.', status: 429 });
  }

  if (linkExpired(purchase)) purchase = await reissueToken(env, purchase);
  await queueDelivery(env, purchase.session_id, true);
  ctx.locals.cfContext?.waitUntil(deliverPurchases(env, siteOrigin(env, ctx.request)));
  return formResult(ctx, true, { redirect: `${back}&resent=1` });
};
