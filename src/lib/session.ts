/**
 * Passwordless sign-in for buyers (re-download from /account).
 *
 * - Magic link: a signed, time-limited token sent by email (`/api/access/request` →
 *   `/api/access/verify`).
 * - Session: a signed cookie holding the email and an expiry. No server-side state.
 */
import type { APIContext, AstroGlobal } from 'astro';
import { base64url, base64urlDecode, sign, signingSecret, verify, randomToken, digest } from './tokens';

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

export async function createLoginToken(env: Env, email: string) {
  signingSecret(env);
  const token = randomToken();
  await env.DB.prepare('INSERT INTO login_tokens (digest, email, expires_at) VALUES (?1, ?2, ?3)')
    .bind(await digest(token), email.toLowerCase(), Date.now() + MAGIC_LINK_MINUTES * 60_000).run();
  return token;
}

/** Atomic consumption prevents replay, including two concurrent requests. */
export async function verifyLoginToken(env: Env, token: string): Promise<string | null> {
  signingSecret(env);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await env.DB.prepare('DELETE FROM login_tokens WHERE digest = ?1 AND expires_at > ?2 RETURNING email')
    .bind(await digest(token), Date.now()).first<{email: string}>();
  return row?.email ?? null;
}

/** Checkout return access is scoped to one order and to the browser that started it. */
export async function setOrderCookie(ctx: APIContext | AstroGlobal, env: Env, sessionId: string) {
  const expiry = Date.now() + 60 * 60_000;
  const body = `${sessionId}.${expiry}`;
  ctx.cookies.set('ug_order', `${body}.${await sign(signingSecret(env), `order:${body}`)}`, {
    path: '/', httpOnly: true, sameSite: 'lax', secure: ctx.url.protocol === 'https:', maxAge: 3600,
  });
}

export async function canAccessOrder(ctx: APIContext | AstroGlobal, env: Env, sessionId: string, email: string) {
  if (await getSessionEmail(ctx, env) === email.toLowerCase()) return true;
  const [id, expiry, signature] = (ctx.cookies.get('ug_order')?.value ?? '').split('.');
  if (id !== sessionId || !signature || !expiry || !Number.isFinite(Number(expiry)) || Number(expiry) < Date.now()) return false;
  return verify(signingSecret(env), `order:${id}.${expiry}`, signature);
}

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

/** Email of the signed-in buyer, or null. */
export async function getSessionEmail(ctx: APIContext | AstroGlobal, env: Env): Promise<string | null> {
  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return unpack(env, token, 'session');
}
