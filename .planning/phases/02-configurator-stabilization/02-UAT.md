---
status: testing
phase: 02-configurator-stabilization
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-02-20T12:00:00Z
updated: 2026-02-20T12:00:00Z
---

## Current Test

number: 1
name: Configurator page loads with correct styles
expected: |
  Open the configurator page. All UI elements (step headers, option cards, buttons, pricing display) should render with proper styling — no unstyled or broken layout.
awaiting: user response

## Tests

### 1. Configurator page loads with correct styles
expected: Open the configurator page. All UI elements (step headers, option cards, buttons, pricing display) should render with proper styling — no unstyled or broken layout.
result: [pending]

### 2. Non-configurator pages free of configurator CSS
expected: Visit the homepage or a collection page and view page source (or Network tab). The configurator.css stylesheet should NOT be loaded on non-configurator pages.
result: [pending]

### 3. Step-by-step navigation through configurator
expected: Starting at step 1, select an option and advance. Each subsequent step should render its options (cards, variants, quantity selectors) correctly. You should be able to progress through all 15 steps.
result: [pending]

### 4. Price updates with each selection
expected: Select a model/size in step 1, then add options in subsequent steps (liner, exterior, hydro massage, etc.). The displayed total price should update after each selection, reflecting the cumulative cost.
result: [pending]

### 5. Variant selection highlights correctly
expected: Click a variant card in any step (e.g., size or liner color). The selected card should visually highlight (border/background change). Clicking a different variant in the same step should move the highlight — no double-selections or stuck states.
result: [pending]

### 6. Validation blocks incomplete cart add
expected: Leave a required step incomplete (e.g., skip selecting an exterior panel) and click "Add to Cart". A toast notification should appear saying "Please complete all required selections before adding to cart." The cart add should NOT proceed.
result: [pending]

### 7. Grouped configuration summary card
expected: After selecting options across several steps, a summary card should appear before the "Add to Cart" button. It should show grouped categories (Base Model / Heating / Wellness Features / Accessories) listing your selections with a total price at the bottom.
result: [pending]

### 8. Successful cart add with matching price
expected: Complete all required steps (model/size, liner, oven, exterior) and click "Add to Cart". The Shopify cart should contain the correct product variant with all add-ons. The cart total should match the price displayed in the configurator.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
