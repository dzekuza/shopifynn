# Configurator Redesign: Parts-Based Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the hot tub configurator from a tier-based model selector to a parts-based builder where users pick size first, then optionally add components, with the ability to remove items from the order summary.

**Architecture:** Refactor the existing `configurator.js` web component. Replace the 3 tier-collection settings with a single base product picker. Change Step 1 from tier+size to size-only. Make steps 3-15 optional with remove buttons in the summary. Simplify base product resolution to size-only lookup.

**Tech Stack:** Shopify Liquid, vanilla JavaScript (Web Component), CSS

---

### Task 1: Update section schema — replace 3 collection pickers with 1 product picker

**Files:**
- Modify: `sections/configurator.liquid:314-378` (schema block)

**Step 1: Edit the schema block**

Replace the Step 1 header and 3 collection settings:

```json
{ "type": "header", "content": "Step 1 — Base Products (Model Tiers)" },
{ "type": "collection", "id": "base_classic_collection", "label": "Nordic Elite Classic collection" },
{ "type": "collection", "id": "base_premium_collection", "label": "Nordic Elite Premium collection" },
{ "type": "collection", "id": "base_signature_collection", "label": "Nordic Elite Signature collection" },
```

With a single product picker:

```json
{ "type": "header", "content": "Step 1 — Base Hot Tub" },
{ "type": "product", "id": "base_product", "label": "Base hot tub product (variants: XL, L, M)" },
```

**Step 2: Verify the schema is valid**

Run: `shopify theme check sections/configurator.liquid` or just reload the dev preview and confirm the theme editor shows the new setting.

**Step 3: Commit**

```bash
git add sections/configurator.liquid
git commit -m "refactor: replace 3 tier collection settings with single base product picker in configurator schema"
```

---

### Task 2: Update Liquid JSON data block — serialize base product instead of 3 collections

**Files:**
- Modify: `sections/configurator.liquid:112-173` (JSON data block, "base" key)

**Step 1: Replace the base data serialization**

Replace the entire `"base": [...]` block (lines 114-173) with:

```liquid
"base": {%- if section.settings.base_product != blank -%}
  {%- assign product = section.settings.base_product -%}
  {% render 'configurator-product-json', product: product %}
{%- else -%}null{%- endif -%},
```

This serializes the single base product with all its variants (XL, L, M) instead of 3 tier collections.

**Step 2: Update the Liquid step 1 title and subtitle**

In the `{%- case i -%}` block (line 45), change:

```liquid
{%- when 1 -%}{%- assign s_title = 'Your Hot Tub' -%}{%- assign s_sub = 'Choose model and size.' -%}
```

To:

```liquid
{%- when 1 -%}{%- assign s_title = 'Choose Your Size' -%}{%- assign s_sub = 'Select the size for your hot tub.' -%}
```

**Step 3: Commit**

```bash
git add sections/configurator.liquid
git commit -m "refactor: serialize single base product instead of 3 tier collections in configurator data"
```

---

### Task 3: Update template JSON settings

**Files:**
- Modify: `templates/page.configurator.json`

**Step 1: Replace the 3 collection settings with single product**

Replace:
```json
"base_classic_collection": "nordic-elite-premium-copy",
"base_premium_collection": "nordic-elite-classic",
"base_signature_collection": "m-hot-tubs",
```

With:
```json
"base_product": "",
```

Note: The product handle will need to be set once the base tub product is created in Shopify admin. Leave empty for now.

**Step 2: Commit**

```bash
git add templates/page.configurator.json
git commit -m "refactor: update configurator template to use single base_product setting"
```

---

### Task 4: Rewrite STEPS constant and state initialization in configurator.js

**Files:**
- Modify: `assets/configurator.js:25-41` (STEPS constant)
- Modify: `assets/configurator.js:59-91` (state initialization)

**Step 1: Update STEPS constant**

Replace lines 25-41 with:

```javascript
const STEPS = [
  { num: 1,  key: 'size',         title: 'Choose Your Size',           subtitle: 'Select the size for your hot tub.' },
  { num: 2,  key: 'liner',        title: 'Fiberglass Liner',           subtitle: 'Select collection & color.' },
  { num: 3,  key: 'insulation',   title: 'Hot Tub Insulation',         subtitle: 'Extra insulation layer.' },
  { num: 4,  key: 'oven',         title: 'Heating System',             subtitle: 'External or internal oven.' },
  { num: 5,  key: 'exterior',     title: 'Exterior Panel',             subtitle: 'Pick your wood finish.' },
  { num: 6,  key: 'hydro',        title: 'Hydro Massage',              subtitle: 'Select system & nozzles.' },
  { num: 7,  key: 'air',          title: 'Air System',                 subtitle: 'Select system & nozzles.' },
  { num: 8,  key: 'filter',       title: 'Filter System',              subtitle: 'Filtration options.' },
  { num: 9,  key: 'led',          title: 'LED Lighting',               subtitle: 'Choose lamps & quantity.' },
  { num: 10, key: 'thermometer',  title: 'Thermometer',                subtitle: 'Temperature monitoring.' },
  { num: 11, key: 'stairs',       title: 'Stairs',                     subtitle: 'Matching exterior material.' },
  { num: 12, key: 'pillows',      title: 'Hot Tub Head Pillows',       subtitle: 'Comfort pillows.' },
  { num: 13, key: 'cover',        title: 'Cover',                      subtitle: 'Protect your hot tub.' },
  { num: 14, key: 'controls',     title: 'Control Installation',       subtitle: 'Mark installation locations.' },
  { num: 15, key: 'heater_conn',  title: 'Heater Connection Type',     subtitle: 'Connection angle.' },
];

// Steps 1-2 are required, steps 3+ are optional
const REQUIRED_STEPS = new Set([1, 2]);
```

**Step 2: Simplify state initialization**

Replace lines 59-91 with:

```javascript
this.state = {
  // Step 1 — size only (no tier/model)
  size: null,                // 'XL', 'L', 'M'
  baseVariantId: null,       // resolved variant ID from base product
  basePrice: 0,              // resolved variant price

  // Steps 2-15 (same as before, minus model/tier fields)
  liner: null,
  linerVariant: null,
  insulation: false,
  ovenType: 'external',
  glassDoor: false,
  chimney: false,
  exterior: null,
  exteriorVariant: null,
  hydro: null,
  hydroNozzles: 8,
  air: null,
  airNozzles: 12,
  filterEnabled: false,
  filterProduct: null,
  led: null,
  ledQty: 1,
  thermometer: null,
  stairs: false,
  pillows: false,
  pillowQty: 2,
  cover: null,
  coverVariant: null,
  controlLocation: 'default',
  heaterConnection: 'straight',
};
```

**Step 3: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: update STEPS constant and state — remove tier, add REQUIRED_STEPS set"
```

---

### Task 5: Rewrite Step 1 rendering — size-only cards

**Files:**
- Modify: `assets/configurator.js:159-214` (_renderSteps switch case + _renderModelSizeStep)

**Step 1: Update the switch case for step 1**

In `_renderSteps()` (line 167), change:

```javascript
case 'model_size':  this._renderModelSizeStep(content); break;
```

To:

```javascript
case 'size':  this._renderSizeStep(content); break;
```

**Step 2: Replace `_renderModelSizeStep` with `_renderSizeStep`**

Replace the entire `_renderModelSizeStep` method (lines 186-214) with:

```javascript
_renderSizeStep(container) {
  const baseProduct = this.data.base;
  if (!baseProduct || !baseProduct.variants) {
    container.innerHTML = '<p class="cfg-empty">Base product not configured. Assign it in the section settings.</p>';
    return;
  }

  const dims = {
    XL: 'Inside ∅ 200 cm / Outside ∅ 225 cm',
    L: 'Inside ∅ 180 cm / Outside ∅ 200 cm',
    M: '100×80 cm / 120×200 cm',
  };
  const persons = { XL: '6–8 persons', L: '6–8 persons', M: '2 persons' };

  // Build size cards from variants (each variant = a size)
  const sizeOrder = ['XL', 'L', 'M'];
  const sizes = [];
  for (const v of baseProduct.variants) {
    const sizeLabel = (v.option1 || '').toUpperCase();
    if (sizeLabel && sizeOrder.includes(sizeLabel)) {
      sizes.push({ label: sizeLabel, price: v.price, variantId: v.id });
    }
  }
  // Sort by defined order
  sizes.sort((a, b) => sizeOrder.indexOf(a.label) - sizeOrder.indexOf(b.label));

  let html = '<p class="cfg-label">Select your hot tub size:</p>';
  html += '<div class="cfg-cards" data-size-cards>';
  for (const s of sizes) {
    html += `
      <div class="cfg-card cfg-card--size" data-action="select-size" data-size="${s.label}" data-variant-id="${s.variantId}" data-price="${s.price}" tabindex="0" role="button" aria-pressed="false">
        <div class="cfg-card__info">
          <h4 class="cfg-card__name">${s.label}</h4>
          <p class="cfg-card__desc">${dims[s.label] || ''}</p>
          <p class="cfg-card__meta">${persons[s.label] || ''}</p>
        </div>
        <div class="cfg-card__price">From ${money(s.price)}</div>
      </div>`;
  }
  html += '</div>';

  container.innerHTML = DOMPurify.sanitize(html);
}
```

**Step 3: Commit**

```bash
git add assets/configurator.js
git commit -m "feat: rewrite step 1 as size-only selection from base product variants"
```

---

### Task 6: Rewrite event handlers — remove model select, simplify size select

**Files:**
- Modify: `assets/configurator.js:520-691` (event handling section)

**Step 1: Remove model select from event handler**

In `_bindEvents()` switch block (line 531), remove the `select-model` case:

```javascript
// DELETE this case:
case 'select-model':
  this._handleModelSelect(target.dataset.modelKey);
  break;
```

**Step 2: Rewrite `_handleSizeSelect`**

Replace `_handleSizeSelect` (lines 670-691) with:

```javascript
_handleSizeSelect(size) {
  this.state.size = size;

  // Update size cards UI
  this.querySelectorAll('[data-action="select-size"]').forEach(el => {
    const selected = el.dataset.size === size;
    el.classList.toggle('cfg-card--selected', selected);
    el.setAttribute('aria-pressed', String(selected));
  });

  // Resolve base product variant directly from size
  this._resolveBaseProduct();

  // Unlock step 2 (liner)
  this._unlockThrough(2, { autoFocus: false });
  this._updatePrice();
  this._scrollToStep(2);
}
```

**Step 3: Delete `_handleModelSelect` method**

Remove the entire `_handleModelSelect` method (lines 635-668) since tiers no longer exist.

**Step 4: Add `remove-summary-item` action to the event handler**

In the `_bindEvents()` switch block, add a new case:

```javascript
case 'remove-summary-item': {
  const stepNum = parseInt(target.dataset.removeStep, 10);
  this._handleRemoveItem(stepNum);
  break;
}
```

**Step 5: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: remove model select handler, simplify size select, add remove-summary-item action"
```

---

### Task 7: Rewrite `_resolveBaseProduct` and update `_unlockThrough` for new flow

**Files:**
- Modify: `assets/configurator.js:849-956` (product resolution section)

**Step 1: Simplify `_resolveBaseProduct`**

Replace `_resolveBaseProduct` (lines 877-923) with:

```javascript
_resolveBaseProduct() {
  const baseProduct = this.data.base;
  if (!baseProduct || !this.state.size) return;

  const size = this.state.size.toUpperCase();
  const variant = baseProduct.variants?.find(v => (v.option1 || '').toUpperCase() === size);

  if (variant) {
    this.state.baseVariantId = variant.id;
    this.state.basePrice = variant.price;
    if (baseProduct.image) {
      this._preloadImage(baseProduct.image);
      this._setMainImage(baseProduct.image);
    }
  } else {
    this.state.baseVariantId = null;
    this.state.basePrice = 0;
  }
}
```

**Step 2: Delete `_extractSizes` method**

Remove the entire `_extractSizes` method (lines 851-875) — no longer needed since sizes come from product variants.

**Step 3: Delete `_renderSizeCards` method**

Remove the `_renderSizeCards` method (lines 414-435) — size cards are now rendered inline in `_renderSizeStep`.

**Step 4: Update `_updateOvenAvailability`**

Replace `_updateOvenAvailability` (lines 925-956). Since oven type no longer affects the base product, simplify it:

```javascript
_updateOvenAvailability() {
  // Oven type no longer affects base product resolution.
  // Both external and internal are always available as add-on choices.
  // No availability check needed.
}
```

**Step 5: Update `_unlockThrough` for new flow**

The existing `_unlockThrough` works fine, but update the condition that enables the CTA button (line 503):

Change:
```javascript
if (this.state.size && this.ctaBtn) {
```

The CTA should only enable once both required steps (size + liner) are completed. Update to:

```javascript
if (this.state.size && this.state.liner && this.ctaBtn) {
```

**Step 6: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: simplify base product resolution to size-only variant lookup"
```

---

### Task 8: Update step unlock flow — liner unlocks all optional steps

**Files:**
- Modify: `assets/configurator.js` (_handleProductSelect and _handleSizeSelect)

**Step 1: Update `_handleProductSelect` to unlock all steps after liner**

In `_handleProductSelect` (around line 734), after `this._updatePrice();`, add logic to unlock all steps when liner is selected:

```javascript
// After liner (step 2) is selected, unlock all remaining optional steps
if (group === 'liners') {
  this._unlockThrough(STEPS.length, { autoFocus: false });
  // Enable CTA now that both required steps are done
  if (this.ctaBtn) {
    this.ctaBtn.disabled = false;
    this.ctaBtn.textContent = 'Add to Cart';
    if (this.stickyCta) this.stickyCta.disabled = false;
  }
  this._scrollToStep(3);
}
```

**Step 2: Commit**

```bash
git add assets/configurator.js
git commit -m "feat: unlock all optional steps (3-15) after liner selection in step 2"
```

---

### Task 9: Add remove-from-summary handler

**Files:**
- Modify: `assets/configurator.js` (new method `_handleRemoveItem`)

**Step 1: Add `_handleRemoveItem` method**

Add after `_handleHeaterConnection` (around line 835):

```javascript
_handleRemoveItem(stepNum) {
  // Map step numbers to state keys that need to be reset
  const resetMap = {
    3:  () => { this.state.insulation = false; this._uncheckStep(3); },
    4:  () => {
      this.state.ovenType = 'external';
      this.state.glassDoor = false;
      this.state.chimney = false;
      this._uncheckStep(4);
    },
    5:  () => { this.state.exterior = null; this.state.exteriorVariant = null; this._unselectProducts(5, 'exteriors'); },
    6:  () => { this.state.hydro = null; this.state.hydroNozzles = 8; this._unselectProducts(6, 'hydro'); },
    7:  () => { this.state.air = null; this.state.airNozzles = 12; this._unselectProducts(7, 'air'); },
    8:  () => { this.state.filterEnabled = false; this.state.filterProduct = null; this._uncheckStep(8); },
    9:  () => { this.state.led = null; this.state.ledQty = 1; this._unselectProducts(9, 'leds'); },
    10: () => { this.state.thermometer = null; this._unselectProducts(10, 'thermometers'); },
    11: () => { this.state.stairs = false; this._uncheckStep(11); },
    12: () => { this.state.pillows = false; this.state.pillowQty = 2; this._uncheckStep(12); },
    13: () => { this.state.cover = null; this.state.coverVariant = null; this._unselectProducts(13, 'covers'); },
    15: () => {
      this.state.heaterConnection = 'straight';
      this.querySelectorAll('[data-action="heater-conn"]').forEach(card => {
        card.classList.toggle('cfg-card--selected', card.dataset.value === 'straight');
      });
    },
  };

  const reset = resetMap[stepNum];
  if (reset) {
    reset();
    this._updatePrice();
  }
}

_uncheckStep(stepNum) {
  const stepEl = this._stepEls[stepNum];
  if (!stepEl) return;
  stepEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.cfg-checkbox-card')?.classList.remove('cfg-checkbox-card--checked');
  });
  // Hide conditional panels
  stepEl.querySelectorAll('.cfg-conditional').forEach(panel => { panel.style.display = 'none'; });
}

_unselectProducts(stepNum, dataKey) {
  const stepEl = this._stepEls[stepNum];
  if (!stepEl) return;
  stepEl.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
  stepEl.querySelectorAll('.cfg-radio-card--selected').forEach(c => { c.classList.remove('cfg-radio-card--selected'); });
  // Hide variant area and qty area
  const variantArea = stepEl.querySelector(`[data-variant-area="${dataKey}"]`);
  if (variantArea) variantArea.style.display = 'none';
  const qtyArea = stepEl.querySelector(`[data-qty-area="${dataKey}"]`);
  if (qtyArea) qtyArea.style.display = 'none';
}
```

**Step 2: Commit**

```bash
git add assets/configurator.js
git commit -m "feat: add remove-from-summary handler that resets step state and UI"
```

---

### Task 10: Update `_updateSummary` — add remove buttons for optional items

**Files:**
- Modify: `assets/configurator.js:1203-1458` (_updateSummary method)

**Step 1: Update the Base Model group**

In `_updateSummary`, replace the Base Model group (around lines 1210-1223). Since there's no tier, change the label:

```javascript
// Base group (step 1) — size only, no tier
if (this.state.size) {
  groups.push({
    heading: 'Base Hot Tub',
    stepNum: 1,
    removable: false,  // required — no remove button
    items: [{
      label: `Size ${this.state.size}`,
      image: this.data.base?.image || null,
      price: this.state.basePrice || 0,
      qty: null,
    }],
  });
}
```

**Step 2: Add `removable` flag and per-item `stepNum` to all groups**

For every group/item added to the summary, add `removable: true` for optional steps (3+) and `removable: false` for required steps (1-2). Also ensure each item has its own `stepNum` so the remove button knows which step to reset.

The Heating group (step 4):
```javascript
if (heatingItems.length > 0) groups.push({ heading: 'Heating', stepNum: 4, removable: true, items: heatingItems });
```

The Wellness group:
```javascript
if (wellnessItems.length > 0) groups.push({ heading: 'Wellness Features', stepNum: 6, removable: true, items: wellnessItems });
```

For the Accessories group, each item has its own `stepNum` — use per-item removal. Add `removable` to each item:

```javascript
// In each accItem push, add removable: true
accItems.push({
  label: ...,
  image: ...,
  price: ...,
  qty: ...,
  stepNum: X,
  removable: true,  // add this for steps 3+
});
```

For the Liner item (step 2), set `removable: false` since it's required.

**Step 3: Update `buildCard()` to render remove buttons**

In the `buildCard()` function (around line 1368), update the item rendering loop. After creating the info element, add a remove button for removable items:

```javascript
// After itemEl.appendChild(infoEl); add:

// Per-item remove button (for accessories group where items have individual stepNums)
const itemStepNum = item.stepNum || group.stepNum;
const itemRemovable = item.removable !== undefined ? item.removable : group.removable;
if (itemRemovable) {
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'cfg-summary__remove';
  removeBtn.textContent = '×';
  removeBtn.dataset.action = 'remove-summary-item';
  removeBtn.dataset.removeStep = String(itemStepNum);
  removeBtn.setAttribute('aria-label', `Remove ${item.label}`);
  itemEl.appendChild(removeBtn);
}
```

**Step 4: Commit**

```bash
git add assets/configurator.js
git commit -m "feat: add remove buttons to optional items in order summary"
```

---

### Task 11: Update `_buildConfigSummary` for cart properties — remove tier references

**Files:**
- Modify: `assets/configurator.js:1460-1523` (_buildConfigSummary method)

**Step 1: Update the Base group line**

Replace the base group section (around lines 1467-1472):

```javascript
// Replace:
if (this.state.model && this.state.size) {
  const tierTitle = trunc(this.state.selectedTier?.title || this.state.model);
  const ovenLabel = this.state.ovenType === 'internal' ? 'Int.' : 'Ext.';
  lines.push('Base');
  lines.push(`  ${tierTitle}, Sz ${this.state.size}, ${ovenLabel}`);
}

// With:
if (this.state.size) {
  lines.push('Base');
  lines.push(`  Sz ${this.state.size}`);
}
```

**Step 2: Update the fallback compact summary**

Replace the fallback section (around lines 1514-1519):

```javascript
// Replace:
if (this.state.model && this.state.size) fallbackParts.push(`${trunc(this.state.selectedTier?.title || '', 12)} ${this.state.size}`);
if (this.state.ovenType) fallbackParts.push(this.state.ovenType === 'internal' ? 'Int' : 'Ext');

// With:
if (this.state.size) fallbackParts.push(`Sz ${this.state.size}`);
```

**Step 3: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: remove tier references from cart configuration summary text"
```

---

### Task 12: Update `_validateRequiredSteps` — only require size + liner

**Files:**
- Modify: `assets/configurator.js:1548-1563` (_validateRequiredSteps method)

**Step 1: Simplify validation**

Replace `_validateRequiredSteps` with:

```javascript
_validateRequiredSteps() {
  if (!this.state.size || !this.state.baseVariantId) {
    return { valid: false, missingStep: 'size' };
  }
  if (!this.state.liner) {
    return { valid: false, missingStep: 'liner' };
  }
  return { valid: true, missingStep: null };
}
```

**Step 2: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: simplify validation to only require size and liner"
```

---

### Task 13: Add CSS for remove button and optional step states

**Files:**
- Modify: `assets/theme.css` (append to configurator styles section)

**Step 1: Add remove button styles**

Append to `assets/theme.css`:

```css
/* ── Configurator: Remove button in summary ── */
.cfg-summary__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-text-muted, #7A8B8A);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted, #7A8B8A);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 8px;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}
.cfg-summary__remove:hover {
  border-color: var(--color-accent, #4A90A4);
  color: var(--color-accent, #4A90A4);
  background: rgba(74, 144, 164, 0.08);
}

/* Summary item layout — add space for remove button */
.cfg-summary__item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cfg-summary__item-info {
  flex: 1;
  min-width: 0;
}
```

**Step 2: Commit**

```bash
git add assets/theme.css
git commit -m "feat: add CSS for remove buttons in configurator order summary"
```

---

### Task 14: Update `_handleOvenTypeToggle` — decouple from base product

**Files:**
- Modify: `assets/configurator.js:757-787` (_handleOvenTypeToggle method)

**Step 1: Remove `_resolveBaseProduct` call from oven toggle**

In `_handleOvenTypeToggle`, remove the line:
```javascript
this._resolveBaseProduct();
```

Oven type no longer affects the base product. The rest of the method (toggling buttons, showing/hiding addons, resetting addon state for internal) stays the same.

**Step 2: Commit**

```bash
git add assets/configurator.js
git commit -m "refactor: decouple oven type toggle from base product resolution"
```

---

### Task 15: Clean up dead code and unused references

**Files:**
- Modify: `assets/configurator.js`

**Step 1: Remove dead state fields from any remaining references**

Search for and remove any remaining references to:
- `this.state.model`
- `this.state.selectedTier`
- `this.state.selectedBaseProduct`
- `_handleModelSelect`
- `_renderModelSizeStep`
- `_extractSizes`
- `_renderSizeCards`
- `data-model-cards`
- `data-model-key`
- `select-model`

**Step 2: Remove the `_sizeSection` and `_sizeCardsContainer` cache lines**

In `_cacheEls` (line 153-154), remove:
```javascript
this._sizeSection = this.querySelector('[data-size-section]');
this._sizeCardsContainer = this.querySelector('[data-size-cards]');
```

**Step 3: Update the file header comment**

Replace lines 1-8:
```javascript
/**
 * Nordic Elite Hot Tub Configurator
 * Dynamic 15-step parts-based builder reading from Shopify products/collections.
 *
 * Base product: single product with variants for sizes (XL/L/M).
 * Step 1 selects size. Step 2 selects liner. Steps 3-15 are optional add-ons.
 */
```

**Step 4: Commit**

```bash
git add assets/configurator.js
git commit -m "chore: clean up dead tier/model code and update file header"
```

---

### Task 16: End-to-end verification

**Step 1: Verify dev preview loads without JS errors**

Open http://127.0.0.1:9292 and navigate to the configurator page. Open browser DevTools console and check for errors.

**Step 2: Verify the new flow**

1. Step 1 should show size cards (XL, L, M) with base prices — **no tier selection**
2. Selecting a size should unlock Step 2 (liner)
3. Selecting a liner should unlock all steps 3-15
4. Steps 3-15 should all be optional (can skip)
5. Summary should show remove buttons (×) on all optional items
6. Clicking × should deselect the item in its step and remove from summary
7. "Add to Cart" should only require size + liner

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final adjustments from end-to-end configurator testing"
```

---

## Shopify Admin Setup (manual, after code deployment)

1. Create a new product called "Nordic Elite Base Tub" with 3 variants:
   - Variant option1: "XL" — price: (your XL base price)
   - Variant option1: "L" — price: (your L base price)
   - Variant option1: "M" — price: (your M base price)
2. In the Shopify theme editor, go to the Configurator section settings
3. Set "Base hot tub product" to the newly created product
4. Save and preview
