// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// The public URL of the site. Override per environment with SITE_URL
// (wrangler `vars` are loaded into process.env at build time by the adapter).
const site = process.env.SITE_URL || 'https://uncomplicatedguide.com';

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
      filter: (page) =>
        !page.includes('/thank-you') &&
        !page.includes('/download/') &&
        !page.includes('/account') &&
        !page.includes('/admin/') &&
        !page.includes('/api/'),
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
