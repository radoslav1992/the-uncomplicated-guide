import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuide } from '../../data/guides';
import { site } from '../../data/site';
import { sendEmail } from '../../lib/email';
import { formResult, isEmail, safeRedirect, siteOrigin, str } from '../../lib/http';
import { getSignup, upsertSignup } from '../../lib/db';
import { unsubscribeUrl } from '../../lib/signups';

export const prerender = false;

/** POST /api/notify — "tell me when the next guide ships". */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const redirect = safeRedirect(form?.get('redirect') ?? null, '/?signup=ok#signup');
  const fail = (error: string, status = 400) => formResult(ctx, false, { redirect: redirect.split('?')[0]!, error, status });
  if (!form) return fail('Invalid form submission.');
  if (str(form.get('website'))) return formResult(ctx, true, { redirect });

  const email = str(form.get('email'), 254).toLowerCase();
  if (!isEmail(email)) return fail('That email address does not look right.');
  const guide = getGuide(str(form.get('guide'), 80));

  const existing = await getSignup(env, email);
  const guides = new Set<string>(existing ? (JSON.parse(existing.guides) as string[]) : []);
  guides.add(guide?.slug ?? '*');
  await upsertSignup(env, email, [...guides]);

  // One confirmation so the person knows it worked, with an unsubscribe link.
  if (!existing) {
    const origin = siteOrigin(env, ctx.request);
    const what = guide ? `“${guide.title}”` : 'the next guide';
    await sendEmail(env, {
      to: email,
      subject: `Noted — I will write when ${guide ? guide.title : 'the next guide'} ships`,
      text: `You asked to hear when ${what} comes out. You will get one email on that day, and nothing else.

If this was not you, or you change your mind, this link removes your address:
${await unsubscribeUrl(env, origin, email)}

Radoslav
${site.name}`,
    });
  }

  return formResult(ctx, true, { redirect });
};
