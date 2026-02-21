---
phase: quick
plan: 3
subsystem: cart
tags: [cart, b2b, attributes, company-details, liquid, javascript, css]
dependency_graph:
  requires: []
  provides: [company-details-cart-attributes]
  affects: [sections/cart.liquid, assets/theme.js, assets/theme.css]
tech_stack:
  added: []
  patterns: [debounced-fetch, data-attributes-dom-hooks, aria-expanded-toggle, cart-attributes-api]
key_files:
  modified:
    - sections/cart.liquid
    - assets/theme.js
    - assets/theme.css
decisions:
  - "has_company computed in Liquid frontmatter block to pre-open section when attributes already exist on page load"
  - "Debounce 500ms on input events — same pattern as existing cart note auto-save"
  - "data-company-toggle and data-company-field as DOM hooks per project convention (never class selectors)"
  - "Company section placed above .cart-page__summary, below order note — visible before subtotal"
metrics:
  duration: 5 min
  completed: 2026-02-21
  tasks_completed: 1
  files_modified: 3
---

# Quick Task 3: Company Details Cart Attributes — Summary

**One-liner:** Collapsible B2B company details section (Company Name, Registration Number, VAT Number) in cart sidebar, auto-saved as Shopify cart attributes via debounced /cart/update.js fetch.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add company details collapsible section to cart sidebar and wire JS | 7e82d7a | sections/cart.liquid, assets/theme.js, assets/theme.css |

## What Was Built

A collapsible "Company Details" section was added to the cart sidebar above the order summary block. The feature targets B2B customers who need to supply company information for invoicing purposes without requiring Shopify Plus.

### sections/cart.liquid

- Added `has_company` Liquid variable computed in the frontmatter liquid block — checks if any of the three cart attributes are non-blank and auto-expands the section on page load when data already exists.
- Added the collapsible company section inside `.cart-page__sidebar`, above `.cart-page__summary`, wrapped in `{% if section.settings.show_company_details %}`.
- Toggle button uses `data-company-toggle` as DOM hook, `aria-expanded` set from `has_company`, `aria-controls="company-details-fields"`.
- Fields div uses `data-company-fields`, `hidden` attribute applied via `{% unless has_company %}hidden{% endunless %}`.
- Each input uses `data-company-field="<attribute name>"` and `value="{{ cart.attributes['...'] | escape }}"` for persistence.
- Added 9 schema settings under a "Company details" header: `show_company_details` (checkbox), `company_heading`, plus label/placeholder pairs for all 3 fields.

### assets/theme.js

- Added `/* ---- Company Details (cart attributes) ---- */` section after the cart note auto-save block.
- Toggle button click handler: reads `companyFields.hasAttribute('hidden')` to determine direction, sets `companyFields.hidden` and `aria-expanded` accordingly.
- Debounced input handler (500ms) collects all `[data-company-field]` values into an `attributes` object and POSTs to `/cart/update.js`.
- Guard `if (companyToggle && companyFields)` — no-ops on pages without the cart section.

### assets/theme.css

- Added `.cart-page__company`, `.cart-page__company-toggle`, `.cart-page__company-fields`, `.cart-page__company-field` and descendant styles after `.cart-page__note-input:focus`.
- Toggle button: `border-bottom` separator, hover uses `var(--color-secondary)`, SVG chevron rotates 180deg on `[aria-expanded="true"]`.
- Input fields: focus ring uses `var(--color-secondary)` with 15% opacity box shadow — matches brand green accent.
- Placed immediately before `.cart-page__summary` block, consistent with cart page visual hierarchy.

## Verification Checklist

- [x] Company details toggle visible in cart sidebar above subtotal
- [x] Fields expand/collapse with chevron rotation on click
- [x] Input values debounce-saved to `/cart/update.js` after 500ms
- [x] Fields pre-populated from `cart.attributes` on page load (Liquid pre-fill)
- [x] Section auto-expands when existing cart attributes are present
- [x] Theme editor `show_company_details` checkbox controls section visibility
- [x] All 3 fields pass to Shopify checkout as order attributes automatically
- [x] Uses `data-*` attribute hooks per project conventions, no class selectors in JS

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `sections/cart.liquid` — modified, company section at lines 100-121, schema settings added
- `assets/theme.js` — modified, company details block added after cart note handler
- `assets/theme.css` — modified, company styles block added after `.cart-page__note-input:focus`
- Commit `7e82d7a` exists in git log
