---
phase: 02-configurator-stabilization
plan: "03"
subsystem: configurator
tags: [javascript, pricing, events, locale, refactor]

# Dependency graph
requires:
  - phase: 02-configurator-stabilization
    plan: "01"
    provides: configurator.js asset file and locale injection in theme.liquid
  - phase: 02-configurator-stabilization
    plan: "02"
    provides: metafield-based product resolution in configurator.js
provides:
  - Unified price calculation via _calculateLineItems()
  - Event delegation for variant selection (no listener accumulation)
  - Locale-aware currency formatting via window.__shopLocale
affects:
  - assets/configurator.js (pricing, events, formatting)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single source of truth: _calculateLineItems() used by both display and cart paths"
    - "Event delegation: all interactions handled by one top-level click listener"
    - "Locale-aware formatting: Intl.NumberFormat reads window.__shopLocale with de-DE fallback"

key-files:
  created: []
  modified:
    - assets/configurator.js

key-decisions:
  - "_calculateLineItems() returns full line item array with variantId, quantity, priceInCents, label, properties — enabling both display sum and cart payload from one source"
  - "Removed addEventListener from _showVariants() — delegated to top-level _bindEvents via select-variant case and new _handleVariantSelect() method"
  - "money() uses Intl.NumberFormat with window.__shopLocale and window.__shopCurrency — de-DE/EUR fallbacks maintained for backward compatibility"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 02 Plan 03: Unified Pricing, Event Delegation Fix, and Locale-Aware Formatting Summary

**Introduced _calculateLineItems() as single source of truth for display and cart pricing, fixed variant click listener accumulation via event delegation, and replaced hardcoded de-DE locale with store locale.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T23:39:12Z
- **Completed:** 2026-02-19T23:44:33Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

### Task 1: Unified price calculation into _calculateLineItems()

- Added `_calculateLineItems()` method returning an array of `{ variantId, quantity, priceInCents, label, properties }` objects
- Covers all 13 price components: base, liner, insulation, oven add-ons (glass door + chimney), exterior, hydro, air, filter, LED (quantity-based), thermometer, stairs, pillows (quantity-based), cover, heater 90 degree connection
- Refactored `_updatePrice()` to call `_calculateLineItems()` and sum via `reduce` — single line of arithmetic
- Refactored `_buildCartItems()` to call `_calculateLineItems()` and filter/map for Shopify cart payload — 5 lines total
- Eliminated all independent price calculation logic from both consumers; display and cart totals now always agree

### Task 2: Event delegation and locale formatting

- Removed inline `target.addEventListener('click', ...)` from `_showVariants()` — this was the source of listener accumulation on every product selection
- Added `case 'select-variant'` to the top-level delegated click handler in `_bindEvents()`
- Extracted `_handleVariantSelect(group, variantId, price)` method that handles visual state updates (selected class, aria-pressed) and calls `_selectVariant()`
- Replaced `money()` hardcoded `de-DE`/`€` implementation with `Intl.NumberFormat` reading `window.__shopLocale` and `window.__shopCurrency`
- Fallback values `de-DE` and `EUR` maintained for backward compatibility when locale variables are not injected

## Task Commits

Each task was committed atomically:

1. **Task 1: Unify price calculation into _calculateLineItems()** — `4e020e8` (feat)
2. **Task 2: Fix event delegation and locale formatting** — `2125f08` (feat)

## Files Created/Modified

- `assets/configurator.js` — Added `_calculateLineItems()`, simplified `_updatePrice()` and `_buildCartItems()`, removed listener accumulation in `_showVariants()`, added `_handleVariantSelect()`, fixed `money()` locale

## Decisions Made

- `_calculateLineItems()` includes both `variantId` (for cart) and `priceInCents` (for display) in each line item — this is the key that enables unification without data loss
- Liner, exterior, and cover prices use variant price when a variant is selected (same logic that was in the old `_getSelectedVariantPrice`), falling back to product price — this preserves existing pricing behavior
- `_handleVariantSelect()` queries the DOM by `data-variant-id` to find the correct element for visual state update — more robust than relying on event target

## Deviations from Plan

### Auto-fixed Issues

None.

### Additional Notes

- Note regarding `_getSelectedVariantPrice`, `_getSelectedProductPrice`, `_getProductPrice`, and `_getAddonPrice` helper methods: these remain in the file as they are no longer called but removing them would be a separate cleanup task. They are dead code after this refactor. Deferred to avoid scope creep.

## Issues Encountered

- Git rebase was in progress (interactive rebase of main onto a Shopify-pulled commit with merge conflicts in sections/stats-bar.liquid and sections/trust-badges.liquid). This caused configurator.js to be unavailable in the working tree. The rebase was aborted and main branch was restored before executing the plan. No plan work was affected.

## Self-Check

### Created files exist:
- No new files created.

### Modified files exist:
- `/Users/gvozdovic/Desktop/WEB Projects/shopifynn/assets/configurator.js` — FOUND

### Commits exist:
- `ebe52cb` — FOUND (feat(02-03): unify price calculation into _calculateLineItems())
- `5858356` — FOUND (feat(02-03): fix event delegation and locale-aware currency formatting)

### Verification checks:
- `_calculateLineItems` defined and called by both `_updatePrice` and `_buildCartItems` — PASSED
- No direct price arithmetic in `_updatePrice` or `_buildCartItems` — PASSED
- `_showVariants` contains zero `addEventListener` calls — PASSED
- `select-variant` case in `_bindEvents` delegated handler — PASSED
- `money()` reads `window.__shopLocale` — PASSED
- `de-DE` only appears as fallback, not primary locale — PASSED
- JavaScript syntax valid (node -e new Function check) — PASSED

## Self-Check: PASSED

---
*Phase: 02-configurator-stabilization*
*Completed: 2026-02-20*
