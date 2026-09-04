import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getPurchase, linkExpired, reissueToken, sendDeliveryEmail } from '../../lib/purchases';
import { formResult, siteOrigin, str } from '../../lib/http';

export const prerender = false;

/** POST /api/resend-link (session_id) — emails the current download link again. */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const sessionId = str(form?.get('session_id') ?? null, 200);
  const back = `/thank-you?session_id=${encodeURIComponent(sessionId)}`;
  if (!sessionId) return formResult(ctx, false, { redirect: '/thank-you', error: 'Missing session.' });

  let purchase = await getPurchase(env, sessionId);
  if (!purchase) return formResult(ctx, false, { redirect: back, error: 'Purchase not found.', status: 404 });

  // Simple throttle: one resend per minute per purchase.
  const throttleKey = `resend:${sessionId}`;
  if (await env.PURCHASES.get(throttleKey)) {
    return formResult(ctx, false, { redirect: back, error: 'Already sent a moment ago. Check your inbox and spam folder.', status: 429 });
  }
  await env.PURCHASES.put(throttleKey, '1', { expirationTtl: 60 });

  if (linkExpired(purchase)) purchase = await reissueToken(env, purchase);
  const r = await sendDeliveryEmail(env, siteOrigin(env, ctx.request), purchase);
  if (!r.ok) return formResult(ctx, false, { redirect: back, error: 'Email could not be sent right now. Use the download button on this page instead.', status: 502 });
  return formResult(ctx, true, { redirect: `${back}&resent=1` });
};
