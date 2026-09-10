-- Operational state; preserve existing purchases and reviews for reconciliation.
ALTER TABLE purchases ADD COLUMN verified_at TEXT;
ALTER TABLE purchases ADD COLUMN livemode INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN consent_at TEXT;
ALTER TABLE purchases ADD COLUMN terms_version TEXT;
CREATE TABLE login_tokens (digest TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE delivery_jobs (
  session_id TEXT PRIMARY KEY REFERENCES purchases(session_id),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_id TEXT,
  completed_at TEXT,
  last_error TEXT
);
ALTER TABLE newsletter_recipients ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE newsletter_recipients ADD COLUMN lease_id TEXT;
CREATE INDEX delivery_jobs_pending ON delivery_jobs(completed_at, next_attempt_at);

-- A full refund can arrive before checkout.session.completed.
CREATE TABLE refunded_payments (payment_intent TEXT PRIMARY KEY, refunded_at TEXT NOT NULL);
