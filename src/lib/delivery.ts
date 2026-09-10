import { getPurchase, activePurchase, linkExpired, reissueToken, sendDeliveryEmail } from './purchases';
import { randomToken } from './tokens';
import { now } from './db';

export async function queueDelivery(env: Env, sessionId: string, resend = false) {
  await env.DB.prepare(`INSERT INTO delivery_jobs (session_id) VALUES (?1)
    ON CONFLICT(session_id) DO UPDATE SET completed_at = CASE WHEN ?2 = 1 THEN NULL ELSE completed_at END,
    next_attempt_at = CASE WHEN ?2 = 1 THEN 0 ELSE next_attempt_at END`)
    .bind(sessionId, resend ? 1 : 0).run();
}

/** Durable at-least-once email delivery. A lease avoids concurrent sends; provider timeouts may still duplicate email. */
export async function deliverPurchases(env: Env, origin: string, limit = 10) {
  const jobs = await env.DB.prepare(`SELECT session_id FROM delivery_jobs WHERE completed_at IS NULL
    AND next_attempt_at <= ?1 AND lease_until < ?1 LIMIT ?2`).bind(Date.now(), limit).all<{session_id:string}>();
  for (const job of jobs.results) {
    const lease = randomToken();
    const claimed = await env.DB.prepare(`UPDATE delivery_jobs SET lease_until = ?2, lease_id = ?3, attempts = attempts + 1
      WHERE session_id = ?1 AND completed_at IS NULL AND lease_until < ?4 AND next_attempt_at <= ?4 RETURNING attempts`)
      .bind(job.session_id, Date.now() + 300_000, lease, Date.now()).first<{attempts:number}>();
    if (!claimed) continue;
    try {
      let purchase = await getPurchase(env, job.session_id);
      if (!activePurchase(purchase)) {
        await env.DB.prepare('UPDATE delivery_jobs SET completed_at = ?2 WHERE session_id = ?1 AND lease_id = ?3')
          .bind(job.session_id, now(), lease).run();
        continue;
      }
      if (linkExpired(purchase)) purchase = await reissueToken(env, purchase);
      const result = await sendDeliveryEmail(env, origin, purchase);
      if (!result.ok) throw new Error(result.error || 'Email delivery failed');
      await env.DB.prepare('UPDATE delivery_jobs SET completed_at = ?2, lease_until = 0, last_error = NULL WHERE session_id = ?1 AND lease_id = ?3')
        .bind(job.session_id, now(), lease).run();
    } catch {
      await env.DB.prepare(`UPDATE delivery_jobs SET lease_until = 0, next_attempt_at = ?2, last_error = 'Email delivery failed; retry scheduled'
        WHERE session_id = ?1 AND lease_id = ?3`)
        .bind(job.session_id, Date.now() + Math.min(3600_000, 60_000 * 2 ** Math.min(claimed.attempts, 6)), lease).run();
    }
  }
}
