import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { categorySlugs } from './data/categories';

/**
 * Every article on the site. One Markdown file per article in `src/content/blog/`;
 * the file name becomes the URL (`my-post.md` → `/blog/my-post`).
 *
 * Articles are organised by one `category` (src/data/categories.ts) and any number of
 * free-form `tags`. Long reads can be marked `featured` to lead the home page.
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    /** The headline (the page's <h1>). */
    title: z.string(),
    /**
     * Optional <title> for search results when it should differ from the headline,
     * e.g. to lead with the main keyword. Falls back to `title`.
     */
    seoTitle: z.string().optional(),
    /** One or two sentences. Used on listings, in <meta name="description"> and in the feed. */
    description: z.string(),
    pubDate: z.coerce.date(),
    /** Set when an article is materially revised, not for typo fixes. */
    updatedDate: z.coerce.date().optional(),
    /** One of the slugs in src/data/categories.ts. Decides the article's category page. */
    category: z.enum(categorySlugs),
    /** Free-form topics, shown on the article and used to suggest related reading. */
    tags: z.array(z.string()).default([]),
    /** Featured articles lead the home page ("start here" and the featured section). */
    featured: z.boolean().default(false),
    /** Hero/social image, ideally 16:9. Root-relative paths and absolute URLs are supported. */
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    /**
     * Optional 1200×630 card for social shares (e.g. `/social/my-post.png`).
     * Falls back to `image`, then to the site-wide card.
     */
    socialImage: z.string().optional(),
    /**
     * Optional "Key takeaways": three to seven one-line points, shown in a box above
     * the article body. Write them so a reader who stops there still learns something.
     */
    takeaways: z.array(z.string()).optional(),
    /** Drafts are visible with `astro dev` and left out of the build. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
