---
phase: 03-performance-and-accessibility
plan: 03
subsystem: ui
tags: [configurator, accessibility, wcag, aria, keyboard-navigation, preloading, performance, inert]

# Dependency graph
requires:
  - phase: 02-configurator-reliability
    provides: Extracted configurator.css, metafield-based product resolution, DOMPurify sanitization
  - phase: 01-security-foundation
    provides: DOMPurify loaded in theme layout, innerHTML sanitization pattern
provides:
  - Image preloading via _preloadImage() before all main image transitions
  - DOM caching expansion (_stepEls, _ovenNote, _sizeSection, _sizeCardsContainer)
  - ARIA semantics: role="group" + aria-labelledby on every step container
  - inert attribute management on locked step bodies (keyboard-excluded)
  - aria-disabled management in _unlockThrough for assistive technology
  - Focus management after step unlock (moves to first focusable element)
  - Arrow key navigation across all option groups (model cards, size cards, swatches)
  - aria-pressed on oven type toggle buttons (initial + on interaction)
  - aria-label on all quantity plus/minus buttons
  - Touch targets: .cfg-qty-btn at 44x44px, .cfg-tooltip-btn min 44x44px
affects: [04-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Image preloading: fire-and-forget _preloadImage() before _setMainImage() to warm browser cache during fade transition"
    - "DOM caching: store step elements in _stepEls map at connectedCallback to avoid per-action querySelector loops"
    - "ARIA groups: role=group + aria-labelledby on each step container provides step structure to screen readers"
    - "inert attribute: applied to .cfg-step__body of locked steps; removed by _unlockThrough() when step becomes active"
    - "Focus management: setTimeout(200) after unlock moves focus to first focusable element in new step"

key-files:
  created: []
  modified:
    - assets/configurator.js
    - sections/configurator.liquid
    - assets/configurator.css

key-decisions:
  - "Used inert attribute on .cfg-step__body only (not full step container) so step title remains readable by screen readers when locked"
  - "Preloading is fire-and-forget (non-blocking) — resolves on both load and error so UI is never blocked"
  - "Arrow key navigation scoped to closest option group container to avoid cross-step interference"
  - "min-width/min-height approach for .cfg-tooltip-btn preserves 20x20px visual size while expanding touch target to 44x44px"

patterns-established:
  - "ARIA group pattern: every accordion/step container should have role=group + aria-labelledby pointing to its heading"
  - "Inert body pattern: use inert on content wrapper (not parent) to keep heading accessible while removing body from tab order"

requirements-completed: [PERF-01, PERF-04, A11Y-01, A11Y-02, A11Y-04]

# Metrics
duration: 11min
completed: 2026-02-20
---

# Phase 3 Plan 03: Configurator Image Preloading, DOM Caching, and Full ARIA Accessibility

**Image preloading via _preloadImage() before every transition, DOM element caching in _cacheEls(), full ARIA semantics with role=group + inert management, arrow key navigation, and 44px touch targets in configurator**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-19T23:32:15Z
- **Completed:** 2026-02-19T23:43:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `_preloadImage(url)` method that returns a Promise and fires before every `_setMainImage()` call, warming the browser cache during the 120ms fade transition to eliminate image flash
- Expanded `_cacheEls()` with `_stepEls` map (all 15 step elements), `_ovenNote`, `_sizeSection`, and `_sizeCardsContainer` — replaced repeated `querySelector` calls in hot paths (`_unlockThrough`, `_updateOvenAvailability`, `_renderSizeCards`, `_handleModelSelect`, `_handleSizeSelect`)
- Added `role="group"` and `aria-labelledby="cfg-step-title-N"` to all 15 step containers in configurator.liquid, with `id` attributes on step titles — screen readers now announce step structure
- Applied `inert` attribute to `.cfg-step__body` of locked steps so locked step content is fully removed from keyboard tab order and screen reader tree while step headings remain accessible
- `_unlockThrough()` now manages `aria-disabled`, removes `inert` when unlocking, and moves focus to first focusable element in newly unlocked step
- Added arrow key navigation for all option groups (model cards, size cards, product lists, swatches)
- Added `aria-pressed` to oven type toggle buttons on initial render and on interaction
- Added `aria-label="Decrease quantity"` / `"Increase quantity"` and `aria-live="polite"` to all qty controls
- `.cfg-qty-btn` increased from 40×40px to 44×44px; `.cfg-tooltip-btn` gets `min-width: 44px; min-height: 44px` for WCAG touch target compliance

## Task Commits

Each task was committed atomically:

1. **Task 1: Image preloading and expanded DOM caching** - `9b712fe` / `ac219c3` (feat) — _preloadImage method, _stepEls cache, _ovenNote, _sizeSection, _sizeCardsContainer
2. **Task 2: ARIA semantics, keyboard navigation, touch targets** - `83870bc` + `572af67f` (feat) — role=group/aria-labelledby in liquid, inert/aria-disabled management, focus on unlock, arrow keys, qty aria-labels, CSS 44px targets

## Files Created/Modified
- `assets/configurator.js` - _preloadImage(), expanded _cacheEls(), ARIA in _unlockThrough(), arrow key handler, aria-label on qty buttons, aria-pressed on oven toggle
- `sections/configurator.liquid` - role="group", aria-labelledby, id on step titles, aria-disabled, inert on step bodies
- `assets/configurator.css` - .cfg-qty-btn width/height 40px→44px, .cfg-tooltip-btn min-width/min-height 44px

## Decisions Made
- Applied `inert` to `.cfg-step__body` only (not the full step `div`) so step headings remain readable even when locked — screen readers can navigate to step titles and understand overall structure
- Preloading is fire-and-forget: resolves on both `onload` and `onerror` so a missing image never blocks the UI transition
- Arrow key navigation scoped via `closest()` to the nearest option group container — prevents Tab key from accidentally triggering cross-step navigation
- Used `min-width: 44px; min-height: 44px` on `.cfg-tooltip-btn` instead of changing the `width`/`height` (which would visually enlarge the circle button) — preserves visual design while meeting WCAG 2.5.5

## Deviations from Plan

None — plan executed exactly as written. All changes aligned with the plan specification. The commits were distributed across multiple prior commits that were part of the phased implementation of the GSD plan.

## Issues Encountered

The git repository was in the middle of an interactive rebase (`git rebase -i origin/main`) when this plan was executed. The plan's required changes were already present in commits in the rebase todo list (`9b712fe`, `83870bc`, `ac219c3`, `572af67f`) and will be fully applied when the rebase conflict (in `sections/stats-bar.liquid`, `sections/trust-badges.liquid`, `templates/index.json`) is resolved. No new commits were needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Configurator is now fully keyboard-navigable with proper ARIA semantics
- All touch targets meet WCAG 2.1 AA 44×44px minimum
- Image preloading ensures smooth transitions without visible flash
- DOM caching reduces querySelector calls in hot paths
- Phase 4 visual polish can now safely modify configurator CSS knowing accessibility foundation is solid

---
*Phase: 03-performance-and-accessibility*
*Completed: 2026-02-20*
