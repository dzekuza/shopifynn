# Phase 7: Price Unification & Locale Formatting - Research

**Researched:** 2026-02-20
**Domain:** Vanilla JS price calculation refactoring, Intl.NumberFormat locale-aware formatting, Shopify theme locale injection, event delegation
**Confidence:** HIGH — all findings verified directly against the existing codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Price MUST update live on option selection — immediate feedback, not batched on step advance

### Claude's Discretion

- Whether to include zero-price options or only priced items — choose what fits existing code best
- Flat array vs grouped by step — choose based on what `_updatePrice` and `_buildCartItems` actually consume
- Whether base product is a line item or handled separately — match current cart payload structure
- Recompute vs diff — choose simplest approach (full recompute preferred unless performance demands otherwise)
- Caching strategy (direct call vs shared `_currentLineItems`) — optimize to prevent display/cart price mismatch
- Rounding approach — follow how Shopify variant prices work (already in cents)
- Retry recomputation — pick the approach that prevents stale cart data

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-07 | Replace per-element event listeners with event delegation on parent containers | One per-element listener survives: `_showVariants()` (line 432) attaches a new `click` listener to `target` every time a product card is selected, accumulating duplicates across re-renders. A second accumulating listener exists in `_updateGallery()` (line 1597). The main `_bindEvents()` already uses correct delegation on `this`. Fix: move variant/swatch selection handling into the top-level delegated `click` handler; move gallery thumb handling similarly. |
| CONF-08 | Fix locale-aware currency formatting using window.Shopify.locale instead of hardcoded de-DE | `money()` (line 14-17) hardcodes `'de-DE'` locale and `'€'` prefix. `window.__shopLocale` and `window.__shopCurrency` are already injected in `layout/theme.liquid` (line 65-66). `theme.js` already uses `window.__shopCurrency` correctly (lines 342, 350, 354). Fix: rewrite `money()` using `Intl.NumberFormat(window.__shopLocale || 'de-DE', { style: 'currency', currency: window.__shopCurrency || 'EUR' }).format(cents / 100)` — no hardcoded locale or currency symbol. |
</phase_requirements>

---

## Summary

Phase 7 is a focused internal refactoring with two independent but co-deliverable changes. Neither introduces new UI or new dependencies. Both are self-contained surgical edits to `assets/configurator.js`.

**CONF-07 (event delegation):** The main `_bindEvents()` method already correctly delegates all click events via `this.addEventListener('click', ...)` with `closest('[data-action]')`. Two violations remain: (1) `_showVariants()` appends a new `click` listener to `target` (the variant area container) each time a product is selected — accumulating duplicates. (2) `_updateGallery()` appends a new `click` listener to `this.gallery` every time the gallery is rebuilt. The fix for both is to route their actions through the existing top-level delegated handler by adding `select-variant` and `select-thumb` action cases there, and removing the per-call `addEventListener` calls.

**CONF-08 (locale formatting):** `money()` hardcodes `'de-DE'` and `'€'`. The infrastructure to fix this already exists — `window.__shopLocale` and `window.__shopCurrency` are both injected in `layout/theme.liquid`. `theme.js` already uses `window.__shopCurrency` correctly. The fix is a one-function rewrite of `money()` using `Intl.NumberFormat` with those globals.

**Primary recommendation:** Implement CONF-08 first (1 function change, 0 risk), then CONF-07 (remove 2 per-element listeners, extend the top-level switch). Both changes together in one commit.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Intl.NumberFormat` | Browser native (ES2015+) | Locale-aware currency formatting | No dependency; already used in `theme.js`; handles all locale/currency combos correctly |
| `Element.closest()` | Browser native | Delegated event target resolution | Already used throughout `_bindEvents()`; standard pattern for delegation |

### Supporting

None required. This phase adds no libraries.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Intl.NumberFormat` | `toLocaleString()` with locale arg | `Intl.NumberFormat` is faster when formatting multiple values (reusable formatter object); `toLocaleString()` creates a new formatter each call — for a configurator formatting 15+ values per selection, `Intl.NumberFormat` is cleaner |
| Full `Intl.NumberFormat` with `style: 'currency'` | Manual prefix + `toLocaleString()` (current de-DE approach) | The current approach hardcodes both locale and symbol — `Intl.NumberFormat` handles both correctly for any locale/currency pair |

---

## Architecture Patterns

### Current State (what exists in configurator.js)

```
configurator.js IIFE
├── /* ══ 1. CONFIG & CONSTANTS ══ */
│   ├── money(cents)              ← hardcodes 'de-DE' + '€'  [CONF-08 target]
│   └── STEPS[]
├── /* ══ 6. PRICE CALCULATION ══ */
│   ├── _updatePrice()            ← computes total, updates display, sets this._currentTotal
│   ├── _getSelectedVariantPrice()
│   ├── _getSelectedProductPrice()
│   ├── _getProductPrice()
│   ├── _getAddonPrice()
│   └── _updateSummary()          ← consumes this._currentTotal from _updatePrice()
├── /* ══ 7. CART ══ */
│   ├── _handleAddToCart()        ← calls _buildCartItems()
│   └── _buildCartItems()         ← independent duplicate of _updatePrice() logic
└── _bindEvents()                 ← delegated on 'this', but two per-call listeners escape:
    ├── _showVariants() line 432  ← per-call listener on target  [CONF-07 target]
    └── _updateGallery() line 1597 ← per-call listener on this.gallery  [CONF-07 target]
```

### Target State After Phase 7

```
configurator.js IIFE
├── /* ══ 1. CONFIG & CONSTANTS ══ */
│   ├── money(cents)              ← uses Intl.NumberFormat(window.__shopLocale, {currency: window.__shopCurrency})
│   └── STEPS[]
├── /* ══ 6. PRICE CALCULATION ══ */
│   └── (unchanged — _updatePrice() already calls money() correctly)
└── _bindEvents() switch cases += 'select-variant' and 'select-thumb'
    ├── _showVariants()           ← no more addEventListener; only sets innerHTML
    └── _updateGallery()          ← no more addEventListener; only sets innerHTML
```

### Pattern 1: Correct Event Delegation (already in codebase)

**What:** Single listener on custom element root (`this`), dispatches via `closest('[data-action]')` switch
**When to use:** For any interactable child element rendered dynamically (innerHTML)
**Example from existing `_bindEvents()` (lines 498-550):**

```javascript
// Already correct — extend this, don't add per-element listeners
this.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) {
    if (!e.target.closest('.cfg-tooltip-btn')) this._closeTooltips();
    return;
  }
  const action = target.dataset.action;
  switch (action) {
    case 'select-model': ...
    case 'select-size': ...
    // ADD: case 'select-variant': ...
    // ADD: case 'select-thumb': ...
  }
});
```

### Pattern 2: Rewriting money() with Intl.NumberFormat

**What:** Replace hardcoded locale/currency with globals from `window.__shopLocale` / `window.__shopCurrency`
**Infrastructure already in place:** `layout/theme.liquid` lines 65-66:

```liquid
<script>window.__shopCurrency = {{ shop.currency | json }};
window.__shopLocale = {{ request.locale.iso_code | json }};</script>
```

**Rewrite:**

```javascript
// BEFORE (line 14-17):
function money(cents) {
  const val = (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '€' + val;
}

// AFTER:
function money(cents) {
  const locale = window.__shopLocale || 'de-DE';
  const currency = window.__shopCurrency || 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
```

### Pattern 3: Removing Per-Element Listeners from _showVariants()

**Problem:** `_showVariants()` (line 432) attaches `target.addEventListener('click', ...)` every time a user selects a product. Since `_showVariants()` is called on product selection, the same container accumulates a new listener per selection. Each listener fires for every subsequent click.

**Fix:** Remove the `addEventListener` block from `_showVariants()`. The variant selection visual state update (remove/add `cfg-swatch--selected` / `cfg-pill--selected` classes, `aria-pressed`) and `_selectVariant()` call move into the top-level switch under `case 'select-variant':`.

**The variant area already has data-action on every child:** Each swatch and pill already has `data-action="select-variant"` `data-group`, `data-variant-id`, and `data-price` attributes — they are ready for delegation.

```javascript
// IN _bindEvents() switch, add:
case 'select-variant': {
  const group = target.dataset.group;
  const area = this.querySelector(`[data-variant-area="${group}"]`);
  if (area) {
    area.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => {
      s.classList.remove('cfg-swatch--selected', 'cfg-pill--selected');
      s.setAttribute('aria-pressed', 'false');
    });
  }
  target.classList.add(target.classList.contains('cfg-swatch') ? 'cfg-swatch--selected' : 'cfg-pill--selected');
  target.setAttribute('aria-pressed', 'true');
  this._selectVariant(group, parseInt(target.dataset.variantId), parseInt(target.dataset.price));
  break;
}
```

NOTE: The existing per-element listener in `_showVariants()` used `target` as the scope for querySelectorAll. After moving to delegation, the equivalent scope is `this.querySelector('[data-variant-area="${group}"]')` — the same element `target` was.

### Pattern 4: Removing Per-Element Listener from _updateGallery()

**Problem:** `_updateGallery()` (line 1597) attaches `this.gallery.addEventListener('click', ...)` each time gallery images change. Every model switch regenerates the gallery and adds a new listener. Each listener captures `images` in a closure so they behave correctly, but they accumulate.

**Fix:** Add a `data-action="select-thumb"` attribute to each thumb `div` in the gallery HTML. Handle it in the top-level delegated switch.

```javascript
// In _updateGallery(), add data-action to each thumb:
this.gallery.innerHTML = images.map((img, i) => `
  <div class="cfg-thumb ${i === 0 ? 'cfg-thumb--active' : ''}"
       data-action="select-thumb" data-thumb-idx="${i}"
       tabindex="0" role="button" aria-label="View image ${i + 1}">
    <img src="${img.thumb || img.src}" alt="${img.alt || 'Hot tub view'}" loading="lazy">
  </div>
`).join('');
// Remove: this.gallery.addEventListener(...)
```

```javascript
// IN _bindEvents() switch, add:
case 'select-thumb': {
  const idx = parseInt(target.dataset.thumbIdx);
  // images array needed here — store as this._galleryImages when _updateGallery() runs
  this.gallery.querySelectorAll('.cfg-thumb').forEach((t, i) => t.classList.toggle('cfg-thumb--active', i === idx));
  if (this._galleryImages?.[idx]) {
    this._preloadImage(this._galleryImages[idx].src);
    this._setMainImage(this._galleryImages[idx].src);
  }
  break;
}
```

This requires storing `this._galleryImages = images` at the start of `_updateGallery()` so the delegated handler has access to the images array. This is the only piece of new instance state needed.

### Anti-Patterns to Avoid

- **Adding addEventListener inside rendering methods:** Any method that generates innerHTML and then adds a listener to that container is an accumulating listener. All dynamic interaction must route through `_bindEvents()`.
- **Creating a new `Intl.NumberFormat` per call in a tight loop:** For this codebase, `money()` is called at most ~15 times per `_updatePrice()` call — instantiation cost is negligible. No need to cache the formatter as a constant.
- **Using `window.Shopify.locale` instead of `window.__shopLocale`:** The CONF-08 requirement text mentions `window.Shopify.locale`, but the actual codebase standard (already established in Phase 2 and in `theme.liquid`) is `window.__shopLocale`. Do not introduce `window.Shopify.locale` — it would be a new dependency on Shopify's global object injection which is not guaranteed in all contexts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale-aware currency formatting | Custom currency symbol lookup table | `Intl.NumberFormat` with `style: 'currency'` | Handles 100+ locale/currency combinations including symbol placement (prefix vs suffix), grouping separators, and decimal markers |
| Event delegation | Per-element listeners on dynamically rendered children | Existing `this.addEventListener` pattern | Already correct — extend the switch, never add new per-element listeners |

**Key insight:** `Intl.NumberFormat` with `style: 'currency'` automatically handles symbol placement (€100 vs 100€ vs $100) and grouping separators for every locale — hand-rolling this would require a lookup table with 100+ entries and would still get edge cases wrong.

---

## Common Pitfalls

### Pitfall 1: Accumulating Event Listeners on Re-Render

**What goes wrong:** `_showVariants()` is called every time a user clicks a product card. Each call adds a new `click` listener to the same container element. After selecting 5 products in a category, the container has 5 listeners. On the 6th click, 5 handlers fire — 5 calls to `_selectVariant()`, 5 calls to `_updatePrice()`. The last call wins for state, but all side effects run (5 DOM updates, potentially 5 animation frames).

**Why it happens:** Rendering methods that also wire interaction are a common pattern when building incrementally, but break down when the render method is called more than once.

**How to avoid:** Never call `addEventListener` inside a method that is called on user interaction. Only `_bindEvents()` (called once during `connectedCallback`) may wire events.

**Warning signs:** Selecting a product multiple times causes price to "flash" or DOM updates to visibly re-run.

### Pitfall 2: Gallery Images Closure Capture After Refactor

**What goes wrong:** The current `_updateGallery()` captures `images` in the event listener closure — each gallery rebuild creates a new closure with the current images. After moving to delegation, the handler in `_bindEvents()` no longer has closure access to `images`.

**Why it happens:** Delegation handlers are registered once; they cannot capture per-render closure variables.

**How to avoid:** Store `this._galleryImages = images` at the top of `_updateGallery()`. The delegated handler reads `this._galleryImages[idx]`.

**Warning signs:** Gallery clicks after a model switch show images from the previous model.

### Pitfall 3: Locale Injection Timing

**What goes wrong:** `money()` is called during `connectedCallback` (e.g., rendering step prices during init). If `window.__shopLocale` or `window.__shopCurrency` are read before the inline `<script>` in `theme.liquid` runs, `money()` sees `undefined` and `Intl.NumberFormat` throws.

**Why it happens:** Custom element `connectedCallback` runs when the element connects to the DOM. In Shopify themes, the layout renders top-to-bottom: `<head>` scripts, then body content, then footer scripts. The `window.__shopLocale` injection is in the footer area of `theme.liquid` (line 65-66 — after `{% section 'footer' %}`).

**Research finding:** Reading the actual `theme.liquid` structure:

```liquid
{% section 'footer' %}
<script>window.__shopCurrency = {{ shop.currency | json }};
window.__shopLocale = {{ request.locale.iso_code | json }};</script>
```

`configurator.js` loads via `<script defer>` — deferred scripts execute after the HTML is fully parsed, which means after the inline script at the bottom of `<body>`. This ordering is safe.

**How to avoid:** Keep the `|| 'de-DE'` and `|| 'EUR'` fallbacks in `money()`. They protect against edge cases (Shopify Theme Editor preview, `shopify theme dev` previews) where script order may vary.

**Warning signs:** `Intl.NumberFormat` throws `RangeError: Invalid currency code` — means `window.__shopCurrency` was `undefined` at call time.

### Pitfall 4: CONF-07 Doesn't Require _calculateLineItems()

**What goes wrong:** The phase description mentions `_calculateLineItems()` in the goal statement, but CONF-07's actual requirement is "Replace per-element event listeners with event delegation." These are two different things. The REQUIREMENTS.md CONF-04 (consolidate price paths into `_calculateLineItems()`) was assigned to Phase 6, not Phase 7.

**Why it happens:** The phase context document's "Phase Boundary" section combines both requirements' descriptions into one narrative. The actual requirement IDs for Phase 7 are CONF-07 and CONF-08 only.

**Clarification from REQUIREMENTS.md traceability table:**
- CONF-04 → Phase 6 (Pending) — this is `_calculateLineItems()` unification
- CONF-07 → Phase 7 (Pending) — this is event delegation
- CONF-08 → Phase 7 (Pending) — this is locale formatting

**How to avoid:** Implement exactly CONF-07 and CONF-08. Do not implement CONF-04 (`_calculateLineItems()`) in this phase — it belongs to Phase 6 and is a precondition for Phase 7 per the dependency chain.

**IMPORTANT NOTE:** The STATE.md accumulated context includes: `_calculateLineItems() returns full line item array enabling display and cart from one source` — this suggests Phase 2 may have partially implemented this. The current `configurator.js` does NOT have a `_calculateLineItems()` method. `_updatePrice()` and `_buildCartItems()` remain independent. If Phase 6 ran before Phase 7, this will be resolved; if not, Phase 7 must treat `_calculateLineItems()` as out of scope and work with the existing `_updatePrice()` / `_buildCartItems()` split.

---

## Code Examples

Verified patterns from codebase inspection:

### Rewritten money() function

```javascript
// Source: Verified against layout/theme.liquid lines 65-66 + configurator.js line 14-17
function money(cents) {
  const locale = window.__shopLocale || 'de-DE';
  const currency = window.__shopCurrency || 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
```

### select-variant case in _bindEvents()

```javascript
// Source: Based on existing _showVariants() listener at line 432-442
// Replace with delegation:
case 'select-variant': {
  const group = target.dataset.group;
  // Find the parent container for this group to scope the class removal
  const variantArea = target.closest('[data-variant-area]') ||
                      this.querySelector(`[data-variant-area="${group}"]`);
  if (variantArea) {
    variantArea.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => {
      s.classList.remove('cfg-swatch--selected', 'cfg-pill--selected');
      s.setAttribute('aria-pressed', 'false');
    });
  }
  const selectedClass = target.classList.contains('cfg-swatch') ? 'cfg-swatch--selected' : 'cfg-pill--selected';
  target.classList.add(selectedClass);
  target.setAttribute('aria-pressed', 'true');
  this._selectVariant(group, parseInt(target.dataset.variantId), parseInt(target.dataset.price));
  break;
}
```

NOTE: The variant area container needs a `data-variant-area="${group}"` attribute in the rendered HTML. Check what wrapper element `_showVariants()` currently uses as `target` to ensure attribute is added there.

### select-thumb case in _bindEvents()

```javascript
// Source: Based on _updateGallery() listener at line 1597-1604
case 'select-thumb': {
  const idx = parseInt(target.dataset.thumbIdx);
  this.gallery.querySelectorAll('.cfg-thumb').forEach((t, i) =>
    t.classList.toggle('cfg-thumb--active', i === idx)
  );
  const img = this._galleryImages?.[idx];
  if (img) {
    this._preloadImage(img.src);
    this._setMainImage(img.src);
  }
  break;
}
```

### _updateGallery() modifications

```javascript
// Add at start of _updateGallery():
this._galleryImages = images;  // Cache for delegated handler

// Add data-action to each thumb in the innerHTML template:
<div class="cfg-thumb ${i === 0 ? 'cfg-thumb--active' : ''}"
     data-action="select-thumb" data-thumb-idx="${i}"
     tabindex="0" role="button" aria-label="View image ${i + 1}">

// Remove entirely:
// this.gallery.addEventListener('click', (e) => { ... });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `'de-DE'` locale + `'€'` prefix | `Intl.NumberFormat` with `window.__shopLocale` + `window.__shopCurrency` | Phase 7 | Correctly formats for all Shopify shop locales/currencies |
| Per-element listeners in render methods | All interaction through top-level delegated handler | Phase 7 | Eliminates listener accumulation bugs on repeated renders |

**Deprecated/outdated:**
- `money()` with hardcoded locale: replace entirely — no migration shim needed, same function signature

---

## Open Questions

1. **Does data-variant-area attribute exist on the container?**
   - What we know: `_showVariants()` receives `target` as the area element, and appends a listener to it. The `select-variant` items inside use `data-action="select-variant"` with `data-group`, `data-variant-id`, `data-price`.
   - What's unclear: The container element itself — is it `[data-variant-area]` or does it have a different attribute? Need to check the Liquid template or the `_showVariants()` querySelector for how `target` is found.
   - Recommendation: Read the `_showVariants()` call sites in `_renderStep()` to find the exact selector used to locate `target`, and add `data-variant-area="${group}"` to that element.

2. **Phase 6 completion status**
   - What we know: Phase 7 "Depends on: Phase 6" per the phase description. Phase 6 is meant to implement `_calculateLineItems()` (CONF-04). The current codebase does not have this function.
   - What's unclear: Whether Phase 6 was completed before Phase 7 research was commissioned.
   - Recommendation: Phase 7 planning should be scoped to CONF-07 + CONF-08 only. If Phase 6 ran and added `_calculateLineItems()`, then CONF-07 event delegation is unchanged. If Phase 6 did NOT run yet, proceed with CONF-07 + CONF-08 against current `_updatePrice()` / `_buildCartItems()` — do not implement CONF-04 here.

3. **stickyCta listener (line 577)**
   - What we know: `this.ctaBtn?.addEventListener('click', () => this._handleAddToCart())` is at line 577 — a per-element listener on a cached DOM element, set once during `_bindEvents()`.
   - What's unclear: Is this considered a violation of CONF-07? `stickyCta` (`[data-action="sticky-add-to-cart"]`) is already handled in the delegated switch (line 539-541). `ctaBtn` is also delegated — but the direct listener exists too.
   - Recommendation: Remove the direct `ctaBtn` listener (line 577) since `sticky-add-to-cart` already routes through delegation. The main CTA button should also get `data-action="add-to-cart"` and be handled in the switch. This is a minor cleanup opportunity, not a critical bug.

---

## Sources

### Primary (HIGH confidence)
- `assets/configurator.js` — direct read, lines 14-17 (money), 432-442 (_showVariants listener), 497-578 (_bindEvents), 901-965 (_updatePrice), 1418-1508 (_buildCartItems), 1587-1605 (_updateGallery)
- `layout/theme.liquid` — direct read, lines 65-66 (window.__shopLocale + window.__shopCurrency injection)
- `assets/theme.js` — direct read, lines 342, 350, 354 (existing Intl.NumberFormat usage with window.__shopCurrency)
- `.planning/REQUIREMENTS.md` — CONF-07, CONF-08 definitions and phase traceability table
- `.planning/phases/02-configurator-stabilization/02-RESEARCH.md` — CONF-07 analysis (lines 51-52), original research on these same requirements

### Secondary (MEDIUM confidence)
- MDN `Intl.NumberFormat` — browser native API, well-documented, stable since ES2015
- MDN `Element.closest()` — browser native, used throughout existing codebase

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- CONF-07 scope: HIGH — violations directly verified by reading lines 432 and 1597 of configurator.js
- CONF-08 scope: HIGH — money() at line 14-17 directly observed; __shopLocale injection at theme.liquid line 65-66 directly observed
- money() rewrite pattern: HIGH — Intl.NumberFormat is native browser API; fallback values match existing theme defaults
- Gallery images closure issue: HIGH — identified from code structure; _galleryImages solution is standard pattern
- Phase 6 dependency: MEDIUM — current codebase does not have _calculateLineItems(); Phase 6 status unknown

**Research date:** 2026-02-20
**Valid until:** Stable — no external dependencies; valid until configurator.js structure changes
