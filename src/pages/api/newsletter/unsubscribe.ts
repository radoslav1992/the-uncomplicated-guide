import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { removeSubscriber, verifySignedLink } from '../../../lib/newsletter';

export const prerender = false;

/**
 * GET /api/newsletter/unsubscribe?e=…&t=… — the link in every letter.
 * (The RFC 8058 POST variant used by mail clients is answered in src/worker.ts.)
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  const email = await verifySignedLink(env, url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '', 'unsubscribe');
  if (!email) return redirect('/newsletter?status=invalid', 303);
  await removeSubscriber(env, email);
  return redirect('/newsletter?status=unsubscribed', 303);
};
