const enc = new TextEncoder();

/** URL-safe random token (32 bytes → 43 chars). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

export function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** HMAC-SHA256 signature (base64url) of a string. */
export async function sign(secret: string, data: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

export async function verify(secret: string, data: string, signature: string): Promise<boolean> {
  const expected = await sign(secret, data);
  if (expected.length !== signature.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Secret used to sign sign-in sessions, magic links and unsubscribe links. Falls back so dev works without configuration. */
export const signingSecret = (env: Env) => {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  console.warn('[auth] AUTH_SECRET is not set — using an insecure development fallback');
  return env.STRIPE_WEBHOOK_SECRET || 'dev-only-insecure-secret';
};
