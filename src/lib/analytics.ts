/**
 * Which Google tag the site loads, from the public vars in wrangler.jsonc.
 * Tag Manager wins when both are set: GA4 is then configured inside the container, and
 * loading it a second time directly would count every visit twice.
 */
const gtm = (import.meta.env.PUBLIC_GTM_CONTAINER_ID || '').trim();
const ga = (import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '').trim();

/** Google Tag Manager container id, or '' — ignored unless it looks like one. */
export const gtmId = /^GTM-[A-Z0-9]+$/.test(gtm) ? gtm : '';
/** GA4 measurement id for a direct install, or '' when Tag Manager is used. */
export const gaId = !gtmId && /^G-[A-Z0-9]+$/.test(ga) ? ga : '';
/** True when either is configured: the cookie banner and the consent-gated loader are on. */
export const analyticsEnabled = Boolean(gtmId || gaId);
