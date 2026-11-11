/// <reference types="@cloudflare/workers-types" />

/**
 * Bindings and variables available to the Worker.
 * Keep in sync with wrangler.jsonc (bindings + vars) and .dev.vars.example (secrets).
 */
interface Env {
  // Storage
  DB: D1Database;
  /**
   * R2 bucket. Two things are served from it: `article-images/` through /media/, and the
   * subscribers' PDF (`site.freeGuide.fileKey`) through signed links at /api/newsletter/guide.
   */
  GUIDE_FILES: R2Bucket;
  // Cloudflare Email Service
  SEND_EMAIL?: SendEmail;
  // Static assets (added by the adapter)
  ASSETS?: Fetcher;

  // Vars
  SITE_URL: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  CONTACT_TO: string;
  PUBLIC_GA_MEASUREMENT_ID?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;

  // Secrets
  TURNSTILE_SECRET_KEY?: string;
  AUTH_SECRET?: string;
  ADMIN_TOKEN?: string;
}

declare namespace Cloudflare {
  interface Env extends globalThis.Env {}
}

interface ImportMetaEnv {
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}
