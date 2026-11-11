# The Uncomplicated Guides

> Coming from the PDF shop? Read [docs/LAUNCH.md](docs/LAUNCH.md) — it lists the clean-up steps in
> R2, Stripe and D1, in the order that is safe.

A free blog of practical articles on putting AI to work. Built with
[Astro](https://astro.build) and deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/):
every article is a prerendered static page; a few on-demand routes handle the newsletter, the
contact form and article images. Newsletter subscribers live in a D1 database, article images can
live in R2, email goes out through Cloudflare Email Service and comes in through Cloudflare Email
Routing. A small admin page sends the newsletter in batches driven by a cron trigger.

Until November 2026 the site sold two guides as PDFs. Those are now free articles, and every shop
URL redirects to its replacement. One of the PDFs lives on as the free guide every newsletter
subscriber is sent (see [Newsletter](#newsletter)).

**Setting up Cloudflare?** Follow [docs/cloudflare-setup.md](docs/cloudflare-setup.md).
Design tokens, fonts and colours are documented in [docs/design.md](docs/design.md).

```
src/
  content/blog/         ← every article: one Markdown file each
  content.config.ts     ← the article frontmatter schema
  data/site.ts          ← site-wide facts (name, author, nav, legal names, upcoming long reads)
  data/categories.ts    ← the article categories, with the intro text of each category page
  pages/                ← / , /blog, /blog/[slug], /blog/category/[category], /newsletter, /contact, legal pages,
                          /admin/newsletter, /media/[...key] (R2 images), /rss.xml
  pages/api/            ← newsletter/{subscribe,confirm,unsubscribe,guide}, contact
  components/           ← Header, Footer, ArticleCard, FeaturedArticle, Cover, CategoryNav, SignupForm,
                          GuideOffer (the subscribers' PDF, offered on Voice AI articles)…
  lib/                  ← blog helpers, newsletter, email, tokens, rate limiting
  styles/               ← global.css (tokens, type, prose, forms), blog.css (listings, home)
  assets/fonts/         ← BDO Grotesk and PP Editorial New Italic from the Adon theme (WOFF2)
  worker.ts             ← Worker entry: Astro fetch handler, `email()` for Email Routing,
                          `scheduled()` for newsletter delivery
public/
  articles/             ← 16:9 hero images for articles kept in the repository
  social/               ← 1200×630 social cards
  covers/               ← cover of the subscribers' PDF
  theme/                ← shapes and icons from the Adon theme (stat cards, covers)
  _redirects            ← wildcard redirects for retired shop URLs (the rest are in astro.config.mjs)
migrations/             ← D1 schema (applied by the deploy command)
wrangler.jsonc          ← bindings, vars and the deploy config
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars      # set AUTH_SECRET (and ADMIN_TOKEN for the admin page)
npm run db:migrate:local            # create the tables in the local D1 emulator
npm run dev                         # Astro dev server with local D1/R2/email emulation
# or, closer to production:
npm run preview                     # astro build + wrangler dev (workerd)
```

Emails sent locally are written to `.wrangler/tmp/email/` instead of being delivered — that is where
the newsletter confirmation links end up during development.

To try the PDF download locally, put any PDF into the local R2 emulator under the configured name:
`npx wrangler r2 object put "kova-guides/<site.freeGuide.fileKey>" --file some.pdf --local`.

Other scripts: `npm run check` (type-check Astro + TS), `npm test` (newsletter, PDF delivery,
rate-limit and content-integrity tests), `npm run build`.

## Deploying to Cloudflare

Deployment runs through Cloudflare's GitHub integration (Workers Builds): every push to the
production branch builds and deploys; other branches get preview URLs.

- Build command: `npm run build`
- Deploy command: `npx wrangler d1 migrations apply guides-db --remote && npx wrangler deploy`

`astro build` writes `dist/server/wrangler.json` and `.wrangler/deploy/config.json`, so a plain
`wrangler deploy` deploys the right thing.

## Writing an article

Articles are Markdown files in `src/content/blog/`. The file name becomes the URL, so
`your-ad-gets-three-seconds.md` is served at `/blog/your-ad-gets-three-seconds`. The home page,
listings, feed and sitemap pick it up on the next build.

```markdown
---
title: Your ad gets three seconds
seoTitle: Optional — the <title> in search results, if it should differ from the headline
description: One or two sentences. Shown on listings, in the meta description and in the feed.
pubDate: 2026-08-26
updatedDate: 2026-12-01      # optional: set for material revisions, not typo fixes
category: ai-video           # required: a slug from src/data/categories.ts
tags: [Video, Ads]           # free-form topics; used for related articles
featured: false              # optional: true puts it at the top of the home page
image: /articles/my-article.webp          # optional 16:9 hero, or /media/article-images/<file> from R2;
                                          # without one, cards show a generated cover
imageAlt: What the image shows
socialImage: /social/my-article.png       # optional 1200×630 share card
takeaways:                                # optional "Key takeaways" box above the body
  - One line a reader can act on.
  - Three to seven of them.
draft: false                              # optional: true keeps it out of the build
---

Body in Markdown. Headings, lists, quotes, code and tables are all styled.
```

### Categories and tags

Every article has exactly one **category** and any number of **tags**. Categories are defined in
`src/data/categories.ts`; each one with at least one published article gets a page at
`/blog/category/<slug>`, linked from `/blog`, the home page, the footer, and the breadcrumb and label
on every article in it. The category's `intro` is the text on that page, so write it as a proper
introduction to the topic. To add a category, add an entry to that file — the schema picks it up.

Tags are finer-grained and free-form. They appear on the article, go into the feed and the
structured data, and decide which related articles are suggested (after the category).

### Long reads

Any article with five or more `##` headings gets a table of contents, with the chapter being read
highlighted. Mark the best long reads `featured: true`: they lead the home page with their chapter
list, and rank higher in the sitemap. Code blocks get a copy button, which is useful for prompt
templates.

Long reads being written are listed in `site.upcoming` (`src/data/site.ts`) and shown on the
newsletter page.

A post marked `draft: true` is visible with `npm run dev` and left out of `npm run build`. Reading
time is worked out from the word count; the schema is enforced at build time, so a missing or
misspelled field fails the build rather than shipping broken. `npm test` also checks that every
category exists and that local images and `/blog/…` links point at something that exists.

### Moving or renaming an article

Add the old path to `redirects` in `astro.config.mjs` (a permanent 301). Redirect targets must be
published articles — the content tests check this. Wildcard rules go in `public/_redirects`.

## SEO and headers

- **Titles and descriptions** — `seoTitle` (falls back to `title`) and `description` per article.
  Every page gets a canonical URL, Open Graph and Twitter tags from `src/layouts/Base.astro`.
- **Structured data** — `WebSite` and `Blog` on the home page, `CollectionPage` with an `ItemList`
  plus `BreadcrumbList` on `/blog` and each category page, and `BlogPosting` plus `BreadcrumbList`
  (Home › Articles › category › article) on every article, with author, publisher, category, word
  count and `isAccessibleForFree`.
- **Sitemap** — `@astrojs/sitemap` in `astro.config.mjs`. Admin, API and redirected paths are
  filtered out. Articles carry a real `lastmod` from `updatedDate`/`pubDate`; featured articles rank
  above the rest, and category pages sit between `/blog` and the articles.
- **robots.txt** — `public/robots.txt`. Disallows `/api/` and `/admin/` and points at the sitemap.
- **Social cards** — `socialImage` (1200×630) when set, otherwise the article's hero image, otherwise
  `public/social/default.png`. Landscape images get `summary_large_image` on Twitter/X.
- **Response headers** — `public/_headers`. Security headers for everything and a one-hour cache for
  the feed. The build appends its own immutable `Cache-Control` rule for `/_astro/*`, so do not add a
  rule for that path by hand.

## Newsletter

Every signup form posts to `/api/newsletter/subscribe`. Double opt-in: the address gets a signed
confirmation link and only confirmed addresses receive letters. `/admin/newsletter` (protected by the
`ADMIN_TOKEN` secret) composes a plain-text letter, sends a test, and queues it for every confirmed
subscriber. Delivery runs in batches of 25: the first batch right away, the rest by the cron trigger
every five minutes. Every letter carries a signed one-click unsubscribe link and `List-Unsubscribe`
headers; unsubscribing deletes the address. Unconfirmed addresses are purged after ninety days.

### The free PDF for subscribers

Everyone who confirms their address gets a PDF guide, described in `site.freeGuide`
(`src/data/site.ts`): title, page count, cover, the article on the same subject, and `fileKey` — the
exact name of the file in the R2 bucket.

- The click that confirms an address sends a second email with the download link and lands on a
  thank-you page with a download button. Opening the confirmation link again shows the button again
  but sends no second email.
- The link is `/api/newsletter/guide?e=…&t=…`: signed with `AUTH_SECRET` for that address, so it needs
  no account and cannot be guessed. The Worker streams the file from R2; the bucket stays private.
  Rotating `AUTH_SECRET` invalidates links already sent — readers get a fresh one by entering their
  address in any signup form.
- A subscriber who is already confirmed and signs up again is sent the link again, at most once a
  day per address.
- If the file is missing from R2, the link leads to a notice that points at the article and the
  contact address, and the Worker logs `[guide] PDF is not in the R2 bucket`.
- The offer is shown on `/newsletter`, in the footer, and at the end of every Voice AI article
  (`GuideOffer.astro`).

Uploading or replacing the file is described in [docs/cloudflare-setup.md](docs/cloudflare-setup.md),
section 3.

## Data (D1, see `migrations/`)

- `signups` — newsletter subscribers (double opt-in: `confirmed_at`), with the source page and topic.
- `newsletters`, `newsletter_recipients` — sent letters and the per-address delivery log.
- `rate_limits` — short-lived, hashed counters that protect the public forms.
- `purchases`, `refunded_payments`, `downloads`, `reviews`, `delivery_jobs`, `login_tokens` — from
  the PDF shop. No code reads or writes them; purchase records are kept for bookkeeping. See
  [docs/LAUNCH.md](docs/LAUNCH.md) for what can be deleted.
