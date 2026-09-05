import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { env } from 'cloudflare:workers';
import { constructWebhookEvent, retrieveSession, retrieveSubscription } from '../../../lib/stripe';
import { ensurePurchase, findPurchaseByPaymentIntent, markRefunded, sendDeliveryEmail } from '../../../lib/purchases';
import { sendWelcomeEmail, syncSubscription, upsertCustomer } from '../../../lib/subscriptions';
import { json, siteOrigin } from '../../../lib/http';

export const prerender = false;

/**
 * POST /api/stripe/webhook
 * Stripe → Developers → Webhooks → add endpoint <SITE_URL>/api/stripe/webhook with events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded,
 *   customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
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
        if (!session.customer_details?.email) session = await retrieveSession(env, session.id);

        if (session.mode === 'subscription') {
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
          const email = session.customer_details?.email ?? session.customer_email;
          if (customerId && email) {
            await upsertCustomer(env, { id: customerId, email, name: session.customer_details?.name ?? null });
          }
          if (subId) {
            const sub = await syncSubscription(env, await retrieveSubscription(env, subId));
            if (sub && !sub.welcomed_at) {
              const r = await sendWelcomeEmail(env, origin, sub);
              console.info('[webhook] welcome email', sub.stripe_subscription_id, r.ok ? 'sent' : 'NOT sent');
            }
          }
          break;
        }

        const purchase = await ensurePurchase(env, session);
        if (!purchase) {
          console.warn('[webhook] session not paid or incomplete', session.id, session.payment_status);
          break;
        }
        if (!purchase.emailed_at) {
          const r = await sendDeliveryEmail(env, origin, purchase);
          console.info('[webhook] delivery email', purchase.session_id, r.ok ? 'sent' : 'NOT sent');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(env, sub);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (pi) {
          const purchase = await findPurchaseByPaymentIntent(env, pi);
          if (purchase) {
            await markRefunded(env, purchase.session_id);
            console.info('[webhook] marked refunded', purchase.session_id);
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
    // 500 makes Stripe retry, which is what we want for transient D1/email failures.
    return json({ error: 'Handler failed' }, { status: 500 });
  }

  return json({ received: true });
};
