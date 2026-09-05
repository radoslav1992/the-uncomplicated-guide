import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { sendEmail } from '../../lib/email';
import { verifyTurnstile } from '../../lib/turnstile';
import { formResult, isEmail, safeRedirect, str } from '../../lib/http';
import { site } from '../../data/site';

export const prerender = false;

/** POST /api/contact — sends the contact-form message to CONTACT_TO. */
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData().catch(() => null);
  const redirect = safeRedirect(form?.get('redirect') ?? null, '/contact?sent=1');
  const fail = (error: string, status = 400) => formResult(ctx, false, { redirect: '/contact', error, status });
  if (!form) return fail('Invalid form submission.');

  // Honeypot: bots fill every field.
  if (str(form.get('website'))) return formResult(ctx, true, { redirect });

  const name = str(form.get('name'), 200);
  const email = str(form.get('email'), 254);
  const message = str(form.get('message'), 5000);
  const topics = form.getAll('topic').map((t) => str(t, 60)).filter(Boolean).slice(0, 6);

  if (!name || !email || !message) return fail('Please fill in your name, email and message.');
  if (!isEmail(email)) return fail('That email address does not look right.');

  const ok = await verifyTurnstile(env, str(form.get('cf-turnstile-response'), 4000), ctx.clientAddress);
  if (!ok) return fail('Could not verify that you are human. Please try again.');

  const to = env.CONTACT_TO || site.email;
  const subject = `[Contact] ${topics[0] ?? 'Message'} — ${name}`;
  const text = `New message from the contact form.

From: ${name} <${email}>
Topics: ${topics.length ? topics.join(', ') : '—'}

${message}

—
Reply to this email to answer ${name} directly.`;

  const result = await sendEmail(env, { to, subject, text, replyTo: email });
  if (!result.ok && env.SEND_EMAIL) {
    return fail(`The message could not be sent. Please email ${to} directly.`, 502);
  }
  return formResult(ctx, true, { redirect });
};
