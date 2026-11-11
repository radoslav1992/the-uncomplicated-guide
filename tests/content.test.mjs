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

test("the subscribers' PDF points at a published article and a cover that exists", async () => {
  const { site } = await import('../src/data/site.ts');
  const guide = site.freeGuide;
  assert.ok(ids.has(guide.article.replace('/blog/', '')), `${guide.article} is not a published article`);
  assert.ok(existsSync(new URL(`../public${guide.cover}`, import.meta.url)), `${guide.cover} is missing`);
  assert.match(guide.fileKey, /\.pdf$/);
  assert.match(guide.fileName, /^[\w.-]+\.pdf$/, 'fileName goes into a Content-Disposition header');
  // The download route must not sit under a path that public/_redirects sends elsewhere.
  const { GUIDE_PATH } = await import('../src/lib/newsletter.ts');
  const redirected = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((from) => from?.endsWith('/*'))
    .map((from) => from.slice(0, -1));
  assert.ok(!redirected.some((prefix) => GUIDE_PATH.startsWith(prefix)), `${GUIDE_PATH} is redirected`);
});

test('analytics ids in wrangler.jsonc are the right kind for their variable', () => {
  const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const value = (name) => config.match(new RegExp(`"${name}":\\s*"([^"]*)"`))?.[1];
  const gtm = value('PUBLIC_GTM_CONTAINER_ID');
  const ga = value('PUBLIC_GA_MEASUREMENT_ID');
  assert.notEqual(gtm, undefined, 'PUBLIC_GTM_CONTAINER_ID is missing from vars');
  assert.notEqual(ga, undefined, 'PUBLIC_GA_MEASUREMENT_ID is missing from vars');
  // A Tag Manager id pasted into the GA4 variable (or the reverse) would silently load nothing.
  if (gtm) assert.match(gtm, /^GTM-[A-Z0-9]+$/, 'PUBLIC_GTM_CONTAINER_ID must be a GTM-… container id');
  if (ga) assert.match(ga, /^G-[A-Z0-9]+$/, 'PUBLIC_GA_MEASUREMENT_ID must be a G-… measurement id');
});
