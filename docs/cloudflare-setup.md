# Cloudflare setup checklist

Everything the site needs in the Cloudflare dashboard, in the order that works. Deployment
is done by Cloudflare's GitHub integration (Workers Builds); nothing is deployed from a laptop.

Names used below (change them together with `wrangler.jsonc` if you prefer others):

| Thing            | Name                          | Where in `wrangler.jsonc` |
| ---------------- | ----------------------------- | ------------------------- |
| Worker           | `the-uncomplicated-guides`    | `name`                    |
| D1 database      | `guides-db`                   | `d1_databases[0]`         |
| R2 bucket        | `uncomplicated-guides-files`  | `r2_buckets[0]`           |
| Email binding    | `SEND_EMAIL`                  | `send_email[0]`           |

## 1. Domain

- [ ] Add your domain as a zone (**Add a domain**) and point the nameservers at Cloudflare.
      Email Routing and Email Service both need the zone to be on Cloudflare.

## 2. D1 database

- [ ] **Storage & Databases → D1 SQL database → Create** — name `guides-db`.
- [ ] Copy the **Database ID** into `wrangler.jsonc` → `d1_databases[0].database_id` and commit.
      (Until you do, the build fails with "REPLACE_WITH_D1_DATABASE_ID".)
- [ ] Migrations in `migrations/` are applied by the deploy command below; you do not create tables by hand.

## 3. R2 bucket

- [ ] **R2 object storage → Create bucket** — name `uncomplicated-guides-files`, location automatic.
      Keep it private (no public access, no custom domain): the Worker streams files itself.
- [ ] Upload each guide PDF with the object key from `src/data/guides.ts` → `fileKey`
      (for the first guide: `ai-assistants-en-v1.1.pdf`). Drag and drop in the bucket's
      **Objects** tab works; so does `npx wrangler r2 object put uncomplicated-guides-files/<fileKey> --file <local file> --remote`.

## 4. Worker deployed from GitHub

- [ ] **Workers & Pages → Create → Workers → Import a repository** → pick `radoslav1992/the-uncomplicated-guide`.
- [ ] Project name `the-uncomplicated-guides` (must equal `name` in `wrangler.jsonc`).
- [ ] Build settings:
  - Build command: `npm run build`
  - Deploy command: `npx wrangler d1 migrations apply guides-db --remote && npx wrangler deploy`
  - Root directory: `/`
  - Production branch: `main` (merge the feature branch first, or set the branch you deploy from).
- [ ] After the first build, open the Worker → **Settings → Bindings** and check that `DB`, `GUIDE_FILES`,
      `SEND_EMAIL` and `ASSETS` are listed. They come from `wrangler.jsonc`; if one is missing the config is wrong.
- [ ] **Settings → Triggers → Cron Triggers** shows `*/5 * * * *` (from `wrangler.jsonc`). It delivers
      queued newsletter batches and purges unconfirmed addresses; nothing to configure.
- [ ] **Settings → Domains & Routes → Add → Custom domain** — e.g. `uncomplicatedguides.com` (and `www` if you want it).
- [ ] `SITE_URL` in `wrangler.jsonc` and `public/robots.txt` are already set to `https://uncomplicatedguides.com`.
      Change both only if you serve the site from `www` instead.

Non-secret settings live in `wrangler.jsonc` → `vars` and ship with each deploy. Secrets are set
once in the dashboard and survive deploys.

## 5. Secrets (Worker → Settings → Variables and Secrets → Add → type *Secret*)

| Name                     | Value                                                           | Required |
| ------------------------ | --------------------------------------------------------------- | -------- |
| `STRIPE_SECRET_KEY`      | Stripe → Developers → API keys → Secret key (`sk_live_…`)        | yes      |
| `STRIPE_WEBHOOK_SECRET`  | Signing secret of the webhook endpoint from step 6 (`whsec_…`)   | yes      |
| `AUTH_SECRET`            | Any long random string (`openssl rand -base64 48`)               | yes      |
| `ADMIN_TOKEN`            | Another long random string; unlocks `/admin/newsletter`          | yes      |
| `TURNSTILE_SECRET_KEY`   | From step 8, if you use Turnstile                                | optional |

Redeploy (or push a commit) after adding secrets so the running Worker picks them up.

## 6. Stripe (not Cloudflare, but the Worker depends on it)

- [ ] **Products**: create "All-access membership" with two recurring prices (monthly €12, yearly €89,
      tax behaviour *inclusive*). Put the `price_…` ids into `wrangler.jsonc` `vars` →
      `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`. (Single guides are priced inline; no product needed.)
- [ ] **Developers → Webhooks → Add endpoint**: `https://<your-domain>/api/stripe/webhook`, events
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`,
      `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
      Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] **Settings → Billing → Customer portal**: click *Save* once (activates the portal in live mode)
      and allow customers to cancel subscriptions and update payment methods.
- [ ] **Settings → Emails**: turn on receipts for successful payments.
- [ ] Optional: enable **Stripe Tax** and set `STRIPE_AUTOMATIC_TAX` to `"true"` in `wrangler.jsonc`.

## 7. Email

**Sending — Email Service (beta)**

- [ ] **Email → Email Service** (on the account, not the zone) → add the sending domain → add the
      DKIM/SPF/DMARC records it shows (one click if the zone is on Cloudflare) → wait for *Verified*.
- [ ] `EMAIL_FROM` in `wrangler.jsonc` must be an address on that domain (default `hello@uncomplicatedguides.com`).
- [ ] Nothing else: the `send_email` binding is declared in `wrangler.jsonc`.
- [ ] Test: submit the contact form on the live site; the message must arrive at `CONTACT_TO`.
- [ ] Newsletter volume: Email Service is in beta and has per-account sending limits. Check the limit
      shown in the Email Service dashboard before sending to a large list; delivery runs in batches
      of 25 every five minutes, so a list of 1,000 takes about three hours.

**Receiving — Email Routing**

- [ ] Zone → **Email → Email Routing → Get started**; add the DNS records it asks for (MX + TXT).
- [ ] **Destination addresses**: add the mailbox you actually read and confirm the verification email.
      Put that address in `wrangler.jsonc` → `CONTACT_TO`.
- [ ] **Routing rules → Create address**: `hello@<your-domain>` → action **Send to a Worker** →
      `the-uncomplicated-guides`. The Worker (`src/worker.ts`) forwards every message to `CONTACT_TO`.
      (Choosing **Send to an email** instead, straight to the mailbox, also works; the Worker route is
      only needed if you want custom handling later.)
- [ ] Optional: **Catch-all address** → send to the same Worker or mailbox.

## 8. Optional

- [ ] **Turnstile** (contact-form spam protection): **Turnstile → Add widget**, mode *Managed*, add your
      domain. Site key → `wrangler.jsonc` `PUBLIC_TURNSTILE_SITE_KEY`; secret key → secret `TURNSTILE_SECRET_KEY`.
- [ ] **Google Analytics**: set `PUBLIC_GA_MEASUREMENT_ID` in `wrangler.jsonc`. This turns on the cookie
      banner and Consent Mode. Leave empty to ship without analytics.
- [ ] **Observability**: already on (`observability.enabled`). Worker → **Logs** shows every request,
      webhook and email attempt (look for `[webhook]`, `[email]`, `[checkout]`).
- [ ] **Preview URLs**: Workers Builds gives every non-production branch a `*.workers.dev` preview.
      They share the same D1/R2/secrets, so test Stripe with the live keys carefully — or set
      `STRIPE_SECRET_KEY` to a test key until launch.

## 9. Go-live test, in order

1. Open the site; the home, library and guide pages render.
2. Buy the first guide with a real card for €39 (refund it afterwards in Stripe): the thank-you page
   shows a download button, the PDF downloads, the delivery email arrives.
3. Subscribe to the monthly plan: you land on `/account` signed in, the welcome email arrives, every
   guide downloads, "Manage or cancel" opens the Stripe portal. Cancel there and confirm the account
   page shows *Cancelled — access until period end*.
4. Sign out, request a sign-in link for the same address, sign in again.
5. Send yourself a message through the contact form and reply to it — the reply reaches the visitor.
6. Send an email to `hello@<your-domain>` from another mailbox; it arrives at `CONTACT_TO`.
7. Subscribe to the newsletter from the footer, click the confirmation link, then open
   `/admin/newsletter`, send yourself a test, and send a first short letter to everyone.
