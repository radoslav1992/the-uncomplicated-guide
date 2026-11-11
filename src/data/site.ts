/**
 * Site-wide facts. Content that appears in more than one place lives here.
 */

/**
 * The real legal identity behind the site — the publisher and, for GDPR, the data
 * controller. The Imprint and Privacy policy must show this genuine name; it must NOT
 * be replaced by the public pen name below (`author.name`), which is used everywhere else.
 */
const legalTraderName = 'Digital Craft EOOD';

export const site = {
  name: 'The Uncomplicated Guides',
  shortName: 'Uncomplicated',
  tagline: 'Practical guides on AI, vibe coding and social media — free to read',
  description:
    'Free, practical guides and articles on putting AI to work: voice agents, AI video ads, vibe coding and side projects. What to build, what it costs and what breaks.',
  author: {
    /** Public byline / pen name — used for the author bio, bylines and sign-offs. */
    name: 'R. D. Mitchell',
    role: 'Software and AI engineer',
    city: 'Sofia, Bulgaria',
    bio: 'I teach generative AI and natural language processing at university, am a PhD candidate in computer science, and run a software studio in Sofia that builds voice agents, automations and internal systems. Everything here comes from that work.',
  },
  /** Use on legal pages only (Imprint, Terms, Privacy) — see the comment on the constant above. */
  legalTraderName,
  registeredAddress: import.meta.env.SELLER_REGISTERED_ADDRESS || '',
  registrationNumber: import.meta.env.SELLER_REGISTRATION_NUMBER || '',
  vatNumber: import.meta.env.SELLER_VAT_NUMBER || '',
  legalName: `The Uncomplicated Guides · ${legalTraderName}`,
  email: 'hello@uncomplicatedguide.com',
  /** The month shown on legal pages. */
  legalUpdated: 'November 2026',
  /** The day the paid PDFs were retired and republished as free articles. */
  shopClosed: '11 November 2026',
  /** Public URL, used as the RSS feed's fallback base when Astro.site is unset. */
  url: 'https://uncomplicatedguide.com',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Guides', href: '/guides' },
    { label: 'Articles', href: '/blog' },
    { label: 'About', href: '/#author' },
    { label: 'Contact', href: '/contact' },
  ],
  newsletterBlurb: 'One email when a new guide or article is published. Nothing else.',
  legalNav: [
    { label: 'Terms of use', href: '/terms' },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Cookie policy', href: '/cookies' },
    { label: 'Imprint', href: '/imprint' },
  ],
  /** Guides being written. Shown on /guides and the newsletter page. */
  upcoming: [
    {
      title: 'Vibe coding for non-developers',
      text: 'From an idea to a working product without writing the code yourself: what to ask for, how to check what you got, and when to stop and call a developer.',
    },
    {
      title: 'Working with AI coding agents',
      text: 'Running Claude Code and similar agents on real projects: setting up, giving instructions that hold, reviewing the output and keeping a codebase you still understand.',
    },
    {
      title: 'TikTok growth, tested',
      text: 'Hooks, formats, posting rhythm and the signals the algorithm really reads — each one with when it works, when it does not, and how to check.',
    },
  ],
} as const;
