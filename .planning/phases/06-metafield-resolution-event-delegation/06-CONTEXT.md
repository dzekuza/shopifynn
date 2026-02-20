# Phase 6: Metafield Resolution & Event Delegation Recovery - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace fragile regex-based product matching in configurator.js with metafield data lookups, add a connectedCallback null guard for Shopify theme editor safety, and convert event listeners to delegation pattern to prevent listener accumulation on step re-visits. This is a gap closure phase — these changes were implemented in Phase 2 but overwritten during subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Metafield data shape
- `meta.size` uses exact size codes: `XL`, `L`, `M` — matching existing variant naming
- `meta.oven_type` format is Claude's discretion — pick what aligns with existing Shopify metafield conventions and variant option names
- Claude should audit the codebase and setup scripts to identify ALL configurator.* metafields, not just size and oven_type — there may be others that need attention
- Data source (JSON blob vs direct Liquid metafields) is Claude's discretion — pick what fits the existing configurator-product-json.liquid architecture

### Event delegation scope
- Claude should audit the code to understand the exact listener accumulation problem before fixing
- Scope of delegation conversion is Claude's discretion — assess which listeners are problematic and only convert those (don't refactor working listeners unnecessarily)
- Single _bindEvents vs per-group binding is Claude's discretion — pick what fits the existing 8 responsibility group organization
- Event routing mechanism (data-action attributes vs CSS class matching) is Claude's discretion — pick what's most consistent with existing configurator patterns

### Theme editor compatibility
- connectedCallback null guard shows a **branded placeholder message** — not a silent return
- Placeholder uses theme colors, fonts, and centered layout to match the luxury Aurowe aesthetic
- Placeholder copy is Claude's discretion — write appropriate text conveying that the configurator preview isn't available in the editor
- Claude should research how Shopify theme editor handles web component lifecycle (initial load vs settings-change re-renders) to ensure the guard covers all cases

### Fallback behavior
- Products missing `meta.size` or `meta.oven_type` metafields are **skipped** — not shown in the configurator
- No regex fallback — metafields are the only resolution path
- Logging level for skipped products is Claude's discretion
- If a step has zero valid products (all skipped), show an **error state** message — don't silently auto-skip
- Claude should check setup-configurator.mjs to verify which metafields it creates and whether all products should already have them

### Claude's Discretion
- meta.oven_type value format
- Data source architecture (JSON blob vs Liquid metafields)
- Which listeners to convert to delegation
- _bindEvents organization pattern
- Event routing mechanism
- Placeholder message copy
- Logging level for skipped products

</decisions>

<specifics>
## Specific Ideas

- Theme editor placeholder should feel intentional and branded, not like a broken state
- Zero-product error state should be visible enough that an admin would notice the data issue

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-metafield-resolution-event-delegation*
*Context gathered: 2026-02-20*
