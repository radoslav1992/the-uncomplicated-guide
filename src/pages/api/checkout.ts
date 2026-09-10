import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../data/guides';
import { createCheckoutSession, stripeConfigured } from '../../lib/stripe';
import { siteOrigin, str } from '../../lib/http';
import { setOrderCookie } from '../../lib/session';
import { signingSecret } from '../../lib/tokens';
import { rateLimit } from '../../lib/rate-limit';
export const prerender = false;
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const guide = getGuide(str(form?.get('guide') ?? null, 80));
  if (!guide || guide.status !== 'available') return ctx.redirect('/guides', 303);
  const back = `/checkout?guide=${guide.slug}`;
  if (form?.get('digital_consent') !== 'yes') return ctx.redirect(`${back}&error=consent`, 303);
  if (!(await rateLimit(env, 'checkout', ctx.request.headers.get('CF-Connecting-IP') || 'local', 10, 600_000))) return ctx.redirect(`${back}&error=rate`, 303);
  try {
    signingSecret(env); // Fail before creating a payment session if order-cookie signing is unavailable.
    if (!stripeConfigured(env)) throw new Error('Stripe is not configured');
    const session = await createCheckoutSession(env, guide, siteOrigin(env, ctx.request), new Date().toISOString());
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    await setOrderCookie(ctx, env, session.id);
    return ctx.redirect(session.url, 303);
  } catch (err) {
    console.error('[checkout] failed', err instanceof Error ? err.message : 'unknown error');
    return ctx.redirect(`${back}&error=unavailable`, 303);
  }
};
export const GET: APIRoute = ({url, redirect}) => redirect(`/checkout?guide=${encodeURIComponent(url.searchParams.get('guide') ?? '')}`, 303);
