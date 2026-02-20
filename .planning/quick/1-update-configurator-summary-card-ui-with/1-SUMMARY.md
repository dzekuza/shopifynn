---
phase: quick
plan: 1
subsystem: configurator
tags: [ui, summary-card, images, pricing, accessibility]
dependency_graph:
  requires: [configurator.js, sections/configurator.liquid]
  provides: [rich-summary-card-with-images-prices-edit-buttons]
  affects: [configurator summary UX, pre-cart review]
tech_stack:
  added: []
  patterns: [DOM-builder, event-delegation, CSS-custom-properties]
key_files:
  created: []
  modified:
    - assets/configurator.js
    - sections/configurator.liquid
decisions:
  - "Accessories group stepNum anchors to first item's step — Edit button scrolls to the first accessory step selected (liner=2 if present, otherwise next selected)"
  - "price=0 shows 'Included' — base price always shows real price since it is never zero once resolved"
  - "_getProductImage(dataKey, null) pattern handles single-product arrays (insulations, stairs, pillows) consistently"
metrics:
  duration: "2 min"
  completed: "2026-02-20"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 1: Update Configurator Summary Card UI

**One-liner:** Rich summary card with 48px product thumbnails, per-item prices ("Included" for zero-cost items), and bronze Edit buttons per group that scroll to the corresponding configurator step.

## What Was Built

The configurator summary card (rendered in the "Your Configuration" section at the bottom of the steps list) was upgraded from a plain text list to a polished product review UI.

### Before
- Plain text lines per group (e.g. "Liner: Nordic White Pearl")
- No product images
- No individual prices
- No way to navigate back to a step

### After
- Each group has a header row with the group name (left) and an "Edit" button (right)
- Each selected option renders as a flex row: 48x48 thumbnail | label + price
- Images come from product data via the new `_getProductImage()` helper
- Items with zero price show "Included"; items with price show formatted euro amount
- Clicking "Edit" calls `_scrollToStep(stepNum)` via event delegation on the card element
- All DOM built with `createElement`/`textContent` — no `innerHTML` (XSS safety decision 02-04)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add image/price helpers and rewrite _updateSummary | 664d783 | assets/configurator.js |
| 2 | Add CSS for rich summary card layout | 0d5452e | sections/configurator.liquid |

## Changes Detail

### Task 1: configurator.js

**New helper `_getProductImage(dataKey, productId)`** (added after `_getProductTitle`):
- Takes a data key and product ID
- When `productId` is null/undefined: handles single-product array categories (insulations, stairs, pillows) by returning `products[0]?.image`
- Otherwise: finds product by ID and returns its `image` field or `null`

**Rewritten `_updateSummary()`:**
- Groups now carry `stepNum` for Edit button navigation
- Each item is `{ label, image, price, qty, stepNum }` instead of plain string
- Base Model: uses `selectedBaseProduct.image`, `basePrice`
- Heating add-ons: looks up addon image from `oven_addons` array
- Wellness: uses `_getProductImage` + `_getSelectedProductPrice`
- Accessories: 9 item types (liner, insulation, exterior, filter, led, thermometer, stairs, pillows, cover) each with own `stepNum`
- `buildCard()` inner function uses full DOM builder: group-header div, Edit button, item divs with img or placeholder div, info div with label and price spans
- Event delegation: one `click` listener on card checks for `[data-edit-step]` attribute

### Task 2: configurator.liquid CSS

**Removed:** `.cfg-summary__items { padding-left: 1rem; }` — items are now flex rows, not indented text

**Updated:** `.cfg-summary__heading { margin-bottom: 0; }` — spacing handled by group-header flex container

**Added:**
- `.cfg-summary__group-header` — flex row, space-between
- `.cfg-summary__edit` — bronze (#B6754D) borderless button, hover shows subtle tint + underline
- `.cfg-summary__item` — flex row, 0.75rem gap, 0.5rem vertical padding, subtle border-bottom
- `.cfg-summary__img` — 48x48, rounded 0.375rem, object-fit cover
- `.cfg-summary__img-placeholder` — 48x48, same shape, warm background
- `.cfg-summary__item-info` — flex column, flex:1, min-width:0 (prevents overflow)
- `.cfg-summary__item-label` — 0.875rem, truncates with ellipsis
- `.cfg-summary__item-price` — 0.8rem muted text

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

**Files modified:**
- `assets/configurator.js` — FOUND (664d783 commit)
- `sections/configurator.liquid` — FOUND (0d5452e commit)

**Commits:**
- 664d783 — FOUND: feat(quick-1): add _getProductImage helper and rewrite _updateSummary with rich items
- 0d5452e — FOUND: feat(quick-1): add CSS for rich summary card layout with images, prices, edit buttons

## Self-Check: PASSED
