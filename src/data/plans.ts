/**
 * All-access membership. Every guide that exists and every guide that ships
 * while the membership is active, downloadable from the member area.
 */
export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  /** Price in cents. */
  price: number;
  currency: string;
  interval: 'month' | 'year';
  /** Shown under the price. */
  note: string;
  /** Environment variable holding the Stripe Price id (optional). */
  priceIdEnv: 'STRIPE_PRICE_MONTHLY' | 'STRIPE_PRICE_YEARLY';
  highlight?: boolean;
}

export const membership = {
  name: 'All-access membership',
  productName: 'The Uncomplicated Guides — all-access membership',
  tagline: 'Every guide, current and future, for as long as you stay.',
  description:
    'One membership, the whole shelf: every guide that exists today and every one that ships while you are a member. Cancel any time from your account; access runs to the end of the paid period.',
  perks: [
    'Every guide in the library, including the three in progress the day they ship',
    'Revised editions as soon as they replace the old file',
    'Download from your account as often as you need, on any device',
    'Cancel in one click — no emails, no questions',
  ],
} as const;

export const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 1200,
    currency: 'EUR',
    interval: 'month',
    note: 'Billed monthly. Cancel any time.',
    priceIdEnv: 'STRIPE_PRICE_MONTHLY',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 8900,
    currency: 'EUR',
    interval: 'year',
    note: 'Billed once a year. Two months free compared with monthly.',
    priceIdEnv: 'STRIPE_PRICE_YEARLY',
    highlight: true,
  },
];

export const getPlan = (id: string | undefined | null): Plan | undefined =>
  plans.find((p) => p.id === id);
