// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// The public URL of the site. Override per environment with SITE_URL
// (wrangler `vars` are loaded into process.env at build time by the adapter).
const site = process.env.SITE_URL || 'https://uncomplicatedguide.com';

/**
 * `lastmod` dates for blog posts, read from the Markdown frontmatter.
 *
 * The sitemap integration runs outside the content-collection API, so the dates are
 * parsed from the files rather than imported. Only posts get a `lastmod`: stamping
 * every page with the build time is the pattern that teaches search engines to
 * ignore the field altogether.
 */
function blogLastmod() {
  const dir = new URL('./src/content/blog/', import.meta.url);
  const dates = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const frontmatter = readFileSync(new URL(file, dir), 'utf-8').split('---')[1] ?? '';
    if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
    const date =
      frontmatter.match(/^updatedDate:\s*(\S+)/m)?.[1] ?? frontmatter.match(/^pubDate:\s*(\S+)/m)?.[1];
    if (date) dates.set(`/blog/${file.replace(/\.md$/, '')}`, new Date(date));
  }
  return dates;
}

const postDates = blogLastmod();
const guidePaths = guideArticles();
const LEGAL = ['/terms', '/privacy', '/cookies', '/imprint'];

/** Paths of the long-form guides (`kind: guide`), which rank above ordinary articles. */
function guideArticles() {
  const dir = new URL('./src/content/blog/', import.meta.url);
  const paths = new Set();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const frontmatter = readFileSync(new URL(file, dir), 'utf-8').split('---')[1] ?? '';
    if (/^kind:\s*guide\s*$/m.test(frontmatter)) paths.add(`/blog/${file.replace(/\.md$/, '')}`);
  }
  return paths;
}

/**
 * Retired URLs from the PDF shop, and where they now point. Served as permanent (301)
 * redirects: the Cloudflare adapter appends them to `public/_redirects`, which holds
 * the wildcard ones (`/download/*`, `/samples/*`) Astro cannot express.
 */
const AI_RECEPTIONIST_GUIDE = '/blog/ai-receptionist-guide';
const AI_VIDEO_GUIDE = '/blog/ai-ugc-video-ads-guide';
const moved = (destination) => ({ status: 301, destination });
const redirects = {
  // The two paid guides are now free articles.
  '/guides/ai-assistants': moved(AI_RECEPTIONIST_GUIDE),
  '/guides/ai-video-ads-ugc': moved(AI_VIDEO_GUIDE),
  // "Coming soon" product pages.
  '/guides/vibe-coding-for-non-developers': moved('/guides'),
  '/guides/working-with-ai-coding-agents': moved('/guides'),
  '/guides/30-tiktok-hacks-for-success': moved('/guides'),
  // Shop pages.
  '/account': moved('/guides'),
  '/checkout': moved('/guides'),
  '/thank-you': moved('/guides'),
  '/refunds': moved('/terms'),
  // Renamed for search: the guide's first slug, live for a few hours.
  '/blog/ai-receptionist-voice-assistant-guide': moved(AI_RECEPTIONIST_GUIDE),
  // An article about the shop's sales pages, retired with them.
  '/blog/who-its-not-for': moved('/blog'),
};

/** How often each kind of page changes, and how it ranks against the rest of the site. */
function sitemapEntry(path) {
  if (path === '/') return { changefreq: 'weekly', priority: 1.0 };
  if (path === '/guides') return { changefreq: 'weekly', priority: 0.9 };
  if (path === '/blog') return { changefreq: 'weekly', priority: 0.8 };
  if (path.startsWith('/blog/')) {
    const guide = guidePaths.has(path);
    return {
      changefreq: guide ? 'monthly' : 'yearly',
      priority: guide ? 0.9 : 0.7,
      lastmod: postDates.get(path),
    };
  }
  if (path === '/contact' || path === '/newsletter') return { changefreq: 'yearly', priority: 0.4 };
  if (LEGAL.includes(path)) return { changefreq: 'yearly', priority: 0.2 };
  return { changefreq: 'monthly', priority: 0.5 };
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  adapter: cloudflare({
    // Optimise images with sharp at build time for prerendered pages.
    // On-demand pages (newsletter status, admin, media) do not use <Image>.
    imageService: 'compile',
  }),
  redirects,
  integrations: [
    sitemap({
      // Private pages and redirect stubs stay out of the index. Admin and API routes
      // also carry `noindex` and are disallowed in robots.txt.
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '') || '/';
        return !path.startsWith('/admin') && !path.startsWith('/api/') && !(path in redirects);
      },
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        const { lastmod, ...rest } = sitemapEntry(path);
        return { ...item, ...rest, ...(lastmod && { lastmod: lastmod.toISOString() }) };
      },
    }),
  ],
  // Blog code blocks: a light theme so they sit on the site's paper, not a dark slab.
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
  // Sessions are not used; keep the adapter from provisioning a KV namespace for them.
  session: false,
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // `file` format + Cloudflare's `drop-trailing-slash` keep URLs without trailing slashes.
  build: { format: 'file', inlineStylesheets: 'auto' },
});
