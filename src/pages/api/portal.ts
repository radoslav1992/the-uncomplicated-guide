import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createPortalSession, stripeConfigured } from '../../lib/stripe';
import { getSessionEmail } from '../../lib/session';
import { findSubscriptionByEmail } from '../../lib/subscriptions';
import { formResult, siteOrigin } from '../../lib/http';

export const prerender = false;

/** POST /api/portal — opens the Stripe Customer Portal for the signed-in member. */
export const POST: APIRoute = async (ctx) => {
  const email = await getSessionEmail(ctx, env);
  if (!email) return ctx.redirect('/account', 303);
  const sub = await findSubscriptionByEmail(env, email);
  if (!sub || !stripeConfigured(env)) {
    return formResult(ctx, false, { redirect: '/account', error: 'No membership found for this address.', status: 404 });
  }
  try {
    const portal = await createPortalSession(env, sub.stripe_customer_id, siteOrigin(env, ctx.request));
    return ctx.redirect(portal.url, 303);
  } catch (err) {
    console.error('[portal] failed', err);
    return formResult(ctx, false, {
      redirect: '/account',
      error: 'Could not open the billing portal. Write to us and we will sort it out.',
      status: 502,
    });
  }
};
