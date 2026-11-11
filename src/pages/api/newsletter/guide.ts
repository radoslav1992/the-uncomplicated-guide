import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { guideDownload } from '../../../lib/newsletter';

export const prerender = false;

/**
 * GET /api/newsletter/guide?e=…&t=…
 * The free PDF for subscribers (`site.freeGuide`), streamed from R2. The signed link is
 * issued when an address is confirmed: in the email and on the thank-you page.
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  const result = await guideDownload(env, url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '');
  if (result === 'invalid') return redirect('/newsletter?status=invalid', 303);
  if (result === 'missing') return redirect('/newsletter?status=guide-unavailable', 303);
  return result;
};
