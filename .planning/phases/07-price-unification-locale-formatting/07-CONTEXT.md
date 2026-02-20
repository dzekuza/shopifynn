# Phase 7: Price Unification & Locale Formatting - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a single `_calculateLineItems()` function that serves as the sole source of truth for both display pricing and cart payload construction. Wire `money()` to read `window.__shopLocale` and `window.__shopCurrency` instead of hardcoded `de-DE` / `EUR`. No new UI — this is an internal refactoring of price data flow.

</domain>

<decisions>
## Implementation Decisions

### Line item structure
- Claude's discretion on whether to include zero-price options or only priced items — choose what fits existing code best
- Claude's discretion on flat array vs grouped by step — choose based on what `_updatePrice` and `_buildCartItems` actually consume
- Claude's discretion on whether base product is a line item or handled separately — match current cart payload structure
- Claude's discretion on recompute vs diff — choose simplest approach (full recompute preferred unless performance demands otherwise)

### Price display sync
- Price MUST update live on option selection — immediate feedback, not batched on step advance
- Claude's discretion on caching strategy (direct call vs shared `_currentLineItems`) — optimize to prevent display/cart price mismatch
- Claude's discretion on rounding approach — follow how Shopify variant prices work (already in cents)
- Claude's discretion on retry recomputation — pick the approach that prevents stale cart data

### Claude's Discretion
All structural decisions for `_calculateLineItems()` (return shape, inclusion criteria, base product handling, caching, rounding, retry behavior) are Claude's call — optimize for simplicity, correctness, and preventing price mismatch between display and cart. The one locked decision: price display updates live on selection.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user trusts Claude to make the right structural choices based on the existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-price-unification-locale-formatting*
*Context gathered: 2026-02-20*
