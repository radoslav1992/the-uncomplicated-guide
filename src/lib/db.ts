/**
 * Thin typed helpers over the D1 database (binding `DB`). Schema: migrations/.
 */
export interface PurchaseRow {
  session_id: string;
  payment_intent: string | null;
  guide: string;
  email: string;
  name: string | null;
  country: string | null;
  amount_total: number;
  currency: string;
  created_at: string;
  emailed_at: string | null;
  refunded_at: string | null;
  last_resend_at: string | null;
  token: string | null;
  token_issued_at: string | null;
  reissues: number;
}

export interface SubscriptionRow {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  email: string;
  plan: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
  welcomed_at: string | null;
}

export interface CustomerRow {
  stripe_customer_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignupRow {
  email: string;
  guides: string;
  created_at: string;
  updated_at: string;
}

export const now = () => new Date().toISOString();

export const db = (env: Env) => env.DB;

export async function insertDownload(
  env: Env,
  d: { guide: string; email: string; source: 'purchase' | 'membership'; ref?: string | null },
) {
  await env.DB.prepare(
    'INSERT INTO downloads (guide, email, source, ref, downloaded_at) VALUES (?1, ?2, ?3, ?4, ?5)',
  )
    .bind(d.guide, d.email, d.source, d.ref ?? null, now())
    .run();
}

export async function getSignup(env: Env, email: string) {
  return env.DB.prepare('SELECT * FROM signups WHERE email = ?1').bind(email.toLowerCase()).first<SignupRow>();
}

export async function upsertSignup(env: Env, email: string, guides: string[]) {
  const t = now();
  await env.DB.prepare(
    `INSERT INTO signups (email, guides, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT(email) DO UPDATE SET guides = excluded.guides, updated_at = excluded.updated_at`,
  )
    .bind(email.toLowerCase(), JSON.stringify(guides), t)
    .run();
}

export async function deleteSignup(env: Env, email: string) {
  await env.DB.prepare('DELETE FROM signups WHERE email = ?1').bind(email.toLowerCase()).run();
}
