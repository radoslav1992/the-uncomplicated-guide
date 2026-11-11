// Content integrity: the checks a typo in frontmatter or a moved article would otherwise
// only reveal as a broken link or a missing card on the live site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../src/content/blog/', import.meta.url);
const posts = readdirSync(dir)
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const text = readFileSync(new URL(file, dir), 'utf8');
    const frontmatter = text.split('---')[1] ?? '';
    const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm'))?.[1];
    return {
      id: file.replace(/\.md$/, ''),
      body: text.split('---').slice(2).join('---'),
      category: field('category'),
      featured: field('featured') === 'true',
      image: field('image'),
      socialImage: field('socialImage'),
      draft: field('draft') === 'true',
    };
  });
const published = posts.filter((post) => !post.draft);
const ids = new Set(published.map((post) => post.id));

test('every article has a category defined in src/data/categories.ts', () => {
  const source = readFileSync(new URL('../src/data/categories.ts', import.meta.url), 'utf8');
  const known = new Set([...source.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]));
  assert.ok(known.size > 0, 'no categories found');
  for (const post of posts) {
    assert.ok(post.category, `${post.id} has no category`);
    assert.ok(known.has(post.category), `${post.id} uses unknown category "${post.category}"`);
  }
});

test('local article and social images exist in public/', () => {
  for (const post of published) {
    for (const src of [post.image, post.socialImage]) {
      if (!src || !src.startsWith('/') || src.startsWith('/media/')) continue;
      assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), `${post.id}: ${src} is missing`);
    }
  }
});

test('internal /blog links in articles point to published articles', () => {
  for (const post of published) {
    for (const [, slug] of post.body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)) {
      assert.ok(ids.has(slug), `${post.id} links to /blog/${slug}, which is not published`);
    }
  }
});

test('featured articles have chapters, and redirects land on published articles', () => {
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  for (const post of published.filter((p) => p.featured)) {
    const chapters = post.body.split('\n').filter((line) => line.startsWith('## ')).length;
    assert.ok(chapters >= 5, `${post.id} has only ${chapters} chapters`);
  }
  // Destinations are written as `moved('/blog/…')` or as a constant (`= '/blog/…'`).
  for (const [, target] of config.matchAll(/(?:moved\(|= )'(\/blog\/[a-z0-9-]+)'/g)) {
    assert.ok(ids.has(target.replace('/blog/', '')), `redirect target ${target} is not a published article`);
  }
});
