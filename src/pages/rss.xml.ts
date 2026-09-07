import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/blog';
import { site } from '../data/site';

/** GET /rss.xml — the blog feed. Linked from every page's <head>. */
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: `${site.name} — blog`,
    description:
      'Short pieces on the same procedures the guides cover: what breaks, what it costs, and what to check before you promise it to a client.',
    site: context.site ?? site.url,
    // The site serves URLs without a trailing slash; matching it keeps feed links
    // from bouncing through a redirect.
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
      categories: post.data.tags,
    })),
    customData: '<language>en</language>',
  });
}
