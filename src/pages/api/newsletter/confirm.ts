import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { siteOrigin } from '../../../lib/http';
import { confirmSubscriber, guideQuery, sendGuideEmail, verifySignedLink } from '../../../lib/newsletter';

export const prerender = false;

/**
 * GET /api/newsletter/confirm?e=…&t=…
 * Confirms the address, emails the link to the free PDF (once, on the click that confirms)
 * and lands on a thank-you page that offers the same download.
 */
export const GET: APIRoute = async ({ url, request, redirect }) => {
  const email = await verifySignedLink(env, url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '', 'confirm');
  if (!email) return redirect('/newsletter?status=invalid', 303);
  const result = await confirmSubscriber(env, email);
  if (result === 'not-found') return redirect('/newsletter?status=invalid', 303);

  // Opening the confirmation link again shows the download again but sends no second email.
  const emailed = result === 'confirmed' ? (await sendGuideEmail(env, siteOrigin(env, request), email)).ok : true;
  return redirect(`/newsletter?status=confirmed&${await guideQuery(env, email)}${emailed ? '' : '&emailed=0'}`, 303);
};
