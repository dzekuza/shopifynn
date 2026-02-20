# Phase 8: CSS Architecture & theme.js Cleanup — Research

**Researched:** 2026-02-20
**Domain:** Shopify Liquid theme asset management, CSS extraction, JavaScript modernization
**Confidence:** HIGH

---

## Summary

Phase 8 closes two architectural gaps that were logged during earlier phases but never resolved. The first gap is that configurator CSS was supposed to be extracted to `assets/configurator.css` — this was explicitly scoped and deferred when Phase 2 added CSS to the `{% stylesheet %}` block as a workaround. The second gap is that `theme.js` contains 24 `var` declarations scattered across the Product Gallery and Variant Picker sections, a mix that was introduced when prior tooling partially modernized the file.

Both tasks are purely mechanical: no logic changes are required, no new libraries needed, and the success criteria are binary (file exists / no `var` remains). The Liquid conditional loading pattern is already in place in `theme.liquid` (`{% if template.suffix == 'configurator' %} {{ 'configurator.css' | asset_url | stylesheet_tag }} {% endif %}`), so the infrastructure for ARCH-02 is done — the file just needs to be created. The `{% style %}` block (lines 260–263) that holds dynamic Liquid variable styles must stay in `configurator.liquid`; only the static `{% stylesheet %}` block (lines 11–258, ~18 KB) moves to the asset file.

**Primary recommendation:** Extract the `{% stylesheet %}` block verbatim to `assets/configurator.css`, delete the block from `configurator.liquid`, then do a single-pass `var`→`const`/`let` replacement in `theme.js` following reassignment semantics.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Extract configurator CSS from section `{% stylesheet %}` block to `assets/configurator.css` | ~18 KB of static CSS on lines 11–258 of `sections/configurator.liquid` ready to copy verbatim. No Liquid expressions inside the block — pure CSS only. |
| ARCH-02 | Load `configurator.css` conditionally only on configurator template | Already implemented in `layout/theme.liquid` lines 51–53: `{% if template.suffix == 'configurator' %}{{ 'configurator.css' | asset_url | stylesheet_tag }}{% endif %}`. Requires only that the asset file exists. |
| ARCH-04 | Clean up `var`/`const`/`let` inconsistency in `theme.js` | 24 `var` declarations located entirely within the Product Gallery block (lines 250–260) and Variant Picker/Color Swatches block (lines 296–426). All are straightforward `const`/`let` replacements. |
</phase_requirements>

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Shopify Liquid `{% stylesheet %}` | Built-in | Section-scoped CSS rendered inline or as asset | Theme platform feature |
| `asset_url` + `stylesheet_tag` filters | Built-in | Generate CDN URL and `<link>` tag for asset files | Official Shopify theme pattern |
| Vanilla JavaScript `const`/`let` | ES6 | Modern variable declarations | Replaces `var` which has function-scoped hoisting semantics |

### No External Dependencies

This phase requires zero new libraries. It is file manipulation and keyword replacement only.

---

## Architecture Patterns

### Shopify `{% stylesheet %}` vs `{% style %}` vs `assets/*.css`

Shopify Liquid sections support two CSS mechanisms:

| Mechanism | Behavior | Use for |
|-----------|----------|---------|
| `{% stylesheet %}` | Shopify concatenates all section `{% stylesheet %}` blocks and injects them as a single `<style>` tag (or inline per-section) in the page `<head>`. NOT cacheable per-asset. | Static CSS that doesn't need Liquid interpolation |
| `{% style %}` | Rendered inline per section render, supports Liquid expressions | CSS that requires dynamic Liquid values (e.g., `{{ section.settings.background_color }}`) |
| `assets/*.css` | Separate file, served from Shopify CDN with long-lived cache headers, loaded via `asset_url` | Large, static CSS files that benefit from HTTP caching |

**Implication for ARCH-01:** The `{% stylesheet %}` block in `configurator.liquid` (lines 11–258) contains **zero Liquid expressions** — it is pure static CSS. This is safe to extract verbatim to `assets/configurator.css`. The `{% style %}` block (lines 260–263) uses `{{ section.settings.background_color }}` and `{{ section.settings.padding_top }}` — this must remain in `configurator.liquid` as-is.

### Conditional Asset Loading in theme.liquid

**Pattern already in use** (lines 51–53 of `layout/theme.liquid`):

```liquid
{% if template.suffix == 'configurator' %}
  {{ 'configurator.css' | asset_url | stylesheet_tag }}
{% endif %}
```

**Key decision from STATE.md:** `template.suffix == 'configurator'` is the correct check because `templates/page.configurator.json` has suffix `configurator` and name `page`. Using `template.name` would check for `page`, which would load the CSS on all pages. This is already implemented correctly — no changes needed.

**404 risk:** If `configurator.css` does not exist in the assets folder, Shopify will serve a 404 for the stylesheet request on the configurator page. Currently the conditional is live in `theme.liquid` but `assets/configurator.css` does not exist — this is the active bug ARCH-01 fixes.

### `var` → `const`/`let` Replacement Semantics

The 24 `var` declarations in `theme.js` fall into two scoping groups. Correct replacement requires checking reassignment:

**Rule:** Use `const` when a binding is never reassigned after initialization. Use `let` when it is reassigned (e.g., `touchStartX = e.touches[0].clientX` inside a listener callback, or `hiddenSelect = hiddenSelect.querySelector(...)` as a chained reassignment).

**Confirmed `var` locations and correct replacement:**

| Line | Declaration | Correct replacement | Reason |
|------|-------------|---------------------|--------|
| 250 | `var touchStartX = 0;` | `let touchStartX` | Reassigned in touchstart listener (line 253) |
| 251 | `var track = gallery.querySelector(...)` | `const track` | Never reassigned |
| 255 | `var diff = touchStartX - e.changedTouches[0].clientX;` | `const diff` | Never reassigned after initialization |
| 296 | `var productVariants = [];` | `let productVariants` | Reassigned on line 301: `productVariants = JSON.parse(...)` |
| 297 | `var productJsonEl = document.querySelector(...)` | `const productJsonEl` | Never reassigned |
| 308 | `var addToCartBtn = document.querySelector(...)` | `const addToCartBtn` | Never reassigned |
| 314 | `var options = [];` | `const options` | Only `.push()` called, binding not reassigned |
| 330 | `var selectedOptions = getSelectedOptions();` | `const selectedOptions` | Never reassigned |
| 331 | `var matchedVariant = findVariant(selectedOptions);` | `const matchedVariant` | Never reassigned |
| 336 | `var variantInput = document.querySelector(...)` | `const variantInput` | Never reassigned |
| 340 | `var priceEl = document.querySelector(...)` | `const priceEl` | Never reassigned |
| 346 | `var compareEl = document.querySelector(...)` | `const compareEl` | Never reassigned |
| 347 | `var saveBadge = document.querySelector(...)` | `const saveBadge` | Never reassigned |
| 354 | `var saved = ((...) / 100).toLocaleString(...)` | `const saved` | Never reassigned |
| 364 | `var btn = document.querySelector(...)` | `const btn` | Never reassigned |
| 376 | `var url = new URL(window.location.href);` | `const url` | Never reassigned (`.searchParams.set` mutates object, not binding) |
| 382 | `var galleryImages = document.querySelectorAll(...)` | `const galleryImages` | Never reassigned |
| 383 | `var filename = matchedVariant.featured_image.src.split(...)[...]` | `const filename` | Never reassigned |
| 384 | `for (var i = 0; ...)` | `for (let i = 0; ...)` | Loop counter requires mutable binding |
| 402 | `var value = swatch.dataset.value;` | `const value` | Never reassigned |
| 405 | `var group = swatch.closest('.product__swatches');` | `const group` | Never reassigned |
| 412 | `var hiddenSelect = swatch.closest('.product__option');` | `let hiddenSelect` | Reassigned on line 413: `if (hiddenSelect) hiddenSelect = hiddenSelect.querySelector(...)` |
| 420 | `var optionWrap = swatch.closest('.product__option');` | `const optionWrap` | Never reassigned |
| 422 | `var valueLabel = optionWrap.querySelector(...)` | `const valueLabel` | Never reassigned |

**Summary by type:**
- `const` replacements: 19
- `let` replacements: 4 (`touchStartX`, `productVariants`, loop `i`, `hiddenSelect`)
- Total: 23 `var` keyword occurrences (line 384's `for (var i` counts as 1)

**Note from STATE.md history:** An earlier decision (commit 01-01) noted that `hiddenSelect` uses `let` because it is reassigned via chained `querySelector`. This is consistent with the analysis above.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS delivery for Shopify sections | Custom bundler or concatenation script | Shopify `assets/` + `asset_url` filter | Shopify CDN handles delivery, versioning, and caching automatically |
| `var` detection | Manual grep and case analysis | Direct audit using `grep -n "\bvar\b"` output | Already done — 24 occurrences fully catalogued above |

---

## Common Pitfalls

### Pitfall 1: Leaving Liquid Expressions in the Extracted CSS

**What goes wrong:** If any `{{ ... }}` or `{% ... %}` Liquid syntax were in the `{% stylesheet %}` block, copying it verbatim to a `.css` file would result in literal braces appearing in the output rather than being evaluated.

**Why it happens:** Confusion between `{% stylesheet %}` (static) and `{% style %}` (Liquid-evaluated).

**How to avoid:** The `{% stylesheet %}` block in `configurator.liquid` has been audited — it contains **zero** Liquid expressions. All 247 lines (11–258) are pure CSS. Safe to copy verbatim.

**Warning signs:** Any `{{` or `{%` substring in the extracted CSS content.

### Pitfall 2: Deleting the `{% style %}` Block Instead of Only `{% stylesheet %}`

**What goes wrong:** The `{% style %}` block (lines 260–263) uses `{{ section.settings.background_color }}` and `{{ section.settings.padding_top }}` / `{{ section.settings.padding_bottom }}`. Removing it would break the section's theme-editor-controlled background color and padding.

**Why it happens:** Both blocks are adjacent and look similar; a careless selection deletes both.

**How to avoid:** Delete only lines 11–258 (`{% stylesheet %}` through `{% endstylesheet %}`). Lines 260–263 (`{% style %}` through `{% endstyle %}`) must remain.

### Pitfall 3: Using `const` for a Reassigned Binding

**What goes wrong:** In strict mode (`'use strict'` at line 6 of `theme.js`), assigning to a `const` binding throws a `TypeError` at runtime.

**Why it happens:** `var` and `const` look similar when scanning code, and the reassignment may be in a different closure scope.

**How to avoid:** Use the per-line analysis table above. The two non-obvious cases are `touchStartX` (reassigned in a listener, not at declaration site) and `hiddenSelect` (reassigned on the very next line via guard).

### Pitfall 4: `for (const i = 0; ...)` in a Loop Counter

**What goes wrong:** `for (const i = 0; i < len; i++)` throws immediately because `i++` attempts to reassign a `const`.

**Why it happens:** Blindly replacing all `var` with `const`.

**How to avoid:** Loop counters always use `let`. Line 384: `for (let i = 0; i < galleryImages.length; i++)`.

### Pitfall 5: 404 Already Live in Production

**What goes wrong:** The `{% if template.suffix == 'configurator' %}` conditional that loads `configurator.css` is already in `layout/theme.liquid` (verified). But `assets/configurator.css` does not exist (verified via `ls assets/`). This means the configurator page is currently requesting a non-existent file.

**Why it happens:** The conditional was added in an earlier phase, but the CSS extraction was deferred.

**How to avoid:** Creating `assets/configurator.css` with the extracted content resolves this immediately. No changes to `theme.liquid` are needed.

---

## Code Examples

### Extracting the {% stylesheet %} Block

Source in `sections/configurator.liquid` lines 11–258:
```liquid
{% stylesheet %}
  /* ── Layout ── */
  .cfg { display: block; width: 100%; ... }
  /* ... ~18 KB of CSS ... */
  .cfg-sticky-bar__cta:disabled { opacity: .45; cursor: not-allowed; }
{% endstylesheet %}
```

Target file `assets/configurator.css`:
```css
/* ── Layout ── */
.cfg { display: block; width: 100%; ... }
/* ... same CSS, no {% %} wrappers ... */
.cfg-sticky-bar__cta:disabled { opacity: .45; cursor: not-allowed; }
```

The Liquid tag lines themselves (`{% stylesheet %}` and `{% endstylesheet %}`) are removed; the CSS content between them is copied verbatim.

### Keeping the {% style %} Block in configurator.liquid

This block remains unchanged after extraction:
```liquid
{% style %}
  .cfg-{{ cfg_id }} { background-color: {{ section.settings.background_color }}; }
  .cfg-{{ cfg_id }} .cfg__wrap { padding-top: {{ section.settings.padding_top }}px; padding-bottom: {{ section.settings.padding_bottom }}px; }
{% endstyle %}
```

### Representative var → const/let Replacements

```javascript
// BEFORE (lines 250-251)
var touchStartX = 0;
var track = gallery.querySelector('[data-gallery-track]');

// AFTER
let touchStartX = 0;         // reassigned in touchstart listener
const track = gallery.querySelector('[data-gallery-track]');

// BEFORE (line 296-297)
var productVariants = [];
var productJsonEl = document.querySelector('[data-product-json]');

// AFTER
let productVariants = [];    // reassigned: productVariants = JSON.parse(...)
const productJsonEl = document.querySelector('[data-product-json]');

// BEFORE (line 384)
for (var i = 0; i < galleryImages.length; i++) {

// AFTER
for (let i = 0; i < galleryImages.length; i++) {

// BEFORE (line 412)
var hiddenSelect = swatch.closest('.product__option');
if (hiddenSelect) hiddenSelect = hiddenSelect.querySelector('[data-option-index]');

// AFTER
let hiddenSelect = swatch.closest('.product__option');
if (hiddenSelect) hiddenSelect = hiddenSelect.querySelector('[data-option-index]');
```

### Verification Commands

```bash
# Confirm no var remains in theme.js after replacement
grep -c "\bvar\b" assets/theme.js
# Expected: 0

# Confirm no {% stylesheet %} block remains in configurator.liquid
grep -c "stylesheet" sections/configurator.liquid
# Expected: 0

# Confirm configurator.css exists and is non-empty
wc -c assets/configurator.css
# Expected: ~18000+ bytes

# Confirm {% style %} block still present (dynamic Liquid styles)
grep -c "{% style %}" sections/configurator.liquid
# Expected: 1
```

---

## Current State Audit

### ARCH-01 (CSS extraction)

- `assets/configurator.css` **does not exist** — confirmed via `ls assets/`
- `sections/configurator.liquid` `{% stylesheet %}` block spans lines 11–258, ~18 KB
- Block contains **zero** Liquid expressions — pure CSS, safe to extract verbatim
- `{% style %}` block (lines 260–263) uses dynamic Liquid values — must remain

### ARCH-02 (Conditional loading)

- `layout/theme.liquid` lines 51–53 **already implement** the conditional:
  ```liquid
  {% if template.suffix == 'configurator' %}
    {{ 'configurator.css' | asset_url | stylesheet_tag }}
  {% endif %}
  ```
- The conditional is correct (`template.suffix` not `template.name`)
- **No changes needed to `theme.liquid`** — only creating the asset file is required
- Currently causing a 404 on every configurator page load (asset referenced but missing)

### ARCH-04 (var cleanup)

- 24 `\bvar\b` occurrences in `theme.js` confirmed via grep
- All concentrated in two sections: Product Gallery (lines 250–260) and Variant Picker/Color Swatches (lines 296–426)
- `'use strict';` is active at line 6 — reassignment to `const` bindings will throw at runtime
- Full replacement table catalogued in Architecture Patterns section above

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `var` declarations (ES5) | `const`/`let` (ES6+) | Block scoping, no hoisting surprises, signals immutability intent |
| `{% stylesheet %}` inline section CSS | `assets/*.css` CDN file | HTTP caching, single request shared across page navigations |

---

## Open Questions

1. **Order of CSS rules after extraction**
   - What we know: Shopify renders `{% stylesheet %}` blocks from sections into the page. After extraction, `configurator.css` will be loaded via `<link>` in `<head>` before `theme.css` (per current `theme.liquid` order — `theme.css` is on line 49, configurator conditional is on lines 51–53).
   - What's unclear: Whether any CSS specificity depends on source order between `theme.css` and configurator styles.
   - Recommendation: The configurator uses `.cfg-*` prefixed classes exclusively — there is no overlap with `theme.css` selectors. Specificity order is not a concern.

2. **Shopify Theme Editor behavior with removed {% stylesheet %}**
   - What we know: Shopify's theme editor uses section renders to preview changes. When the `{% stylesheet %}` block is removed, the configurator CSS will instead come from the `<link>` tag loaded conditionally.
   - What's unclear: Whether Shopify's theme editor injects section `{% stylesheet %}` CSS differently than the `<link>` loaded via `theme.liquid`.
   - Recommendation: The configurator template (`page.configurator.json`) only uses the configurator section. The `{% if template.suffix == 'configurator' %}` conditional in `theme.liquid` will be active in the editor when previewing the configurator page. This should work correctly. LOW confidence without testing — but behavioral risk is minimal since the CSS content is identical.

---

## Sources

### Primary (HIGH confidence)

- Direct code audit: `sections/configurator.liquid` lines 11–258 (stylesheet block) and lines 260–263 (style block)
- Direct code audit: `layout/theme.liquid` lines 49–53 (CSS loading)
- Direct code audit: `assets/theme.js` — `grep -n "\bvar\b"` output listing all 24 occurrences
- Direct file system check: `ls assets/` — confirmed `configurator.css` absent
- `.planning/STATE.md` — decision history confirming `template.suffix == 'configurator'` pattern and `hiddenSelect` reassignment rationale

### Secondary (MEDIUM confidence)

- Shopify Liquid documentation patterns: `{% stylesheet %}` vs `{% style %}` distinction (consistent with observed behavior in codebase)
- `.agents/skills/shopify-development/SKILL.md` — Shopify theme development patterns

---

## Metadata

**Confidence breakdown:**
- CSS extraction mechanics: HIGH — full code audit completed, zero Liquid expressions confirmed
- Conditional loading: HIGH — already implemented in theme.liquid, confirmed correct
- var replacement table: HIGH — all 24 occurrences catalogued with correct `const`/`let` decisions
- Theme editor compatibility: LOW — not testable without Shopify CLI dev environment

**Research date:** 2026-02-20
**Valid until:** Stable — these are one-time file changes with no external dependencies
