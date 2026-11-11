import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * Published articles, newest first. Drafts appear while developing and are dropped
 * from the build, so a half-written piece can be previewed without shipping it.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** Long-form guides (`kind: guide`), newest first. */
export async function getGuides(): Promise<Post[]> {
  return (await getPosts()).filter((post) => post.data.kind === 'guide');
}

export const isGuide = (post: Post) => post.data.kind === 'guide';

/** Rounded minutes at 200 words per minute; never zero. */
export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export const postUrl = (post: Post) => `/blog/${post.id}`;

/**
 * Articles to suggest after `post`: the ones sharing the most tags or the same
 * guide first, then the newest. Never the post itself.
 */
export function relatedPosts(post: Post, all: Post[], count = 3): Post[] {
  const tags = new Set(post.data.tags.map((t) => t.toLowerCase()));
  const score = (other: Post) =>
    other.data.tags.filter((t) => tags.has(t.toLowerCase())).length +
    (post.data.guide && (other.data.guide === post.data.guide || other.id === post.data.guide) ? 2 : 0) +
    (other.data.guide === post.id ? 2 : 0);
  return all
    .filter((other) => other.id !== post.id)
    .map((other, index) => ({ other, index, score: score(other) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ other }) => other);
}
