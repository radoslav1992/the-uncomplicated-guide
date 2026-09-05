/**
 * Newsletter: subscribers (table `signups`, double opt-in) and letters
 * (`newsletters` + `newsletter_recipients`), delivered in batches by the cron trigger.
 */
import { site } from '../data/site';
import { sendEmail, textToHtml } from './email';
import { base64url, base64urlDecode, sign, signingSecret, verify } from './tokens';
import { now, type SignupRow } from './db';

export interface Subscriber extends SignupRow {
  confirmed_at: string | null;
  source: string | null;
}

export interface Newsletter {
  id: number;
  subject: string;
  body: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  total: number;
  sent: number;
  failed: number;
}

// ─── Signed links ────────────────────────────────────────────────────────────

async function signedLink(env: Env, origin: string, path: string, email: string, purpose: string) {
  const e = base64url(new TextEncoder().encode(email.toLowerCase()));
  const t = await sign(signingSecret(env), `${purpose}:${email.toLowerCase()}`);
  return `${origin}${path}?e=${e}&t=${t}`;
}

export const confirmUrl = (env: Env, origin: string, email: string) =>
  signedLink(env, origin, '/api/newsletter/confirm', email, 'confirm');
export const unsubscribeUrl = (env: Env, origin: string, email: string) =>
  signedLink(env, origin, '/api/newsletter/unsubscribe', email, 'unsubscribe');

/** Returns the email when the (e, t) pair is valid for the purpose, else null. */
export async function verifySignedLink(env: Env, e: string, t: string, purpose: string): Promise<string | null> {
  let email = '';
  try {
    email = base64urlDecode(e).toLowerCase();
  } catch {
    return null;
  }
  if (!email || !(await verify(signingSecret(env), `${purpose}:${email}`, t))) return null;
  return email;
}

// ─── Subscribers ─────────────────────────────────────────────────────────────

export async function getSubscriber(env: Env, email: string) {
  return env.DB.prepare('SELECT * FROM signups WHERE email = ?1').bind(email.toLowerCase()).first<Subscriber>();
}

/**
 * Add or update a subscriber and send the confirmation email when the address is not
 * confirmed yet. `interest` is a guide slug or '*' (anything new).
 */
export async function subscribe(env: Env, origin: string, email: string, interest: string, source: string) {
  email = email.toLowerCase();
  const existing = await getSubscriber(env, email);
  const guides = new Set<string>(existing ? (JSON.parse(existing.guides) as string[]) : []);
  guides.add(interest);
  const t = now();
  await env.DB.prepare(
    `INSERT INTO signups (email, guides, created_at, updated_at, source) VALUES (?1, ?2, ?3, ?3, ?4)
     ON CONFLICT(email) DO UPDATE SET guides = excluded.guides, updated_at = excluded.updated_at`,
  )
    .bind(email, JSON.stringify([...guides]), t, source)
    .run();

  if (existing?.confirmed_at) return { status: 'already-confirmed' as const };

  await sendEmail(env, {
    to: email,
    subject: `Please confirm — ${site.name} newsletter`,
    text: `One click and you are on the list:
${await confirmUrl(env, origin, email)}

What you get: one email when a guide ships or a revised edition replaces the old file, and now and then a short note about something I learned building or selling one of these. Never more than a couple a month; every email has an unsubscribe link.

If you did not ask for this, ignore it — nothing is sent without the click.

Radoslav
${site.name}`,
  });
  return { status: 'confirmation-sent' as const };
}

export async function confirmSubscriber(env: Env, email: string): Promise<boolean> {
  const r = await env.DB.prepare(
    'UPDATE signups SET confirmed_at = COALESCE(confirmed_at, ?2), updated_at = ?2 WHERE email = ?1',
  )
    .bind(email.toLowerCase(), now())
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export async function removeSubscriber(env: Env, email: string) {
  await env.DB.prepare('DELETE FROM signups WHERE email = ?1').bind(email.toLowerCase()).run();
}

/** Privacy policy promise: addresses that never confirmed are deleted after ninety days. */
export async function purgeUnconfirmed(env: Env, days = 90) {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const r = await env.DB.prepare('DELETE FROM signups WHERE confirmed_at IS NULL AND created_at < ?1').bind(cutoff).run();
  return r.meta.changes ?? 0;
}

export async function subscriberStats(env: Env) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed FROM signups`,
  ).first<{ total: number; confirmed: number | null }>();
  return { total: r?.total ?? 0, confirmed: r?.confirmed ?? 0 };
}

/**
 * RFC 8058 one-click unsubscribe (the POST mail clients send to the List-Unsubscribe URL).
 * Handled in the Worker entry, before Astro, because mail clients send no Origin header
 * and Astro's CSRF check would reject the form-encoded POST.
 */
export async function oneClickUnsubscribe(env: Env, url: URL): Promise<Response> {
  const email = await verifySignedLink(env, url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '', 'unsubscribe');
  if (!email) return new Response('Invalid link', { status: 400 });
  await removeSubscriber(env, email);
  return new Response(null, { status: 200 });
}

// ─── Letters ─────────────────────────────────────────────────────────────────

export async function listNewsletters(env: Env, limit = 20) {
  const r = await env.DB.prepare('SELECT * FROM newsletters ORDER BY id DESC LIMIT ?1').bind(limit).all<Newsletter>();
  return r.results;
}

export async function getNewsletter(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM newsletters WHERE id = ?1').bind(id).first<Newsletter>();
}

/** Create a letter and queue every confirmed subscriber. Delivery happens in `deliverPending`. */
export async function createNewsletter(env: Env, subject: string, body: string): Promise<Newsletter> {
  const t = now();
  const ins = await env.DB.prepare(
    'INSERT INTO newsletters (subject, body, created_at, started_at) VALUES (?1, ?2, ?3, ?3) RETURNING id',
  )
    .bind(subject, body, t)
    .first<{ id: number }>();
  const id = ins!.id;
  await env.DB.prepare(
    'INSERT OR IGNORE INTO newsletter_recipients (newsletter_id, email) SELECT ?1, email FROM signups WHERE confirmed_at IS NOT NULL',
  )
    .bind(id)
    .run();
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM newsletter_recipients WHERE newsletter_id = ?1')
    .bind(id)
    .first<{ n: number }>();
  await env.DB.prepare('UPDATE newsletters SET total = ?2, finished_at = CASE WHEN ?2 = 0 THEN ?3 ELSE NULL END WHERE id = ?1')
    .bind(id, c?.n ?? 0, t)
    .run();
  return (await getNewsletter(env, id))!;
}

async function renderLetter(env: Env, origin: string, n: Pick<Newsletter, 'subject' | 'body'>, email: string) {
  const unsub = await unsubscribeUrl(env, origin, email);
  const text = `${n.body.trim()}

—
You get this because you subscribed at ${origin}. Unsubscribe in one click:
${unsub}`;
  return {
    subject: n.subject,
    text,
    html: textToHtml(text),
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** Send a preview of a letter to one address without queuing it. */
export async function sendTestLetter(env: Env, origin: string, n: Pick<Newsletter, 'subject' | 'body'>, to: string) {
  const mail = await renderLetter(env, origin, { ...n, subject: `[Test] ${n.subject}` }, to);
  return sendEmail(env, { to, ...mail });
}

/**
 * Deliver pending recipients of unfinished letters, oldest letter first.
 * Called by the cron trigger and kicked once right after a letter is created.
 * Returns the number of emails attempted in this run.
 */
export async function deliverPending(env: Env, origin: string, budgetMs = 20_000, batch = 25): Promise<number> {
  const started = Date.now();
  let attempted = 0;
  while (Date.now() - started < budgetMs) {
    const letter = await env.DB.prepare(
      'SELECT * FROM newsletters WHERE finished_at IS NULL AND started_at IS NOT NULL ORDER BY id LIMIT 1',
    ).first<Newsletter>();
    if (!letter) break;
    const pending = await env.DB.prepare(
      'SELECT email FROM newsletter_recipients WHERE newsletter_id = ?1 AND sent_at IS NULL AND error IS NULL LIMIT ?2',
    )
      .bind(letter.id, batch)
      .all<{ email: string }>();
    if (!pending.results.length) {
      await env.DB.prepare('UPDATE newsletters SET finished_at = ?2 WHERE id = ?1').bind(letter.id, now()).run();
      continue;
    }
    for (const { email } of pending.results) {
      if (Date.now() - started >= budgetMs) return attempted;
      const mail = await renderLetter(env, origin, letter, email);
      const r = await sendEmail(env, { to: email, ...mail });
      attempted++;
      if (r.ok) {
        await env.DB.batch([
          env.DB.prepare('UPDATE newsletter_recipients SET sent_at = ?3 WHERE newsletter_id = ?1 AND email = ?2').bind(letter.id, email, now()),
          env.DB.prepare('UPDATE newsletters SET sent = sent + 1 WHERE id = ?1').bind(letter.id),
        ]);
      } else {
        await env.DB.batch([
          env.DB.prepare('UPDATE newsletter_recipients SET error = ?3 WHERE newsletter_id = ?1 AND email = ?2').bind(letter.id, email, r.error ?? 'send failed'),
          env.DB.prepare('UPDATE newsletters SET failed = failed + 1 WHERE id = ?1').bind(letter.id),
        ]);
      }
    }
  }
  return attempted;
}
