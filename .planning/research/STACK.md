# Stack Research

**Domain:** Shopify Liquid theme hardening — security, configurator stabilization, performance, visual polish
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (vanilla JS/CSS/Liquid ecosystem is stable; specific library versions verified against cdnjs and official releases)

---

## Context

This is a **subsequent milestone** research file. The existing stack (Shopify Liquid, vanilla JS, vanilla CSS, GSAP) is fixed and not changing. The question is: which specific patterns, techniques, and minimal external libraries should be adopted to harden security, stabilize the configurator Web Component, improve performance, and polish visuals — all without introducing build tools or bundlers.

No npm install. No webpack. No preprocessors. Everything loads via Shopify CDN (`| asset_url`) or a trusted external CDN.

---

## Recommended Stack

### Core Technologies (Existing — Carry Forward)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Shopify Liquid | Runtime (2024-10 API) | Server-side templating, section rendering | Platform requirement; no alternative |
| Vanilla JS (ES6+) | N/A (browser native) | All client-side interactivity | Constraint per project; no frameworks |
| Vanilla CSS3 | N/A (browser native) | All styling via CSS custom properties | Constraint per project; no preprocessors |
| GSAP | **3.13.0** | Scroll animations, transitions | Already in use; 3.13 released all plugins as free, stable ScrollTrigger |

**GSAP version note:** The search against cdnjs confirmed **3.13.0** is the current stable release on cdnjs (as of Feb 2026). The project currently uses `gsap@3` without a pinned version via jsDelivr. Pin to `3.13.0` explicitly to prevent surprise breakage on minor updates. GSAP is now completely free including commercial use (Webflow acquisition, 2024). Confidence: HIGH (cdnjs verified).

---

### Security Libraries

#### DOMPurify — XSS Sanitization

| Library | Version | CDN URL | Purpose |
|---------|---------|---------|---------|
| DOMPurify | **3.2.7** | `https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js` | Sanitize any HTML string before setting via innerHTML |

**Why DOMPurify, not alternatives:**

The configurator sets `innerHTML` in at least 15 places (lines 150, 157, 203, 216, 233, 265, 271, 329, 336, 341, 667, 765, 771, 959, 983 of `assets/configurator.js`). Most of this content comes from Shopify product data (titles, descriptions, metafields) which is controlled — not user-typed input — so the XSS risk is conditional on a Shopify admin account being compromised. However, **best practice requires sanitizing any string set as HTML**, including API-sourced content.

DOMPurify is the industry-standard choice:
- Maintained by cure53 (security specialists)
- Pure browser JS — no Node.js, no build step, loads from CDN
- 3.x API is stable: `DOMPurify.sanitize(dirtyString)` returns a safe string
- ~30KB minified — negligible on a Shopify store
- Version 3.2.7 verified against cdnjs (Feb 2026). Confidence: HIGH.

**Do NOT use:** `sanitize-html` (Node.js-oriented, requires bundler), the native `Sanitizer API` (still experimental, not in Safari as of 2026 — LOW confidence on readiness), or rolling a custom escaping function (the existing `_escAttr()` at line 1163 proves why this is inadequate).

**Usage pattern:**
```javascript
// Replace: element.innerHTML = someString;
// With:
element.innerHTML = DOMPurify.sanitize(someString);

// For plain text (titles, prices) — no sanitizer needed, just use:
element.textContent = someString;
```

**Rule:** Use `textContent` for text-only content. Reserve `DOMPurify.sanitize()` for content that genuinely contains markup (e.g., product descriptions with `<strong>` tags). Eliminate `innerHTML` entirely for plain strings.

---

#### Credential Management

No library needed. This is a process/workflow fix:

**Pattern (MEDIUM confidence — verified against GitHub Docs and Shopify partner docs):**

1. **Immediate:** Rotate all exposed Shopify API credentials in Shopify Admin (Partner Dashboard → Apps → rotate secret). The `.env` file and hardcoded values in `scripts/setup-configurator.mjs` lines 10-13 must be treated as compromised.

2. **Remove from git history:** Use `git-filter-repo` (the modern replacement for `git filter-branch`, officially recommended by GitHub Docs as of 2025).
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path ".env" --path-glob "scripts/setup-configurator.mjs"
   # Then force-push; all collaborators must re-clone
   ```
   Note: `git filter-branch` still works but is slower and deprecated by Git team. Use `git-filter-repo`.

3. **Going forward:** `.env` in `.gitignore` only. Add `.env.example` showing required variable names without values. Use environment variables in CI/CD via GitHub Secrets (if added to pipeline). For Node scripts, `process.env.CLIENT_SECRET` — never hardcoded strings.

4. **Shopify theme context:** Theme JS files served to browsers must NEVER contain API credentials. The `window.__shopCurrency` pattern (currently used) is safe for non-sensitive shop config. Keep that pattern, extend carefully.

---

### CSS Architecture

No new libraries. Pattern changes only.

#### Cascade Layers (`@layer`)

**Why:** The existing `assets/theme.css` is ~3800 lines with no organizational structure beyond comments. Specificity conflicts are managed by source order — fragile and hard to debug. CSS `@layer` is now baseline-supported (Chrome 99+, Firefox 97+, Safari 15.4+). Confidence: HIGH (MDN verified).

**Recommended layer order for `assets/theme.css`:**
```css
@layer reset, base, tokens, layout, components, sections, utilities, overrides;
```

This means:
- `reset` — browser normalization (lowest priority)
- `base` — element defaults (body, h1-h6, a, etc.)
- `tokens` — CSS custom properties / design tokens (`:root {}` variables)
- `layout` — grid, container, structural patterns
- `components` — buttons, cards, product-card
- `sections` — section-specific overrides (hero, configurator, etc.)
- `utilities` — single-purpose helpers
- `overrides` — one-off fixes (highest priority, use sparingly)

**When to adopt:** Do NOT refactor the entire 3800-line file into layers in one pass — this is a progressive enhancement. Apply layers when extracting the configurator CSS to `assets/configurator.css`.

#### Configurator CSS Extraction

**Current problem:** `sections/configurator.liquid` contains ~900 lines of CSS in a `{% stylesheet %}` block. This CSS cannot be cached by the browser and is re-parsed on every page load.

**Fix:** Extract to `assets/configurator.css` and load via:
```liquid
{{ 'configurator.css' | asset_url | stylesheet_tag }}
```
Load this only on the configurator page template (`templates/page.configurator.json`) by adding it to the section schema, not globally in `layout/theme.liquid`. Shopify's CDN caches asset files — this is a material performance win.

#### `@property` for Animatable Custom Properties

**Why:** The existing CSS uses custom properties for color tokens (`--color-primary`, etc.) and GSAP animations. `@property` enables typed, animatable custom properties with defined initial values and inheritance. Baseline supported (Chrome 85+, Firefox 128+, Safari 16.4+). Confidence: HIGH (MDN verified).

**Use for:** Transition animations on color variables (e.g., hover state color fades) and progress indicators in the configurator. Not required for the existing static token use.

---

### JavaScript Architecture Patterns

No new libraries. Patterns only.

#### Event Delegation (Replace Per-Element Listeners)

**Problem (from CONCERNS.md):** `_showVariants()` adds click listeners to individual swatch elements every call. Multiple calls stack duplicate listeners.

**Fix:** Delegate to the nearest stable parent container.
```javascript
// Replace: element.addEventListener('click', handler) in a loop
// With:
container.addEventListener('click', (e) => {
  const swatch = e.target.closest('[data-swatch]');
  if (!swatch) return;
  handleSwatchClick(swatch);
});
```
Event delegation on a single parent element handles all children, survives DOM re-renders, and requires one `removeEventListener` to clean up. This is the standard Web Component pattern recommended by webcomponents.org. Confidence: HIGH.

#### DOM Node Caching

**Problem:** `querySelectorAll('[data-action="select-model"]')` called repeatedly in loops.

**Fix:** Cache in `connectedCallback` or a `_cacheEls()` method:
```javascript
_cacheEls() {
  this._els = {
    modelCards: this.querySelectorAll('[data-action="select-model"]'),
    stepPanels: this.querySelectorAll('[data-step]'),
    priceDisplay: this.querySelector('[data-price]'),
  };
}
```
Update cache only when the DOM structure changes (after full re-render), not on every state update. Confidence: HIGH (established performance pattern).

#### Image Preloading for Configurator Steps

**Problem:** Every variant change reloads the main image with animation overhead — no preloading.

**Pattern (HIGH confidence — browser native, no library):**
```javascript
// Preload next image while current is displayed
function preloadImage(src) {
  const img = new Image();
  img.src = src;
  // Browser fetches and caches it; no DOM insertion needed
}

// Call preloadImage() with the NEXT step's image src when entering current step
```

For thumbnails, add `loading="lazy"` to `<img>` elements. The native `loading="lazy"` attribute is Baseline-supported and requires zero JS. Confidence: HIGH (MDN).

#### Price Calculation Consolidation

**Problem:** Price logic duplicated between UI display (lines 847-902) and cart building (lines 1037-1127).

**Pattern:**
```javascript
// Single source of truth
function calculateTotalCents(state) {
  let total = state.baseVariantPrice || 0;
  for (const addon of state.selectedAddons) {
    total += addon.price * (addon.quantity || 1);
  }
  return total;
}

// Both UI and cart call this:
priceDisplay.textContent = money(calculateTotalCents(this._state));
// and
cartPayload.price = calculateTotalCents(this._state);
```

Confidence: HIGH (basic refactor pattern, no library dependency).

#### GSAP + Deferred Script Race Fix

**Problem (from CONCERNS.md):** `theme.js` may run before GSAP loads because both use `defer`. `defer` scripts execute in document order but GSAP and ScrollTrigger are separate tags — race condition possible.

**Fix:** Check for GSAP existence before initializing scroll animations:
```javascript
// In theme.js, wrap animation init:
function initAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // Retry after short delay — or use a MutationObserver on script load
    setTimeout(initAnimations, 100);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  // ... setup animations
}
document.addEventListener('DOMContentLoaded', initAnimations);
```

Alternatively (cleaner): Make GSAP load synchronous (no `defer`) and keep `theme.js` as `defer`. Since GSAP is CDN-hosted and small, this is acceptable. Confidence: MEDIUM (verified approach, specific GSAP/Shopify interaction not in official docs).

---

### Metafield-Based Product Lookups (Configurator Stabilization)

No new libraries. Shopify Liquid metafields are the platform-native solution.

**Problem:** Configurator resolves product size and oven type via regex on product titles (`/\bXL\b/i`) — fragile to any naming change.

**Solution:** Use Shopify metafields in the `configurator.*` namespace (already partially used) to store explicit classification:

```liquid
{{- product.metafields.configurator.size | json -}}
{{- product.metafields.configurator.oven_type | json -}}
{{- product.metafields.configurator.addon_type | json -}}
```

Metafield types supported: `single_line_text_field`, `json`, `boolean`. For the configurator, use `single_line_text_field` with controlled vocabulary: `"XL"`, `"L"`, `"M"` for size; `"external"`, `"internal"` for oven_type. These are set via the `scripts/setup-configurator.mjs` provisioning script (already exists) — add metafield definitions there.

**Access in JS:** The `snippets/configurator-product-json.liquid` snippet already serializes product data to JSON for the configurator. Add metafield values to that serialization:
```liquid
"size": {{ product.metafields.configurator.size | json }},
"oven_type": {{ product.metafields.configurator.oven_type | json }},
"addon_type": {{ product.metafields.configurator.addon_type | json }}
```

Confidence: HIGH (Shopify official docs confirm `product.metafields.namespace.key.value` syntax).

---

### Locale-Aware Currency Formatting

**Problem:** `toLocaleString('de-DE')` hardcoded at line 14 of `configurator.js`. Breaks for non-German locales.

**Fix (no library needed):**
```javascript
// Read from Shopify's injected shop data
const LOCALE = window.Shopify?.locale || 'de-DE';
const CURRENCY = window.__shopCurrency || 'EUR';

function money(cents) {
  return (cents / 100).toLocaleString(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  });
}
```

`window.Shopify.locale` is set by Shopify on all theme pages. `window.__shopCurrency` is already injected by this theme's `layout/theme.liquid`. Confidence: MEDIUM (Shopify global `window.Shopify` is a de facto standard but not formally documented as a theme API contract).

---

### Configurator Step Validation

No library. Pure JS pattern.

**Problem:** User can add incomplete configuration to cart — only `size` and `baseVariantId` are checked.

**Pattern:**
```javascript
const REQUIRED_STEPS = ['model_size', 'liner', 'oven']; // steps that block cart add

function validateConfiguration(state) {
  const missing = REQUIRED_STEPS.filter(key => !state[key]);
  return { valid: missing.length === 0, missing };
}

// In _handleAddToCart:
const { valid, missing } = validateConfiguration(this._state);
if (!valid) {
  this._showValidationError(missing);
  return;
}
```

Confidence: HIGH (standard form validation pattern).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| DOMPurify 3.2.7 | Native Sanitizer API | Sanitizer API is still experimental in 2026; no Safari support confirmed — LOW confidence on browser readiness. DOMPurify is battle-tested and ~30KB. |
| DOMPurify 3.2.7 | Custom escaping function | The existing `_escAttr()` proves this approach fails — it's incomplete. Security libraries should be written by security experts. |
| `git-filter-repo` | `git filter-branch` | `filter-branch` is deprecated by Git team, slower, and prone to mistakes. `filter-repo` is the official GitHub-recommended replacement (2025). |
| CSS `@layer` | PostCSS/SCSS layer plugins | Adding PostCSS violates the "no build tools" constraint. `@layer` is native CSS, Baseline-supported. |
| Event delegation | AbortController for cleanup | Both are valid; delegation is simpler for a Web Component that owns its DOM tree. AbortController is better when listeners cross component boundaries. |
| Native `loading="lazy"` | vanilla-lazyload library | Native is zero-JS, Baseline-supported, adequate for this use case. The library adds value only for complex lazy-load patterns (backgrounds, videos). |
| GSAP 3.13.0 (pinned) | CSS scroll-driven animations | CSS scroll-driven animations (animation-timeline: scroll()) are Baseline 2024 and compelling, but they don't have the composability GSAP provides for the existing multi-element orchestration. Keep GSAP; add native scroll animations for simple parallax only. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `innerHTML` with unsanitized strings | DOM XSS vector. OWASP Rule #1: never insert untrusted data as HTML. The configurator has 15+ innerHTML assignments that need audit. | `textContent` for plain text; `DOMPurify.sanitize()` for markup strings |
| Custom HTML escape functions | Incomplete by definition — the existing `_escAttr()` misses dozens of HTML entities. Security escaping must be exhaustive or it fails. | DOMPurify |
| Hardcoded API credentials in source files | Any repo access (including compromised git clone, GitHub breach, or leaked archive) exposes full Shopify admin. Already the case in this codebase. | Environment variables + `.gitignore` + `git-filter-repo` history rewrite + credential rotation |
| `var` keyword in new JS | Function-scoped, hoisted — causes bugs in async/callback-heavy code. The existing theme.js mixes `var` and `const`, a code smell. | `const` by default, `let` when reassignment needed |
| `eval()` and `new Function(string)` | Primary XSS escalation path. Not currently in use — ensure it stays that way. | No alternative exists: redesign if you think you need eval |
| `innerHTML = template literals with user data` | Even with escaping, string concatenation into HTML is error-prone. A missed escape anywhere is a vulnerability. | createElement + setAttribute + textContent (DOM builder pattern) |
| Loading GSAP without a pinned version (`gsap@3`) | jsDelivr resolves `@3` to latest 3.x — a future 3.x update could introduce breaking changes. | `gsap@3.13.0` (explicit pin) |
| External CDN scripts without SRI (Subresource Integrity) | CDN compromise could inject malicious JS. Low probability but real risk for production stores. | Add `integrity` and `crossorigin` attributes to CDN script tags |

---

## Stack Patterns by Scenario

**When content is plain text (product titles, prices, option labels):**
- Use `element.textContent = value` — zero risk, zero overhead

**When content contains trusted markup from Shopify (product descriptions with `<strong>`, `<em>`):**
- Use `element.innerHTML = DOMPurify.sanitize(value, { ALLOWED_TAGS: ['strong', 'em', 'p', 'br'] })`
- Define an explicit allowlist — don't use defaults blindly

**When building DOM elements programmatically:**
```javascript
const card = document.createElement('div');
card.className = 'option-card';
card.setAttribute('data-id', product.id); // Safe for non-event attributes
const title = document.createElement('span');
title.textContent = product.title;          // Safe for text
card.appendChild(title);
```

**When animating on scroll:**
- Simple single-element fade-in: prefer CSS `@keyframes` + `animation-timeline: scroll()` (zero JS, no library)
- Multi-element orchestration, staggered timelines, scrub effects: use GSAP ScrollTrigger (already loaded)

**When handling resize or scroll events:**
- Always debounce: `let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(handler, 150); })`
- For scroll events that drive visual updates: use `requestAnimationFrame` to batch reads/writes

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| GSAP | 3.13.0 | ScrollTrigger 3.13.0 | Must match — always load same version. cdnjs URLs: `gsap@3.13.0/dist/gsap.min.js` and `gsap@3.13.0/dist/ScrollTrigger.min.js` |
| DOMPurify | 3.2.7 | All modern browsers | No dependencies. Load before configurator.js. |
| CSS `@layer` | Baseline | Chrome 99+, Firefox 97+, Safari 15.4+ | All modern browsers. No IE11 consideration for a 2026 Shopify store. |
| `@property` | Baseline | Chrome 85+, Firefox 128+, Safari 16.4+ | Modern browsers. Use as progressive enhancement for animatable tokens. |
| Native `loading="lazy"` | Baseline | Chrome 77+, Firefox 75+, Safari 15.4+ | No JS required. Add to img tags directly in Liquid. |

---

## Installation

No package manager installs for the theme itself. CDN-loaded additions:

```html
<!-- In layout/theme.liquid — BEFORE configurator.js and theme.js -->
<!-- DOMPurify: add integrity hash for production SRI -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js"
        crossorigin="anonymous"></script>

<!-- GSAP (update from unpinned @3 to explicit version) -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
```

For credential management (one-time fix, not ongoing dependency):
```bash
pip install git-filter-repo
# Then run history rewrite (see credential management section above)
```

---

## Sources

- [OWASP DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html) — Safe DOM APIs, innerHTML alternatives. HIGH confidence.
- [DOMPurify on cdnjs](https://cdnjs.com/libraries/dompurify) — Version 3.2.7 confirmed current. HIGH confidence.
- [GSAP on cdnjs](https://cdnjs.com/libraries/gsap) — Version 3.13.0 confirmed current. HIGH confidence.
- [GSAP 3.13 Release Notes](https://gsap.com/blog/3-13/) — Free for all uses including commercial; all plugins public. HIGH confidence.
- [GitHub Docs — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) — git-filter-repo as recommended tool. HIGH confidence.
- [Shopify Liquid metafield object docs](https://shopify.dev/docs/api/liquid/objects/metafield) — Namespace access syntax confirmed. HIGH confidence.
- [MDN — CSS @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) — Browser support matrix. HIGH confidence.
- [MDN — @property](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule/property) — Typed custom properties, browser support. HIGH confidence.
- [MDN — loading="lazy"](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading) — Native lazy loading pattern. HIGH confidence.
- [WebSearch: GSAP Shopify integration patterns](https://gsap.com/community/forums/topic/27203-getting-started-with-shopify-and-gsap/) — Deferred loading pattern. MEDIUM confidence.
- [WebSearch: Shopify credential security best practices](https://www.shopify.com/uk/partners/blog/building-secure-shopify-apps) — OAuth2, env var patterns. MEDIUM confidence.
- [WebSearch: CSS @layer for large themes 2025](https://www.lexo.ch/blog/2025/11/css-cascade-layers-a-practical-guide-to-the-layer-rule-for-better-style-management/) — Layer structure recommendations. MEDIUM confidence (single blog source, MDN confirms browser support).

---

*Stack research for: Aurowe Shopify theme hardening — security, configurator stabilization, performance, visual polish*
*Researched: 2026-02-20*
