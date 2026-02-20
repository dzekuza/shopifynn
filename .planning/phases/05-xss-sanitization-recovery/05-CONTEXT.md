# Phase 5: XSS Sanitization Recovery - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate all XSS vectors in configurator.js — load DOMPurify on the configurator template, sanitize or convert all innerHTML call sites that interpolate dynamic data, delete the _escAttr() helper method. This is a gap closure phase recovering Phase 1 XSS work that was overwritten during subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Conversion scope per call site
- ~20 innerHTML call sites exist in configurator.js; each needs per-site assessment
- Static HTML strings (e.g. `'<p class="cfg-empty">Not configured.</p>'`) — Claude decides whether to leave as-is or convert, based on pragmatism (static strings cannot be XSS vectors)
- Dynamic sites interpolating product data (titles, prices, image URLs) — Claude picks DOMPurify.sanitize() wrapping vs DOM builder conversion based on template complexity and readability
- Mixed approaches across the file are acceptable — use whatever is cleanest per call site
- Gallery image src URLs (line 1589): Claude assesses actual risk given these are Shopify-hosted product images; DOMPurify handles dangerous protocols
- Summary card already uses DOM builders (from quick task 1) — this can serve as reference pattern but is not mandatory everywhere

### Tooltip attribute handling
- 3 _escAttr() call sites in innerHTML templates for data-tooltip attributes
- Claude decides between DOMPurify on the whole HTML block vs createElement + setAttribute() approach, based on surrounding template complexity
- Tooltip content comes from Shopify metafields (store admin data) — treat as trusted but sanitize as defense-in-depth
- Tooltip rich HTML support: Claude decides based on current tooltip rendering implementation (plain text vs formatted)

### DOMPurify loading & fallback
- CDN failure behavior: Claude decides the risk/UX tradeoff (block configurator vs degrade gracefully with warning)
- Version: Claude decides — project convention from Phase 3 is to pin exact semver versions for CDN dependencies
- CDN provider: Claude decides — jsDelivr was used in original Phase 1 work and is the established project convention
- Load strategy (defer vs blocking): Claude decides based on script loading architecture and configurator.js initialization timing

### Claude's Discretion
- Per-site decision on sanitize() vs DOM builder vs leave-as-is for all ~20 innerHTML call sites
- DOMPurify configuration options (ALLOWED_TAGS, ALLOWED_ATTR if restricting)
- Tooltip approach (DOMPurify block wrap vs setAttribute)
- CDN load strategy and fallback behavior
- Whether to add a lightweight sanitize shim as fallback if CDN fails

</decisions>

<specifics>
## Specific Ideas

- Prior Phase 1 decision established "mixed strategy: sanitize() for product data, DOM builder for summary list, static strings left as-is" — this can guide the approach
- Pin CDN version to exact semver, consistent with Phase 3 GSAP pinning decision
- jsDelivr is the established CDN provider for this project
- DOMPurify must load before configurator.js in the template

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-xss-sanitization-recovery*
*Context gathered: 2026-02-20*
