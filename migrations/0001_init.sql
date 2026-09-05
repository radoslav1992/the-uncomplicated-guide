-- Purchases of single guides (one row per Stripe Checkout Session).
CREATE TABLE IF NOT EXISTS purchases (
  session_id      TEXT PRIMARY KEY,
  payment_intent  TEXT,
  guide           TEXT NOT NULL,
  email           TEXT NOT NULL,
  name            TEXT,
  country         TEXT,
  amount_total    INTEGER NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  created_at      TEXT NOT NULL,
  emailed_at      TEXT,
  refunded_at     TEXT,
  last_resend_at  TEXT,
  token           TEXT,
  token_issued_at TEXT,
  reissues        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS purchases_email ON purchases(email);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_token ON purchases(token);

-- Every file download, for support and refund questions.
CREATE TABLE IF NOT EXISTS downloads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guide         TEXT NOT NULL,
  email         TEXT NOT NULL,
  source        TEXT NOT NULL,          -- 'purchase' | 'membership'
  ref           TEXT,                   -- session id or subscription id
  downloaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS downloads_email ON downloads(email);

-- Stripe customers (only created for subscriptions).
CREATE TABLE IF NOT EXISTS customers (
  stripe_customer_id TEXT PRIMARY KEY,
  email              TEXT NOT NULL,
  name               TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customers_email ON customers(email);

-- All-access memberships, mirrored from Stripe subscriptions via webhooks.
CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  stripe_customer_id     TEXT NOT NULL,
  email                  TEXT NOT NULL,
  plan                   TEXT,                       -- 'monthly' | 'yearly'
  status                 TEXT NOT NULL,              -- Stripe status
  current_period_end     TEXT,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  welcomed_at            TEXT
);
CREATE INDEX IF NOT EXISTS subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS subscriptions_customer ON subscriptions(stripe_customer_id);

-- "Tell me when it ships" signups.
CREATE TABLE IF NOT EXISTS signups (
  email      TEXT PRIMARY KEY,
  guides     TEXT NOT NULL DEFAULT '[]',   -- JSON array of guide slugs, '*' = any
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
