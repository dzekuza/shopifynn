---
phase: 04-visual-polish-and-brand-content
plan: 01
subsystem: ui
tags: [css, gsap, animations, testimonials, hero, features, visual-polish]

# Dependency graph
requires: []
provides:
  - Refined hero section CSS with luxury typography (letter-spacing, line-height, desktop padding)
  - Features cards with hover lift animation and spacious 40px/32px padding
  - Testimonials avatar 40x40 circle layout alongside author name in row flex
  - Standardized GSAP animation vocabulary across all sections
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GSAP animation standards defined as comment block above initGSAPAnimations
    - BEM-lite CSS class naming maintained throughout refinements

key-files:
  created: []
  modified:
    - assets/theme.css
    - assets/theme.js

key-decisions:
  - "Hero heading letter-spacing set to 0.04em (positive) for luxury Nordic feel, replacing -0.03em"
  - "Section heading letter-spacing standardized to 0.02em (positive) from -0.02em"
  - "Features icon reduced from 72px to 56px for better proportion with new 40px/32px card padding"
  - "FAQ animations brought in line with power3.out ease standard (was power2.out)"
  - "Stats bar y-offset raised from 20 to 30 to stay within 30-40 range standard"

patterns-established:
  - "GSAP standard: hero entry duration 0.9, stagger 0.12, ease power3.out, delay 0.3"
  - "GSAP standard: section headers duration 0.8, y 32, ease power3.out"
  - "GSAP standard: card stagger duration 0.7, y 40, stagger 0.10, ease power3.out"
  - "GSAP standard: side-slide duration 0.8, x +/-40, ease power3.out"

requirements-completed: [VIS-01, VIS-02, VIS-03, VIS-04]

# Metrics
duration: 15min
completed: 2026-02-20
---

# Phase 4 Plan 1: Visual Polish — Hero, Features, Testimonials Summary

**Luxury CSS refinements with hero typography polish, features card hover lift, testimonials avatar row layout, and unified GSAP power3.out animation timing across all sections**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-19T23:31:18Z
- **Completed:** 2026-02-20T (checkpoint at Task 3)
- **Tasks:** 2/3 (Task 3 is human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Hero heading `letter-spacing: 0.04em` and subtitle `letter-spacing: 0.12em` with `text-transform: uppercase` for luxury Nordic positioning; desktop content padding increased to `80px`
- Features cards: `padding: 40px 32px`, hover lift `translateY(-4px)` with `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`, icon container unified at `56px`, heading weight `600`
- Testimonials author fix: `flex-direction: row; align-items: center; gap: 12px` with `.testimonials__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }`
- GSAP standards comment block added; all eases unified to `power3.out`; hero stagger `0.12`; y-offsets in 30-40 range; no `!important` added

## Task Commits

Each task was committed atomically:

1. **Task 1: Refine hero, features, and testimonials CSS** - `bdef72b` (feat)
2. **Task 2: Standardize GSAP animation parameters** - `701021a` (feat)
3. **Task 3: Visual verification** — CHECKPOINT (awaiting human-verify)

## Files Created/Modified
- `assets/theme.css` - Hero typography, features card hover, testimonials avatar row fix, section heading letter-spacing
- `assets/theme.js` - GSAP standards comment + standardized parameters across all animation blocks

## Decisions Made
- Set `.section__heading` letter-spacing to `0.02em` (positive) from `-0.02em` — positive tracking matches luxury brand aesthetic better for serif/heading fonts at this size
- Reduced features icon from 72px to 56px — proportionally correct with the new `40px 32px` card padding
- FAQ animations migrated from `power2.out` to `power3.out` for consistency (FAQ had diverged from site standard)
- Stats bar y-offset normalized to 30 (was 20, which was below the 30-40 standard floor)

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CSS and JS files are ready for visual QA via `shopify theme dev`
- Task 3 checkpoint: human must run `shopify theme dev` and visually verify hero, features, testimonials sections
- After approval, plan is fully complete and ready for 04-02

---
*Phase: 04-visual-polish-and-brand-content*
*Completed: 2026-02-20 (pending Task 3 human-verify)*
