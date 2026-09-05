/**
 * Worker entry point.
 *
 * - `fetch`: Astro (static assets + on-demand routes), via the Cloudflare adapter.
 * - `email`: Cloudflare Email Routing. In the dashboard (Email → Email Routing →
 *   Routing rules) send mail for hello@yourdomain to this Worker. Messages are
 *   forwarded to CONTACT_TO, which must be a verified destination address.
 * - `scheduled`: the cron trigger in wrangler.jsonc; delivers queued newsletter batches.
 */
import { handle } from '@astrojs/cloudflare/handler';
import { deliverPending, oneClickUnsubscribe, purgeUnconfirmed } from './lib/newsletter';

const MAX_FORWARD_BYTES = 25 * 1024 * 1024;

export default {
  async fetch(request, env, ctx) {
    // One-click unsubscribe POSTs from mail clients carry no Origin header; answer them here.
    if (request.method === 'POST') {
      const url = new URL(request.url);
      if (url.pathname === '/api/newsletter/unsubscribe') return oneClickUnsubscribe(env, url);
    }
    return handle(request, env, ctx);
  },

  async email(message, env) {
    const to = env.CONTACT_TO;
    if (!to) {
      message.setReject('No destination configured');
      return;
    }
    if (message.rawSize > MAX_FORWARD_BYTES) {
      message.setReject('Message too large');
      return;
    }
    // Keep a lightweight audit trail in logs (no body, no attachments).
    console.info('[inbound-email]', {
      from: message.from,
      to: message.to,
      subject: message.headers.get('subject') ?? '',
      size: message.rawSize,
    });
    await message.forward(to);
  },

  async scheduled(_event, env, ctx) {
    const origin = (env.SITE_URL || '').replace(/\/$/, '');
    ctx.waitUntil(
      deliverPending(env, origin).then((n) => {
        if (n) console.info('[newsletter] cron delivered', n);
      }),
    );
    ctx.waitUntil(
      purgeUnconfirmed(env).then((n) => {
        if (n) console.info('[newsletter] purged unconfirmed', n);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
