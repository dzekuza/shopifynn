---
phase: 07-price-unification-locale-formatting
verified: 2026-02-20T12:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 7: Price Unification & Locale Formatting Verification Report

**Phase Goal:** A single _calculateLineItems() function drives both display price and cart payload, and currency formatting respects the shop locale
**Verified:** 2026-02-20T12:00:00Z
**Status:** passed
**Re-verification:** Yes — regression check against previous passed verification

---

## Re-Verification Summary

A previous VERIFICATION.md existed with `status: passed` (score 5/5, no gaps). `assets/configurator.js` does NOT appear in `git status` (not modified since last commit — confirmed via `git diff HEAD -- assets/configurator.js` returning empty). All five truths were re-checked against the actual file. No regressions found.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | money() formats currency using window.__shopLocale / window.__shopCurrency — not hardcoded de-DE/EUR | VERIFIED | `configurator.js:14-19` — `const locale = window.__shopLocale \|\| 'de-DE'` and `const currency = window.__shopCurrency \|\| 'EUR'` passed into `new Intl.NumberFormat(locale, { style: 'currency', currency: currency, ... })`. No hardcoded EUR symbol or fixed locale in the function body. |
| 2 | Selecting a product multiple times in the same step does not accumulate duplicate event listeners | VERIFIED | `configurator.js:521,609` — only two `this.addEventListener` calls exist in _bindEvents() (click delegation root + keydown nav). Zero per-element listeners in _showVariants(), _updateGallery(), or _updateSummary(). Confirmed by full `addEventListener` audit below. |
| 3 | Gallery thumbnail clicks after model switch show the correct model's images | VERIFIED | `configurator.js:1713` — `this._galleryImages = images` stored at top of _updateGallery(); `configurator.js:581-591` — case 'select-thumb' reads `this._galleryImages?.[idx]`; thumb divs carry `data-action="select-thumb"` at line 1715. |
| 4 | Re-visiting a configurator step and re-selecting an option fires the selection handler exactly once | VERIFIED | All variant swatches render with `data-action="select-variant"` (lines 447, 453 from prior audit); `case 'select-variant'` at line 566 in delegated switch reads `target.dataset.action`. _showVariants() contains zero addEventListener calls. |
| 5 | The displayed configuration total and the cart line item total match exactly for any combination of model, size, and add-ons | VERIFIED | `configurator.js:1144-1146` — _updatePrice() calls `this._calculateLineItems()` and reduces to total; `configurator.js:1610-1620` — _buildCartItems() calls `this._calculateLineItems().filter(...).map(...)`. Single source of truth at lines 957-1141 covers all 13 purchasable categories (Base, Liner, Insulation, Glass door, Chimney, Exterior, Hydro, Air, Filter, LED, Thermometer, Stairs, Pillows, Cover, Heater connection 90). |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/configurator.js` | Locale-aware money(), _calculateLineItems() source of truth, fully delegated event handling | VERIFIED | 1760 lines; all three concerns present, substantive, and wired |

**Level 1 — Exists:** File present at `assets/configurator.js` (1760 lines). Not modified since last commit.

**Level 2 — Substantive:** Contains `Intl.NumberFormat` (line 17), `_calculateLineItems()` definition (line 957, implementation lines 957-1142 spanning all purchasable categories), delegation switch with `case 'select-variant'` (line 566), `case 'select-thumb'` (line 581), `case 'edit-summary-step'` (line 593), `case 'add-to-cart'` (line 563).

**Level 3 — Wired:** `_updatePrice()` calls `this._calculateLineItems()` at line 1145; `_buildCartItems()` calls `this._calculateLineItems()` at line 1612; both consume the result (reduce for total, filter+map for cart). No orphaned methods.

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| money() | window.__shopLocale, window.__shopCurrency | Intl.NumberFormat constructor | WIRED | `configurator.js:15-16` — `const locale = window.__shopLocale \|\| 'de-DE'` and `const currency = window.__shopCurrency \|\| 'EUR'` passed directly into `new Intl.NumberFormat(locale, ...)` |
| window.__shopLocale, window.__shopCurrency | theme.liquid | Liquid globals injection | WIRED | `layout/theme.liquid:71-72` — `window.__shopCurrency = {{ shop.currency \| json }};` and `window.__shopLocale = {{ request.locale.iso_code \| json }};` injected before closing body tag |
| _bindEvents() switch | select-variant, select-thumb, edit-summary-step, add-to-cart | data-action delegation cases | WIRED | All four cases exist at lines 563, 566, 581, 593; switch reads `target.dataset.action` at delegation handler (line 521) |
| _updatePrice() | _calculateLineItems() | shared line items computation | WIRED | Line 1145: `const items = this._calculateLineItems()` then `items.reduce(...)` |
| _buildCartItems() | _calculateLineItems() | shared line items computation | WIRED | Line 1612: `return this._calculateLineItems().filter(...).map(...)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONF-04 | 07-01-PLAN.md | Consolidate two price calculation paths into single _calculateLineItems() function used by both display and cart | SATISFIED | `_calculateLineItems()` defined at line 957; called by _updatePrice() (line 1145) and _buildCartItems() (line 1612); neither method independently walks state. **Traceability note:** REQUIREMENTS.md traceability table maps CONF-04 to "Phase 6 / Complete". The 07-01-PLAN.md frontmatter also claims CONF-04. The code commit implementing `_calculateLineItems()` was made during Phase 07-01 execution (Phase 06-02 explicitly stated "0 code changes, pre-implemented"). The requirement is satisfied in the codebase; the traceability entry is a documentation artefact, not a correctness gap. |
| CONF-07 | 07-01-PLAN.md | Replace per-element event listeners with event delegation on parent containers | SATISFIED | Exactly 4 `addEventListener` calls remain in configurator.js (lines 521, 609, 1684, 1756) — the two _bindEvents delegation calls (click + keydown), one toast `{ once: true }` self-cleaning listener, and one DOMContentLoaded init. Zero per-element listeners in _showVariants(), _updateGallery(), _updateSummary(). |
| CONF-08 | 07-01-PLAN.md | Fix locale-aware currency formatting using window.Shopify.locale instead of hardcoded de-DE | SATISFIED | money() uses `Intl.NumberFormat(window.__shopLocale \|\| 'de-DE', { style: 'currency', currency: window.__shopCurrency \|\| 'EUR' })`. window.__shopLocale and window.__shopCurrency injected in theme.liquid lines 71-72 via `{{ request.locale.iso_code \| json }}` and `{{ shop.currency \| json }}`. **Note:** REQUIREMENTS.md description says "window.Shopify.locale" but the implementation uses `window.__shopLocale` — the custom global injected in theme.liquid. This is correct; `window.Shopify.locale` is a Shopify storefront global not reliably available in theme context, while `window.__shopLocale` is explicitly injected. The requirement intent (locale-aware formatting) is fully satisfied. |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps CONF-07 and CONF-08 to Phase 7. No additional requirement IDs are mapped to Phase 7. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/configurator.js` | 55, 108 | `_renderEditorPlaceholder()` | Info | Shopify Theme Editor preview stub — expected product behavior, not a code stub |
| `assets/configurator.js` | 133, 1397-1410, 1700 | `this.placeholder` / placeholder div | Info | UI image fallback when no product image available — legitimate runtime state, not a code stub |

No blocker or warning-level anti-patterns found. No `TODO`, `FIXME`, `XXX`, or `HACK` comments exist in the file.

---

### Human Verification Required

The following behaviours are logically guaranteed by the code structure but require a browser with a live Shopify storefront to confirm end-to-end:

#### 1. Locale Formatting Output

**Test:** Load the configurator on a store with a non-EUR/non-de-DE locale (e.g., en-GB / GBP). Step through the configurator and observe price display.
**Expected:** Price renders as "£1,234.00" (or locale-correct format), not "1.234,00 €".
**Why human:** window.__shopLocale and window.__shopCurrency values come from the live Shopify storefront context; cannot be verified with grep alone.

#### 2. No Duplicate Handler Firings on Re-selection

**Test:** Open configurator, select a liner colour, then select a different liner colour, then select the original colour. Observe the price update — it should fire once per click.
**Expected:** Price updates exactly once per click; no double-counting or ghost values.
**Why human:** Event delegation correctness under repeated re-renders requires runtime observation.

#### 3. Gallery Thumbnail Accuracy After Model Switch

**Test:** Select Model A (e.g., Classic XL), cycle through gallery thumbnails. Switch to Model B (Premium L), cycle through gallery thumbnails.
**Expected:** Thumbnails after model switch exclusively show Model B images; no Model A images bleed through.
**Why human:** this._galleryImages is updated on every _updateGallery() call but the delegated handler reading the correct snapshot requires runtime DOM interaction to confirm.

---

### Gaps Summary

No gaps. All five observable truths verified, all key links wired, all three requirement IDs (CONF-04, CONF-07, CONF-08) satisfied by the code. No regressions from previous verification. Phase goal is achieved.

---

## Verification Detail

### addEventListener audit (complete list in configurator.js)

```
configurator.js:521   this.addEventListener('click', ...)            — _bindEvents() click delegation root
configurator.js:609   this.addEventListener('keydown', ...)          — _bindEvents() keyboard nav
configurator.js:1684  toast.addEventListener('transitionend', ..., { once: true })  — self-cleaning toast removal
configurator.js:1756  document.addEventListener('DOMContentLoaded', init)           — module init
```

Exactly 4 calls. No per-element listeners in dynamic render methods. Matches expected state.

### _calculateLineItems() coverage (purchasable categories, lines 957-1141)

1. Base product (model + size + oven type resolved variant)
2. Liner (with variant selection)
3. Insulation
4. Glass door (oven add-on)
5. Chimney (oven add-on)
6. Exterior (with variant selection)
7. Hydro massage
8. Air system
9. Filter
10. LED lighting (with quantity)
11. Thermometer
12. Stairs
13. Pillows (with quantity)
14. Cover (with variant selection)
15. Heater connection 90-degree

Step 14 (Controls/installation diagram) has no purchasable variant and is correctly excluded.

### _updatePrice() call sites

9 active call sites at lines 665, 686, 731, 751, 783, 800, 823, 831, 843 — all fire on immediate option selection, satisfying the live price update requirement.

### CONF-04 traceability discrepancy

REQUIREMENTS.md traceability table shows `CONF-04 | Phase 6 | Complete`. The 07-01-PLAN.md frontmatter also declares `CONF-04`. This is a documentation conflict, not a code defect. The `_calculateLineItems()` implementation exists at `configurator.js:957` and is fully functional. The requirement is satisfied regardless of which phase "owns" it in the table.

---

_Verified: 2026-02-20T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
