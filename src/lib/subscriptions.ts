/**
 * All-access memberships (table `subscriptions`), mirrored from Stripe.
 */
import type Stripe from 'stripe';
import { site } from '../data/site';
import { membership } from '../data/plans';
import { getStripe } from './stripe';
import { sendEmail } from './email';
import { formatDate } from './http';
import { now, type CustomerRow, type SubscriptionRow } from './db';

export type Subscription = SubscriptionRow;

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** True while Stripe still considers the member entitled (past_due keeps access during dunning). */
export const isActive = (s: Subscription) => ACTIVE_STATUSES.has(s.status);

export async function upsertCustomer(env: Env, c: { id: string; email: string; name?: string | null }) {
  const t = now();
  await env.DB.prepare(
    `INSERT INTO customers (stripe_customer_id, email, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT(stripe_customer_id) DO UPDATE SET email = excluded.email, name = COALESCE(excluded.name, customers.name), updated_at = excluded.updated_at`,
  )
    .bind(c.id, c.email.toLowerCase(), c.name ?? null, t)
    .run();
}

export async function getCustomer(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM customers WHERE stripe_customer_id = ?1').bind(id).first<CustomerRow>();
}

/** Resolve the customer's email: from our table, else from Stripe. */
async function customerEmail(env: Env, customerId: string): Promise<{ email: string; name: string | null } | null> {
  const row = await getCustomer(env, customerId);
  if (row) return { email: row.email, name: row.name };
  const c = await getStripe(env).customers.retrieve(customerId);
  if (c.deleted || !c.email) return null;
  await upsertCustomer(env, { id: c.id, email: c.email, name: c.name ?? null });
  return { email: c.email.toLowerCase(), name: c.name ?? null };
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === 'number');
  if (!ends.length) return null;
  return new Date(Math.min(...ends) * 1000).toISOString();
}

/** Insert or update a subscription row from a Stripe Subscription object. */
export async function syncSubscription(env: Env, sub: Stripe.Subscription): Promise<Subscription | null> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const who = await customerEmail(env, customerId);
  if (!who) return null;
  const t = now();
  await env.DB.prepare(
    `INSERT INTO subscriptions
       (stripe_subscription_id, stripe_customer_id, email, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT(stripe_subscription_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       email = excluded.email,
       plan = COALESCE(excluded.plan, subscriptions.plan),
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       updated_at = excluded.updated_at`,
  )
    .bind(
      sub.id,
      customerId,
      who.email,
      sub.metadata?.plan ?? null,
      sub.status,
      periodEnd(sub),
      sub.cancel_at_period_end ? 1 : 0,
      new Date(sub.created * 1000).toISOString(),
      t,
    )
    .run();
  return getSubscription(env, sub.id);
}

export async function getSubscription(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?1').bind(id).first<Subscription>();
}

/** The member's best subscription: an active one if any, else the most recent. */
export async function findSubscriptionByEmail(env: Env, email: string): Promise<Subscription | null> {
  const r = await env.DB.prepare(
    `SELECT * FROM subscriptions WHERE email = ?1
     ORDER BY CASE WHEN status IN ('active','trialing','past_due') THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`,
  )
    .bind(email.toLowerCase())
    .first<Subscription>();
  return r ?? null;
}

export async function findActiveSubscription(env: Env, email: string): Promise<Subscription | null> {
  const s = await findSubscriptionByEmail(env, email);
  return s && isActive(s) ? s : null;
}

/** Welcome email after the first successful subscription checkout. */
export async function sendWelcomeEmail(env: Env, origin: string, s: Subscription) {
  if (s.welcomed_at) return { ok: true };
  const text = `Welcome to the ${membership.name.toLowerCase()}.

Your account, with every guide ready to download:
${origin}/account

Sign in any time with a link sent to this address — there is no password. ${
    s.current_period_end ? `The current period runs until ${formatDate(s.current_period_end)}.` : ''
  }
Manage or cancel the membership from the same page.

Radoslav
${site.name}`;
  const r = await sendEmail(env, {
    to: s.email,
    subject: `Welcome — your ${membership.name.toLowerCase()}`,
    text,
    replyTo: env.CONTACT_TO || env.EMAIL_FROM,
  });
  if (r.ok) {
    await env.DB.prepare('UPDATE subscriptions SET welcomed_at = ?2 WHERE stripe_subscription_id = ?1')
      .bind(s.stripe_subscription_id, now())
      .run();
  }
  return r;
}
