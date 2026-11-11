/**
 * Shared database helpers (binding `DB`, schema in migrations/).
 *
 * The `purchases`, `downloads`, `reviews`, `delivery_jobs`, `login_tokens` and
 * `refunded_payments` tables belong to the old PDF shop. Nothing reads or writes
 * them any more; they are kept because past purchase records must be retained for
 * bookkeeping. See docs/LAUNCH.md before dropping them.
 */
export interface SignupRow {
  email: string;
  guides: string;
  created_at: string;
  updated_at: string;
}

export const now = () => new Date().toISOString();
