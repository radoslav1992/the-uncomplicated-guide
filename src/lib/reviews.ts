/**
 * Reviews (table `reviews`).
 *
 * Only a buyer can review a guide, and only the guide they bought — checked against
 * the `purchases` table on every write, so "verified buyer" is a fact rather than a
 * badge. Ratings are 1–5; the comment is optional.
 */
import { now } from './db';

export interface Review {
  id: number;
  guide: string;
  email: string;
  display_name: string | null;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
}

export interface RatingSummary {
  count: number;
  average: number;
  /** How many gave 1, 2, 3, 4 and 5 stars, in that order. */
  spread: [number, number, number, number, number];
}

/**
 * Below this many reviews the average is not shown: "5.0 from one review" tells a
 * reader nothing and looks like a thumb on the scale. Individual reviews still appear.
 */
export const MIN_FOR_AVERAGE = 3;

export const MAX_BODY = 1500;
export const MAX_NAME = 60;

/** True when this address bought this guide and the purchase was not refunded. */
export async function hasBought(env: Env, email: string, guide: string): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT 1 AS ok FROM purchases WHERE email = ?1 AND guide = ?2 AND refunded_at IS NULL LIMIT 1',
  )
    .bind(email.toLowerCase(), guide)
    .first<{ ok: number }>();
  return Boolean(row);
}

/** The buyer's own review, hidden or not, so they can see and edit it. */
export async function getOwnReview(env: Env, email: string, guide: string) {
  return env.DB.prepare('SELECT * FROM reviews WHERE email = ?1 AND guide = ?2')
    .bind(email.toLowerCase(), guide)
    .first<Review>();
}

/** Every review a buyer has left, keyed by guide slug — one lookup for the account page. */
export async function getOwnReviews(env: Env, email: string): Promise<Map<string, Review>> {
  const r = await env.DB.prepare('SELECT * FROM reviews WHERE email = ?1')
    .bind(email.toLowerCase())
    .all<Review>();
  return new Map(r.results.map((review) => [review.guide, review]));
}

/** Published reviews for a guide, newest first. */
export async function listReviews(env: Env, guide: string, limit = 50): Promise<Review[]> {
  const r = await env.DB.prepare(
    'SELECT * FROM reviews WHERE guide = ?1 AND hidden_at IS NULL ORDER BY created_at DESC LIMIT ?2',
  )
    .bind(guide, limit)
    .all<Review>();
  return r.results;
}

/** Count, mean and star spread for a guide, over published reviews only. */
export async function getSummary(env: Env, guide: string): Promise<RatingSummary> {
  const r = await env.DB.prepare(
    `SELECT rating, COUNT(*) AS n FROM reviews
     WHERE guide = ?1 AND hidden_at IS NULL GROUP BY rating`,
  )
    .bind(guide)
    .all<{ rating: number; n: number }>();

  const spread: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let count = 0;
  let total = 0;
  for (const { rating, n } of r.results) {
    spread[rating - 1] = n;
    count += n;
    total += rating * n;
  }
  return { count, average: count ? total / count : 0, spread };
}

/**
 * Save a buyer's review, replacing their previous one for that guide.
 * Returns null when the address has not bought the guide.
 */
export async function saveReview(
  env: Env,
  input: { email: string; guide: string; rating: number; body: string; displayName: string },
): Promise<Review | null> {
  const email = input.email.toLowerCase();
  if (!(await hasBought(env, email, input.guide))) return null;

  const rating = Math.round(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  const body = input.body.trim().slice(0, MAX_BODY) || null;
  const name = input.displayName.trim().slice(0, MAX_NAME) || null;
  const t = now();

  await env.DB.prepare(
    `INSERT INTO reviews (guide, email, display_name, rating, body, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(guide, email) DO UPDATE SET
       display_name = excluded.display_name,
       rating = excluded.rating,
       body = excluded.body,
       updated_at = excluded.updated_at`,
  )
    .bind(input.guide, email, name, rating, body, t)
    .run();

  return getOwnReview(env, email, input.guide);
}

export async function deleteOwnReview(env: Env, email: string, guide: string) {
  await env.DB.prepare('DELETE FROM reviews WHERE email = ?1 AND guide = ?2')
    .bind(email.toLowerCase(), guide)
    .run();
}

// ─── Moderation ──────────────────────────────────────────────────────────────

/** Every review including hidden ones, for the admin page. */
export async function listAllReviews(env: Env, limit = 100): Promise<Review[]> {
  const r = await env.DB.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT ?1')
    .bind(limit)
    .all<Review>();
  return r.results;
}

export async function setHidden(env: Env, id: number, hidden: boolean, reason = '') {
  await env.DB.prepare('UPDATE reviews SET hidden_at = ?2, hidden_reason = ?3 WHERE id = ?1')
    .bind(id, hidden ? now() : null, hidden ? reason.slice(0, 200) || 'Hidden by the seller' : null)
    .run();
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const reviewerName = (r: Review) => r.display_name?.trim() || 'Verified buyer';

/** Average to one decimal, e.g. 4.7. */
export const formatAverage = (average: number) => average.toFixed(1);

/** Five characters for the rating: filled, then empty. */
export const stars = (rating: number) => '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
