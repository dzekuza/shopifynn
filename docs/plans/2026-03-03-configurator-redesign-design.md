# Configurator Redesign: Parts-Based Builder

**Date:** 2026-03-03
**Approach:** Refactor existing configurator.js (Approach A)

## Problem

The current configurator forces users to pick a tier (Classic/Premium/Signature) first, then configure add-ons around that bundle. Users should instead build from parts: pick a size, pick required components, then optionally add whatever extras they want.

## Design

### New Step Flow

| Step | Key | Title | Required? |
|------|-----|-------|-----------|
| 1 | `size` | Choose Your Size | Yes |
| 2 | `liner` | Fiberglass Liner | Yes |
| 3 | `insulation` | Insulation | No |
| 4 | `oven` | Heating System | No |
| 5 | `exterior` | Exterior Panel | No |
| 6 | `hydro` | Hydro Massage | No |
| 7 | `air` | Air System | No |
| 8 | `filter` | Filter System | No |
| 9 | `led` | LED Lighting | No |
| 10 | `thermometer` | Thermometer | No |
| 11 | `stairs` | Stairs | No |
| 12 | `pillows` | Head Pillows | No |
| 13 | `cover` | Cover | No |
| 14 | `controls` | Control Installation | No |
| 15 | `heater_conn` | Heater Connection | No |

- Step 1 shows 3 size cards (XL, L, M) with base tub price per size
- No tier concept (Classic/Premium/Signature eliminated)
- Steps 3-15 are all optional with skip and remove capability

### Base Product & Pricing

- Single base tub product in Shopify with 3 variants (XL, L, M), each with its own price
- Section settings: replace 3 `base_*_collection` settings with single `base_product` product picker
- `_resolveBaseProduct()` simplifies to: find variant matching selected size
- Oven type (external/internal) no longer affects base product, only determines oven add-on availability in Step 4
- Pricing: `Total = base_tub_price[size] + SUM(selected_addon_prices)`
- Each add-on is a separate line item in cart

### Order Summary with Remove

- Optional items (steps 3-15) get a remove button (x icon) next to them
- Required items (size, liner) only get "Edit" button (no remove)
- Clicking remove: deselects item in its step, removes from summary, recalculates price
- Step stays visible/navigable so user can re-add later
- Layout: `[thumbnail] [name + details]  [price]  [Edit] [x]`

### Step Unlocking

- Step 1 (size) selected -> Step 2 (liner) unlocks
- Step 2 (liner) selected -> all steps 3-15 unlock at once
- Optional steps show "Skip" link
- Unselected steps show subtle empty state

### Cart Submission

- Validation: only size + liner required
- Line items: base tub variant + only explicitly selected add-ons
- No "included at 0" items unless user added them
- Configuration summary text reflects only selected items
- Same cart API (POST /cart/add.js), same events, same DOMPurify sanitization

### Shopify Admin Setup Required

- Create new "Base Tub" product with 3 variants: XL, L, M (each priced accordingly)
- All existing add-on products/collections remain unchanged

## Files to Modify

1. `assets/configurator.js` - Core logic changes (step flow, state, pricing, summary)
2. `sections/configurator.liquid` - Section schema (replace 3 collection settings with 1 product), step rendering
3. `snippets/configurator-product-json.liquid` - May need minor adjustments for base product serialization
4. `templates/page.configurator.json` - Update settings to reference new base product
5. `assets/theme.css` - Add styles for remove button, skip link, optional step states
