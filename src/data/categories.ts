/**
 * Article categories. Every article has exactly one (`category:` in its frontmatter,
 * using the slug below); tags stay free-form for finer topics.
 *
 * Each category with at least one published article gets a page at
 * /blog/category/<slug>, so `intro` should read as a real introduction to the topic —
 * it is the text search engines see on that page.
 *
 * `shape` is one of the theme graphics in public/theme/, shown on the generated
 * cover that articles without an image get (src/components/Cover.astro).
 *
 * To add a category, add an entry here; the schema in src/content.config.ts picks it up.
 */
export const categories = [
  {
    slug: 'voice-ai',
    name: 'Voice AI',
    shape: 'icon-s-9',
    description:
      'AI receptionists and voice agents: what they are, how to build one that answers real calls, and how to price it.',
    intro:
      'Articles on AI receptionists and voice agents that answer real phone calls — where they pay off, how to prompt and test them, the telephony nobody demos, and how to price a service whose costs rise with every call.',
  },
  {
    slug: 'ai-video',
    name: 'AI Video',
    shape: 'icon-s-12',
    description:
      'AI UGC ads, avatars and voiceovers: how to make AI video ads that hold attention, and how to test them.',
    intro:
      'Articles on AI video ads and AI UGC — scripts and hooks, AI voiceovers and avatars, editing for the feed, and the testing that decides which version actually works.',
  },
  {
    slug: 'side-projects',
    name: 'Side Projects',
    shape: 'icon-s-11',
    description:
      'Small things built with AI to earn on the side — games, websites and tools — with the honest economics.',
    intro:
      'Side projects built with AI coding tools: games, small websites and tools, and the honest maths of what they might earn — traffic, monetisation and the parts nobody screenshots.',
  },
  {
    slug: 'selling-ai-services',
    name: 'Selling AI Services',
    shape: 'icon-s-8',
    description:
      'Pricing, packaging and selling AI work to clients without losing money on your best customers.',
    intro:
      'Articles on turning AI skills into a service people pay for: pricing work whose costs scale with usage, packaging it, and keeping clients after the pilot.',
  },
] as const;

export type Category = (typeof categories)[number];
export type CategorySlug = Category['slug'];

export const categorySlugs = categories.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

export const categoryUrl = (slug: string) => `/blog/category/${slug}`;
