import { base64url, sign, signingSecret } from './tokens';

export async function unsubscribeUrl(env: Env, origin: string, email: string) {
  const e = base64url(new TextEncoder().encode(email.toLowerCase()));
  const t = await sign(signingSecret(env), email.toLowerCase());
  return `${origin}/api/unsubscribe?e=${e}&t=${t}`;
}
