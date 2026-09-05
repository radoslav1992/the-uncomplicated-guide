import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { setSessionCookie, verifyLoginToken } from '../../../lib/session';

export const prerender = false;

/** GET /api/access/verify?t=<token> — turns a magic link into a session cookie. */
export const GET: APIRoute = async (ctx) => {
  const email = await verifyLoginToken(env, ctx.url.searchParams.get('t') ?? '');
  if (!email) return ctx.redirect('/account?error=link', 303);
  await setSessionCookie(ctx, env, email);
  const next = ctx.url.searchParams.get('next') ?? '';
  return ctx.redirect(next.startsWith('/download/member/') ? next : '/account', 303);
};
