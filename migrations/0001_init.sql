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
  source        TEXT NOT NULL,          -- 'purchase'
  ref           TEXT,                   -- stripe session id
  downloaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS downloads_email ON downloads(email);

-- "Tell me when it ships" signups.
CREATE TABLE IF NOT EXISTS signups (
  email      TEXT PRIMARY KEY,
  guides     TEXT NOT NULL DEFAULT '[]',   -- JSON array of guide slugs, '*' = any
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
