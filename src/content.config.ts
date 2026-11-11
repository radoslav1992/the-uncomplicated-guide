import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Every article on the site. One Markdown file per article in `src/content/blog/`;
 * the file name becomes the URL (`my-post.md` → `/blog/my-post`).
 *
 * Long-form guides are ordinary articles with `kind: guide`: they get the same URL
 * scheme, a "Guide" label, a table of contents, and a place on the home page and in
 * /guides.
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
    tags: z.array(z.string()).default([]),
    /** `guide` for long-form, chaptered guides; everything else is an `article`. */
    kind: z.enum(['article', 'guide']).default('article'),
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
    /**
     * Slug of a guide (another article with `kind: guide`) this piece belongs with.
     * Shows a "read the full guide" card at the end of the article.
     */
    guide: z.string().optional(),
    /** Drafts are visible with `astro dev` and left out of the build. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
