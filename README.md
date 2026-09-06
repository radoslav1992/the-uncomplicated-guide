# The Uncomplicated Guides

Storefront for selling PDF guides, one price per guide. Built with
[Astro](https://astro.build) and deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/)
(static pages + a few on-demand routes). Payments go through Stripe Checkout;
purchases, download tokens and newsletter subscribers live in a D1 database; the PDFs
live in R2; email goes out through Cloudflare Email Service and comes in through Cloudflare Email
Routing. A small admin page sends the newsletter in batches driven by a cron trigger.

**Setting up Cloudflare?** Follow [docs/cloudflare-setup.md](docs/cloudflare-setup.md) — a checklist
of everything to create in the dashboard, including the GitHub deploy integration.

```
src/
  data/guides.ts        ← the catalogue: titles, prices, parts, file keys. Add guides here.
  data/site.ts          ← site-wide facts (name, email, nav, legal date)
  pages/                ← / , /guides, /guides/[slug], /account, /newsletter, /contact, legal pages,
                          /thank-you, /download/[token], /admin/newsletter
  pages/api/            ← checkout, stripe/webhook, access/{request,verify,logout},
                          newsletter/{subscribe,confirm,unsubscribe}, contact, resend-link
  lib/                  ← db (D1), purchases, newsletter, session, stripe, email, tokens
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

To test downloads locally, put the PDFs into the local R2 bucket once (key = exact file name):

```bash
npx wrangler r2 object put "kova-guides/247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf" \
  --file "private/guides/247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf" --local
```

Emails sent locally are written to `.wrangler/tmp/email/` instead of being delivered — that is also
where you find the sign-in links for `/account` during development. Inspect the local database with
`npx wrangler d1 execute guides-db --local --command "SELECT * FROM purchases"`.

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

**Buying a guide.** Buy button → `POST /api/checkout` (`guide=<slug>`) → Stripe Checkout → back to
`/thank-you?session_id=…`, which issues a download link at once and reissues it when it has expired.
The webhook records the purchase in D1 and emails the same link. `/download/<token>` streams the
PDF from R2 while the token is valid (7 days, `site.downloadLinkDays`). Until `STRIPE_SECRET_KEY`
is set, the buy buttons fall back to the guide's `paymentLink` (no webhook, no delivery email).
Prices are set per guide in `src/data/guides.ts`. When the site creates the Checkout Session it
passes the price inline and tags the session with `metadata.guide`. When a buyer pays through a
Payment Link made in the Stripe dashboard there is no metadata, so the paid session is matched to a
guide through the product/price ids of what was bought — list them in the guide's `stripeIds`.
Sessions that match neither are ignored (the Stripe account is shared with kova.bg).

**Re-downloading later.** `/account` lists everything bought with an email address, each with a
fresh link. Sign-in is passwordless: `/api/access/request` emails a 20-minute magic link,
`/api/access/verify` turns it into a signed 30-day cookie. Returning from Stripe Checkout signs the
buyer in automatically.

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
3. Upload the PDF to R2 as is; set `fileKey` to the exact file name and `fileName` to what the buyer
   should save it as. Create the product and Payment Link in Stripe; put the `prod_…` id in
   `stripeIds` and the link in `paymentLink`; switch `status` to `'available'`.
4. Announce it to subscribers from `/admin/newsletter`.
   The `signups.guides` column records which guide each person asked about, if you ever want to
   target a letter (not exposed in the admin page yet).

## Data (D1, see `migrations/0001_init.sql`)

- `purchases` — one row per paid Checkout Session: email, guide, amount, current download token.
- `downloads` — every file download, for support and refund questions.
- `signups` — newsletter subscribers (double opt-in: `confirmed_at`) with the guides they asked about.
- `newsletters`, `newsletter_recipients` — sent letters and the per-address delivery log.
