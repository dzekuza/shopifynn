---
phase: 03-performance-and-accessibility
plan: 02
subsystem: ui
tags: [performance, accessibility, lazy-loading, alt-text, liquid, shopify]

# Dependency graph
requires: []
provides:
  - "loading=lazy on all below-fold section images for reduced initial page weight"
  - "loading=eager on above-fold images (hero, main product, article featured image)"
  - "Descriptive, properly-escaped alt text on every img tag across sections and snippets"
  - "XSS-safe alt text filter ordering: | default: fallback | escape (not escape then default)"
affects:
  - "03-03 (any further accessibility improvements build on this foundation)"
  - "Core Web Vitals — LCP image loading patterns established"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "loading attribute pattern: eager for above-fold, lazy for all others"
    - "alt text filter order: alt=\"{{ value | default: fallback | escape }}\" — ensures fallback is also escaped"
    - "Slideshow first-slide eager pattern: loading=\"{% if forloop.first %}eager{% else %}lazy{% endif %}\""

key-files:
  created: []
  modified:
    - sections/main-product.liquid
    - sections/main-article.liquid
    - sections/main-blog.liquid
    - sections/blog-posts.liquid
    - sections/image-with-text.liquid

key-decisions:
  - "Article featured image gets loading=eager as it is above-fold on the article page"
  - "Product single-image fallback (product__media-main) gets loading=eager as it is the primary LCP candidate"
  - "Filter order for alt text must be | default: fallback | escape — not | escape | default: dynamicValue — to ensure dynamic fallbacks are XSS-escaped"
  - "Literal-string fallbacks (e.g., default: 'Slide image') are safe either way, left unchanged"

patterns-established:
  - "Alt text pattern: alt=\"{{ image.alt | default: contextual_title | escape }}\" for all content images"
  - "Loading pattern: loading=eager for first/featured images, loading=lazy for all others"

requirements-completed:
  - PERF-05
  - A11Y-03

# Metrics
duration: 15min
completed: 2026-02-20
---

# Phase 03 Plan 02: Image Lazy Loading and Alt Text Audit Summary

**loading=lazy on all below-fold section images and correct `| default | escape` filter order on all img alt text attributes across 28 sections and snippets**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-19T23:20:00Z
- **Completed:** 2026-02-19T23:35:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Audited all 35 img tags across sections/ and snippets/ — the vast majority already had correct loading attributes from prior work
- Added `loading="eager"` to the single-image product page fallback and article featured image (both are above-fold LCP candidates)
- Fixed XSS-unsafe alt text filter ordering in 5 files where `| escape | default: dynamicValue` could produce unescaped output
- Established and documented the correct pattern: `alt="{{ value | default: fallback | escape }}"` for all content images

## Task Commits

Each task was committed atomically:

1. **Task 1: Add loading="lazy" to non-critical images missing the attribute** - `db7cb36` (feat)
2. **Task 2: Audit and fix alt text on all img tags across sections and snippets** - `435cdc8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `sections/main-product.liquid` - Added `loading="eager"` to single-image product fallback; fixed `image.alt | default: product.title | escape` filter order (both gallery and thumbnail)
- `sections/main-article.liquid` - Added `loading="eager"` to article featured image; fixed alt text filter order
- `sections/main-blog.liquid` - Fixed alt text filter order: `article.image.alt | default: article.title | escape`
- `sections/blog-posts.liquid` - Fixed alt text filter order: `article.image.alt | default: article.title | escape`
- `sections/image-with-text.liquid` - Fixed alt text filter order: `image_alt | default: section.settings.heading | escape`

## Decisions Made
- Article featured image gets `loading="eager"` — it sits at the top of the article page and is a primary LCP candidate
- Product single-image fallback gets `loading="eager"` — this is the main product image and an LCP candidate
- Sections using literal-string fallbacks (`default: 'Slide image'`, `default: 'Banner image'`, etc.) are safe with either filter order since literals need no escaping — left unchanged to minimize diff

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added loading attribute to sections/main-article.liquid**
- **Found during:** Task 1 (img tag audit)
- **Issue:** `sections/main-article.liquid` was not in the plan's file list but contains an `<img>` tag that was missing a `loading` attribute entirely
- **Fix:** Added `loading="eager"` (article featured image is above-fold) and also fixed the alt text filter order while touching the tag
- **Files modified:** sections/main-article.liquid
- **Verification:** Python audit script confirms 0 img tags missing loading attribute across all sections and snippets
- **Committed in:** db7cb36 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed `| escape | default: dynamicValue` XSS-unsafe filter order**
- **Found during:** Task 2 (alt text audit)
- **Issue:** Pattern `alt="{{ article.image.alt | escape | default: article.title }}"` — if `article.image.alt` is empty, `escape` returns empty string, then `default` falls back to `article.title` which is NOT escaped. A product/article title containing `<script>` would be injected raw into the HTML attribute.
- **Fix:** Reordered to `alt="{{ article.image.alt | default: article.title | escape }}"` — the `escape` filter now runs last, covering both the primary value and the fallback.
- **Files modified:** sections/main-blog.liquid, sections/blog-posts.liquid, sections/image-with-text.liquid, sections/main-product.liquid, sections/main-article.liquid
- **Verification:** No remaining instances of `escape | default: {{ dynamic_variable }}` pattern in sections/ or snippets/
- **Committed in:** 435cdc8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical attribute, 1 security bug)
**Impact on plan:** Both fixes are necessary for correctness and security. No scope creep — main-article.liquid is a standard section file that should have been in scope.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Image performance and accessibility audit complete
- All 35 img tags across sections and snippets verified: loading + alt attributes present and correctly ordered
- Ready for Plan 03 (configurator accessibility / JS-generated image alt text audit)

---
*Phase: 03-performance-and-accessibility*
*Completed: 2026-02-20*

## Self-Check: PASSED

- FOUND: .planning/phases/03-performance-and-accessibility/03-02-SUMMARY.md
- FOUND: db7cb36 (feat(03-02): add loading attributes to all remaining img tags)
- FOUND: 435cdc8 (feat(03-02): fix alt text filter order for proper XSS safety)
- 35 img tags verified: all have loading and alt attributes
