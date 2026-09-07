import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The blog. One Markdown file per post in `src/content/blog/`; the file name
 * becomes the URL (`my-post.md` → `/blog/my-post`).
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /** One or two sentences. Used on the listing, in <meta name="description"> and in the feed. */
    description: z.string(),
    pubDate: z.coerce.date(),
    /** Set when a post is materially revised, not for typo fixes. */
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /**
     * Slug of the guide this post belongs with (see `src/data/guides.ts`).
     * Drives the guide card at the end of the post and the social image.
     */
    guide: z.string().optional(),
    /** Drafts are visible with `astro dev` and left out of the build. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
