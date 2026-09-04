# The Uncomplicated Guides

Storefront for selling PDF guides. Built with [Astro](https://astro.build) and deployed to
[Cloudflare Workers](https://developers.cloudflare.com/workers/) (static pages + a few on-demand
routes). Payments go through Stripe Checkout; delivery links, purchase records and release
signups live in Workers KV; the PDFs live in R2; email goes out through Cloudflare Email Service
and comes in through Cloudflare Email Routing.

```
src/
  data/guides.ts        ← the catalogue: titles, prices, parts, file keys. Add guides here.
  data/site.ts          ← site-wide facts (name, email, nav, legal date)
  pages/                ← / , /guides, /guides/[slug], /contact, legal pages, /thank-you, /download/[token]
  pages/api/            ← checkout, stripe/webhook, contact, notify, unsubscribe, resend-link
  lib/                  ← stripe, purchases (KV), email, tokens, turnstile helpers
  worker.ts             ← Worker entry: Astro fetch handler + `email()` handler for Email Routing
wrangler.jsonc          ← bindings, vars and the deploy config
private/guides/         ← the PDFs (git-ignored). Upload them to R2, see below.
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars      # fill in test keys
npm run dev                         # Astro dev server with local KV/R2/email emulation
# or, closer to production:
npm run preview                     # astro build + wrangler dev (workerd)
```

To test downloads locally, put the PDF into the local R2 bucket once:

```bash
npx wrangler r2 object put uncomplicated-guides-files/ai-assistants-en-v1.1.pdf \
  --file private/guides/ai-assistants-en-v1.1.pdf --local
```

Emails sent locally are written to `.wrangler/tmp/email/` instead of being delivered.

Other scripts: `npm run check` (type-check Astro + TS), `npm run build`.

## Deploying to Cloudflare

The build writes `dist/server/wrangler.json` and `.wrangler/deploy/config.json`, so a plain
`wrangler deploy` after `astro build` deploys the right thing.

```bash
npx wrangler login
npm run deploy
```

Or connect the repository in the Cloudflare dashboard (**Workers & Pages → Create → Workers →
Import a repository**) with build command `npm run build` and deploy command `npx wrangler deploy`.

On the first deploy wrangler provisions the two KV namespaces and the R2 bucket declared in
`wrangler.jsonc` and writes their ids back into the file — commit that change. If you prefer to
create them yourself, paste the ids into `wrangler.jsonc`.

### 1. Upload the guide files to R2

```bash
npx wrangler r2 object put uncomplicated-guides-files/ai-assistants-en-v1.1.pdf \
  --file private/guides/ai-assistants-en-v1.1.pdf --remote
```

The object key must match `fileKey` in `src/data/guides.ts`. Never put PDFs in `public/`.

### 2. Stripe

1. Create the secret: `npx wrangler secret put STRIPE_SECRET_KEY` (use `sk_test_…` first).
2. Add a webhook endpoint in Stripe (**Developers → Webhooks**) pointing at
   `https://<your-domain>/api/stripe/webhook` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   Store its signing secret: `npx wrangler secret put STRIPE_WEBHOOK_SECRET`.
3. In **Settings → Emails**, turn on receipts for successful payments (the site does not send
   receipts itself).
4. Optional: enable Stripe Tax and set `STRIPE_AUTOMATIC_TAX` to `"true"` in `wrangler.jsonc`.
   Prices are declared tax-inclusive.
5. Optional: create a Product/Price in the dashboard and put its `price_…` id in
   `stripePriceId` for the guide; otherwise the checkout session uses inline price data.

Until `STRIPE_SECRET_KEY` is set, the buy buttons fall back to the guide's `paymentLink`
(a Stripe Payment Link). With a payment link there is no webhook, so delivery emails and the
thank-you page do not work — set the secret key for the full flow.

Flow: buy button → `POST /api/checkout` → Stripe Checkout → back to `/thank-you?session_id=…`,
which issues a download link immediately (and reissues it when it has expired). The webhook
records the purchase in KV and emails the same link. `/download/<token>` streams the PDF from R2
while the token is valid (7 days, see `site.downloadLinkDays`).

Test locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook   # copy whsec_… into .dev.vars
```

### 3. Email

**Sending (Cloudflare Email Service, beta).** In the dashboard open **Email → Email Service**,
add and verify your sending domain (it adds DKIM/SPF records to the zone). The `send_email`
binding in `wrangler.jsonc` is already declared. `EMAIL_FROM` must be an address on the verified
domain. Local development logs emails instead of sending them.

**Receiving (Cloudflare Email Routing).** Open **Email → Email Routing**, enable it for the zone,
add and verify the destination mailbox you read (`CONTACT_TO`), then add a routing rule that
sends `hello@<your-domain>` to the Worker `the-uncomplicated-guides`. `src/worker.ts` forwards
every message to `CONTACT_TO`. (You can also route straight to the mailbox without the Worker;
the Worker route is there for custom handling later, e.g. auto-replies.)

The contact form posts to `/api/contact` and emails you with `Reply-To` set to the visitor.

### 4. Optional extras

- **Turnstile** (spam protection on the contact form): create a widget, set
  `PUBLIC_TURNSTILE_SITE_KEY` in `wrangler.jsonc` and `npx wrangler secret put TURNSTILE_SECRET_KEY`.
- **Google Analytics 4**: set `PUBLIC_GA_MEASUREMENT_ID`. This enables the consent banner and
  loads gtag in Consent Mode (denied until the visitor accepts). Leave empty to ship without it.
- **Unsubscribe links** are signed with `DOWNLOAD_TOKEN_SECRET` (any long random string):
  `npx wrangler secret put DOWNLOAD_TOKEN_SECRET`.
- **Custom domain**: add it under the Worker's **Settings → Domains & Routes**, then set
  `SITE_URL` in `wrangler.jsonc` (used for absolute links in emails, Stripe redirects and the
  sitemap) and update `public/robots.txt`.

## Adding a guide

1. Add an entry to `src/data/guides.ts` (`status: 'soon'` until it is ready; the page shows a
   notify-me form instead of a buy button).
2. Put the cover in `src/assets/guides/` and reference it in `cover`.
3. Upload the PDF to R2 and set `fileKey`/`fileName`; switch `status` to `'available'`.
4. Release signups are in the `SIGNUPS` KV namespace (`signup:<email>` → JSON with the guides
   the person asked about). There is no bulk mailer yet; export the keys with
   `npx wrangler kv key list --binding SIGNUPS --remote` when you announce a guide.

## Data

- `PURCHASES` KV: `purchase:<stripe session id>` → purchase record (email, guide, token, downloads),
  `token:<download token>` → session id.
- `SIGNUPS` KV: `signup:<email>` → `{ email, guides[], createdAt, updatedAt }`.
