# Design

A reading-first design for a blog of long practical articles. It replaced the dark Adon
"AI Agency" template adaptation in November 2026: that layout (near-black background,
all-caps Astro Nebula display type, 9–10px uppercase labels, scroll-driven GSAP motion) suited
an agency landing page but made 20-minute articles tiring to read.

## Principles

- **Text first.** Article text is 17.5–19.5px Literata at a 1.75 line height in a column of
  about 720px (roughly 70 characters per line). Nothing animates while you read.
- **Sentence case everywhere.** Headings are Onest 700 in normal case; no all-caps titles.
  Uppercase is kept to short eyebrow labels (13px, letter-spaced).
- **One accent.** The brand orange `#fb7515` is used for fills (buttons, the Subscribe
  button, markers) with dark text on top. Text and links use a darker orange
  (`--accent-text`) that meets contrast requirements on the background.
- **Light and dark.** The light theme is a warm paper background with near-black ink. Dark
  mode follows the reader's system setting (`prefers-color-scheme`), including code blocks.

## Tokens (src/styles/global.css)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#faf8f4` | `#151517` | Page background |
| `--bg-alt` | `#f3efe8` | `#1c1c1f` | Footer, table headers, author box |
| `--card` | `#ffffff` | `#1e1e22` | Cards, panels, inputs |
| `--tint` | `#fdeee3` | `#2a1d14` | Key takeaways, newsletter box |
| `--ink` | `#1c1917` | `#f4f2ee` | Headings |
| `--text` | `#2e2a26` | `#dcd8d2` | Body text |
| `--text-2` | `#57534e` | `#b9b4ad` | Secondary text, descriptions |
| `--muted` | `#6b655e` | `#a39e97` | Dates, meta |
| `--accent` | `#fb7515` | `#fb7515` | Fills (with `--on-accent` text) |
| `--accent-text` | `#b5440d` | `#ff8a3d` | Links and accent text |

Every text colour meets WCAG AA (4.5:1) against the backgrounds it is used on, in both
themes; the lowest is `--accent-text` on `--bg-alt` in light mode at 4.83:1.

## Type

- **Onest Variable** (`@fontsource-variable/onest`) — headings, navigation, buttons, cards,
  tables. Preloaded.
- **Literata Variable** (`@fontsource-variable/literata`, weight axis, regular and italic) —
  article text (`.prose`). A serif made for long reading on screens, with real italics.
- Monospace is the system stack.

## Where things live

- `src/styles/global.css` — tokens, base elements, buttons, forms, article prose, legal pages.
- `src/styles/blog.css` — listings, home sections, grids, the newsletter box.
- Components (`ArticleCard`, `FeaturedArticle`, `CategoryNav`, `Header`, `Footer`) and the
  article page carry their own scoped styles, built on the same tokens.

Social cards (`public/social/*.png`) are 1200×630 images rendered with the same type: dark
background, Onest headline, the article's hero art on the right.
