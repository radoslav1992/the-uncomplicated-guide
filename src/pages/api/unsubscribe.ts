import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { base64urlDecode, signingSecret, verify } from '../../lib/tokens';
import { deleteSignup } from '../../lib/db';

export const prerender = false;

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="margin:0;background:#f6f3ee;font-family:system-ui,sans-serif;color:#16130f"><div style="max-width:520px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e5ded4;border-radius:24px"><h1 style="font-size:24px;margin:0 0 12px">${title}</h1><p style="font-size:16px;line-height:1.6;color:#514941;margin:0 0 20px">${body}</p><a href="/" style="color:#e2542b;font-weight:600">Back to the site →</a></div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

/** GET /api/unsubscribe?e=<base64url email>&t=<signature> */
export const GET: APIRoute = async ({ url }) => {
  const e = url.searchParams.get('e') ?? '';
  const t = url.searchParams.get('t') ?? '';
  let email = '';
  try {
    email = base64urlDecode(e);
  } catch {
    return page('Invalid link', 'This unsubscribe link is not valid.', 400);
  }
  if (!email || !(await verify(signingSecret(env), email.toLowerCase(), t))) {
    return page('Invalid link', 'This unsubscribe link is not valid or has been altered.', 400);
  }
  await deleteSignup(env, email);
  return page('Unsubscribed', `${email} will not receive release notifications. Sorry to see you go — the library is still open whenever you need it.`);
};
