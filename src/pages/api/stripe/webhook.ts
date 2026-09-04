import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { env } from 'cloudflare:workers';
import { constructWebhookEvent, retrieveSession } from '../../../lib/stripe';
import { ensurePurchase, getPurchase, savePurchase, sendDeliveryEmail } from '../../../lib/purchases';
import { json, siteOrigin } from '../../../lib/http';

export const prerender = false;

/**
 * POST /api/stripe/webhook
 * Stripe → Developers → Webhooks → add endpoint <SITE_URL>/api/stripe/webhook with events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
 */
export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing signature' }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(env, payload, signature);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  const origin = siteOrigin(env, request);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        let session = event.data.object as Stripe.Checkout.Session;
        // The event payload may lack customer_details in some API versions; refresh to be safe.
        if (!session.customer_details?.email) session = await retrieveSession(env, session.id);
        const purchase = await ensurePurchase(env, session);
        if (!purchase) {
          console.warn('[webhook] session not paid or incomplete', session.id, session.payment_status);
          break;
        }
        if (!purchase.emailedAt) {
          const r = await sendDeliveryEmail(env, origin, purchase);
          console.info('[webhook] delivery email', purchase.sessionId, r.ok ? 'sent' : 'NOT sent');
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        // Purchases are keyed by session; find it via the session list for this payment intent.
        if (pi) {
          const { getStripe } = await import('../../../lib/stripe');
          const sessions = await getStripe(env).checkout.sessions.list({ payment_intent: pi, limit: 1 });
          const s = sessions.data[0];
          const purchase = s ? await getPurchase(env, s.id) : null;
          if (purchase) {
            purchase.refundedAt = new Date().toISOString();
            await savePurchase(env, purchase);
            console.info('[webhook] marked refunded', purchase.sessionId);
          }
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe does not retry them.
        break;
    }
  } catch (err) {
    console.error('[webhook] handler failed', event.type, err);
    // 500 makes Stripe retry, which is what we want for transient KV/email failures.
    return json({ error: 'Handler failed' }, { status: 500 });
  }

  return json({ received: true });
};
