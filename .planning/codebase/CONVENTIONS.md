# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Liquid template files use kebab-case with descriptive names: `main-product.liquid`, `trust-badges.liquid`, `collapsible-content.liquid`
- JavaScript files use camelCase: `theme.js`, `configurator.js`
- Liquid snippets stored in `snippets/` directory: `product-card.liquid`, `icon.liquid`
- Section files stored in `sections/` directory: `header.liquid`, `hero.liquid`, `footer.liquid`

**Functions:**
- JavaScript functions use camelCase: `getSelectedOptions()`, `findVariant()`, `onVariantChange()`, `goToSlide()`
- Private/internal methods in classes prefixed with underscore: `_cacheEls()`, `_renderSteps()`, `_bindEvents()`, `_handleModelSelect()`, `_handleSizeSelect()`
- Handler functions use descriptive names with `handle` prefix: `_handleProductSelect()`, `_handleCheckboxToggle()`, `_handleOvenTypeToggle()`, `_handleQtyChange()`
- Utility functions descriptive: `money()`, `initGSAPAnimations()`

**Variables:**
- DOM elements suffixed with `El`: `mainImage`, `imgLoader`, `ctaBtn`, `cartError`, `summaryList`
- Query selectors use data attributes: `[data-product-json]`, `[data-step]`, `[data-action]`, `[data-qty-selector]`
- State objects use camelCase: `selectedTier`, `baseVariantId`, `hydroNozzles`
- State maps and lookup objects use consistent naming: `stateMap`, `sizeMap`, `qtyMap`

**CSS Classes:**
- Block Element Modifier (BEM) pattern used throughout
- Block names: `product`, `header`, `cfg-card`, `testimonials`
- Elements use double underscore: `product__gallery`, `header__nav`, `cfg-card__info`
- Modifiers use double dash: `product__card--selected`, `is-open`, `is-active`, `cfg-card--model`
- State classes: `is-open`, `is-active`, `is-scrolled`, `faq__answer--open`

**Types/Constants:**
- Constant arrays defined at module scope: `STEPS` (uppercase for constants)
- Data structures use camelCase: `stateMap`, `variantMap`, `cardGroups`

## Code Style

**Formatting:**
- No explicit linting/formatting tool detected (no .eslintrc, .prettierrc, prettier.config.js)
- Uses functional programming conventions in vanilla JavaScript
- 2-space indentation for Liquid templates (visible in header.liquid)
- Template literals for string interpolation in JavaScript
- Semicolons used consistently in JavaScript

**Linting:**
- Not detected: No .eslintrc, eslint.config.js, or biome.json files
- Code follows common JavaScript style patterns organically (camelCase, descriptive names, proper spacing)

**IIFE Pattern:**
- Both main JavaScript files wrap code in IIFE with 'use strict': `(function () { 'use strict'; ... })()`
- Prevents global namespace pollution
- Protects against strict mode issues in embedded environments

**Variable Declaration:**
- Mix of `var`, `let`, and `const` used
- Modern code uses `const` for immutable values: `const header = document.querySelector()`
- `let` used for reassignable loop/counter variables: `let currentIndex = 0`
- Older code sections use `var`: `var gallery = document.querySelector()`, `var productVariants = []`

## Import Organization

**Not applicable:** This is a Shopify theme without build tools (no module imports, no bundler setup).

**Data attribute organization:**
- HTML structure uses semantic data attributes for DOM selection: `data-header`, `data-product-json`, `data-option-index`
- Event delegation uses `[data-action]` attributes with action type strings
- State containers use `[data-step]` for numbered step progression
- Configuration uses `[data-*-selector]` for interactive elements

## Error Handling

**Patterns:**
- Try-catch blocks for JSON parsing and async operations: `try { productVariants = JSON.parse(productJsonEl.textContent); } catch (e) { console.warn(...) }`
- Console warnings for non-fatal issues: `console.warn('AUROWE: Could not parse product variants JSON')`
- Console errors with context prefix for debugging: `console.error('[Configurator]', error)`
- Graceful fallbacks for missing DOM elements: `if (!element) return;` pattern used throughout
- Optional chaining for safe property access: `product?.variants?.[0]?.id || null`
- Fetch error handling with response checking: `if (!res.ok) { throw new Error(...) }`
- User-friendly error display via DOM: `_showError(msg)` method updates error message element

**Error recovery:**
- JSON parsing falls back silently with console warning, doesn't break execution
- Missing DOM elements handled with early returns
- Cart add failures show user message and restore button state
- Image loading errors handled with `onerror` callbacks

## Logging

**Framework:** Console (no logging library detected)

**Patterns:**
- Warning logs for configuration issues: `console.warn('AUROWE: Could not parse product variants JSON')`
- Error logs with context prefix: `console.error('[Configurator]', error)`
- Prefixed with theme/component name for clarity: `AUROWE:`, `[Configurator]`
- User-facing errors displayed in DOM, not just logged
- No debug/info level logging present

## Comments

**When to Comment:**
- Section headers use dashes and semicolons for visual separation: `/* ---- Sticky Header ---- */`
- Significant feature blocks get descriptive section headers
- Complex logic (like base product resolution) documented with explanatory comment blocks
- Data structure comments explain purpose: `// Store original button text early`
- Algorithm comments explain non-obvious logic: `// Find product matching size + oven type`

**JSDoc/TSDoc:**
- Not used: No JSDoc/TypeScript documentation format observed
- Comments are inline and minimal
- Focus is on clear, self-documenting code names

**Comment Style:**
- Single-line comments for clarifications: `// Close on link click`, `// Touch swipe support`
- Section dividers: `/* ---- Mobile Menu ---- */`
- No multi-line block documentation

## Function Design

**Size:**
- Functions typically 10-40 lines (utilities are shorter, handlers are medium)
- Private handler methods 20-50 lines (e.g., `_handleAddToCart`, `_buildCartItems`)
- Helper methods 5-15 lines for focused tasks

**Parameters:**
- Most functions take 0-3 parameters
- Configurator methods operate on instance state (`this.state`) rather than parameter passing
- Data retrieval methods accept single lookup key: `_getSelectedProductPrice(dataKey, stateKey)`
- Event handlers receive event target or data attributes

**Return Values:**
- Explicit returns for values, implicit `undefined` for void operations
- Utilities return computed values: `money()` returns formatted string, `findVariant()` returns object or undefined
- Void operations like DOM manipulation don't return values
- Private methods return `undefined` implicitly

## Module Design

**Exports:**
- No module exports: Code is organized as IIFE + custom elements
- Custom element class `HotTubConfigurator` defined globally and registered via `customElements.define()`
- Global functions: `initGSAPAnimations()`, `money()`, `updateFormQuantity()`, exposed via IIFE

**Barrel Files:**
- Not applicable: No module system, single-file scripts per feature

**Global Exposure:**
- Minimal globals: Only `money()` function and event handlers exposed within IIFE
- Custom element tag names discovered from DOM: `[data-cfg-tag]` attribute
- Global utilities attached to `window`: `window.__productGallery`, `window.__shopCurrency`
- Event delegation centered on `document` or component elements

**File Organization:**
- `assets/theme.js`: ~620 lines covering sticky header, navigation, carousels, product variants, GSAP animations
- `assets/configurator.js`: ~1184 lines for custom element class with 15-step product configurator
- Monolithic approach: All functionality in single file per feature

---

*Convention analysis: 2026-02-20*
