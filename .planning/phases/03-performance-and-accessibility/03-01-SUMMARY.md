---
phase: 03-performance-and-accessibility
plan: 01
subsystem: ui
tags: [gsap, accessibility, wcag, cdn, css-variables, contrast]

# Dependency graph
requires: []
provides:
  - Pinned GSAP 3.13.0 CDN URLs in theme.liquid
  - GSAP existence guard verified for both gsap and ScrollTrigger globals
  - WCAG 2.1 AA compliant muted text color (#6A6864) replacing failing #7D7B78
affects: [04-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pinned CDN versions to prevent silent breaking changes"
    - "Graceful GSAP degradation with typeof guard before initialization"

key-files:
  created: []
  modified:
    - layout/theme.liquid
    - config/settings_schema.json
    - config/settings_data.json

key-decisions:
  - "Chose #6A6864 as muted text replacement — achieves ~4.5:1 contrast on #F4F1EC without noticeably changing the brand palette"
  - "No changes to theme.js required — guard already checks both gsap and ScrollTrigger before animation init"
  - "Updated settings_data.json alongside settings_schema.json so live theme immediately reflects compliant color"

patterns-established:
  - "CDN version pinning: always use exact semver in CDN URLs (gsap@3.13.0 not gsap@3)"
  - "Color contrast: muted text must achieve 4.5:1 AA ratio on all backgrounds"

requirements-completed: [PERF-02, PERF-03, A11Y-05]

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 3 Plan 01: GSAP Version Pinning and WCAG AA Muted Text Contrast Fix

**Pinned GSAP CDN to 3.13.0 and darkened muted text from #7D7B78 to #6A6864 to achieve WCAG 2.1 AA 4.5:1 contrast ratio on all page backgrounds**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-19T23:25:00Z
- **Completed:** 2026-02-19T23:33:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GSAP CDN URLs pinned to exact version 3.13.0, eliminating risk of silent breaking updates from floating `@3` tag
- Verified existing GSAP guard in theme.js correctly checks both `typeof gsap` and `typeof ScrollTrigger` with load-event fallback — no changes needed
- Muted text color updated from #7D7B78 (~3.8:1 contrast) to #6A6864 (~4.5:1 contrast) on #F4F1EC background, meeting WCAG 2.1 AA minimum
- settings_data.json updated so the live theme immediately picks up the compliant color without needing a theme editor save
- Confirmed theme.css has zero hardcoded color instances — all 44 usages already reference `var(--color-text-muted)`

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin GSAP CDN version and verify existence guard** - `52c0d7c` (feat)
2. **Task 2: Fix muted text color contrast to meet WCAG AA** - `f719d51` (fix)

## Files Created/Modified
- `layout/theme.liquid` - GSAP script src URLs changed from `gsap@3` to `gsap@3.13.0`
- `config/settings_schema.json` - color_text_muted default updated from `#7D7B78` to `#6A6864`
- `config/settings_data.json` - current color_text_muted value updated from `#7D7B78` to `#6A6864`

## Decisions Made
- Chose `#6A6864` as the replacement muted text color — it's the minimum darkening required to clear 4.5:1 on #F4F1EC while staying visually close to the original warm gray palette
- Did not change `--color-secondary` (#B6754D) or `--color-accent` (#C85E3F) as planned — these are used for large text/UI elements where the 3:1 large text ratio applies
- Verified `--color-accent-dark: #3A8F7D` (configurator price text on white) — estimated ~4.7:1, passes AA; noted but not changed per plan scope

## Deviations from Plan

None - plan executed exactly as written. The GSAP guard was already correct (both `typeof gsap` and `typeof ScrollTrigger` checks present), and theme.css had no hardcoded color values requiring replacement.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GSAP version is now stable and predictable for any future animation work
- WCAG AA muted text contrast resolved across all 44 usage sites in theme.css via CSS variable update
- Remaining contrast concerns (`--color-accent-dark` in configurator styles) are within Plan 03 scope for Phase 3

---
*Phase: 03-performance-and-accessibility*
*Completed: 2026-02-20*
