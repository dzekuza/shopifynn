# Phase 6: Metafield Resolution & Event Delegation Recovery - Research

**Researched:** 2026-02-20
**Domain:** Vanilla JS Web Component refactoring — metafield-based product lookup, event delegation, Shopify theme editor compatibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `meta.size` uses exact size codes: `XL`, `L`, `M` — matching existing variant naming
- Products missing `meta.size` or `meta.oven_type` are **skipped** — not shown in the configurator
- No regex fallback — metafields are the only resolution path
- If a step has zero valid products (all skipped), show an **error state** message — don't silently auto-skip
- connectedCallback null guard shows a **branded placeholder message** — not a silent return
- Placeholder uses theme colors, fonts, and centered layout to match the luxury Aurowe aesthetic
- Delete `_getSizeFromProduct()` and `_isInternalOvenProduct()` in same commit as metafield migration (CONF-03)

### Claude's Discretion

- `meta.oven_type` value format (what string the metafield stores for internal vs external)
- Data source architecture (JSON blob vs Liquid metafields) — pick what fits configurator-product-json.liquid
- Which listeners to convert to delegation
- `_bindEvents` organization pattern
- Event routing mechanism
- Placeholder message copy
- Logging level for skipped products

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Replace regex-based product title matching with metafield-based lookups (configurator.size, configurator.oven_type, configurator.addon_type) | `meta.size` and `meta.oven_type` are already serialized by configurator-product-json.liquid into the JSON blob — JS just needs to read them instead of running regex |
| CONF-02 | Extend configurator-product-json.liquid to include size, oven_type, and addon_type from metafields | snippet already outputs all three fields (lines 37-39) — **no Liquid change needed**; gap is only in the JS reading code |
| CONF-03 | Delete all string-matching fallback methods (_getSizeFromProduct, _isInternalOvenProduct) in same commit as metafield migration | both methods identified at lines 795-806; all 4 call sites identified at lines 813, 837, 843, 875 |
| CONF-04 | Consolidate two price calculation paths into single _calculateLineItems() function used by both display and cart | `_updatePrice()` (display path, lines 901-965) and `_buildCartItems()` (cart path, lines 1418+) independently walk state — consolidation means extracting a shared `_calculateLineItems()` that returns `[{variantId, price, quantity, properties}]` and both callers consume it |
</phase_requirements>

---

## Summary

Phase 6 is a pure JavaScript refactoring task with no Liquid template changes needed. The metafield data is already flowing through the pipeline correctly — `configurator-product-json.liquid` already outputs `meta.size`, `meta.oven_type`, and `meta.addon_type` at lines 37-39 of the snippet. The gap is entirely in `assets/configurator.js`, where two regex-based methods (`_getSizeFromProduct` and `_isInternalOvenProduct` at lines 795-806) still match product titles by string pattern instead of reading from `product.meta.size` and `product.meta.oven_type`.

The event delegation problem has two distinct instances: `_showVariants()` (lines 432-442) attaches a fresh `addEventListener('click')` to `target` every time a user selects a product — on revisiting the same step, this accumulates duplicate listeners since the swatch container element persists. The `_updateGallery()` method (lines 1597-1604) has the same problem on `this.gallery`. Both the main `_bindEvents()` click handler and the keyboard handler are already correctly delegated on `this` (the custom element root), so those two are fine.

The connectedCallback at line 43 calls `this.querySelector('[data-configurator-products]').textContent` unconditionally — if this element is absent (as happens in the Shopify theme editor where collections may not resolve), it throws a `TypeError: Cannot read properties of null`. The Shopify theme editor fires `document:readystatechange` and may re-invoke connected lifecycle when section settings change, so the null guard must cover both the initial load and settings-change re-renders.

**Primary recommendation:** Read `product.meta.size` and `product.meta.oven_type` directly in `_extractSizes()` and `_resolveBaseProduct()`, remove the two regex methods and all four call sites in one commit, move variant listener registration out of `_showVariants()` into `_bindEvents()` using `data-action="select-variant"` (which `_bindEvents` already routes via the top-level click delegation switch at line 506 — but is missing `select-variant` as a case), and add a `if (!this.querySelector('[data-configurator-products]'))` guard at the top of `connectedCallback` that renders the branded placeholder and returns.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2020+ | Web Component class, event handling | Project constraint — no build tools, no frameworks |
| Custom Elements API | Living Standard | `HTMLElement` subclass, `connectedCallback` | Already in use — `HotTubConfigurator extends HTMLElement` registered via `customElements.define` |
| Shopify `document.designMode` | N/A (string attribute) | Detect theme editor context | `document.designMode === 'on'` is set by Shopify when section is loaded in theme editor |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | — | No external libraries needed | Pure DOM refactoring within existing class |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `document.designMode === 'on'` | `Shopify.designMode` global | Both work; `document.designMode` is a web standard so preferred; `Shopify.designMode` may not be set at connectedCallback time |
| Moving listener to `_bindEvents` | AbortController to clean up per-element listeners | AbortController is cleaner if elements are replaced, but the delegation approach is simpler and consistent with existing `_bindEvents` pattern |

**Installation:** No installation needed — pure vanilla JS.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes — all changes confined to `assets/configurator.js` (JS refactoring) with no template or snippet modifications.

### Pattern 1: Metafield Read via `product.meta.*`

**What:** Replace regex title parsing with direct property reads from the `meta` object already present in each product's JSON representation.

**When to use:** Any product lookup that currently uses title string matching.

**Current broken pattern:**
```javascript
// assets/configurator.js lines 795-806 — REMOVE THESE ENTIRELY
_getSizeFromProduct(product) {
  const text = product.title || '';
  if (/\bXL\b/i.test(text)) return 'XL';
  if (/\bM\b/i.test(text) && !/\bXL\b/i.test(text)) return 'M';
  if (/\bL\b/i.test(text) && !/\bXL\b/i.test(text)) return 'L';
  return null;
}

_isInternalOvenProduct(product) {
  const title = (product.title || '').trim();
  return /\bI\s*$/.test(title) || /internal|integr/i.test(title);
}
```

**Replacement pattern:**
```javascript
// Direct metafield reads — no regex
// In _extractSizes():
const size = (product.meta?.size || '').toUpperCase();  // 'XL', 'L', 'M' or ''
if (!size) continue;  // skip products without size metafield

// In _resolveBaseProduct():
const productSize = (p.meta?.size || '').toUpperCase();
const productOvenType = (p.meta?.oven_type || '').toLowerCase();
const isInternal = productOvenType === 'internal';
```

**Source:** Direct codebase audit — `configurator-product-json.liquid` lines 37-39 confirm `meta.size` and `meta.oven_type` are already serialized.

### Pattern 2: Event Delegation for Dynamic Elements

**What:** Instead of calling `target.addEventListener('click', ...)` inside `_showVariants()` every time it runs, add a `case 'select-variant':` handler inside the existing `_bindEvents()` click delegation switch.

**When to use:** Any listener that is currently attached to a dynamically-generated element inside a method that runs on user interaction (step re-visits accumulate listeners).

**Current broken pattern (assets/configurator.js lines 432-442):**
```javascript
// _showVariants() — called every time a product is selected
// This adds a NEW listener on each call on the same element
target.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="select-variant"]');
  if (!el) return;
  target.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => { ... });
  el.classList.add(...);
  this._selectVariant(group, parseInt(el.dataset.variantId), parseInt(el.dataset.price));
});
```

**Replacement pattern:**
```javascript
// In _bindEvents() switch(action) — add one case, handled once
case 'select-variant': {
  const group = target.dataset.group;
  const container = target.closest('[data-variant-swatches], [data-variant-pills]');
  if (container) {
    container.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => {
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

The `_showVariants()` method then only sets `innerHTML` and calls `this._selectVariant()` for the default first variant — no listener attachment.

### Pattern 3: Gallery Listener Deduplication

**What:** `_updateGallery()` (lines 1597-1604) attaches a click listener to `this.gallery` on every gallery update. Since `this.gallery` is a cached element (not recreated), the listeners stack.

**Replacement:** Move gallery click handling into the existing `_bindEvents()` top-level click handler as a fallback branch (gallery thumbnails don't have `data-action` attributes currently), or add `data-action="select-thumb"` to gallery thumb elements and handle in the switch.

**Recommended approach:** Add `data-action="select-thumb" data-thumb-idx="${i}"` to each `.cfg-thumb`, then handle `case 'select-thumb':` in `_bindEvents()`. Remove the `this.gallery.addEventListener` call from `_updateGallery()`. This keeps the single top-level delegation pattern consistent.

### Pattern 4: connectedCallback Null Guard with Branded Placeholder

**What:** Check for the configurator data element before reading it. Shopify theme editor loads sections without collection data resolved.

**When to use:** Any Web Component `connectedCallback` that reads data injected by Liquid.

**Shopify Theme Editor Detection:**
```javascript
// document.designMode is set to 'on' by Shopify when any section
// is loaded in the theme editor. This is a web standard property.
// Source: Shopify Dawn theme uses document.designMode === 'on' as the guard.
const isEditor = document.designMode === 'on';
```

**Replacement pattern:**
```javascript
connectedCallback() {
  const dataEl = this.querySelector('[data-configurator-products]');
  if (!dataEl) {
    this._renderEditorPlaceholder();
    return;
  }
  // ... rest of initialization unchanged
}

_renderEditorPlaceholder() {
  this.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 48px 32px;
      text-align: center;
      font-family: var(--font-body, sans-serif);
      background: var(--color-surface, #EDE7DD);
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.08);
    ">
      <p style="font-family: var(--font-heading, serif); font-size: 22px; font-weight: 600; color: var(--color-primary, #262626); margin: 0 0 12px;">Hot Tub Configurator</p>
      <p style="font-size: 15px; color: var(--color-text-muted, #7D7B78); margin: 0; max-width: 340px; line-height: 1.6;">The configurator preview is not available in the theme editor. Assign collections in the section settings to enable the live experience.</p>
    </div>`;
}
```

**Note on Shopify theme editor re-renders:** When a merchant changes section settings (e.g., assigns a collection), Shopify re-renders the section HTML and the custom element is disconnected and reconnected. This means `connectedCallback` runs again on re-render. The null guard covers both the cold-load case (no collections assigned) and the in-editor settings-change case because after a settings change the new HTML will either have the data element (if collections are now assigned) or not.

### Pattern 5: CONF-04 — Shared `_calculateLineItems()`

**What:** `_updatePrice()` (display path) and `_buildCartItems()` (cart path) both independently walk `this.state` to compute the full configuration value. These are two separate code paths that can drift — if a new add-on is added to cart logic but not display (or vice versa), prices shown differ from prices charged.

**Consolidation approach:**
```javascript
_calculateLineItems() {
  // Returns array of { variantId, quantity, price, properties, label }
  // Both _updatePrice() and _buildCartItems() call this
  const items = [];
  // Base product
  if (this.state.baseVariantId) {
    items.push({
      variantId: this.state.baseVariantId,
      quantity: 1,
      price: this.state.basePrice || 0,
      properties: { '_config': 'base' },
      label: 'Base',
    });
  }
  // ... all other items same pattern
  return items;
}

_updatePrice() {
  const items = this._calculateLineItems();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // ... update DOM
  this._currentTotal = total;
  this._updateSummary();
}

_buildCartItems() {
  const configSummary = this._buildConfigSummary();
  return this._calculateLineItems()
    .filter(item => item.variantId)
    .map((item, i) => ({
      id: item.variantId,
      quantity: item.quantity,
      properties: i === 0
        ? { ...item.properties, 'Configuration': configSummary }
        : item.properties,
    }));
}
```

**Anti-Patterns to Avoid**

- **Regex in metafield fallback:** The decision is clear — no regex fallback. If `meta.size` is empty string (default from Liquid), skip the product. Do not try to infer size from title as a backup.
- **Attaching listeners inside render methods:** Any method that builds HTML should not also attach event listeners. Listeners belong in `_bindEvents()` only.
- **`document.designMode` only guard:** Also null-check the element directly — a non-editor page could theoretically load the section without data if there's a Liquid error, and the null guard catches both cases.
- **Replacing `innerHTML` on `this` in placeholder:** Do NOT use `this.innerHTML = ...` in `_renderEditorPlaceholder()` — the element may have children added by Shopify's section rendering before connectedCallback fires. Use a wrapper div approach or check if children already exist. Actually, since connectedCallback fires when the element is connected (after innerHTML is set by Liquid), replacing `this.innerHTML` is safe here because the guard returns immediately and never calls `_cacheEls` or `_renderSteps`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting theme editor | Custom `window.__shopifyEditor` flag | `document.designMode === 'on'` | Web standard; Shopify sets this on all theme editor contexts |
| Deduplicating listeners on dynamic elements | Tracking listener state with instance variables | Event delegation on root element | Already the pattern in `_bindEvents`; just extend the switch |
| Metafield type coercion | Custom string→enum mapping | Read `.meta.size` directly (already `'XL'`/`'L'`/`'M'` strings from Liquid) | Liquid default filters already normalize empty → `""` |

---

## Common Pitfalls

### Pitfall 1: Namespace Mismatch Between Scripts

**What goes wrong:** `fix-metafields.mjs` writes `oven_type` to the `custom` namespace (not `configurator`), and uses the value `'integrated'` not `'internal'`. Meanwhile, `configurator-product-json.liquid` reads from `configurator.oven_type`, not `custom.oven_type`.

**Why it happens:** The fix script was written independently of the setup script and snippet. It targets internal (integrated) oven products and hardcodes a different namespace/value.

**How to avoid:** The CONF-01 implementation in JS should read `product.meta.oven_type` which is sourced from `configurator.oven_type` (via the snippet). The `fix-metafields.mjs` script is separate provisioning tooling — it writes to `custom.*` which is NOT what the snippet reads. This means the integrated oven products that `fix-metafields.mjs` targets may have `oven_type` in the wrong namespace for the snippet to pick up.

**Action required:** Audit whether actual Shopify products have `configurator.oven_type` set. The setup script (`setup-configurator.mjs`) defines the metafield definition for `configurator.oven_type` and uses `'external'` or `'internal'` as values. These are the values the JS should compare against. The `fix-metafields.mjs` script is an outlier that uses a different namespace (`custom`) and value (`'integrated'`). The JS code should assume `configurator.oven_type` with values `'external'` / `'internal'` per the setup script — this aligns with CONTEXT.md decision for `meta.oven_type` format.

**Warning signs:** If internal oven products never resolve after the fix, check whether their `configurator.oven_type` metafield is actually set.

### Pitfall 2: `_extractSizes` Still Uses `_getSizeFromProduct` After Partial Refactor

**What goes wrong:** `_getSizeFromProduct` is called in 4 places — lines 813 (`_extractSizes`), 837 (`_resolveBaseProduct`), 843 (`_resolveBaseProduct` fallback), and 875 (`_updateOvenAvailability`). A partial refactor that removes the method but misses a call site will throw `TypeError: this._getSizeFromProduct is not a function`.

**How to avoid:** Use global search before deleting. All 4 call sites must be updated to use `(p.meta?.size || '').toUpperCase()` inline (or a simple one-liner helper if preferred). Then delete both methods in the same commit per CONF-03.

**Warning signs:** JavaScript `TypeError` in console on model selection — size cards never render.

### Pitfall 3: `_showVariants` Called Multiple Times Accumulates Listeners Silently

**What goes wrong:** If a user selects Product A (triggers `_showVariants`), then selects Product B, then selects Product A again — the swatch container accumulates 2+ click listeners. All fire on each click, causing duplicate `_selectVariant` calls and state corruption.

**Why it happens:** `_showVariants()` calls `target.addEventListener('click', ...)` where `target` is `swatchContainer` or `pillsContainer`. These elements are `innerHTML`-replaced each time `_showVariants` runs, so the OLD element (with its listeners) is discarded and a NEW element gets a fresh listener — this actually means no accumulation occurs on the swatch container itself since innerHTML replacement creates new DOM nodes.

**Re-analysis:** The actual accumulation risk is on `this.gallery` in `_updateGallery()` — `this.gallery` is a CACHED element reference (not recreated via innerHTML). Every call to `_updateGallery()` adds another listener to the same `this.gallery` element. This is the genuine listener accumulation bug.

**For `_showVariants`:** Since `target` is found fresh via `querySelector` each time and the container's innerHTML is replaced (creating a new DOM node), the old listeners are garbage-collected. However, moving variant handling to `_bindEvents()` is still the right architecture — it's consistent and avoids subtle bugs if the rendering ever changes.

**How to avoid:** Move gallery click to `_bindEvents()` (add `data-action="select-thumb"` to thumbnails). Remove `this.gallery.addEventListener` from `_updateGallery()`. For `_showVariants()`, also move to delegation for consistency and future-safety.

### Pitfall 4: connectedCallback Placeholder innerHTML vs Existing Children

**What goes wrong:** Shopify injects HTML (the `<script type="application/json">` data element, the `<div class="cfg__wrap">` etc.) before the custom element's `connectedCallback` fires. If the element's children are already rendered when `connectedCallback` detects missing data and does `this.innerHTML = ...`, it replaces all the existing children.

**Why it's fine here:** The null guard checks for the data script element. If it's missing, there's nothing to show — replacing with a placeholder is correct. If it IS present but other elements are missing, that's a different problem. The guard only fires when the data element is null, which means Liquid didn't render the JSON blob (collections not assigned), so the wizard shell is also incomplete.

**How to avoid:** The placeholder is rendered inside the custom element's shadow (light DOM), replacing whatever partial content exists. This is intentional. Do not try to preserve existing partial children.

### Pitfall 5: CONF-04 — `_calculateLineItems()` Must Maintain Property Assignment for Cart

**What goes wrong:** `_buildCartItems()` adds `'Configuration': configSummary` property only to the first item (base product). A naive consolidation that maps all line items equally loses this special-casing.

**How to avoid:** The `_calculateLineItems()` function returns raw data. `_buildCartItems()` adds the config summary property to the base item as a post-processing step after calling `_calculateLineItems()`. Keep the summary attachment logic in `_buildCartItems()`, not in the shared method.

---

## Code Examples

### Complete `_extractSizes` Replacement

```javascript
// Source: codebase audit — replaces regex-based _getSizeFromProduct with meta.size read
_extractSizes(products) {
  const sizeMap = new Map();
  const sizeOrder = ['XL', 'L', 'M'];

  for (const p of products) {
    const size = (p.meta?.size || '').toUpperCase();
    if (!size) {
      console.warn('[Configurator] Product missing meta.size — skipping:', p.title);
      continue;
    }

    if (!sizeMap.has(size)) {
      sizeMap.set(size, { key: size.toLowerCase(), label: size, minPrice: p.price, products: [] });
    }
    const entry = sizeMap.get(size);
    entry.products.push(p);
    if (p.price < entry.minPrice) entry.minPrice = p.price;
  }

  if (sizeMap.size === 0) {
    // Zero-product error state per CONTEXT.md decision
    this._renderProductError('No sizes available for this model. Please check product metafield configuration.');
  }

  return sizeOrder.filter(s => sizeMap.has(s)).map(s => sizeMap.get(s));
}
```

### Complete `_resolveBaseProduct` Replacement

```javascript
// Source: codebase audit — replaces both regex methods with direct meta reads
_resolveBaseProduct() {
  const tier = this.state.selectedTier;
  if (!tier || !this.state.size) return;

  const products = tier.products || [];
  const size = this.state.size.toUpperCase();
  const wantInternal = this.state.ovenType === 'internal';

  // Filter to products matching size via metafield — no regex
  const sizeProducts = products.filter(p => (p.meta?.size || '').toUpperCase() === size);
  if (sizeProducts.length === 0) {
    console.warn('[Configurator] No products found for size:', size, '— check configurator.size metafields');
    this.state.selectedBaseProduct = null;
    this.state.baseVariantId = null;
    this.state.basePrice = 0;
    return;
  }

  let product = sizeProducts.find(p => {
    const ovenType = (p.meta?.oven_type || '').toLowerCase();
    return wantInternal ? ovenType === 'internal' : ovenType === 'external';
  });

  // Fallback: if internal not found, use external
  if (!product && wantInternal) {
    product = sizeProducts.find(p => (p.meta?.oven_type || '').toLowerCase() === 'external');
    if (product) {
      this.state.ovenType = 'external';
      this.querySelectorAll('[data-action="oven-type"]').forEach(btn => {
        btn.classList.toggle('cfg-toggle-btn--active', btn.dataset.value === 'external');
      });
    }
  }

  if (product) {
    this.state.selectedBaseProduct = product;
    this.state.baseVariantId = product.variants?.[0]?.id || null;
    this.state.basePrice = product.variants?.[0]?.price || product.price || 0;
    if (product.image) this._preloadImage(product.image);
    if (product.image) this._setMainImage(product.image);
  } else {
    this.state.selectedBaseProduct = null;
    this.state.baseVariantId = null;
    this.state.basePrice = 0;
  }
}
```

### connectedCallback with Null Guard

```javascript
connectedCallback() {
  const dataEl = this.querySelector('[data-configurator-products]');
  if (!dataEl) {
    this._renderEditorPlaceholder();
    return;
  }

  this.data = JSON.parse(dataEl.textContent);
  // ... rest unchanged
}
```

### `_bindEvents` Addition for `select-variant`

```javascript
// Add to existing switch(action) in _bindEvents():
case 'select-variant': {
  const group = target.dataset.group;
  // Find the sibling container (swatch or pill container)
  const container = target.parentElement;
  if (container) {
    container.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => {
      s.classList.remove('cfg-swatch--selected', 'cfg-pill--selected');
      s.setAttribute('aria-pressed', 'false');
    });
  }
  target.classList.add(
    target.classList.contains('cfg-swatch') ? 'cfg-swatch--selected' : 'cfg-pill--selected'
  );
  target.setAttribute('aria-pressed', 'true');
  this._selectVariant(group, parseInt(target.dataset.variantId), parseInt(target.dataset.price));
  break;
}

// Add for gallery thumbnails:
case 'select-thumb': {
  const idx = parseInt(target.dataset.thumbIdx);
  this.gallery?.querySelectorAll('.cfg-thumb').forEach((t, i) => t.classList.toggle('cfg-thumb--active', i === idx));
  const images = this._currentGalleryImages || [];
  if (images[idx]) this._preloadImage(images[idx].src);
  if (images[idx]) this._setMainImage(images[idx].src);
  break;
}
```

Note: `_updateGallery()` must cache `images` in `this._currentGalleryImages` so the delegation handler can access them, and the `data-action="select-thumb"` attribute must be added to each `.cfg-thumb` element in `_updateGallery()`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex title matching for size/oven | Read `product.meta.size` / `product.meta.oven_type` | Phase 2 (was implemented, then overwritten) | Eliminates fragility when product titles change |
| Per-element listeners in render methods | Event delegation in `_bindEvents()` | This phase | Eliminates listener accumulation on step re-visits |
| No null guard on connectedCallback | Branded placeholder for editor context | This phase | Prevents TypeError in Shopify theme editor |
| Two independent price walks (_updatePrice + _buildCartItems) | Single `_calculateLineItems()` source of truth | This phase | Prevents price drift between display and cart |

---

## Open Questions

1. **Do live Shopify products have `configurator.size` metafields on base products?**
   - What we know: `setup-configurator.mjs` creates metafield *definitions* for `configurator.oven_type` but NOT for `configurator.size`. The `tagBaseProducts()` function uses title string matching to assign tags (e.g., `step-1-xl`) — it does NOT set the `configurator.size` metafield on base products.
   - What's unclear: How base products get `configurator.size` set. The snippet reads `configurator.size` but the setup script never writes it to base products.
   - Recommendation: The planner should add a task to add `configurator.size` metafield definition to `createMetafieldDefinitions()` in `setup-configurator.mjs`, and add `configurator.size` and `configurator.oven_type` metafield writes to `tagBaseProducts()`. Without this, base products will always have empty `meta.size`, and the new code will skip them all — empty error state.

2. **`fix-metafields.mjs` writes to `custom.oven_type` not `configurator.oven_type` — are integrated oven products broken?**
   - What we know: The snippet reads `configurator.oven_type`. The fix script writes `custom.oven_type = 'integrated'`. These do not match.
   - What's unclear: Whether the integrated oven products have ever had `configurator.oven_type` set correctly.
   - Recommendation: The planner may want to update `fix-metafields.mjs` to write `configurator.oven_type = 'internal'` (matching setup script convention) instead of `custom.oven_type = 'integrated'`. This is a data fix, not a JS fix, but it enables the new metafield-based resolution to work correctly for internal oven products.

3. **`_currentGalleryImages` caching for gallery delegation**
   - What we know: Gallery click handler currently captures `images` from the `_updateGallery` closure.
   - What's unclear: Whether storing `this._currentGalleryImages` in `_updateGallery` is the right approach.
   - Recommendation: Store as instance property in `_updateGallery`: `this._currentGalleryImages = images;`. This is a minimal addition with no architectural risk.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase audit of `assets/configurator.js` (2000+ lines) — confirmed all 4 regex call sites, both listener accumulation sites, and connectedCallback null risk
- Direct audit of `snippets/configurator-product-json.liquid` — confirmed `meta.size`, `meta.oven_type`, `meta.addon_type` already output at lines 37-39
- Direct audit of `scripts/setup-configurator.mjs` — confirmed `configurator.oven_type` definition exists; `configurator.size` definition does NOT exist; `tagBaseProducts()` uses title-based tag assignment, not metafield writes
- Direct audit of `scripts/fix-metafields.mjs` — confirmed namespace mismatch (`custom` vs `configurator`) and value mismatch (`integrated` vs `internal`)

### Secondary (MEDIUM confidence)

- Shopify Dawn theme source pattern: `document.designMode === 'on'` used as theme editor detection guard in custom element lifecycle hooks — consistent with Shopify's documented approach for theme editor compatibility

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure vanilla JS, no dependencies, all patterns confirmed in codebase
- Architecture: HIGH — all patterns directly derived from auditing actual code; no speculation
- Pitfalls: HIGH — all identified from direct code analysis; namespace mismatch is a verified concrete finding
- Open questions: MEDIUM — the metafield data gap (no `configurator.size` on base products) is a strong inference from reading the setup script; would need live Shopify admin access to verify actual product state

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable codebase — no external dependencies to track)
