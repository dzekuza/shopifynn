---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/configurator.js
  - sections/configurator.liquid
autonomous: true
requirements: [QUICK-01]

must_haves:
  truths:
    - "Each selected option in the summary card shows a thumbnail image of the product"
    - "Each selected option shows its individual price (or 'Included' for base items)"
    - "Each group in the summary card has an Edit button that scrolls to the corresponding step"
    - "Summary card total still displays correctly at the bottom"
  artifacts:
    - path: "assets/configurator.js"
      provides: "Updated _updateSummary with image, price, and edit button per item"
    - path: "sections/configurator.liquid"
      provides: "CSS for new summary card layout with images, prices, edit buttons"
  key_links:
    - from: "cfg-summary__edit button"
      to: "_scrollToStep()"
      via: "click handler in _updateSummary"
      pattern: "_scrollToStep"
    - from: "_updateSummary items"
      to: "product.image from this.data"
      via: "_getProductImage helper"
      pattern: "_getProductImage"
---

<objective>
Upgrade the configurator summary card from plain text lists to a rich UI showing product thumbnail images, per-option prices, and an edit button on each group that navigates back to the relevant step.

Purpose: Customers see exactly what they configured with visual confirmation and price transparency before adding to cart.
Output: Enhanced summary card in `_updateSummary()` with images, prices, and edit buttons; supporting CSS in configurator.liquid.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@assets/configurator.js
@sections/configurator.liquid
@snippets/configurator-product-json.liquid
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add image/price helpers and rewrite _updateSummary to render rich summary items</name>
  <files>assets/configurator.js</files>
  <action>
1. Add a `_getProductImage(dataKey, productId)` helper near `_getProductTitle` (~line 1157). Pattern: look up product in `this.data[dataKey]` by ID, return `product.image || null`. For single-product categories (insulations, stairs, pillows), handle array with `products[0]?.image`.

2. Rewrite the `_updateSummary()` method (starting ~line 1001) to build a richer data structure. Each group item should now be an object instead of a string:
   ```
   { label: string, image: string|null, price: number, qty: number|null }
   ```

   Mapping for each group — derive price per item using existing helpers:
   - **Base Model**: image from `this.state.selectedBaseProduct?.image`, price from `this.state.basePrice`
   - **Heating** add-ons (glassDoor, chimney, heaterConnection): prices from `_getAddonPrice()`, no product images (these are add-ons without separate products)
   - **Wellness** (hydro, air): image/price from `_getProductImage`/`_getSelectedProductPrice`, include nozzle count in label
   - **Accessories** (liner, insulation, exterior, cover, led, pillows, thermometer, filter, stairs): image from `_getProductImage` using appropriate dataKey, price from corresponding `_getSelectedProductPrice`/`_getProductPrice`/`_getSelectedVariantPrice`. For led multiply price by `ledQty`, for pillows multiply by `pillowQty`.

   Each group also gets a `stepNum` property matching the STEPS array num for that group:
   - Base Model -> 1, Heating -> 4, Wellness Features -> 6 (first wellness step), Accessories items map to their respective step nums (liner->2, insulation->3, exterior->5, led->9, etc.)

3. Rewrite the `buildCard()` inner function to use DOM builder (no innerHTML, per XSS safety decision). For each group:
   - Group container: `div.cfg-summary__group`
   - Group header row: `div.cfg-summary__group-header` containing:
     - `div.cfg-summary__heading` with group heading text
     - `button.cfg-summary__edit` with text "Edit" and `data-edit-step="{stepNum}"` attribute
   - For each item in the group, create `div.cfg-summary__item` containing:
     - If `item.image`: `img.cfg-summary__img` with `src=item.image`, `alt=item.label`, `loading="lazy"`, width 48, height 48
     - If no image: `div.cfg-summary__img-placeholder` (empty 48x48 box with background color)
     - `div.cfg-summary__item-info` containing:
       - `span.cfg-summary__item-label` with item.label text
       - `span.cfg-summary__item-price` with `money(item.price * (item.qty || 1))` — if price is 0, show "Included"
   - Keep the existing total row at the bottom unchanged.

4. Add event delegation for edit buttons. After `this.summaryCard.replaceChildren(card)` (or `this.summaryList.replaceChildren(card)`), add a click listener on the card element:
   ```js
   card.addEventListener('click', (e) => {
     const btn = e.target.closest('[data-edit-step]');
     if (!btn) return;
     const stepNum = parseInt(btn.dataset.editStep, 10);
     this._scrollToStep(stepNum);
   });
   ```
   This uses event delegation so one listener handles all edit buttons.

5. The summary card container (`data-summary-card`) should now be shown (remove `style.display = 'none'` and set `display = ''`) when groups exist, matching existing show/hide logic.

IMPORTANT: Use DOM builder methods (createElement, textContent, appendChild) throughout — never innerHTML — per project security decision [02-04].
  </action>
  <verify>
  Open the configurator in a browser, complete several steps (model, liner, exterior at minimum), and confirm:
  - Summary card appears with grouped sections
  - Each item shows a thumbnail image (or placeholder if no image)
  - Each item shows its price or "Included"
  - Each group has an "Edit" button
  - Clicking "Edit" scrolls to the correct step
  - Total price at bottom matches the total price display
  </verify>
  <done>Summary card renders product images, individual prices, and working edit buttons for every selected option across all 15 configurator steps.</done>
</task>

<task type="auto">
  <name>Task 2: Add CSS for rich summary card layout</name>
  <files>sections/configurator.liquid</files>
  <action>
Add CSS rules in the `{% style %}` block of configurator.liquid, after the existing `.cfg-summary__total` rule (~line 169). New rules:

```css
/* ── Summary card enhanced layout ── */
.cfg-summary__group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.cfg-summary__edit {
  background: none;
  border: none;
  color: var(--color-secondary, #B6754D);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: inherit;
  transition: background 0.15s ease;
}
.cfg-summary__edit:hover {
  background: rgba(182, 117, 77, 0.1);
  text-decoration: underline;
}
.cfg-summary__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.cfg-summary__item:last-child {
  border-bottom: none;
}
.cfg-summary__img {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--color-background, #F4F1EC);
}
.cfg-summary__img-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  flex-shrink: 0;
  background: var(--color-background, #F4F1EC);
}
.cfg-summary__item-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.cfg-summary__item-label {
  font-size: 0.875rem;
  color: var(--color-primary, #262626);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cfg-summary__item-price {
  font-size: 0.8rem;
  color: var(--color-text-muted, #7D7B78);
  font-weight: 500;
}
```

Remove or update the old `.cfg-summary__items` rule (padding-left: 1rem, font-size: 0.9rem) since items are now flex rows with images instead of indented text lines. Keep it only if still referenced elsewhere; if not, remove it.

Ensure the `.cfg-summary__group` still has `margin-bottom: 0.75rem` for spacing between groups.
  </action>
  <verify>
  Inspect the summary card in browser devtools:
  - Group headers show heading left-aligned and Edit button right-aligned
  - Items display as horizontal rows: image | label+price
  - Images are 48x48 with rounded corners
  - Edit button uses bronze (#B6754D) color
  - Layout is responsive and doesn't break on mobile widths (320px)
  </verify>
  <done>CSS renders summary card as a polished grid of image+label+price rows with edit buttons per group, matching the Aurowe brand palette.</done>
</task>

</tasks>

<verification>
1. Navigate to configurator page, select model (Classic, XL, External)
2. Select a liner, skip insulation, confirm heating, select an exterior panel
3. Scroll to bottom — summary card should show:
   - "Base Model" group with tub image, base price, Edit button
   - "Accessories" group with liner image + price, exterior image + price, Edit buttons
4. Click "Edit" on Accessories — page scrolls to the liner step (step 2)
5. Select additional options (hydro massage, LED lighting, cover)
6. Summary card updates live with new items, each showing image + price
7. Total at bottom matches the running total in the price display
8. On mobile viewport (375px), layout stacks cleanly without overflow
</verification>

<success_criteria>
- Every selected configurator option appears in summary with its product image thumbnail
- Every item shows its individual price (or "Included" if zero/base)
- Every group has a working Edit button that scrolls to the correct configurator step
- Total price in summary matches the main total display
- No innerHTML used — all DOM built via createElement/textContent (XSS safety)
- CSS matches Aurowe brand palette (bronze edit buttons, warm surface background)
</success_criteria>

<output>
After completion, create `.planning/quick/1-update-configurator-summary-card-ui-with/1-SUMMARY.md`
</output>
