import { allowForm } from '../../../lib/rate-limit';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { formResult, isEmail, safeRedirect, siteOrigin, str } from '../../../lib/http';
import { subscribe } from '../../../lib/newsletter';

export const prerender = false;

/**
 * POST /api/newsletter/subscribe (email, optional topic, optional redirect)
 * Double opt-in: stores the address and sends a confirmation link. An address that is
 * already confirmed is sent the link to the free PDF again instead.
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
  if (!(await allowForm(env, ctx.request, 'newsletter', email))) return formResult(ctx, false, { redirect: '/newsletter', error: 'Too many attempts. Please try again in ten minutes.', status: 429 });
  // Optional interest tag (a topic or article slug); '*' means anything new.
  const topic = str(form.get('topic'), 80).toLowerCase().replace(/[^a-z0-9-]/g, '') || '*';
  const referer = ctx.request.headers.get('referer');
  const source = str(form.get('source'), 40) || (referer ? new URL(referer).pathname : 'unknown');

  const r = await subscribe(env, siteOrigin(env, ctx.request), email, topic, source);
  if (r.status === 'delivery-failed') return fail('Confirmation email could not be sent. Please try again later.', 503);
  if (r.status === 'already-confirmed') {
    // Without JavaScript the default "check your inbox" page would promise a confirmation email.
    const target = redirect.startsWith('/newsletter?status=check') ? '/newsletter?status=already' : redirect;
    return formResult(ctx, true, { redirect: target, data: { status: r.status, resent: r.resent } });
  }
  return formResult(ctx, true, { redirect, data: { status: r.status } });
};
