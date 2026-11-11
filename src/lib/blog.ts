import { getCollection, type CollectionEntry } from 'astro:content';
import { categories, categoryUrl, getCategory } from '../data/categories';

export type Post = CollectionEntry<'blog'>;

/**
 * Published articles, newest first. Drafts appear while developing and are dropped
 * from the build, so a half-written piece can be previewed without shipping it.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** Rounded minutes at 200 words per minute; never zero. */
export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** The article's `## ` headings, read from the Markdown source. */
export function chapters(post: Post): string[] {
  return (post.body ?? '')
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).replace(/[*_`]/g, '').trim());
}

export const postUrl = (post: Post) => `/blog/${post.id}`;

/** The category record for an article (the schema guarantees it exists). */
export const postCategory = (post: Post) => getCategory(post.data.category)!;

/**
 * Categories that have at least one published article, in the order of
 * src/data/categories.ts, each with its articles. Empty categories get no page.
 */
export function categoriesWithPosts(posts: Post[]) {
  return categories
    .map((category) => ({
      ...category,
      url: categoryUrl(category.slug),
      posts: posts.filter((post) => post.data.category === category.slug),
    }))
    .filter((category) => category.posts.length > 0);
}

/**
 * Articles to suggest after `post`: the same category first, then shared tags,
 * then the newest. Never the post itself.
 */
export function relatedPosts(post: Post, all: Post[], count = 3): Post[] {
  const tags = new Set(post.data.tags.map((t) => t.toLowerCase()));
  const score = (other: Post) =>
    (other.data.category === post.data.category ? 3 : 0) +
    other.data.tags.filter((t) => tags.has(t.toLowerCase())).length;
  return all
    .filter((other) => other.id !== post.id)
    .map((other, index) => ({ other, index, score: score(other) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ other }) => other);
}
