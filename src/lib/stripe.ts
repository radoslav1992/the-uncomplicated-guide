import Stripe from 'stripe';
import type { Guide } from '../data/guides';

export const stripeConfigured = (env: Env) => Boolean(env.STRIPE_SECRET_KEY);

export function getStripe(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: 'the-uncomplicated-guides', url: env.SITE_URL },
  });
}

const consumerNotice = (origin: string) =>
  `Digital content, delivered immediately after payment. By paying you agree that the 14-day right of withdrawal ends once the download starts. Terms: ${origin}/terms`;

/** Shared options for both checkout modes. */
function baseParams(env: Env, origin: string): Partial<Stripe.Checkout.SessionCreateParams> {
  const automaticTax = env.STRIPE_AUTOMATIC_TAX === 'true';
  return {
    locale: 'auto',
    allow_promotion_codes: true,
    billing_address_collection: automaticTax ? 'required' : 'auto',
    automatic_tax: { enabled: automaticTax },
    tax_id_collection: automaticTax ? { enabled: true } : undefined,
    custom_text: { submit: { message: consumerNotice(origin) } },
    // Uncomment once a Terms of Service URL is set in Stripe → Settings → Public details:
    // consent_collection: { terms_of_service: 'required' },
  };
}

/** One-off purchase of a single guide. */
export async function createCheckoutSession(env: Env, guide: Guide, origin: string): Promise<Stripe.Checkout.Session> {
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = guide.stripePriceId
    ? { price: guide.stripePriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: guide.currency.toLowerCase(),
          unit_amount: guide.price,
          tax_behavior: 'inclusive',
          product_data: {
            name: guide.title,
            description: guide.subtitle,
            images: guide.cover ? [new URL(guide.cover.src, origin).href] : undefined,
            metadata: { guide: guide.slug },
          },
        },
      };

  return getStripe(env).checkout.sessions.create({
    ...baseParams(env, origin),
    mode: 'payment',
    line_items: [lineItem],
    success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/guides/${guide.slug}`,
    metadata: { guide: guide.slug },
  });
}

export async function retrieveSession(env: Env, sessionId: string) {
  return getStripe(env).checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
}

/** Verify a webhook and return the event. Throws on a bad signature. */
export async function constructWebhookEvent(env: Env, payload: string, signature: string) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  return getStripe(env).webhooks.constructEventAsync(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}
