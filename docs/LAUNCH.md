# Launch changes and deployment

This branch changes the purchase schema and authentication behavior. Apply migration `0004_launch_hardening.sql` before deploying the Worker. Do not publish the complete paid PDFs in this repository; `public/samples/` intentionally contains only three selected pages per guide.

## Required production setup

1. Confirm that **Digital Craft EOOD** is the contractual seller (this is the name observed in Stripe Checkout). Supply its verified full registered postal address and registration number as `SELLER_REGISTERED_ADDRESS` and `SELLER_REGISTRATION_NUMBER` in the build environment or `.env`. Supply `SELLER_VAT_NUMBER` when applicable. The repository cannot establish these facts. `npm run deploy` checks the two mandatory fields. Direct dashboard deployments must use the same build values and release check.
2. Confirm the tax treatment with the business's accountant. `STRIPE_AUTOMATIC_TAX` is still false until the appropriate registrations and Stripe Tax configuration are established. Stripe payment processing does not itself satisfy filing/remittance obligations. Inline checkout prices use inclusive tax treatment. If switching to fixed Stripe Price IDs, verify their amount, currency and tax behavior.
3. Set a newly generated, private `AUTH_SECRET` of at least 32 characters in Cloudflare. The example has no usable default. Rotating the secret invalidates old account and newsletter links; tell existing subscribers if rotation is needed. Set a separate long `ADMIN_TOKEN`, the correct live Stripe API and webhook secrets, and verify the SEND_EMAIL domain/binding and CONTACT_TO destination. Rate limiting protects public forms even without Turnstile. Enable Turnstile with matching public/secret keys if wanted.
4. Back up D1, then run `npm run db:migrate` against the intended production database. Migration 0004 adds single-use login tokens, rate limits, purchase verification/consent, a delivery queue, newsletter leases and refund tombstones. It does not delete purchases or reviews. Deploy the new Worker only after migration succeeds. An old Worker ignores the additive columns, but do not roll back to its unsafe access behavior.
5. Privately upload the full PDFs to R2 bucket `kova-guides` with the existing exact keys:
   - `247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf` ← uploaded `24-7-AI-Assistants-EN-v1.1.pdf` (36 pages).
   - `AI_Video_Ads_UGC_Guide_EN_v1.0.pdf` ← uploaded video PDF (35 pages).
   Confirm the R2 content type, object size and checksum against each source. The files have not been uploaded to production by this change.
6. Enable Stripe webhook events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Keep the scheduled trigger running every five minutes. Delivery jobs persist before acknowledgement and retry failed email sends with backoff. Inspect `delivery_jobs` for growing attempts or old pending records. A provider timeout can cause a duplicate email; links remain order-scoped.
7. At `/admin/reviews`, verify legacy purchases against Stripe in batches of 25. Test/seed and unverified purchases cannot contribute public reviews or averages. Critical reviews are treated identically to positive ones. Unresolved Stripe sessions remain unverified for support investigation. Previously issued test receipts are not proof of live purchases.
8. Deactivate or update externally shared legacy Stripe Payment Links. New site purchases go through the express-consent page. Legacy links do not create the order browser cookie or record the new consent; buyers recover through email/account and retain any applicable withdrawal rights.
9. Address the PDFs' page-2 claim that copies are personalised. Current fulfilment delivers the original PDF; it does not stamp buyer identification. Remove the claim in the source editions before shipping, or implement and verify actual personalisation. This branch does not alter the paid source files.

## Acceptance checks before public launch

- `npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run check:release` on the deployment runner. CI runs type checking, Node/SQLite regression tests and the Cloudflare build without production secrets.
- In Stripe **test mode**, complete each guide's checkout from the consent page. Verify the checkbox is mandatory, metadata records consent, and R2 returns the correct PDF. A pasted session id in a different browser must reveal no email or download and must not sign in to the buyer account.
- Delay and replay a payment webhook; trigger a failed email send then a successful retry. Check that there is one purchase and one current token, and that the queue drains. Async payment methods must not deliver while unpaid.
- Request a login email; it must work only once and expire after 20 minutes. Renew an expired download from My guides. Repeat in two tabs and check both receive the same renewed token.
- Test full refunds, duplicate refund events and refunds before completion events. Downloads/reissues/resends must stop. Partial refunds intentionally preserve access.
- Unsubscribe after a newsletter is queued; future sends must skip that address. Test overlapping cron calls and retry failed deliveries in the admin page. An already in-flight provider send cannot be recalled.
- Check desktop and real mobile browsers at 320, 390 and 768 CSS pixels, including keyboard navigation, Escape-to-close menu, sample PDF links, form errors, the cookie banner, sticky purchase bar and 200% text zoom. Screen-reader testing remains necessary for a full accessibility assessment.
- Verify both sample PDFs (3 pages), social cards (1200×630), canonical URLs and noindex on private routes. Confirm sensitive URLs and query strings never enter analytics. Analytics is absent on private pages and loads only after consent on public pages. Events: page_view, view_item, view_sample, begin_checkout. Use Stripe for confirmed sales; no unverified client-side purchase event is emitted.

## Validation limits in the review workspace

Local regression tests exercise actual library logic against SQLite with mocked email, image metadata and platform bindings. They are not an end-to-end Cloudflare or Stripe certification. The Cloudflare build reached Worker bundling but the local runtime failed at `os.networkInterfaces` (`uv_interface_addresses`, system error 1) during prerendering. The review browser also blocked localhost. CI and a staging deployment must complete the build and rendered desktop/mobile checks before merge/release. No production payment, email, refund, migration, R2 upload or deployment was performed.

## References for changed disclosures

- EU digital content withdrawal and consumer remedies: https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm
- Statutory guarantees: https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/index_en.htm
- ODR closure: https://consumer-redress.ec.europa.eu/site-relocation_en
- Stripe tax filing: https://docs.stripe.com/tax/filing
