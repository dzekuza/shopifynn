# Phase 2: Configurator Stabilization - Research

**Researched:** 2026-02-20
**Domain:** Shopify Liquid metafields, Vanilla JS Web Components, Cart AJAX API, CSS architecture
**Confidence:** HIGH (codebase verified by direct read; Shopify APIs verified via official docs and community sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Step validation**
- Sequential navigation only — users must complete the current step before advancing to the next
- When a user tries to advance without completing a step, show a toast message ("Please select an option to continue") — no inline highlights
- Claude's discretion on which steps are required vs optional, based on the product data structure (some add-on steps like pillows/thermometer may be skippable)
- Final step before cart add shows a full summary card listing all selections with prices, then the "Add to Cart" button

**Order summary format**
- Grouped summary structure — options grouped by category (base model, heating, wellness features, accessories) with category headings
- Option names only per group, single total price at the bottom — no per-item or per-group subtotals
- Summary language in English regardless of store locale
- Summary visible both in the cart (as line item properties) and in the order confirmation email

### Claude's Discretion
- Error recovery UX on cart-add failure (retry button, error message copy, timeout behavior)
- Price display behavior (running total visibility, update animation)
- Which specific steps are required vs optional
- Exact grouping categories for the order summary
- Toast message styling, duration, and positioning
- Summary card layout and visual treatment on the final step

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Replace regex-based product title matching with metafield-based lookups (configurator.size, configurator.oven_type, configurator.addon_type) | Metafield Liquid access pattern verified: `product.metafields.configurator.size.value`. The `configurator-product-json.liquid` snippet already outputs `meta.oven_type` from the existing `configurator.oven_type` metafield. Need to add `size` and `addon_type` metafield definitions. |
| CONF-02 | Extend configurator-product-json.liquid to include size, oven_type, and addon_type from metafields | The snippet at `snippets/configurator-product-json.liquid` already outputs `meta.oven_type`. Add `meta.size` and `meta.addon_type` fields using same pattern. |
| CONF-03 | Delete all string-matching fallback methods (_getSizeFromProduct, _isInternalOvenProduct) in same commit as metafield migration | Both methods exist in `assets/configurator.js` (lines 643-654). Must delete atomically with CONF-01 to prevent dual-path resolution. |
| CONF-04 | Consolidate two price calculation paths into single _calculateLineItems() function used by both display and cart | `_updatePrice()` (display) and `_buildCartItems()` (cart) are currently independent. Unify by extracting `_calculateLineItems()` returning `[{variantId, quantity, price, label}]`. Display derives total from these; cart payload uses the same array. |
| CONF-05 | Add step validation before cart — user cannot add to cart with incomplete required configuration | Requires a `_validateRequiredSteps()` method called before `_handleAddToCart()`. Required steps: model_size (non-negotiable); optional: pillows, thermometer, stairs (checkbox steps that default to "no"). |
| CONF-06 | Add clear error recovery on cart add failure with retry option and failure explanation | Current `_showError()` only shows text; needs retry button injected alongside the error, referencing `_handleAddToCart()`. |
| CONF-07 | Replace per-element event listeners with event delegation on parent containers | The main `click` handler in `_bindEvents()` already uses event delegation on `this`. The violation is in `_showVariants()` (line 782) which attaches a new listener to `target` every time a product is selected. Fix: move variant/swatch clicks into the top-level delegated handler. |
| CONF-08 | Fix locale-aware currency formatting using window.Shopify.locale instead of hardcoded de-DE | `money()` function (line 14) hardcodes `'de-DE'`. Replace with `Intl.NumberFormat` using `request.locale.iso_code` injected into a `window.__locale` variable via `theme.liquid`, similar to how `window.__shopCurrency` is already injected. |
| CONF-09 | Format configuration summary for order confirmation email display | `_buildConfigSummary()` currently produces a compact pipe-separated string. Expand to a grouped multi-line format matching the locked summary structure. Must fit Shopify line item property constraints (see Pitfalls). |
| ARCH-01 | Extract configurator CSS from section {% stylesheet %} block to assets/configurator.css | The `{% stylesheet %}` block in `sections/configurator.liquid` (lines 11-165) contains ~154 lines of CSS. Extract to a new `assets/configurator.css` file. |
| ARCH-02 | Load configurator.css conditionally only on configurator template | Use `template.name` in `layout/theme.liquid` to conditionally load the file. The template is `page.configurator.json`, so `template.name` is `page` and `template.suffix` is `configurator`. Pattern: `{% if template.suffix == 'configurator' %}{{ 'configurator.css' | asset_url | stylesheet_tag }}{% endif %}`. |
| ARCH-03 | Internally decompose configurator.js into 8 responsibility groups with clear comment banners | Current file is one IIFE with inline comment banners already present but inconsistent. Formalize into exactly 8 groups with `/* ══ GROUP NAME ══════════════════════════════ */` banners. |
</phase_requirements>

---

## Summary

Phase 2 operates entirely within the existing Shopify Liquid + vanilla JavaScript stack — no new libraries or build tools. The configurator has a well-established architecture: a Web Component registered via `customElements.define`, data injected from Liquid as a JSON blob, and event delegation for user interaction. The core problems are two fragile patterns (string-matching for product resolution, dual price calculation paths), missing validation before cart add, and an architectural smell (CSS in a section `{% stylesheet %}` block loaded globally).

The metafield infrastructure is already partially in place. The `configurator-product-json.liquid` snippet already outputs `meta.oven_type` from the `configurator.oven_type` metafield. The `setup-configurator.mjs` script already creates the `oven_type` metafield definition. What is missing is: (a) `size` and `addon_type` metafield definitions on base products, (b) the Liquid snippet outputting those fields, and (c) the JS replacing string-matching with metafield reads. The replacement is a contained swap — no new Shopify API calls needed.

The two highest-risk items are the cart line item property size limit (the grouped summary must fit within Shopify's undocumented-but-empirically-tested ~20,000 character cart attribute limit — line item properties share this space) and the `window.Shopify.locale` availability (undocumented officially, but reliably available in storefronts via `content_for_header` injection). The safe pattern is to inject locale server-side via a `<script>` tag in `theme.liquid` using `{{ request.locale.iso_code }}`.

**Primary recommendation:** Tackle CONF-01/02/03 atomically (metafield migration), then CONF-04 (price unification), then CONF-05/06 (validation + error recovery), then CONF-07/08/09 (cleanup), then ARCH-01/02/03 (CSS extraction + code organization). This order avoids breaking the live cart flow mid-refactor.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS IIFE | N/A | Web Component host | Project constraint — no bundler |
| Shopify Cart AJAX API | `/cart/add.js` | Add multiple items in one POST | Officially documented, no auth needed |
| Shopify Liquid | Current | Metafield serialization | Only server-side data access path |
| `Intl.NumberFormat` | Browser native | Locale-aware currency display | No library needed; MDN HIGH confidence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `customElements.define` | Browser native | Web Component registration | Already in use |
| `data-*` attributes | N/A | DOM hooks for event delegation | Project convention |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.__locale` injected by Liquid | `window.Shopify.locale` | `window.Shopify.locale` is not officially documented; Liquid injection is reliable |
| Single `_calculateLineItems()` | Two separate paths | Two paths always drift and produce mismatches — unification is the only safe approach |
| Toast via DOM injection | Browser `alert()` | `alert()` blocks JS; DOM injection allows styling per user constraints |

---

## Architecture Patterns

### Current Configurator Structure

```
assets/configurator.js          ← 1,183 lines, one IIFE, one class
sections/configurator.liquid    ← Section file with embedded {% stylesheet %} (~154 CSS lines)
snippets/configurator-product-json.liquid  ← Liquid data serializer
templates/page.configurator.json ← Template composing the section
layout/theme.liquid             ← Injects window.__shopCurrency
```

### Target Structure (Post Phase 2)

```
assets/configurator.js          ← Refactored, 8 responsibility groups, ~same line count
assets/configurator.css         ← Extracted from section {% stylesheet %}
sections/configurator.liquid    ← Section file without embedded CSS
snippets/configurator-product-json.liquid  ← Extended with size, addon_type fields
layout/theme.liquid             ← Adds conditional configurator.css load + window.__locale
```

### Pattern 1: Metafield-Based Product Resolution

**What:** Replace `_getSizeFromProduct()` and `_isInternalOvenProduct()` (title-string regex) with reads from `product.meta.size` and `product.meta.oven_type` fields already in the JSON blob.

**When to use:** Always — after Phase 2 no string-matching fallback exists.

**Current broken code:**
```javascript
// assets/configurator.js lines 643-654
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

**Target code:**
```javascript
// After CONF-01: read from metafields, no regex
_getSizeFromProduct(product) {
  return product.meta?.size || null;   // 'XL', 'L', 'M', or null
}

_isInternalOvenProduct(product) {
  return product.meta?.oven_type === 'internal';
}
```

**Liquid snippet addition (CONF-02):**
```liquid
// snippets/configurator-product-json.liquid — add to "meta" object:
"size": {{ product.metafields.configurator.size.value | default: "" | json }},
"addon_type": {{ product.metafields.configurator.addon_type.value | default: "" | json }},
```

### Pattern 2: Unified Line Item Calculation

**What:** Extract a single `_calculateLineItems()` method that returns an array of `{variantId, quantity, priceInCents, label}`. Both `_updatePrice()` (display) and `_buildCartItems()` (cart payload) consume this array.

**Why:** The current `_updatePrice()` and `_buildCartItems()` are parallel implementations that will inevitably diverge (they already have subtle differences in how they handle variant vs product price).

**Target structure:**
```javascript
_calculateLineItems() {
  const items = [];
  // Base product
  if (this.state.baseVariantId) {
    items.push({ variantId: this.state.baseVariantId, quantity: 1,
      priceInCents: this.state.basePrice, label: 'Base: ' + (this.state.selectedTier?.title || '') });
  }
  // Each add-on follows same pattern...
  return items;
}

_updatePrice() {
  const items = this._calculateLineItems();
  const total = items.reduce((sum, i) => sum + i.priceInCents * i.quantity, 0);
  if (this.totalPriceEl) this.totalPriceEl.textContent = money(total);
  this._updateSummary(items);
}

_buildCartItems() {
  return this._calculateLineItems()
    .filter(i => i.variantId)
    .map(i => ({ id: i.variantId, quantity: i.quantity, properties: i.properties || {} }));
}
```

### Pattern 3: Step Validation with Toast

**What:** A `_validateRequiredSteps()` method checks state before cart add. A `_showToast(message)` method injects a styled toast element with auto-dismiss.

**Required vs optional step classification (Claude's discretion — recommended):**

| Step | Key | Required? | Rationale |
|------|-----|-----------|-----------|
| 1 | model_size | YES | No product without model + size |
| 2 | liner | YES | Fiberglass liner is structural |
| 3 | insulation | NO | Checkbox — "no" is a valid choice |
| 4 | oven | YES | Heating system is core |
| 5 | exterior | YES | Panel selection required |
| 6 | hydro | NO | Optional add-on |
| 7 | air | NO | Optional add-on |
| 8 | filter | NO | Checkbox — "no" is valid |
| 9 | led | NO | Optional add-on |
| 10 | thermometer | NO | Optional add-on |
| 11 | stairs | NO | Checkbox — "no" is valid |
| 12 | pillows | NO | Checkbox — "no" is valid |
| 13 | cover | YES | Cover is a standard accessory (show toast but allow skip) |
| 14 | controls | NO | Info-only diagram step |
| 15 | heater_conn | NO | Defaults to straight |

**Toast implementation (no library needed):**
```javascript
_showToast(message, duration = 3000) {
  const existing = this.querySelector('.cfg-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'cfg-toast';
  toast.textContent = message;
  this.appendChild(toast);

  // Animate in (CSS handles transition via .cfg-toast--visible)
  requestAnimationFrame(() => toast.classList.add('cfg-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('cfg-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}
```

### Pattern 4: Conditional CSS Loading in theme.liquid

**What:** Extract CSS from `{% stylesheet %}` in `sections/configurator.liquid` to `assets/configurator.css`. Load it only on the configurator template.

**Detection:** `template.suffix` is `'configurator'` when the template is `page.configurator.json`.

```liquid
{# In layout/theme.liquid, inside <head>: #}
{% if template.suffix == 'configurator' %}
  {{ 'configurator.css' | asset_url | stylesheet_tag }}
{% endif %}
```

**Important:** The `{% stylesheet %}` block in a section is deduplicated by Shopify — it only outputs once even if the section is included multiple times. After extraction to a file, the `{% stylesheet %}` block is removed entirely.

### Pattern 5: Locale-Aware Currency Formatting

**What:** Replace the hardcoded `'de-DE'` locale in `money()` with the store's actual locale.

**Safe approach — inject via theme.liquid (not `window.Shopify.locale` which is undocumented):**
```liquid
{# In layout/theme.liquid, alongside existing window.__shopCurrency: #}
<script>
  window.__shopCurrency = {{ shop.currency | json }};
  window.__shopLocale = {{ request.locale.iso_code | json }};
</script>
```

```javascript
// In configurator.js, replace money() function:
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

### Pattern 6: Cart Summary as Line Item Property

**What:** The configuration summary is stored as a cart line item property `'Configuration'` on the base product line item. It must be human-readable in both the cart and order confirmation email.

**Grouped summary format (locked decision):**
```
Base Model
  Nordic Elite Premium, Size XL, External Oven

Heating
  External Oven 75cm (30 kW), Door with Glass

Wellness Features
  Hydro Massage System 1.5 kW (10 nozzles)
  Air System - Standard 12 Nozzles

Accessories
  Fiberglass Liner - Pearl Collection (Azure Pearl)
  Exterior Panel - WPC (Grey)
  Thermal Cover (Black)
  Stairs
  LED Lamp 65 mm ×2

Total: €12,450.00
```

**Character limit concern (see Pitfalls):** The undocumented Shopify line item property value limit is not publicly documented with a precise byte count. Community sources (LOW confidence) report the limit is per-key-value pair and approximately 2,000 characters in practice, though the cart attribute limit is ~20MB. The safe approach: keep the property value under 500 characters and test with a maximum configuration.

### Pattern 7: Event Delegation Fix

**What:** The `_showVariants()` method adds a new click listener on the swatch/pill container every time a product is selected, accumulating listeners.

**Fix:** Move variant selection into the top-level `click` listener on `this`:
```javascript
// In _bindEvents() click switch:
case 'select-variant': {
  this._handleVariantSelect(target.dataset.group, parseInt(target.dataset.variantId), parseInt(target.dataset.price));
  break;
}
```

Remove the `target.addEventListener('click', ...)` inside `_showVariants()`.

### Pattern 8: configurator.js Responsibility Groups (8 groups)

Recommended banner names matching existing comment style:

```
/* ══ 1. CONFIG & CONSTANTS ══════════════════════════════════════ */
/* ══ 2. LIFECYCLE & INITIALIZATION ══════════════════════════════ */
/* ══ 3. STEP RENDERING ══════════════════════════════════════════ */
/* ══ 4. EVENT HANDLING ══════════════════════════════════════════ */
/* ══ 5. PRODUCT RESOLUTION ══════════════════════════════════════ */
/* ══ 6. PRICE CALCULATION ═══════════════════════════════════════ */
/* ══ 7. CART & VALIDATION ═══════════════════════════════════════ */
/* ══ 8. UI UTILITIES (images, toast, tooltip, error) ════════════ */
```

### Anti-Patterns to Avoid

- **Dual price paths:** Never let `_updatePrice()` and `_buildCartItems()` diverge again — always derive both from `_calculateLineItems()`.
- **String matching for product identity:** Never match on product title or description. Always use metafields.
- **Event listener accumulation:** Never call `addEventListener` inside a method that runs on every product selection.
- **Hardcoded locale strings:** Never hardcode `'de-DE'` or any locale string in JS — always read from `window.__shopLocale`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale currency format | Custom regex format string | `Intl.NumberFormat` | Handles all locale edge cases (thousands separator, currency symbol placement, decimal format) |
| Cart validation | Server-side API call | Client-side state check before POST | Cart API will reject invalid variant IDs anyway; client-side check improves UX |
| Toast message | Third-party library | Simple DOM injection with CSS transition | ~15 lines of code, no dependency, matches project constraint |

---

## Common Pitfalls

### Pitfall 1: Metafield Migration Without Atomic Deletion

**What goes wrong:** CONF-01 (new metafield read) is merged before CONF-03 (deletion of string-matching fallbacks). For a brief window, both paths coexist. If metafields are not yet populated on all products, the new read returns `null` and the old fallback silently takes over — hiding the migration bug.

**Why it happens:** Treating CONF-01/02/03 as three separate tasks deployed independently.

**How to avoid:** Make CONF-01 + CONF-02 + CONF-03 a single atomic commit. The metafields must be populated on all base products before the commit lands in production.

**Warning signs:** `_resolveBaseProduct()` returns `null` for a valid size selection after migration.

### Pitfall 2: Cart Line Item Property Overflow

**What goes wrong:** The grouped summary string exceeds Shopify's line item property value limit. The cart POST silently truncates or rejects the property, causing garbled order confirmations.

**Why it happens:** With 13 options selected and verbose labels, the summary can easily reach 1,000+ characters. The exact Shopify limit is undocumented; community reports suggest ~2,000 characters per property value, but this is LOW confidence.

**How to avoid:**
1. Keep property value short — use abbreviated category names and truncate product titles to 30 chars.
2. Test with maximum configuration (all steps selected, longest product names).
3. As a fallback, split into multiple properties if a single one overflows: `'Config_1': '...', 'Config_2': '...'`.

**Warning signs:** Order confirmation emails show truncated or missing configuration data.

### Pitfall 3: `template.suffix` vs `template.name` Confusion

**What goes wrong:** Using `{% if template.name == 'configurator' %}` when the template is `page.configurator.json`. The `template.name` for this file is `'page'`, not `'configurator'`. The CSS never loads.

**Why it happens:** Conflating template name with template suffix.

**How to avoid:** Use `{% if template.suffix == 'configurator' %}`. Confirm in browser by checking `{{ template.name }}` (outputs `page`) and `{{ template.suffix }}` (outputs `configurator`).

**Warning signs:** `configurator.css` link element absent from page HTML on the configurator page.

### Pitfall 4: _showVariants() Listener Accumulation

**What goes wrong:** Each time a user clicks a different product in a step, `_showVariants()` adds another click listener to the swatch container. After 5 product selections, clicking a swatch fires 5 handlers, producing 5 price updates and potential state corruption.

**Why it happens:** The listener is added inside a render function rather than in `_bindEvents()`.

**How to avoid:** Move all `[data-action="select-variant"]` handling to the top-level delegated click handler in `_bindEvents()`.

**Warning signs:** Price display flickers or doubles when switching between product options after multiple selections.

### Pitfall 5: Shopify Theme Editor (`designMode`) Breaking connectedCallback

**What goes wrong:** When a merchant previews the configurator in the Shopify theme editor, `connectedCallback()` fires but `this.querySelector('[data-configurator-products]')` may be null or the JSON may be invalid if the section is added to a non-configurator page.

**Why it happens:** The theme editor can add/remove sections dynamically outside the configurator template context.

**How to avoid:** Add a guard at the top of `connectedCallback()`:
```javascript
connectedCallback() {
  const dataEl = this.querySelector('[data-configurator-products]');
  if (!dataEl) return; // Not in configurator context
  // ... rest of init
}
```

**Warning signs:** JS errors in theme editor console: `Cannot read properties of null (reading 'textContent')`.

---

## Code Examples

### Verified: Metafield Access in Liquid Snippet

```liquid
{# Source: shopify.dev/docs/api/liquid/objects/metafield — HIGH confidence #}
"meta": {
  "size": {{ product.metafields.configurator.size.value | default: "" | json }},
  "oven_type": {{ product.metafields.configurator.oven_type.value | default: "" | json }},
  "addon_type": {{ product.metafields.configurator.addon_type.value | default: "" | json }}
}
```

### Verified: Conditional Asset Loading in theme.liquid

```liquid
{# Source: shopify.dev/docs/api/liquid/tags/stylesheet + community confirmed — MEDIUM confidence #}
{% if template.suffix == 'configurator' %}
  {{ 'configurator.css' | asset_url | stylesheet_tag }}
{% endif %}
```

### Verified: Cart AJAX Multiple Items

```javascript
// Source: shopify.dev/docs/api/ajax/reference/cart — HIGH confidence
const res = await fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { id: variantId1, quantity: 1, properties: { '_config': 'base', 'Configuration': summaryText } },
      { id: variantId2, quantity: 1, properties: { '_config': 'liner' } },
    ]
  })
});
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.description || 'Could not add to cart.');
}
```

### Verified: Intl.NumberFormat for Currency

```javascript
// Source: MDN — HIGH confidence
function money(cents) {
  const locale = window.__shopLocale || 'de-DE';
  const currency = window.__shopCurrency || 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}
```

### Verified: Error Recovery with Retry Button

```javascript
// Pattern: inject retry inline with error message
_showError(msg) {
  if (!this.cartError) return;
  this.cartError.innerHTML = '';   // safe — no user content goes here

  const msgEl = document.createElement('span');
  msgEl.textContent = msg;         // safe — textContent, not innerHTML

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'cfg__retry-btn';
  retryBtn.textContent = 'Try again';
  retryBtn.addEventListener('click', () => {
    this._hideError();
    this._handleAddToCart();
  });

  this.cartError.appendChild(msgEl);
  this.cartError.appendChild(retryBtn);
  this.cartError.style.display = 'block';
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Regex on product title | Metafield-based lookup | Eliminates fragility when product naming changes |
| `toLocaleString('de-DE', ...)` hardcoded | `Intl.NumberFormat` with injected locale | Correct formatting for non-German locales |
| Inline `{% stylesheet %}` in section | External `assets/configurator.css` file | Browser caching; CSS only loaded on configurator page |
| Per-element variant listeners | Event delegation on parent | No listener accumulation; cleaner teardown |
| Dual price paths (display + cart) | Single `_calculateLineItems()` source | Price always matches cart; no divergence |

---

## Open Questions

1. **Which metafield holds `size` for base products?**
   - What we know: `configurator.oven_type` is defined and populated by `setup-configurator.mjs`. The base product JSON in `configurator.liquid` renders products from collections. Base products (Nordic Elite Classic/Premium/Signature) have size in the title (XL/L/M).
   - What's unclear: Are `configurator.size` metafields already set on base products? The setup script tags them with size tags (`step-1-xl`, `step-1-l`, `step-1-m`) but does not set a `configurator.size` metafield.
   - Recommendation: During planning, task the developer to verify this via Shopify Admin. If not set, add a small migration to `setup-configurator.mjs` or manually set `configurator.size` on each base product before deploying CONF-01. Alternatively, fall back to reading the size tag from `product.tags` in Liquid until metafields are populated.

2. **Cart line item property character limit**
   - What we know: The limit is not officially documented. Community sources report ~2,000 characters per property value (LOW confidence). Cart attributes are ~20MB total.
   - What's unclear: Whether the limit applies per property, or total across all properties on a line item.
   - Recommendation: Build the summary to stay under 400 characters by default. Add a character-count assertion in the `_buildConfigSummary()` method during development. Test with a fully-loaded configuration.

3. **`template.suffix` reliability across all Shopify plan types**
   - What we know: `template.suffix` is documented in Liquid and used by themes. `page.configurator.json` has suffix `configurator`.
   - What's unclear: Whether any edge case (e.g., theme preview mode, page being edited) could cause the suffix check to fail.
   - Recommendation: LOW risk. Use `template.suffix == 'configurator'` as the guard. Also verify with `shopify theme check` after implementation.

---

## Sources

### Primary (HIGH confidence)
- `assets/configurator.js` — Direct code read, 1,183 lines. Current implementation of string-matching, price calculation, event handling, and cart add.
- `snippets/configurator-product-json.liquid` — Current Liquid serializer; already outputs `meta.oven_type`.
- `sections/configurator.liquid` — Section with embedded CSS in `{% stylesheet %}` block.
- `layout/theme.liquid` — Confirms `window.__shopCurrency` injection pattern; `template.name` in body class.
- `templates/page.configurator.json` — Confirms `template.suffix` is `configurator`.
- [Shopify Cart AJAX API Reference](https://shopify.dev/docs/api/ajax/reference/cart) — Confirms `/cart/add.js` multi-item POST format.
- [Shopify Liquid Metafield Object](https://shopify.dev/docs/api/liquid/objects/metafield) — Confirms `product.metafields.namespace.key.value` syntax.
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) — Currency formatting API.

### Secondary (MEDIUM confidence)
- [Shopify Partners Blog: Metafields in Themes](https://www.shopify.com/partners/blog/metafields) — Confirms namespace.key access pattern in Liquid.
- WebSearch on `template.name` vs `template.suffix` conditional CSS — Multiple community confirmations that `template.suffix` is the correct check for `page.configurator.json`.

### Tertiary (LOW confidence)
- Community reports on Shopify line item property character limits (~2,000 chars per value) — Unverified, needs empirical testing.
- `window.Shopify.locale` availability in storefront — Community reports it exists but no official docs found. Using Liquid injection (`window.__shopLocale`) instead as the documented alternative.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all verified against current codebase
- Architecture patterns: HIGH — metafield Liquid syntax and Cart AJAX API are officially documented
- Pitfalls: HIGH for implementation pitfalls (verified by direct code read); LOW for cart property limits (undocumented)

**Research date:** 2026-02-20
**Valid until:** 2026-08-20 (stable APIs; check Shopify changelog for quarterly API version changes)
