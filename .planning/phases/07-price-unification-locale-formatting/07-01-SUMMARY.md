---
phase: 07-price-unification-locale-formatting
plan: 01
subsystem: ui
tags: [configurator, javascript, intl, currency, events, delegation]

# Dependency graph
requires:
  - phase: 02-configurator-stabilization
    provides: configurator.js with _updatePrice, _buildCartItems, _showVariants, _updateGallery, _updateSummary
provides:
  - Locale-aware money() using Intl.NumberFormat with window.__shopLocale/window.__shopCurrency
  - _calculateLineItems() as single source of truth for price and cart computation
  - Fully delegated event handling via _bindEvents() — zero per-element listeners accumulate
affects: any future configurator work touching pricing, cart, event handling

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intl.NumberFormat for locale-correct currency formatting (no hardcoded locale or symbol)"
    - "Single source of truth: _calculateLineItems() drives both display and cart"
    - "Event delegation: all dynamic child interactions route through _bindEvents() switch"
    - "this._galleryImages stored on instance for delegated gallery thumbnail access"

key-files:
  created: []
  modified:
    - assets/configurator.js
    - sections/configurator.liquid

key-decisions:
  - "money() uses Intl.NumberFormat with window.__shopLocale/window.__shopCurrency — de-DE/EUR fallbacks for backward compatibility"
  - "Do not cache Intl.NumberFormat formatter — instantiation cost negligible for ~15 calls per update cycle"
  - "_calculateLineItems() returns full line item array with variantId, quantity, price, properties, label"
  - "Configuration summary string attached only to first cart item in _buildCartItems() as post-processing — not in _calculateLineItems()"
  - "CTA button given data-action=add-to-cart attribute in configurator.liquid to enable delegation"
  - "edit-summary-step case uses data-action on DOM-built edit buttons (dataset.action assignment)"

patterns-established:
  - "Delegation pattern: NEVER add addEventListener inside methods called on user interaction — only _bindEvents() (called once) may wire events"
  - "Per-element listeners that accumulate on re-renders are a critical anti-pattern for the configurator"

requirements-completed: [CONF-04, CONF-07, CONF-08]

# Metrics
duration: 9min
completed: 2026-02-20
---

# Phase 7 Plan 01: Price Unification & Locale Formatting Summary

**Locale-aware money() via Intl.NumberFormat, unified _calculateLineItems() price source of truth, and fully delegated event handling eliminating accumulating per-element listeners**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-20T01:06:02Z
- **Completed:** 2026-02-20T01:14:50Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Replaced hardcoded `de-DE` locale and `€` symbol with `Intl.NumberFormat(window.__shopLocale, { style: 'currency', currency: window.__shopCurrency })` — currency formatting now correct for all locales
- Implemented `_calculateLineItems()` as the canonical line item source: both `_updatePrice()` and `_buildCartItems()` now derive from it, guaranteeing display total and cart payload always match
- Eliminated all per-element listeners that accumulated on re-renders: variant swatches, gallery thumbnails, summary edit buttons, and CTA button now all route through `_bindEvents()` delegated switch

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite money() to use Intl.NumberFormat with shop locale/currency globals** - `a3ff91d` (feat)
2. **Task 2: Replace per-element listeners with delegation in _bindEvents()** - `0e689b5` (feat)
3. **Task 3: Implement _calculateLineItems() and wire _updatePrice() and _buildCartItems() to use it** - `48cca5a` (feat)

## Files Created/Modified
- `assets/configurator.js` - money() rewrite, _calculateLineItems() method added, _updatePrice() and _buildCartItems() consume it, per-element listeners removed, new delegation cases added to _bindEvents()
- `sections/configurator.liquid` - Added `data-action="add-to-cart"` to main CTA button to enable delegation

## Decisions Made
- `money()` instantiates `Intl.NumberFormat` per call (not cached at module level) — negligible cost for ~15 calls per update cycle; caching would miss runtime locale changes
- `_calculateLineItems()` returns `{ variantId, quantity, price, properties, label }` objects — variantId enables cart, price enables display, label for debugging
- `_buildCartItems()` filters by `item.variantId` before mapping to cart shape, ensuring items without a resolved variant never reach the cart API
- `Configuration` summary string is post-processing in `_buildCartItems()` only (attached to `i === 0`), not in `_calculateLineItems()` — keeps the shared method clean
- `data-action="edit-summary-step"` is set via `editBtn.dataset.action` assignment (DOM builder pattern) since summary card uses DOM builder not innerHTML per [02-04] XSS safety decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 07 plan 01 complete — all three CONF requirements addressed
- configurator.js now has clean event delegation architecture and unified price calculation
- No blockers for further configurator or theme work

---
*Phase: 07-price-unification-locale-formatting*
*Completed: 2026-02-20*
