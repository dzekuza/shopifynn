# Codebase Concerns

**Analysis Date:** 2026-02-20

## Security Issues

**Hardcoded API Credentials:**
- Issue: Shopify API credentials (CLIENT_ID, CLIENT_SECRET, API key) are hardcoded in source files and exposed in `.env`
- Files: `scripts/setup-configurator.mjs` (lines 10-13), `.env` (lines 1-7)
- Impact: Critical security vulnerability. Any compromise of this repository exposes full Shopify admin access, allowing malicious actors to modify products, collections, orders, and customer data
- Fix approach: Move all credentials to environment variables only. Remove `.env` from git history using `git filter-branch` or `git-filter-repo`. Rotate all exposed API credentials immediately in Shopify Admin. Use GitHub Secrets for CI/CD if needed

**innerHTML XSS Vulnerability:**
- Issue: Unsanitized HTML is set via `innerHTML` in configurator.js, particularly when handling user-controlled data
- Files: `assets/configurator.js` (lines 150, 157, 203, 216, 233, 265, 271, 329, 336, 341, 667, 765, 771, 959, 983)
- Impact: Potential XSS attacks if product titles, descriptions, or metadata contain malicious HTML/JavaScript
- Fix approach: Use `textContent` for plain text (titles, prices) and `insertAdjacentHTML` with sanitization for controlled markup. Better: use DOM methods (`createElement`, `appendChild`) instead of string concatenation

**Insecure String Escaping:**
- Issue: Custom `_escAttr()` method (line 1163) only escapes quotes and angle brackets, missing other HTML entity escapes
- Files: `assets/configurator.js` (lines 1163-1165)
- Impact: Could allow injection of special characters in data attributes if product data contains control characters
- Fix approach: Use a robust HTML escaping library or ensure all special characters are properly encoded

## Tech Debt

**Large Monolithic Sections:**
- Files: `sections/main-product.liquid` (783 lines), `sections/configurator.liquid` (520 lines)
- Why it's debt: These sections are difficult to maintain, test, and modify. The configurator especially mixes HTML, CSS, and JavaScript in a single file
- Safe modification: Extract inline styles and scripts into separate asset files. Break section into smaller Liquid components using `{% render %}`
- Test coverage: Limited — JavaScript is not unit tested

**Tightly Coupled Configurator State:**
- Files: `assets/configurator.js` (entire class, especially state object at lines 41-73)
- Why it's debt: State object has 25+ properties with complex interdependencies. No clear separation between UI state and data state. Changes to state logic are error-prone
- Safe modification: Refactor into separate concerns — product state, UI state, pricing state. Add validation layer before state mutations
- Impact: Hard to add new configurator steps without breaking existing logic

**Variant Resolution Logic Fragility:**
- Files: `assets/configurator.js` (lines 680-716, 718-749)
- Why it's debt: Base product resolution depends on regex pattern matching on product titles (`_getSizeFromProduct`, `_isInternalOvenProduct` at lines 643-654). If product naming conventions change, the entire configurator breaks
- Safe modification: Add explicit metadata fields to products (e.g., custom metafields for size, oven type) and read from those instead of parsing titles
- Impact: Current fallback behavior (lines 694-704) silently changes user selection if internal oven not available — confusing UX

**Inline CSS in Liquid Section:**
- Files: `sections/configurator.liquid` (lines 11-267 contain 900+ lines of CSS in `{% stylesheet %}`)
- Why it's debt: CSS is difficult to modify, can't be cached, can't be shared with other sections, adds to page render blocking
- Safe modification: Extract all CSS to `assets/configurator.css` and link it in theme layout or using Shopify asset tags
- Impact: Poor performance (CSS is not cached), harder to audit styles, duplicated code if other sections need similar styling

**Price Calculation Logic Duplication:**
- Files: `assets/configurator.js` (lines 847-902 for display, 1037-1127 for cart)
- Why it's debt: Price calculation occurs in two places — UI display and cart item building. If pricing logic changes, both places must be updated
- Safe modification: Consolidate into single `calculatePrice(state)` function that both UI and cart logic call
- Impact: Risk of price mismatches between displayed and cart price

## Performance Bottlenecks

**Unoptimized Image Handling in Configurator:**
- Problem: Main image changes trigger `_setMainImage()` which adds/removes fade classes and loader (lines 968-979), but doesn't use proper image preloading
- Files: `assets/configurator.js` (lines 968-979)
- Cause: Every variant change, step navigation, or thumbnail click reloads image with animation overhead. Gallery images are referenced but not prefetched
- Improvement path: Preload next image while current is loading. Use `loading="lazy"` for thumbnails. Cache loaded images in memory

**Event Listener Accumulation:**
- Problem: Variant selection creates new click listeners on swatches every time `_showVariants()` is called (line 782)
- Files: `assets/configurator.js` (lines 752-793)
- Cause: If user changes product selection multiple times, multiple identical listeners stack up without removal
- Improvement path: Use event delegation on parent container instead of adding listeners to individual elements

**Synchronous Script Loading:**
- Problem: `theme.js` deferred, but GSAP and ScrollTrigger are also deferred without proper initialization wait
- Files: `layout/theme.liquid` (lines 63-66)
- Cause: `theme.js` may run before GSAP is loaded, causing scroll animations to fail silently
- Improvement path: Add explicit check that GSAP exists before initializing, or use module pattern with import (if using modern build)

**DOM Queries in Loops:**
- Problem: Many operations query the same elements repeatedly (e.g., `querySelectorAll('[data-action="select-model"]')` in _handleModelSelect, line 432)
- Files: `assets/configurator.js` (throughout)
- Cause: No caching of frequently-accessed DOM nodes
- Improvement path: Cache frequently-accessed node lists in `_cacheEls()` or create getter methods

## Fragile Areas

**Addon Title String Matching:**
- Files: `assets/configurator.js` (lines 582-587, 932-936, 1063, 1067)
- Why fragile: Oven addons (glass door, chimney) are found by checking if title includes keywords like 'glass', 'door', 'chimney'. If admin renames products, these break silently
- Safe modification: Store explicit addon type metadata on products (e.g., `addon_type: "glass-door"`) and match on that
- Test coverage: No tests for addon detection — could fail in production

**Currency Formatting Locale Hardcoding:**
- Files: `assets/configurator.js` (line 14: `toLocaleString('de-DE')` hardcoded)
- Why fragile: Only formats prices for German locale. If store expands to other countries, prices display incorrectly
- Safe modification: Read locale from `window.__shopCurrency` or Shopify shop settings and pass to formatter
- Impact: International customers see wrong currency formatting

**Size Extraction from Product Names:**
- Files: `assets/configurator.js` (lines 643-649)
- Why fragile: Regex patterns like `/\bXL\b/i` are fragile to naming variations. Middle Size "L" could be caught by "Large" text (though current logic tries to prevent this)
- Safe modification: Use metafield-based size classification instead of text parsing
- Test coverage: No automated tests for size extraction — easy to break with new product names

## Missing Critical Features

**No Configurator State Persistence:**
- Problem: Configurator state is lost on page refresh. User loses all 15-step progress if they navigate away
- Files: `assets/configurator.js` (state object, no localStorage implementation)
- Blocks: Users cannot complete complex configurations across sessions

**No Configuration Validation Before Cart:**
- Problem: User can add to cart with partial configuration. No check for required steps
- Files: `assets/configurator.js` (lines 1000-1035, `_handleAddToCart` only checks `size` and `baseVariantId`)
- Blocks: Invalid configurations can be added to cart, leading to incomplete orders

**No Configuration Summary Email:**
- Problem: Cart properties are added but not formatted for order confirmation email
- Files: `assets/configurator.js` (line 1046 adds config summary as property)
- Blocks: Customers don't see what they configured in order confirmation

**No Error Recovery for Failed Cart Addition:**
- Problem: If cart add fails, user gets error message but no clear next steps
- Files: `assets/configurator.js` (lines 1021-1023, 1031)
- Blocks: User may retry without understanding the failure cause

**No Accessibility for Custom Elements:**
- Problem: Custom configurator element lacks proper ARIA labels and semantic structure
- Files: `sections/configurator.liquid`, `assets/configurator.js`
- Blocks: Screen reader users cannot properly navigate the 15-step interface
- Impact: WCAG 2.1 AA compliance gap

## Test Coverage Gaps

**Configurator JavaScript Not Tested:**
- What's not tested: All 1184 lines of configurator logic (variant resolution, price calculation, state management, cart building)
- Files: `assets/configurator.js`
- Risk: Price miscalculations, wrong variants added to cart, state corruption on edge cases go undetected
- Priority: High — this is revenue-critical code

**Setup Scripts Not Integrated Tested:**
- What's not tested: Both setup scripts will succeed/fail silently without proper error handling
- Files: `scripts/setup-configurator.mjs`, `scripts/fix-collections.mjs`
- Risk: Incomplete product/collection setup without clear indication of what failed
- Priority: High — breaks configurator if incomplete

**Product Gallery Swipe on Touch Not Tested:**
- What's not tested: Touch swipe functionality in product gallery
- Files: `assets/theme.js` (lines 246-255)
- Risk: Swipe could fail silently on mobile devices, breaking product discovery
- Priority: Medium

**Mobile Responsive Configurator Not Tested:**
- What's not tested: Configurator layout on mobile (especially the sticky image panel)
- Files: `sections/configurator.liquid` (CSS grid changes at min-width: 990px)
- Risk: Layout could break on mobile/tablet devices
- Priority: Medium

## Scaling Limits

**Configurator with Many Add-on Products:**
- Current capacity: Tested with ~30 add-on products. Each step renders full product list
- Limit: At 100+ add-on products, step rendering becomes slow due to DOM manipulation overhead
- Scaling path: Implement pagination/lazy loading in product lists, or virtual scrolling for large collections

**Cart Payload Size:**
- Current: Cart items array can grow large with many nozzle options × quantities
- Limit: Shopify cart properties have size limits (max 200 bytes per property value)
- Scaling path: Compress configuration summary or use order notes instead of item properties

**Shopify API Rate Limits (Setup Scripts):**
- Current: Scripts use 550ms delay between requests (lines 77-79 in setup-configurator.mjs)
- Limit: If creating 1000+ products, setup takes hours
- Scaling path: Batch GraphQL mutations or use bulk operations API

## Dependencies at Risk

**GSAP (Animation Library) - External CDN:**
- Risk: Animations depend on cdn.jsdelivr.net being available and fast
- Impact: If CDN is down, scroll animations don't load; page still works but animations missing
- Migration plan: Either vendor GSAP locally or make animations optional/progressive enhancement

**External Font Loading:**
- Risk: Custom fonts loaded via `| font_face` filter in Shopify (layout/theme.liquid, lines 39-41)
- Impact: Font loading blocks rendering, FOUT/FOIT issues
- Migration plan: Use `font-display: swap` (already configured, good)

**Shopify REST API Version 2024-10:**
- Risk: API version will eventually deprecate
- Impact: Setup scripts will stop working when version is EOL
- Migration plan: Add version switching to environment variable, check Shopify EOL dates quarterly

## Code Quality Issues

**Mixed var/const/let in theme.js:**
- Files: `assets/theme.js` (uses `var` on line 213, 287, etc., and `const` elsewhere)
- Why it matters: Inconsistent scoping makes code harder to understand, potential for scope-related bugs

**Inconsistent Null Checks:**
- Files: `assets/configurator.js` (uses optional chaining `?.` but also bare array access `products[0]`)
- Why it matters: Pattern inconsistency makes code harder to review, easy to introduce regressions

**Unused Global Window References:**
- Files: `assets/theme.js` (line 235 exposes `window.__productGallery` globally without cleanup)
- Why it matters: Global state pollutes namespace, hard to track dependencies
- Fix approach: Use module pattern or export via explicit API

**Hard-to-Test Event Delegation:**
- Files: `assets/configurator.js` (all event handling in `_bindEvents` at line 358)
- Why it matters: Complex event logic tangled with DOM updates makes unit testing impossible without mocking browser APIs

---

*Concerns audit: 2026-02-20*
