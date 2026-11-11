# Cloudflare setup checklist

Everything the site needs in the Cloudflare dashboard, in the order that works. Deployment
is done by Cloudflare's GitHub integration (Workers Builds); nothing is deployed from a laptop.

Names used below (change them together with `wrangler.jsonc` if you prefer others):

| Thing            | Name                          | Where in `wrangler.jsonc` |
| ---------------- | ----------------------------- | ------------------------- |
| Worker           | `the-uncomplicated-guides`    | `name`                    |
| D1 database      | `guides-db`                   | `d1_databases[0]`         |
| R2 bucket        | `kova-guides` (shared with kova.bg; article images only) | `r2_buckets[0]` |
| Email binding    | `SEND_EMAIL`                  | `send_email[0]`           |

## 1. Domain

- [ ] Add your domain as a zone (**Add a domain**) and point the nameservers at Cloudflare.
      Email Routing and Email Service both need the zone to be on Cloudflare.

## 2. D1 database

- [x] **Storage & Databases → D1 SQL database → Create** — name `guides-db`.
- [x] Its **Database ID** (`1257ef33-c0c0-4d12-b568-8629bc7fc0c8`) is in `wrangler.jsonc` → `d1_databases[0].database_id`.
- [ ] Migrations in `migrations/` are applied by the deploy command below; you do not create tables by hand.

## 3. R2 bucket

- [x] The existing private bucket `kova-guides` is reused; nothing to create.
- [ ] Article hero images go under the `article-images/` prefix (**R2 → kova-guides → Objects → Upload**).
      They are served at `/media/article-images/<file name>`; nothing else in the bucket is reachable
      from the site. Images can also live in the repository under `public/articles/`.
- [ ] The guide PDFs from the old shop are no longer used. See `docs/LAUNCH.md` before deleting them.

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
      queued newsletter batches, purges unconfirmed addresses and clears expired rate-limit rows;
      nothing to configure.
- [ ] **Settings → Domains & Routes → Add → Custom domain** — e.g. `uncomplicatedguide.com` (and `www` if you want it).
- [ ] `SITE_URL` in `wrangler.jsonc` and `public/robots.txt` are already set to `https://uncomplicatedguide.com`.
      Change both only if you serve the site from `www` instead.

Non-secret settings live in `wrangler.jsonc` → `vars` and ship with each deploy. Secrets are set
once in the dashboard and survive deploys.

## 5. Secrets (Worker → Settings → Variables and Secrets → Add → type *Secret*)

| Name                     | Value                                                           | Required |
| ------------------------ | --------------------------------------------------------------- | -------- |
| `AUTH_SECRET`            | Any long random string (`openssl rand -base64 48`); signs newsletter links | yes |
| `ADMIN_TOKEN`            | Another long random string; unlocks `/admin/newsletter`          | yes      |
| `TURNSTILE_SECRET_KEY`   | From step 7, if you use Turnstile                                | optional |

The site no longer takes payments, so it needs no Stripe secrets. If `STRIPE_SECRET_KEY` or
`STRIPE_WEBHOOK_SECRET` are still set on the Worker, delete them (see `docs/LAUNCH.md`).

Redeploy (or push a commit) after adding secrets so the running Worker picks them up.

## 6. Email

**Sending — Email Service (beta)**

- [ ] **Email → Email Service** (account level, where kova.bg is already verified) → add
      `uncomplicatedguide.com` as a sending domain → add the DKIM/SPF/DMARC records it shows (one
      click, the zone is on Cloudflare) → wait for *Verified*.
- [ ] `EMAIL_FROM` is `hello@uncomplicatedguide.com` and the `send_email` binding only allows that
      sender (`allowed_sender_addresses`), like the agency Worker. Recipients are unrestricted, which
      is what newsletter confirmations and letters need.
- [ ] Shortcut if you do not want to verify the new domain yet: set `EMAIL_FROM` and the allowed
      sender to an address on kova.bg (e.g. `chas@kova.bg`), which is already verified.
- [ ] Test: submit the contact form on the live site; the message must arrive at `CONTACT_TO`.
- [ ] Newsletter volume: Email Service is in beta and has per-account sending limits. Check the limit
      shown in the Email Service dashboard before sending to a large list; delivery runs in batches
      of 25 every five minutes, so a list of 1,000 takes about three hours.

**Receiving — Email Routing**

- [ ] Zone → **Email → Email Routing → Get started**; add the DNS records it asks for (MX + TXT).
- [x] **Destination address**: `radoslav.dodnikov@gmail.com` is already verified on the account (kova.bg
      uses it) and is set as `CONTACT_TO`.
- [ ] **Routing rules → Create address**: `hello@uncomplicatedguide.com` → action **Send to a Worker** →
      `the-uncomplicated-guides`. The Worker (`src/worker.ts`) forwards every message to `CONTACT_TO`.
      (Choosing **Send to an email** instead, straight to the mailbox, also works; the Worker route is
      only needed if you want custom handling later.)
- [ ] Optional: **Catch-all address** → send to the same Worker or mailbox.

## 7. Optional

- [ ] **Turnstile** (contact-form spam protection): **Turnstile → Add widget**, mode *Managed*, add your
      domain. Site key → `wrangler.jsonc` `PUBLIC_TURNSTILE_SITE_KEY`; secret key → secret `TURNSTILE_SECRET_KEY`.
- [ ] **Google Analytics**: set `PUBLIC_GA_MEASUREMENT_ID` in `wrangler.jsonc`. This turns on the cookie
      banner and Consent Mode. Leave empty to ship without analytics.
- [ ] **Observability**: already on (`observability.enabled`). Worker → **Logs** shows every request
      and email attempt (look for `[email]`, `[newsletter]`, `[inbound-email]`).
- [ ] **Preview URLs**: Workers Builds gives every non-production branch a `*.workers.dev` preview.
      They share the same D1/R2/secrets, so a newsletter sent from a preview goes to real subscribers.

## 8. Go-live test, in order

1. Open the site; the home page, `/blog`, a category page such as `/blog/category/voice-ai`, and both
   featured articles render.
2. Old URLs redirect permanently: `/guides`, `/guides/ai-assistants`, `/guides/ai-video-ads-ugc`, `/account`,
   `/refunds` and `/samples/ai-assistants.pdf` each answer `301` with the new location
   (`curl -sI https://uncomplicatedguide.com/guides/ai-assistants`).
3. Send yourself a message through the contact form and reply to it — the reply reaches the visitor.
4. Send an email to `hello@uncomplicatedguide.com` from another mailbox; it arrives at `CONTACT_TO`.
5. Subscribe to the newsletter from the footer, click the confirmation link, then open
   `/admin/newsletter`, send yourself a test, and send a first short letter to everyone.
