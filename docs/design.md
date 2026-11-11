# Design

The site uses the design language of the **Adon** template (ThemeForest, by RavexTheme),
taken from its own blog, article, about, FAQ and contact pages rather than its agency
landing pages. It was rebuilt in Astro components and plain CSS; none of the template's
Bootstrap, jQuery, GSAP or smooth-scroll code is shipped.

## Principles

- **Editorial, not agency.** Big grotesque headlines with one italic serif accent word,
  rounded images, pill labels and buttons, generous white space.
- **Text first on article pages.** Article text is 17–19px DM Sans at a 1.72 line height in
  a column of about 760px. Nothing animates inside an article.
- **One accent.** The brand orange `#fb7515` is used for fills (buttons, stat card, covers,
  markers, link underlines) with dark text on top. Where orange is text, a darker shade
  (`--accent-text`) is used so it stays readable.
- **Light and dark.** Light is the default; dark mode follows the reader's system setting
  (`prefers-color-scheme`), code blocks included. The theme ships both variants, and the
  tokens below mirror them.

## Tokens (src/styles/global.css)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#111111` | Page background |
| `--bg-alt` | `#f4f4f2` | `#1b1b1b` | Panels: key takeaways, author box, cards |
| `--bg-chip` | `#f1f1f1` | `#222222` | Chips (category, date), inline code |
| `--ink` | `#111111` | `#ffffff` | Headings, buttons |
| `--text` | `#2b2b2b` | `#d9d9d9` | Body text |
| `--text-2` | `#555555` | `#a8a8a8` | Descriptions, secondary text |
| `--muted` | `#696969` | `#999999` | Dates, meta |
| `--border` | `#e6e6e3` | `#2a2a2a` | Hairlines |
| `--accent` | `#fb7515` | `#fb7515` | Fills (with `--on-accent` text) |
| `--accent-text` | `#b5440d` | `#ff8a3d` | Accent-coloured text |

Every text colour meets WCAG AA (4.5:1) on the backgrounds it is used on, in both themes;
the lowest is `--muted` on `--bg-alt` in light mode at 4.99:1.

`.band` is a section that is dark in both themes (the topics list on the home page). It
redefines the text tokens for everything inside it.

## Type

| Role | Font | Notes |
| --- | --- | --- |
| Headings, large numerals | **BDO Grotesk** 400/500 | Tracking −0.04 to −0.05em. From the theme; SIL Open Font License. Subset to Latin, WOFF2, in `src/assets/fonts/`. |
| Accent word in headlines, pull quotes, covers | **PP Editorial New** Italic | From the theme. Use `<em>` inside a heading, or `.accent`. See the licence note below. |
| Body, interface, article text | **DM Sans** (variable) | `@fontsource-variable/dm-sans`, self-hosted. |

**Licence note.** BDO Grotesk carries the SIL Open Font License in its metadata. PP Editorial
New is a Pangram Pangram typeface bundled with the theme; Pangram Pangram normally licenses
its fonts separately for commercial websites, so confirm the theme purchase covers it or buy
a web licence. To swap it, change `--font-serif` in `global.css` and the `@font-face` above it
(Instrument Serif Italic is a close open-source alternative).

## Components

- **Pill label** (`.pill`) — bordered pill with a dot; opens every section.
- **Chip** (`.chip`) — soft filled pill for category, date and reading time.
- **Buttons** (`.btn`) — black pill (white in dark mode); `.btn-accent` is the orange one used
  for subscribing; `.btn-outline`. Give a link `data-text` and wrap its label in a `<span>` for
  the theme's rolling-label hover.
- **Underlined link** (`.arrow-link`).
- **Article card** (`ArticleCard.astro`) and **featured card** (`FeaturedArticle.astro`) —
  rounded image, title, description, meta line; the image zooms slightly on hover.
- **Generated cover** (`Cover.astro`) — articles without an image get a tinted panel with one
  of the theme's line shapes (set per category in `src/data/categories.ts`), corner brackets
  and the category in the italic serif. The colour is derived from the article id.
- **Home page** — hero, three stat cards (soft / orange / ink) with the theme's 3D tiles, a
  scrolling line of topics, the topics list on the dark band, recent articles, the author
  statement and the FAQ accordion.
- **Article page** — category, date and reading-time chips and the author on a left rail, the
  title beside it, a full-width rounded image, then the contents list on the rail next to the
  text column.
- **Footer** — large newsletter call to action on the left, link columns on the right.

## Motion

Small and optional: sections on the home and listing pages fade up as they scroll into view
(`data-reveal`, a few lines of script in `Base.astro`), cards zoom their image on hover, and
the topic line on the home page scrolls. All of it is switched off under
`prefers-reduced-motion`, and content is visible without JavaScript.

## Theme assets in the repository

- `src/assets/fonts/` — BDO Grotesk Regular and Medium, PP Editorial New Italic (WOFF2 subsets).
- `public/theme/` — the theme's 3D tiles (`shape-s-10/11/12`), a scribble (`shape-s-8`), the
  asterisk (`icon-s-10`) and four line icons used on generated covers.
- `public/social/*.png` — 1200×630 share cards rendered with the same fonts.

The template itself (HTML pages, SCSS, scripts, placeholder images) is not in the repository.
