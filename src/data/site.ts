/**
 * Site-wide facts. Content that appears in more than one place lives here.
 */
export const site = {
  name: 'The Uncomplicated Guides',
  shortName: 'Uncomplicated',
  shortSuffix: 'guides',
  tagline: 'Practical guides on AI, vibe coding and social media',
  description:
    'Each guide is one procedure from start to finish: when it is worth doing, how to build it, where it breaks and how to charge for it.',
  author: {
    name: 'Radoslav Dodnikov',
    role: 'Author · Software and AI engineer',
    city: 'Sofia, Bulgaria',
  },
  legalName: 'The Uncomplicated Guides · Radoslav Dodnikov',
  reach: 'Sofia, Bulgaria · Sold worldwide as PDF',
  email: 'hello@uncomplicated.guides',
  imprint: 'Galactic Guides',
  /** Default currency for all guides. */
  currency: 'EUR',
  /** The month shown on legal pages. */
  legalUpdated: 'September 2026',
  /** Days a download link stays valid. Mirrored in the terms. */
  downloadLinkDays: 7,
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Library', href: '/guides' },
    { label: 'About', href: '/#author' },
    { label: 'Contact', href: '/contact' },
  ],
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
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
