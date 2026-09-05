import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../../data/guides';
import { formResult, isEmail, safeRedirect, siteOrigin, str } from '../../../lib/http';
import { subscribe } from '../../../lib/newsletter';

export const prerender = false;

/**
 * POST /api/newsletter/subscribe (email, optional guide, optional redirect)
 * Double opt-in: stores the address and sends a confirmation link.
 */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const redirect = safeRedirect(form?.get('redirect') ?? null, '/newsletter?status=check');
  const fail = (error: string, status = 400) =>
    formResult(ctx, false, { redirect: redirect.split('?')[0]!.split('#')[0]!, error, status });
  if (!form) return fail('Invalid form submission.');
  if (str(form.get('website'))) return formResult(ctx, true, { redirect });

  const email = str(form.get('email'), 254).toLowerCase();
  if (!isEmail(email)) return fail('That email address does not look right.');
  const guide = getGuide(str(form.get('guide'), 80));
  const referer = ctx.request.headers.get('referer');
  const source = str(form.get('source'), 40) || (referer ? new URL(referer).pathname : 'unknown');

  const r = await subscribe(env, siteOrigin(env, ctx.request), email, guide?.slug ?? '*', source);
  return formResult(ctx, true, { redirect, data: { status: r.status } });
};
