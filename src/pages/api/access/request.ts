import { allowForm } from '../../../lib/rate-limit';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { site } from '../../../data/site';
import { sendEmail } from '../../../lib/email';
import { formResult, isEmail, siteOrigin, str } from '../../../lib/http';
import { createLoginToken } from '../../../lib/session';

export const prerender = false;

/**
 * POST /api/access/request (email) — emails a sign-in link.
 * Always answers "sent" so the form cannot be used to probe which addresses are customers.
 */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const email = str(form?.get('email') ?? null, 254).toLowerCase();
  if (str(form?.get('website') ?? null)) return formResult(ctx, true, { redirect: '/account?sent=1' });
  if (!isEmail(email)) return formResult(ctx, false, { redirect: '/account', error: 'That email address does not look right.' });

  if (!(await allowForm(env, ctx.request, 'access', email))) return formResult(ctx, false, { redirect: '/account', error: 'Too many attempts. Please try again in ten minutes.', status: 429 });
  if (!env.SEND_EMAIL) return formResult(ctx, false, { redirect: '/account', error: 'Sign-in email is temporarily unavailable. Please try again later.', status: 503 });
  const origin = siteOrigin(env, ctx.request);
  // Issue the same email for every valid address; the authenticated account lists only its purchases.
  const token = await createLoginToken(env, email);
  const link = `${origin}/api/access/verify?t=${encodeURIComponent(token)}`;
  const result = await sendEmail(env, {
    to: email,
    subject: `Your sign-in link — ${site.name}`,
    text: `Open your personal guide library:\n${link}\n\nThis link works once, for 20 minutes. If you did not ask for it, ignore this email.\n\n${site.name}`,
  });
  if (!result.ok) return formResult(ctx, false, {redirect:'/account', error:'Sign-in email could not be sent. Please try again later.', status:503});
  return formResult(ctx, true, { redirect: '/account?sent=1' });
};
