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
const LEGAL = ['/terms', '/refunds', '/privacy', '/cookies', '/imprint'];

/** How often each kind of page changes, and how it ranks against the rest of the site. */
function sitemapEntry(path) {
  if (path === '/') return { changefreq: 'weekly', priority: 1.0 };
  if (path === '/guides') return { changefreq: 'weekly', priority: 0.9 };
  if (path.startsWith('/guides/')) return { changefreq: 'monthly', priority: 0.8 };
  if (path === '/blog') return { changefreq: 'weekly', priority: 0.7 };
  if (path.startsWith('/blog/')) {
    return { changefreq: 'yearly', priority: 0.6, lastmod: postDates.get(path) };
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
    // On-demand pages (thank-you, download) do not use <Image>.
    imageService: 'compile',
  }),
  integrations: [
    sitemap({
      // Private and transactional pages stay out of the index. These also carry
      // `noindex` in the page itself and are disallowed in robots.txt.
      filter: (page) =>
        !page.includes('/thank-you') &&
        !page.includes('/download/') &&
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/admin/') &&
        !page.includes('/api/'),
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
