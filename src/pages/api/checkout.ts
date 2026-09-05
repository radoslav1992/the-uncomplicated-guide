import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../data/guides';
import { createCheckoutSession, stripeConfigured } from '../../lib/stripe';
import { json, siteOrigin, str } from '../../lib/http';

export const prerender = false;

/**
 * POST /api/checkout (guide=<slug>)
 * Creates a Stripe Checkout Session for the guide and redirects the buyer to it.
 * Without STRIPE_SECRET_KEY it falls back to the guide's Payment Link.
 */
export const POST: APIRoute = async (ctx) => {
  const { request, redirect } = ctx;
  const form = await request.formData().catch(() => null);
  const origin = siteOrigin(env, request);
  const guide = getGuide(str(form?.get('guide') ?? null, 80));
  if (!guide) return json({ ok: false, error: 'Unknown guide.' }, { status: 404 });
  if (guide.status !== 'available') return json({ ok: false, error: 'This guide is not on sale yet.' }, { status: 409 });

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

/** GET /api/checkout?guide=slug — a self-submitting form for plain links. */
export const GET: APIRoute = ({ url }) => {
  const guide = (url.searchParams.get('guide') ?? '').replace(/[^a-z0-9-]/gi, '');
  const field = `<input type="hidden" name="guide" value="${guide}">`;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Checkout</title><form id="f" method="post" action="/api/checkout">${field}<noscript><button>Continue to checkout</button></noscript></form><script>document.getElementById('f').submit()</script>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
};
