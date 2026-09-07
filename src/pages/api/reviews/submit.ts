import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../../data/guides';
import { getSessionEmail } from '../../../lib/session';
import { deleteOwnReview, saveReview, MAX_BODY, MAX_NAME } from '../../../lib/reviews';
import { formResult, str } from '../../../lib/http';

export const prerender = false;

/**
 * POST /api/reviews/submit — leave, edit or remove a review.
 *
 * Requires a signed-in buyer; `saveReview` re-checks the purchase against the
 * database, so a forged form cannot review a guide the address never bought.
 */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  // Query first, fragment last — the other way round buries the parameter in the hash.
  const back = '/account';
  const done = (param: string) => `${back}?${param}=1#reviews`;
  const fail = (error: string, status = 400) => formResult(ctx, false, { redirect: back, error, status });
  if (!form) return fail('Invalid form submission.');

  const email = await getSessionEmail(ctx, env);
  if (!email) return fail('Sign in first — reviews come from buyers only.', 401);

  const guide = getGuide(str(form.get('guide'), 80));
  if (!guide) return fail('Unknown guide.', 404);

  if (str(form.get('action'), 20) === 'delete') {
    await deleteOwnReview(env, email, guide.slug);
    return formResult(ctx, true, { redirect: done('removed') });
  }

  const rating = Number.parseInt(str(form.get('rating'), 2), 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail('Choose a rating from one to five stars.');
  }

  const review = await saveReview(env, {
    email,
    guide: guide.slug,
    rating,
    body: str(form.get('body'), MAX_BODY),
    displayName: str(form.get('display_name'), MAX_NAME),
  });

  if (!review) return fail('Only people who bought this guide can review it.', 403);
  return formResult(ctx, true, { redirect: done('saved'), data: { rating: review.rating } });
};
