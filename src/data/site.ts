/**
 * Site-wide facts. Content that appears in more than one place lives here.
 */

/**
 * The real legal identity behind the site — who is registered as the trader and, for
 * GDPR, the data controller. EU consumer-disclosure and privacy law require this genuine
 * name on the Imprint, Terms of sale and Privacy policy; it must NOT be replaced by the
 * public pen name below (`author.name`), which is used everywhere else.
 */
// Match the seller shown in Stripe Checkout. Confirm company registration details before release.
const legalTraderName = 'Digital Craft EOOD';

export const site = {
  name: 'The Uncomplicated Guides',
  shortName: 'Uncomplicated',
  shortSuffix: 'guides',
  tagline: 'Practical guides on AI, vibe coding and social media',
  description:
    'Practical PDF playbooks for AI services: plan the workflow, understand the costs and deliver work you can support. Read real sample pages before buying.',
  author: {
    /** Public byline / pen name — used for the author bio, guide credits and casual sign-offs. */
    name: 'R. D. Mitchell',
    role: 'Author · Software and AI engineer',
    city: 'Sofia, Bulgaria',
  },
  /** Use on legal pages only (Imprint, Terms, Privacy) — see the comment on the constant above. */
  legalTraderName,
  registeredAddress: import.meta.env.SELLER_REGISTERED_ADDRESS || '',
  registrationNumber: import.meta.env.SELLER_REGISTRATION_NUMBER || '',
  vatNumber: import.meta.env.SELLER_VAT_NUMBER || '',
  legalName: `The Uncomplicated Guides · ${legalTraderName}`,
  reach: 'Sofia, Bulgaria · Sold worldwide as PDF',
  email: 'hello@uncomplicatedguide.com',
  imprint: 'Galactic Guides',
  /** Default currency for all guides. */
  currency: 'USD',
  /** The month shown on legal pages. */
  legalUpdated: 'September 2026',
  /** Days a download link stays valid. Mirrored in the terms. */
  downloadLinkDays: 7,
  /** Public URL, used as the RSS feed's fallback base when Astro.site is unset. */
  url: 'https://uncomplicatedguide.com',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Library', href: '/guides' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/#author' },
    { label: 'Contact', href: '/contact' },
  ],
  newsletterBlurb: 'One email when a guide ships, now and then a short note. Nothing else.',
  legalNav: [
    { label: 'Terms of sale', href: '/terms' },
    { label: 'Refund policy', href: '/refunds' },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Cookie policy', href: '/cookies' },
    { label: 'Imprint', href: '/imprint' },
  ],
  footerPromise: 'Every purchase comes with a Stripe receipt and a download link that can be reissued.',
} as const;

export const formatPrice = (cents: number, currency: string = site.currency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
