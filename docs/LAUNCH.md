# From shop to blog: deployment and clean-up

On 11 November 2026 the site stopped selling PDF guides and became a free blog. The two paid
guides are now articles (`/blog/ai-receptionist-guide` and
`/blog/ai-ugc-video-ads-guide`), and every shop URL redirects permanently (see `redirects` in
`astro.config.mjs` and `public/_redirects`).

The code change is self-contained: deploying it needs no new secrets and no database migration.
What follows are the steps outside the repository, in the order that is safe.

## 1. Before deleting anything: keep a copy of the PDFs

The full PDFs exist only in the R2 bucket `kova-guides` — they were never committed, and there is
no other copy in this project. Download both first and keep them somewhere you control:

```bash
npx wrangler r2 object get "kova-guides/247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf" --file "247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf" --remote
npx wrangler r2 object get "kova-guides/AI_Video_Ads_UGC_Guide_EN_v1.0.pdf" --file "AI_Video_Ads_UGC_Guide_EN_v1.0.pdf" --remote
```

The free articles were written from the sample pages, the chapter outlines and the related blog
posts, not from the full PDFs. Chapters that exist only in the PDFs can be folded into the articles
later; that needs the files.

## 2. Deploy

Merge and let Workers Builds deploy as usual. Then check:

- `curl -sI https://uncomplicatedguide.com/guides/ai-assistants` answers `301` with
  `location: /blog/ai-receptionist-guide`; likewise `/guides/ai-video-ads-ugc`,
  `/account`, `/thank-you`, `/checkout`, `/refunds`, `/download/anything` and `/samples/anything`.
- `/api/checkout` and `/api/stripe/webhook` answer `404`.
- The newsletter signup, confirmation link, contact form and `/admin/newsletter` still work.

## 3. Delete the PDFs from R2

Only after step 1 and a successful deploy. Delete just the two guide objects — the `article-images/`
prefix in the same bucket serves the blog's images and must stay. The bucket is shared with kova.bg,
so do not delete anything else.

```bash
npx wrangler r2 object delete "kova-guides/247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf" --remote
npx wrangler r2 object delete "kova-guides/AI_Video_Ads_UGC_Guide_EN_v1.0.pdf" --remote
```

## 4. Stripe

The Stripe account is shared with kova.bg, so change only what belonged to this site:

- **Payment Links**: deactivate the two links for the guides (products `prod_VDCE0pSfyMOATJ` —
  24/7 AI Assistants — and `prod_VDCwauiErlkqed` — AI Video Ads & UGC). A link shared somewhere
  would otherwise keep taking money for a file that is no longer delivered.
- **Products**: archive the same two products.
- **Webhooks**: delete the endpoint `https://uncomplicatedguide.com/api/stripe/webhook`. The route is
  gone, so Stripe would retry every event against a 404 and eventually email you about it. Leave
  kova.bg's endpoint alone.
- **Worker secrets**: delete `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from the Worker
  (Settings → Variables and Secrets). Nothing reads them any more.

## 5. Database (D1 `guides-db`)

Nothing is dropped by this change. The shop tables stay in place and are no longer read or written:

| Table | What it holds | Recommendation |
| --- | --- | --- |
| `purchases` | One row per paid order | **Keep.** Accounting records; Bulgarian law currently requires ten years. |
| `refunded_payments` | Refund tombstones | Keep with `purchases`. |
| `downloads` | Download log | Not required by law; export if wanted, then delete. |
| `reviews` | Buyers' ratings and text | No longer published; export if wanted, then delete. |
| `delivery_jobs`, `login_tokens` | Operational queues | Safe to empty. |

Back up first (`npx wrangler d1 export guides-db --remote --output guides-db-backup.sql`), then, if
you agree with the table above:

```sql
DELETE FROM delivery_jobs;
DELETE FROM login_tokens;
DELETE FROM downloads;
DELETE FROM reviews;
```

Run it with `npx wrangler d1 execute guides-db --remote --command "<statement>"`. The privacy policy
already says reviews are no longer published and that buyers can ask for their review and download
log to be deleted. If you later drop the tables, do it in a new migration, not by editing the old ones.

## 6. Earlier buyers

People who paid for a PDF can no longer sign in at `/account` (it redirects to `/guides`); the same
content is now free on the site. Questions about past purchases go to hello@uncomplicatedguide.com,
and the contact form has a topic for them. Whether to email buyers about the change, or to refund
recent purchases, is a business decision — the addresses are in `purchases`.

## 7. Search engines

- In Google Search Console, submit `https://uncomplicatedguide.com/sitemap-index.xml` again and use
  **URL inspection → Request indexing** on the two guide articles.
- The old `/guides/<slug>` product pages redirect with `301`, so their signals pass to the articles;
  leave the redirects in place for at least a year.
- The next step is the keyword-driven pass on the two guide articles. Titles for search results go in
  `seoTitle` (the on-page headline stays `title`), and `description` is the meta description. If a
  slug changes, add the old URL to `redirects` in `astro.config.mjs` and update the two existing
  entries so nothing redirects twice.
