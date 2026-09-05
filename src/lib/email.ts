/**
 * Outgoing email through Cloudflare Email Service (the `send_email` binding).
 *
 * Setup (dashboard → Email → Email Service):
 *   1. Verify the sending domain (adds DKIM/SPF records to your zone).
 *   2. Keep the `send_email` binding in wrangler.jsonc.
 * Locally (`wrangler dev`) sends are logged instead of delivered unless the
 * binding is available; the helper degrades to a console log so forms still work.
 */
import { site } from '../data/site';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(env: Env, mail: OutgoingEmail): Promise<{ ok: boolean; id?: string; error?: string }> {
  const from = { name: env.EMAIL_FROM_NAME || site.name, email: env.EMAIL_FROM || site.email };
  if (!env.SEND_EMAIL) {
    console.warn('[email] SEND_EMAIL binding missing — not sent:', {
      to: mail.to,
      subject: mail.subject,
    });
    console.info('[email] body:\n' + mail.text);
    return { ok: false, error: 'SEND_EMAIL binding missing' };
  }
  try {
    const result = await env.SEND_EMAIL.send({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? textToHtml(mail.text),
      replyTo: mail.replyTo,
      headers: mail.headers,
    });
    return { ok: true, id: result.messageId };
  } catch (err) {
    console.error('[email] send failed', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Escape text for safe inclusion in HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Very small plain-text → HTML conversion: paragraphs and clickable links. */
export function textToHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) =>
      escapeHtml(p)
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#e2542b">$1</a>'),
    )
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#16130f">${p}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5ded4;border-radius:16px;padding:28px">${paragraphs}<p style="margin:24px 0 0;font-size:13px;color:#8a8177">${escapeHtml(site.name)} · ${escapeHtml(site.author.city)}</p></div></body></html>`;
}
