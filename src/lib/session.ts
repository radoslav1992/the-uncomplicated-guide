/**
 * Passwordless member sessions.
 *
 * - Magic link: a signed, time-limited token sent by email (`/api/access/request` →
 *   `/api/access/verify`).
 * - Session: a signed cookie holding the email and an expiry. No server-side state.
 */
import type { APIContext, AstroGlobal } from 'astro';
import { base64url, base64urlDecode, sign, signingSecret, verify } from './tokens';

export const SESSION_COOKIE = 'ug_session';
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 20;

type Payload = { e: string; x: number; k: 'session' | 'login' };

async function pack(env: Env, payload: Payload): Promise<string> {
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(signingSecret(env), body)}`;
}

async function unpack(env: Env, token: string, kind: Payload['k']): Promise<string | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (!(await verify(signingSecret(env), body, sig))) return null;
  try {
    const p = JSON.parse(base64urlDecode(body)) as Payload;
    if (p.k !== kind || typeof p.e !== 'string' || typeof p.x !== 'number') return null;
    if (Date.now() > p.x) return null;
    return p.e.toLowerCase();
  } catch {
    return null;
  }
}

export const createLoginToken = (env: Env, email: string) =>
  pack(env, { e: email.toLowerCase(), x: Date.now() + MAGIC_LINK_MINUTES * 60_000, k: 'login' });

export const verifyLoginToken = (env: Env, token: string) => unpack(env, token, 'login');

export async function setSessionCookie(ctx: APIContext | AstroGlobal, env: Env, email: string) {
  const token = await pack(env, { e: email.toLowerCase(), x: Date.now() + SESSION_DAYS * 86_400_000, k: 'session' });
  ctx.cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: ctx.url.protocol === 'https:',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearSessionCookie(ctx: APIContext | AstroGlobal) {
  ctx.cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Email of the signed-in member, or null. */
export async function getSessionEmail(ctx: APIContext | AstroGlobal, env: Env): Promise<string | null> {
  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return unpack(env, token, 'session');
}
