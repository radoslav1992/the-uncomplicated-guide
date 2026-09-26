# Adon AI Agency adaptation

The storefront uses the dark AI Agency demo from the user-supplied Adon archive
(`dark/ai-agency.html` and `dark/assets/scss/pages/_ai-agency.scss`). The source
archive is not shipped in the repository.

- Astro Nebula display font, technical ruled grid, oversized headings and numerals,
  squared orange classic buttons, numbered capabilities/process sections and
  editorial footer are adapted for the existing guide catalog.
- The archive's hero/gallery files are dimension-labelled placeholders. Existing
  real guide covers and author photography replace them; the orange shape asset
  comes from the archive.
- Original GSAP 3.12.2 and ScrollTrigger 3.11.4 files and license headers are
  retained in `public/adon/js`. Only required plugins are shipped.
- Motion is ported from the template into `agency-motion.js`: staggered heading
  reveals, 50px/1.15-second section entrances, scroll-scrubbed text, cover movement,
  and image parallax. Native scrolling avoids the template's global jQuery,
  ScrollSmoother wrappers and cursor replacement interfering with form controls.
- Reduced-motion preferences (including live changes) revert GSAP animations.
  Content remains available without JavaScript or if motion scripts fail.
- Guide data, prices, checkout handlers, download delivery, account access,
  newsletter/contact handlers, reviews, and legal copy are unchanged.

The original purchased-template and bundled asset licenses continue to apply.

## Validation

- `npm run check`: 0 errors and 0 warnings (existing informational hints remain).
- `npm test`: all 14 existing hardening tests pass.
- `npm run build`: passes. This workspace required a temporary Node network-interface
  shim for the Cloudflare build sandbox; no shim or build workaround is committed.
- Chromium checks at 320, 390, 768 and 1440px: homepage, library, both published
  guide pages, blog, contact and privacy render without horizontal page overflow,
  broken eagerly loaded images or JavaScript errors.
- Mobile navigation, Escape dismissal, FAQ expansion, live reduced-motion changes,
  and visible content/navigation with JavaScript disabled verified.
- `npm run check:release` requires seller address and registration number environment
  settings not present in the local workspace. This existing configuration gate is
  unchanged; no production checkout transaction was performed for the redesign.
