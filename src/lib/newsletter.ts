/**
 * Newsletter: subscribers (table `signups`, double opt-in) and letters
 * (`newsletters` + `newsletter_recipients`), delivered in batches by the cron trigger.
 */
import { site } from '../data/site';
import { sendEmail, textToHtml } from './email';
import { randomToken, base64url, base64urlDecode, sign, signingSecret, verify } from './tokens';
import { now, type SignupRow } from './db';
import { rateLimit } from './rate-limit';

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

/** The `e=…&t=…` pair that proves a link was issued for this address and this purpose. */
async function signedQuery(env: Env, email: string, purpose: string) {
  const e = base64url(new TextEncoder().encode(email.toLowerCase()));
  const t = await sign(signingSecret(env), `${purpose}:${email.toLowerCase()}`);
  return `e=${e}&t=${t}`;
}

async function signedLink(env: Env, origin: string, path: string, email: string, purpose: string) {
  return `${origin}${path}?${await signedQuery(env, email, purpose)}`;
}

export const confirmUrl = (env: Env, origin: string, email: string) =>
  signedLink(env, origin, '/api/newsletter/confirm', email, 'confirm');
export const unsubscribeUrl = (env: Env, origin: string, email: string) =>
  signedLink(env, origin, '/api/newsletter/unsubscribe', email, 'unsubscribe');

/** Where the subscriber's PDF is served from (see `guideDownload`). */
export const GUIDE_PATH = '/api/newsletter/guide';
/** Query string for the PDF link. Only ever issued for an address that has been confirmed. */
export const guideQuery = (env: Env, email: string) => signedQuery(env, email, 'guide');
export const guideUrl = (env: Env, origin: string, email: string) =>
  signedLink(env, origin, GUIDE_PATH, email, 'guide');

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

  if (existing?.confirmed_at) {
    // Someone already on the list asking again gets the PDF link again — at most once a day per
    // address, so the form cannot be used to fill somebody else's inbox.
    const resent =
      (await rateLimit(env, 'guide-resend', email, 1, 86_400_000)) && (await sendGuideEmail(env, origin, email)).ok;
    return { status: 'already-confirmed' as const, resent };
  }

  const delivery = await sendEmail(env, {
    to: email,
    subject: `Please confirm — your free PDF from ${site.name}`,
    text: `One click and you are on the list:
${await confirmUrl(env, origin, email)}

As soon as you confirm, the download link for your free PDF arrives in a second email: “${site.freeGuide.title}: ${site.freeGuide.subtitle}” (${site.freeGuide.pages} pages).

After that: one email when a new article is published, and now and then a short note about something I learned building with AI. Never more than a couple a month; every email has an unsubscribe link.

If you did not ask for this, ignore it — nothing is sent without the click.

${site.author.name}
${site.name}`,
  });
  return { status: delivery.ok ? 'confirmation-sent' as const : 'delivery-failed' as const };
}

/**
 * Mark an address as confirmed. `confirmed` is returned exactly once per address — the click
 * that actually confirmed it — so follow-up work (the PDF email) cannot be repeated by
 * opening the link again.
 */
export async function confirmSubscriber(env: Env, email: string): Promise<'confirmed' | 'already-confirmed' | 'not-found'> {
  email = email.toLowerCase();
  const first = await env.DB.prepare(
    'UPDATE signups SET confirmed_at = ?2, updated_at = ?2 WHERE email = ?1 AND confirmed_at IS NULL RETURNING email',
  )
    .bind(email, now())
    .first();
  if (first) return 'confirmed';
  return (await getSubscriber(env, email)) ? 'already-confirmed' : 'not-found';
}

// ─── The subscriber's PDF ────────────────────────────────────────────────────

/** Email the download link for the free PDF. Sent on confirmation and when a subscriber asks again. */
export async function sendGuideEmail(env: Env, origin: string, email: string) {
  const guide = site.freeGuide;
  const unsub = await unsubscribeUrl(env, origin, email);
  return sendEmail(env, {
    to: email,
    subject: `Your free PDF: ${guide.title}`,
    text: `Thank you for subscribing. Here is your copy of “${guide.title}: ${guide.subtitle}” — PDF, ${guide.pages} pages:
${await guideUrl(env, origin, email)}

The link is tied to this address. If you lose it, enter your address in the subscribe form again and it is sent to you again.

Prefer to read in the browser? The article written from the same guide is here:
${origin}${guide.article}

From now on you get one email when a new article is published, and now and then a short note about something I learned building with AI. Never more than a couple a month.

${site.author.name}
${site.name}

—
You get this because you subscribed at ${origin}. Unsubscribe in one click:
${unsub}`,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
}

/**
 * The PDF behind a signed guide link, streamed from R2. Returns `invalid` when the link was
 * not issued by this site and `missing` when the object is not in the bucket.
 */
export async function guideDownload(env: Env, e: string, t: string): Promise<Response | 'invalid' | 'missing'> {
  if (!(await verifySignedLink(env, e, t, 'guide'))) return 'invalid';
  const object = await env.GUIDE_FILES.get(site.freeGuide.fileKey);
  if (!object) {
    console.error('[guide] PDF is not in the R2 bucket:', site.freeGuide.fileKey);
    return 'missing';
  }
  return new Response(object.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(object.size),
      'content-disposition': `attachment; filename="${site.freeGuide.fileName}"`,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export async function removeSubscriber(env: Env, email: string) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM signups WHERE email = ?1').bind(email.toLowerCase()),
    env.DB.prepare("UPDATE newsletter_recipients SET error = 'unsubscribed' WHERE email = ?1 AND sent_at IS NULL").bind(email.toLowerCase()),
  ]);
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
  const pending = await env.DB.prepare(`SELECT r.newsletter_id, r.email FROM newsletter_recipients r
    JOIN newsletters n ON n.id = r.newsletter_id WHERE n.started_at IS NOT NULL AND n.finished_at IS NULL
    AND r.sent_at IS NULL AND r.error IS NULL AND r.lease_until < ?1 ORDER BY n.id LIMIT ?2`)
    .bind(Math.floor(Date.now()/1000), batch).all<{newsletter_id:number; email:string}>();
  for (const row of pending.results) {
    if (Date.now() - started >= budgetMs) break;
    const lease = randomToken();
    const claim = await env.DB.prepare(`UPDATE newsletter_recipients SET lease_id = ?3, lease_until = ?4
      WHERE newsletter_id = ?1 AND email = ?2 AND sent_at IS NULL AND error IS NULL AND lease_until < ?5 RETURNING email`)
      .bind(row.newsletter_id, row.email, lease, Math.floor(Date.now()/1000)+300, Math.floor(Date.now()/1000)).first();
    if (!claim) continue;
    const subscriber = await getSubscriber(env, row.email);
    if (!subscriber?.confirmed_at) {
      await env.DB.prepare("UPDATE newsletter_recipients SET error = 'unsubscribed', lease_until = 0 WHERE newsletter_id = ?1 AND email = ?2 AND lease_id = ?3").bind(row.newsletter_id,row.email,lease).run();
      continue;
    }
    const letter = await getNewsletter(env, row.newsletter_id);
    if (!letter) continue;
    const mail = await renderLetter(env, origin, letter, row.email);
    const r = await sendEmail(env, {to:row.email, ...mail});
    attempted++;
    await env.DB.prepare(`UPDATE newsletter_recipients SET sent_at = ?4, error = ?5, lease_until = 0
      WHERE newsletter_id = ?1 AND email = ?2 AND lease_id = ?3`)
      .bind(row.newsletter_id,row.email,lease,r.ok ? now() : null,r.ok ? null : 'send failed; retry from admin').run();
  }
  // Recount from rows, never increment counters independently of a claimed delivery.
  await env.DB.prepare(`UPDATE newsletters SET
    sent = (SELECT COUNT(*) FROM newsletter_recipients r WHERE r.newsletter_id = newsletters.id AND r.sent_at IS NOT NULL),
    failed = (SELECT COUNT(*) FROM newsletter_recipients r WHERE r.newsletter_id = newsletters.id AND r.error IS NOT NULL),
    finished_at = CASE WHEN NOT EXISTS (SELECT 1 FROM newsletter_recipients r WHERE r.newsletter_id = newsletters.id AND r.sent_at IS NULL AND r.error IS NULL) THEN ?1 ELSE NULL END
    WHERE started_at IS NOT NULL`).bind(now()).run();
  return attempted;
}

export async function retryFailedLetters(env: Env) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE newsletter_recipients SET error = NULL, lease_until = 0
      WHERE error LIKE 'send failed%' AND EXISTS (SELECT 1 FROM signups s WHERE s.email = newsletter_recipients.email AND s.confirmed_at IS NOT NULL)`),
    env.DB.prepare(`UPDATE newsletters SET finished_at = NULL WHERE EXISTS
      (SELECT 1 FROM newsletter_recipients r WHERE r.newsletter_id = newsletters.id AND r.sent_at IS NULL AND r.error IS NULL)`),
  ]);
}
