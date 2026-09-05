import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { site } from '../../../data/site';
import { sendEmail } from '../../../lib/email';
import { formResult, isEmail, siteOrigin, str } from '../../../lib/http';
import { createLoginToken } from '../../../lib/session';
import { listPurchasesByEmail } from '../../../lib/purchases';

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

  const origin = siteOrigin(env, ctx.request);
  const purchases = await listPurchasesByEmail(env, email);

  if (purchases.length) {
    const token = await createLoginToken(env, email);
    const link = `${origin}/api/access/verify?t=${encodeURIComponent(token)}`;
    await sendEmail(env, {
      to: email,
      subject: `Your sign-in link — ${site.name}`,
      text: `Here is your sign-in link. It works once, for the next 20 minutes:

${link}

If you did not ask for it, ignore this email — nothing happens without the link.

${site.name}`,
    });
  } else {
    // Do not reveal that the address is unknown; just log for support.
    console.info('[access] sign-in requested for unknown address');
  }
  return formResult(ctx, true, { redirect: '/account?sent=1' });
};
