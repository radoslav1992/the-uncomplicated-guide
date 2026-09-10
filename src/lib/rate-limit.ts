import { digest } from './tokens';

/** Atomic fixed-window limits; store hashes rather than IP/email values. */
export async function rateLimit(env: Env, scope: string, subject: string, limit = 5, windowMs = 60_000) {
  const time = Date.now();
  const key = await digest(`${scope}:${subject}:${Math.floor(time / windowMs)}`);
  const row = await env.DB.prepare(`INSERT INTO rate_limits (key, count, expires_at) VALUES (?1, 1, ?2)
    ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count`)
    .bind(key, time + windowMs).first<{count: number}>();
  return Boolean(row && row.count <= limit);
}

export async function allowForm(env: Env, request: Request, scope: string, email = '') {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (!await rateLimit(env, `${scope}:ip`, ip, 10, 600_000)) return false;
  return !email || rateLimit(env, `${scope}:email`, email.toLowerCase(), 3, 600_000);
}
