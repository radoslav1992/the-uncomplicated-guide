import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../data/guides';
import { createCheckoutSession, stripeConfigured } from '../../lib/stripe';
import { json, siteOrigin } from '../../lib/http';

export const prerender = false;

/**
 * POST /api/checkout  (form field: guide=<slug>)
 * Creates a Stripe Checkout Session and redirects the buyer to it.
 * Falls back to the guide's Stripe Payment Link when the secret key is not configured yet.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData().catch(() => null);
  const slug = form?.get('guide');
  const guide = getGuide(typeof slug === 'string' ? slug : undefined);

  if (!guide) return json({ ok: false, error: 'Unknown guide.' }, { status: 404 });
  if (guide.status !== 'available') return json({ ok: false, error: 'This guide is not on sale yet.' }, { status: 409 });

  const origin = siteOrigin(env, request);

  if (!stripeConfigured(env)) {
    if (guide.paymentLink) return redirect(guide.paymentLink, 303);
    return json({ ok: false, error: 'Checkout is not configured yet. Please try again later.' }, { status: 503 });
  }

  try {
    const session = await createCheckoutSession(env, guide, origin);
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return redirect(session.url, 303);
  } catch (err) {
    console.error('[checkout] failed', err);
    if (guide.paymentLink) return redirect(guide.paymentLink, 303);
    return json({ ok: false, error: 'Could not start checkout. Please try again in a minute.' }, { status: 502 });
  }
};

export const GET: APIRoute = ({ url }) => {
  // Allow simple links like /api/checkout?guide=slug to work too.
  const slug = url.searchParams.get('guide');
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Checkout</title><form id="f" method="post" action="/api/checkout"><input type="hidden" name="guide" value="${(slug ?? '').replace(/[^a-z0-9-]/gi, '')}"><noscript><button>Continue to checkout</button></noscript></form><script>document.getElementById('f').submit()</script>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
};
