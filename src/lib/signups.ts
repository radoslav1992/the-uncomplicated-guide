import { base64url, sign, signingSecret } from './tokens';

export interface Signup {
  email: string;
  guides: string[];
  createdAt: string;
  updatedAt: string;
}

export const signupKey = (email: string) => `signup:${email.toLowerCase()}`;

export async function unsubscribeUrl(env: Env, origin: string, email: string) {
  const e = base64url(new TextEncoder().encode(email.toLowerCase()));
  const t = await sign(signingSecret(env), email.toLowerCase());
  return `${origin}/api/unsubscribe?e=${e}&t=${t}`;
}
