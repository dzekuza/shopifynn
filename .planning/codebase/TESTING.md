# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Not detected: No test runner configuration found (no jest.config.js, vitest.config.js, etc.)
- No unit test files present in codebase

**Assertion Library:**
- Not detected: Not applicable, no testing framework present

**Run Commands:**
- Not applicable: Testing infrastructure not configured

## Test File Organization

**Location:**
- No test files found in repository
- Single test file exists in `.claude/` directory: `.claude/get-shit-done/bin/gsd-tools.test.cjs` (internal tooling, not application tests)

**Naming:**
- Not applicable: No test files for application code

**Structure:**
- Not applicable: No test files for application code

## Test Coverage

**Requirements:** None enforced - testing framework not configured

**Current State:** No test coverage for `assets/theme.js` or `assets/configurator.js`

## Code Testability

**Observable patterns for future testing:**

**Pure Functions (Easily Testable):**
- `money(cents)` - formatter function, pure (line 13-16 in configurator.js)
- `_getSizeFromProduct(product)` - regex pattern matching, pure logic (line 643-649)
- `_isInternalOvenProduct(product)` - title parsing, deterministic (line 651-654)

**State Management (Testable with mocking):**
- Configurator class has isolated `this.state` object with clear initialization (line 41-73)
- State changes follow predictable patterns: `_handleModelSelect()`, `_handleSizeSelect()`, `_handleProductSelect()`
- Price calculation `_updatePrice()` (line 847-902) derives totals from state consistently

**DOM Interaction (Requires DOM Testing):**
- Event delegation via `addEventListener` and `querySelector` patterns
- Class toggle patterns for UI state: `classList.add()`, `classList.remove()`, `classList.toggle()`
- Attribute manipulation: `setAttribute('aria-expanded', value)`

**Async Operations (Can be mocked):**
- Fetch call for cart: `fetch('/cart/add.js')` with JSON body and error handling (line 1015-1024)
- Expects Shopify Cart API response

## Mocking Strategies (for Future Implementation)

**Framework:** No mocking framework configured, but patterns exist for:

**What to Mock:**
- DOM queries: `document.querySelector()`, `element.querySelectorAll()`
- Shopify APIs: `Shopify.formatMoney()` (line 333)
- Fetch calls: `/cart/add.js` endpoint (line 1015)
- External dependencies: GSAP library, ScrollTrigger plugin
- Local storage/session data: window variables like `window.__shopCurrency`

**What NOT to Mock:**
- Event handling logic (test with real event objects)
- Class toggling and DOM attribute changes
- State machine logic within configurator (`_resolveBaseProduct()`, `_updatePrice()`)
- Error handling paths (test catch blocks directly)

**Manual Testing Patterns Observable:**
- Configurator has public methods callable via Chrome DevTools: `document.querySelector('hot-tub-configurator')._handleAddToCart()`
- Price updates verify via DOM: `[data-total-price]` element
- State accessible via custom element: `customElement.state`

## Manual Testing Evidence

**Event System Testing:**
- Click handlers bound via event delegation on `[data-action]` attributes
- Keyboard support tested: Enter/Space key handling (line 407-413 in configurator.js)
- Touch events for swipe support with delta tracking (line 152-180 in theme.js)

**Integration Testing Patterns:**
- Product variant matching: `findVariant(selectedOptions)` (line 312-318)
- Gallery image syncing with variant: `window.__productGallery.goToSlide(i)` (line 377)
- Cart submission with full state conversion: `_buildCartItems()` builds 15+ item types

## Common Patterns for Testing

**Async Testing (Pattern Observable):**
- Async cart handler with try-catch: `async _handleAddToCart()` (line 1000-1035)
- State mutations then async operation pattern
- Button state management during async work (disable, text change, restore)

```javascript
// Pattern from configurator:
this.ctaBtn.disabled = true;
const originalText = this.ctaBtn.textContent;
this.ctaBtn.textContent = 'Adding…';

try {
  const res = await fetch('/cart/add.js', { ... });
  if (!res.ok) throw new Error(...);
  this.ctaBtn.textContent = '✓ Added to Cart!';
  // ... success handling
} catch (error) {
  console.error('[Configurator]', error);
  this._showError(error.message);
} finally {
  this.ctaBtn.textContent = originalText;
  this.ctaBtn.disabled = false;
}
```

**Error Testing (Observable Patterns):**
- JSON parse with try-catch fallback: `try { productVariants = JSON.parse(...) } catch (e) { console.warn(...) }`
- Graceful missing element handling: `if (!element) return;` guards throughout
- User error display: `_showError()` called with message string
- State validation before operations: `if (!this.state.size || !this.state.baseVariantId) { _showError(...); return; }`

## Testing Gaps & Recommendations

**Critical Untested Areas:**
1. **Product variant resolution logic** (`_resolveBaseProduct()` line 680-716)
   - Complex matching algorithm with fallback behavior
   - Multiple conditional branches for oven type availability
   - High impact on cart functionality

2. **Price calculation** (`_updatePrice()` line 847-902)
   - 15+ different add-on types combined in single calculation
   - State-driven logic vulnerable to regressions
   - Directly affects revenue

3. **Cart item construction** (`_buildCartItems()` line 1037-1127)
   - Maps complex state to Shopify API format
   - Missing single item causes cart failure
   - 13 distinct cart line items possible

4. **Event delegation system** (line 359-417 in configurator.js)
   - Multiple action types handled in single switch
   - Keyboard and click handling interleaved
   - Accessibility relies on aria-* attribute updates

5. **Sticky header and animations** (theme.js lines 10-187)
   - Scroll event listeners with DOM mutations
   - GSAP integration with ScrollTrigger
   - No explicit error handling for missing GSAP

**Recommended Test Structure (If Framework Added):**
- Unit tests for pure functions (`money()`, `_getSizeFromProduct()`, `_isInternalOvenProduct()`)
- State machine tests for configurator handlers
- Integration tests for cart flow
- E2E tests for complete product configuration → cart journey

**Testing Challenges:**
- Heavy DOM dependency requires DOM testing library (jsdom, Playwright, etc.)
- GSAP/ScrollTrigger interaction requires animation timing tests
- Shopify API responses need mocking
- Touch event testing requires special handling

---

*Testing analysis: 2026-02-20*
