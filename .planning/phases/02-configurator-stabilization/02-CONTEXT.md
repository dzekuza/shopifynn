# Phase 2: Configurator Stabilization - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace fragile string-matching with metafield-based product lookups, consolidate pricing into a single source of truth, add step validation before cart add, implement error recovery on failures, and clean up configurator architecture (CSS extraction, event delegation, code organization). The configurator must reliably complete all 15 steps and produce correct cart payloads.

</domain>

<decisions>
## Implementation Decisions

### Step validation
- Sequential navigation only — users must complete the current step before advancing to the next
- When a user tries to advance without completing a step, show a toast message ("Please select an option to continue") — no inline highlights
- Claude's discretion on which steps are required vs optional, based on the product data structure (some add-on steps like pillows/thermometer may be skippable)
- Final step before cart add shows a full summary card listing all selections with prices, then the "Add to Cart" button

### Order summary format
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

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. The key constraint is that the summary must work within Shopify's cart line item property limits (200 bytes max per property — validate with maximum-option configuration).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-configurator-stabilization*
*Context gathered: 2026-02-20*
