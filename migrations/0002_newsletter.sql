-- Newsletter: double opt-in on signups, plus letters and their per-recipient delivery log.
ALTER TABLE signups ADD COLUMN confirmed_at TEXT;
ALTER TABLE signups ADD COLUMN source TEXT;

CREATE TABLE IF NOT EXISTS newsletters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,          -- plain text; HTML is derived
  created_at  TEXT NOT NULL,
  started_at  TEXT,
  finished_at TEXT,
  total       INTEGER NOT NULL DEFAULT 0,
  sent        INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  newsletter_id INTEGER NOT NULL,
  email         TEXT NOT NULL,
  sent_at       TEXT,
  error         TEXT,
  PRIMARY KEY (newsletter_id, email)
);
CREATE INDEX IF NOT EXISTS newsletter_recipients_pending ON newsletter_recipients(newsletter_id, sent_at);
