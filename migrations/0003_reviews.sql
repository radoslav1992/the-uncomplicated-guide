-- Reviews. Only people who bought the guide can leave one, so every row is a
-- verified purchase; `email` is the address the buyer paid with and is never shown.
CREATE TABLE IF NOT EXISTS reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guide         TEXT NOT NULL,
  email         TEXT NOT NULL,
  -- What appears next to the review. The buyer picks it; blank falls back to "Verified buyer".
  display_name  TEXT,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  -- Moderation. Set only for spam, abuse or personal data — never for being negative;
  -- selectively hiding criticism is a banned practice under EU consumer rules.
  hidden_at     TEXT,
  hidden_reason TEXT
);

-- One review per buyer per guide; they edit theirs rather than adding another.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_buyer ON reviews(guide, email);
CREATE INDEX IF NOT EXISTS reviews_by_guide ON reviews(guide, hidden_at);
