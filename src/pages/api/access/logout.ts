import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = (ctx) => {
  clearSessionCookie(ctx);
  return ctx.redirect('/account', 303);
};
