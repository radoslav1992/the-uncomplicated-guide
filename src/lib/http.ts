import type { APIContext } from 'astro';

export const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...init.headers },
  });

/** True when the client (our progressive-enhancement scripts) prefers JSON over a redirect. */
export const wantsJson = (request: Request) =>
  (request.headers.get('accept') ?? '').includes('application/json');

/** Only allow same-site relative redirect targets coming from form fields. */
export const safeRedirect = (value: FormDataEntryValue | null, fallback: string) => {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') ? v : fallback;
};

/**
 * Public origin of the site. Prefers SITE_URL from wrangler vars, but uses the
 * request origin during local development so redirects stay local.
 */
export const siteOrigin = (env: Env, request: Request) => {
  const url = new URL(request.url);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const configured = (env.SITE_URL || '').replace(/\/$/, '');
  return !local && configured ? configured : url.origin;
};

/** Respond to a form post either with JSON or with a redirect, depending on the client. */
export const formResult = (
  ctx: APIContext,
  ok: boolean,
  opts: { redirect: string; error?: string; status?: number; data?: Record<string, unknown> },
) => {
  if (wantsJson(ctx.request)) {
    return json({ ok, error: opts.error, ...opts.data }, { status: ok ? 200 : (opts.status ?? 400) });
  }
  const target = new URL(opts.redirect, ctx.url);
  if (!ok) target.searchParams.set('error', opts.error ?? 'error');
  return ctx.redirect(target.pathname + target.search + target.hash, 303);
};

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254;

export const str = (v: FormDataEntryValue | null, max = 2000) =>
  (typeof v === 'string' ? v : '').trim().slice(0, max);

/** Format an ISO date for humans. */
export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
