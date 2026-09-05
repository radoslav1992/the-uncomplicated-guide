/**
 * Cloudflare Turnstile verification. Enabled only when TURNSTILE_SECRET_KEY is set.
 */
export async function verifyTurnstile(env: Env, token: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return Boolean(data.success);
  } catch (err) {
    console.error('[turnstile] verification failed', err);
    return false;
  }
}
