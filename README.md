# The Uncomplicated Guides

Storefront for selling PDF guides, one at a time or through an all-access membership. Built with
[Astro](https://astro.build) and deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/)
(static pages + a few on-demand routes). Payments and subscriptions go through Stripe Checkout;
purchases, memberships, download tokens and newsletter subscribers live in a D1 database; the PDFs
live in R2; email goes out through Cloudflare Email Service and comes in through Cloudflare Email
Routing. A small admin page sends the newsletter in batches driven by a cron trigger.

**Setting up Cloudflare?** Follow [docs/cloudflare-setup.md](docs/cloudflare-setup.md) — a checklist
of everything to create in the dashboard, including the GitHub deploy integration.

```
src/
  data/guides.ts        ← the catalogue: titles, prices, parts, file keys. Add guides here.
  data/plans.ts         ← membership plans (monthly / yearly) and perks
  data/site.ts          ← site-wide facts (name, email, nav, legal date)
  pages/                ← / , /guides, /guides/[slug], /membership, /account, /newsletter, /contact,
                          legal pages, /thank-you, /download/[token], /download/member/[slug],
                          /admin/newsletter
  pages/api/            ← checkout, stripe/webhook, portal, access/{request,verify,logout},
                          newsletter/{subscribe,confirm,unsubscribe}, contact, resend-link
  lib/                  ← db (D1), purchases, subscriptions, newsletter, session, stripe, email, tokens
  worker.ts             ← Worker entry: Astro fetch handler, `email()` for Email Routing,
                          `scheduled()` for newsletter delivery
migrations/             ← D1 schema (applied by the deploy command)
wrangler.jsonc          ← bindings, vars and the deploy config
docs/cloudflare-setup.md← dashboard checklist
private/guides/         ← the PDFs (git-ignored). Upload them to R2, see below.
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars      # fill in test keys
npm run db:migrate:local            # create the tables in the local D1 emulator
npm run dev                         # Astro dev server with local D1/R2/email emulation
# or, closer to production:
npm run preview                     # astro build + wrangler dev (workerd)
```

To test downloads locally, put the PDF into the local R2 bucket once:

```bash
npx wrangler r2 object put uncomplicated-guides-files/ai-assistants-en-v1.1.pdf \
  --file private/guides/ai-assistants-en-v1.1.pdf --local
```

Emails sent locally are written to `.wrangler/tmp/email/` instead of being delivered — that is also
where you find the sign-in links for `/account` during development. Inspect the local database with
`npx wrangler d1 execute guides-db --local --command "SELECT * FROM subscriptions"`.

Other scripts: `npm run check` (type-check Astro + TS), `npm run build`.

## Deploying to Cloudflare

Deployment runs through Cloudflare's GitHub integration (Workers Builds): every push to the
production branch builds and deploys; other branches get preview URLs. The full dashboard
checklist — D1, R2, Email Service, Email Routing, secrets, Stripe — is in
[docs/cloudflare-setup.md](docs/cloudflare-setup.md). The two settings that matter in the build
configuration:

- Build command: `npm run build`
- Deploy command: `npx wrangler d1 migrations apply guides-db --remote && npx wrangler deploy`

`astro build` writes `dist/server/wrangler.json` and `.wrangler/deploy/config.json`, so a plain
`wrangler deploy` deploys the right thing. A manual deploy from a laptop is the same two commands
after `npx wrangler login`.

### How selling works

**Single guide.** Buy button → `POST /api/checkout` (`guide=<slug>`) → Stripe Checkout → back to
`/thank-you?session_id=…`, which issues a download link at once and reissues it when it has expired.
The webhook records the purchase in D1 and emails the same link. `/download/<token>` streams the
PDF from R2 while the token is valid (7 days, `site.downloadLinkDays`). Until `STRIPE_SECRET_KEY`
is set, the buy buttons fall back to the guide's `paymentLink` (no webhook, no delivery email).

**Membership.** Plan button → `POST /api/checkout` (`plan=monthly|yearly`) → Stripe Checkout in
subscription mode → back to `/thank-you`, which signs the member in and redirects to `/account`.
The webhook mirrors `customer.subscription.*` events into the `subscriptions` table; access is
granted while the status is `active`, `trialing` or `past_due`. Members sign in with a magic link
(`/api/access/request` → email → `/api/access/verify` → signed 30-day cookie) and download every
available guide from `/download/member/<slug>`. "Manage or cancel" opens the Stripe Customer Portal.
Prices come from Stripe Price ids in `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`; without them
the plan is created inline from `src/data/plans.ts`.

**Newsletter.** Every signup form (footer, home, guide pages, `/newsletter`) posts to
`/api/newsletter/subscribe`. Double opt-in: the address gets a signed confirmation link and only
confirmed addresses receive letters. `/admin/newsletter` (protected by the `ADMIN_TOKEN` secret)
composes a plain-text letter, sends a test, and queues it for every confirmed subscriber. Delivery
runs in batches of 25: the first batch right away, the rest by the cron trigger every five minutes
(`triggers.crons` in `wrangler.jsonc`), so a large list never hits a request time limit. Every
letter carries a signed one-click unsubscribe link and `List-Unsubscribe` headers; unsubscribing
deletes the address. Unconfirmed addresses are purged after ninety days.

Test locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook   # copy whsec_… into .dev.vars
```

## Adding a guide

1. Add an entry to `src/data/guides.ts` (`status: 'soon'` until it is ready; the page shows a
   notify-me form instead of a buy button).
2. Put the cover in `src/assets/guides/` and reference it in `cover`.
3. Upload the PDF to R2 and set `fileKey`/`fileName`; switch `status` to `'available'`.
4. Members see it on `/account` automatically. Announce it to subscribers from `/admin/newsletter`.
   The `signups.guides` column records which guide each person asked about, if you ever want to
   target a letter (not exposed in the admin page yet).

## Data (D1, see `migrations/0001_init.sql`)

- `purchases` — one row per paid Checkout Session: email, guide, amount, current download token.
- `downloads` — every file download (purchase or membership), for support and refund questions.
- `customers`, `subscriptions` — Stripe customers and memberships, kept in sync by the webhook.
- `signups` — newsletter subscribers (double opt-in: `confirmed_at`) with the guides they asked about.
- `newsletters`, `newsletter_recipients` — sent letters and the per-address delivery log.
