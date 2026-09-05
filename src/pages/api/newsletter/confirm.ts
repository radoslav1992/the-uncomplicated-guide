import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { confirmSubscriber, verifySignedLink } from '../../../lib/newsletter';

export const prerender = false;

/** GET /api/newsletter/confirm?e=…&t=… — completes the double opt-in. */
export const GET: APIRoute = async ({ url, redirect }) => {
  const email = await verifySignedLink(env, url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '', 'confirm');
  if (!email) return redirect('/newsletter?status=invalid', 303);
  const ok = await confirmSubscriber(env, email);
  return redirect(ok ? '/newsletter?status=confirmed' : '/newsletter?status=invalid', 303);
};
