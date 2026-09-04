/**
 * Worker entry point.
 *
 * - `fetch`: Astro (static assets + on-demand routes), via the Cloudflare adapter.
 * - `email`: Cloudflare Email Routing. In the dashboard (Email → Email Routing →
 *   Routing rules) send mail for hello@yourdomain to this Worker. Messages are
 *   forwarded to CONTACT_TO, which must be a verified destination address.
 */
import { handle } from '@astrojs/cloudflare/handler';

const MAX_FORWARD_BYTES = 25 * 1024 * 1024;

export default {
  fetch: handle,

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
} satisfies ExportedHandler<Env>;
