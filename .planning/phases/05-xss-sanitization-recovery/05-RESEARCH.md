# Phase 5: XSS Sanitization Recovery - Research

**Researched:** 2026-02-20
**Domain:** XSS sanitization — DOMPurify, innerHTML call site audit, DOM builder APIs
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- ~20 innerHTML call sites exist in configurator.js; each needs per-site assessment
- Static HTML strings (e.g. `'<p class="cfg-empty">Not configured.</p>'`) — Claude decides whether to leave as-is or convert, based on pragmatism (static strings cannot be XSS vectors)
- Dynamic sites interpolating product data (titles, prices, image URLs) — Claude picks DOMPurify.sanitize() wrapping vs DOM builder conversion based on template complexity and readability
- Mixed approaches across the file are acceptable — use whatever is cleanest per call site
- Gallery image src URLs (line 1589): Claude assesses actual risk given these are Shopify-hosted product images; DOMPurify handles dangerous protocols
- Summary card already uses DOM builders (from quick task 1) — this can serve as reference pattern but is not mandatory everywhere
- 3 _escAttr() call sites in innerHTML templates for data-tooltip attributes
- Claude decides between DOMPurify on the whole HTML block vs createElement + setAttribute() approach
- Tooltip content comes from Shopify metafields (store admin data) — treat as trusted but sanitize as defense-in-depth
- Tooltip rich HTML support: Claude decides based on current tooltip rendering implementation (plain text vs formatted)
- CDN failure behavior: Claude decides the risk/UX tradeoff (block configurator vs degrade gracefully with warning)
- Version: Pin exact semver — project convention from Phase 3
- CDN provider: jsDelivr — established project convention from Phase 1
- Load strategy (defer vs blocking): Claude decides based on script loading architecture and configurator.js initialization timing
- Prior Phase 1 decision established "mixed strategy: sanitize() for product data, DOM builder for summary list, static strings left as-is"
- Pin CDN version to exact semver, consistent with Phase 3 GSAP pinning decision
- DOMPurify must load before configurator.js in the template

### Claude's Discretion

- Per-site decision on sanitize() vs DOM builder vs leave-as-is for all ~20 innerHTML call sites
- DOMPurify configuration options (ALLOWED_TAGS, ALLOWED_ATTR if restricting)
- Tooltip approach (DOMPurify block wrap vs setAttribute)
- CDN load strategy and fallback behavior
- Whether to add a lightweight sanitize shim as fallback if CDN fails

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-04 | Sanitize all 15+ innerHTML call sites in configurator.js using textContent, DOM APIs, or DOMPurify | Call site audit below categorizes all 20 sites; sanitize() wrapping and DOM builder patterns documented |
| SEC-05 | Load DOMPurify 3.2.7 from CDN on configurator template for necessary markup sanitization | CDN URL verified live, defer ordering behavior documented, script tag placement confirmed |
| SEC-06 | Remove insecure custom _escAttr() method and replace with proper sanitization | _escAttr() has 3 call sites; all in tooltip templates; replacement via setAttribute() after createElement fully eliminates the method |
</phase_requirements>

## Summary

Phase 5 is a targeted remediation pass: load DOMPurify on the configurator template, patch all innerHTML call sites that interpolate dynamic data, and delete the custom `_escAttr()` helper. The work is entirely within two files — `sections/configurator.liquid` (add one `<script>` tag) and `assets/configurator.js` (patch ~10 dynamic sites, leave ~10 static sites untouched, delete `_escAttr()`).

The codebase audit reveals 20 total `innerHTML` assignment sites across configurator.js. Of these, roughly 8 are fully static strings (no XSS risk; leave as-is per user decision). The remaining ~12 interpolate product data from Shopify JSON (titles, bodies, image URLs, variant option labels, tooltip text, gallery alt text). The three `_escAttr()` call sites are all inside `data-tooltip` attribute values within large innerHTML template strings.

The key architectural decision is script loading order. Both the DOMPurify `<script>` and the configurator `<script defer>` must be `defer` so they run in document order — DOMPurify first, then configurator.js. Since configurator.js only calls `DOMPurify.sanitize()` during rendering (which happens after DOMContentLoaded inside `connectedCallback`), a `defer` ordering of DOMPurify before configurator.js is sufficient; no blocking load is needed.

**Primary recommendation:** Add `<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>` immediately before the existing configurator.js script tag. For each dynamic innerHTML site, wrap the produced HTML string in `DOMPurify.sanitize()` before assignment. For the three `_escAttr()` call sites, replace the whole innerHTML block with `createElement` + `setAttribute('data-tooltip', tooltip)` for the tooltip button — this eliminates attribute injection entirely without relying on DOMPurify for that specific pattern. Then delete `_escAttr()`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMPurify | 3.2.7 | HTML sanitization before innerHTML assignment | Industry-standard XSS sanitizer; DOM-based (not regex); handles mXSS; Cure53 maintained |

### Supporting

None needed. The project is vanilla JS with no build tools; DOMPurify loads as a global via CDN script tag and exposes `window.DOMPurify`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMPurify | Native Sanitizer API | Explicitly out of scope — still experimental in Safari as of 2026 (REQUIREMENTS.md) |
| DOMPurify | Hand-rolled sanitizer | Never do — regex-based sanitizers miss mXSS vectors that DOMPurify's DOM-based approach catches |
| DOMPurify.sanitize() | DOM builder APIs everywhere | DOM builders are appropriate for simple card/list items; DOMPurify is better for complex nested HTML templates where DOM builder verbosity would harm readability |

**Installation:** No npm install. CDN script tag only. This is a no-build-tools project.

```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>
```

CDN URL confirmed live and serving DOMPurify 3.2.7 (verified 2026-02-20).

## Architecture Patterns

### Recommended Project Structure

No structural changes. All work is:
- `sections/configurator.liquid` — add one script tag
- `assets/configurator.js` — patch innerHTML sites, delete _escAttr

### Complete innerHTML Call Site Audit

20 total `innerHTML` assignment sites identified. Categorized below:

**Category A — STATIC strings (no interpolation, no XSS risk → leave as-is):**

| Line | Code | Verdict |
|------|------|---------|
| 184 | `container.innerHTML = '<p class="cfg-empty">No options configured yet.</p>'` | Leave as-is |
| 237 | `container.innerHTML = '<p class="cfg-empty">Not configured.</p>'` | Leave as-is |
| 289 | `container.innerHTML = '<p class="cfg-empty">Not configured.</p>'` | Leave as-is |
| 1254 | `this.summaryCard.innerHTML = ''` | Leave as-is (clear only) |
| 1255 | `this.summaryList.innerHTML = ''` | Leave as-is (clear only) |
| 1512 | `this.cartError.innerHTML = ''` | Leave as-is (clear only; _showError already uses DOM builder) |
| 1529 | `this.cartError.innerHTML = ''` | Leave as-is (clear only) |

**Category B — DYNAMIC but data-attribute values only (no innerHTML rendering risk from data attrs):**
Note: `data-*` attributes set via innerHTML template strings are not executed by the browser as code. The risk is limited to `data-tooltip` being read by `_showTooltip()` which currently uses `tip.textContent = text` (line 1619) — textContent is already safe. However the attribute value itself is injected unescaped (via _escAttr which is inadequate), so the correct fix is to move tooltip buttons to DOM builder to use `setAttribute()`.

**Category C — DYNAMIC interpolation requiring sanitize() or DOM builder:**

| Line | Interpolated data | Recommended approach |
|------|-------------------|---------------------|
| 178 | `_renderModelSizeStep`: product.image, product.title, product.body, product.key, product.price | DOMPurify.sanitize(html) before assignment |
| 204 | `_renderCollectionStep`: p.id, p.image, p.title, p.body, p.price + `_escAttr(tooltip)` | DOMPurify.sanitize(html) — but tooltip button needs setAttribute (see _escAttr section) |
| 230 | `_renderCollectionStep`: html built in same function as line 204 | DOMPurify.sanitize(html) |
| 242 | `_renderCheckboxStep`: product.id, product.image, product.title, product.price + `_escAttr(tooltip)` | DOMPurify.sanitize for full block OR extract tooltip button via DOM builder |
| 251 | Same template block as 242 | Same as above |
| 258 | `_renderCheckboxDropdownStep`: p.id, p.image, p.title, p.price | DOMPurify.sanitize(html) |
| 295 | `_renderCheckboxQtyStep`: product.id, product.image, product.title, product.price | DOMPurify.sanitize(html) |
| 345 | `_renderOvenStep`: addon.id, addon.image, addon.title, addon.price + `_escAttr(tooltip)` | DOMPurify.sanitize for full block |
| 352 | Same block as 345 | Same as above |
| 358 | `_renderDiagramStep` controls: imgData.image (Shopify image URL) | DOMPurify.sanitize(html) — or assess as trusted Shopify URL |
| 363 | `_renderDiagramStep` heater_conn: imgData.straight, imgData.angle (Shopify image URLs), heater_90.price | DOMPurify.sanitize(html) |
| 390 | `_renderSizeCards`: s.label (from data constants XL/L/M), dims lookup, persons lookup | s.label is a value from the configured products object — sanitize as defense |
| 415 | `swatchContainer.innerHTML`: v.id, v.price, v.option1 (variant name), aria attributes | DOMPurify.sanitize(html) |
| 421 | `pillsContainer.innerHTML`: v.option1, v.option2, v.price | DOMPurify.sanitize(html) |
| 1589 | `_updateGallery`: img.thumb/img.src (Shopify CDN URLs), img.alt | DOMPurify.sanitize(html) — DOMPurify strips dangerous protocols like `javascript:` from src |

**_escAttr() call sites (3 total):**

| Line | Location | Template context |
|------|----------|-----------------|
| 204 | `_renderCollectionStep` | Tooltip button inside large radio card template |
| 251 | `_renderCheckboxStep` | Tooltip button inside checkbox card template |
| 345 | `_renderOvenStep` | Tooltip button inside oven addon template |

All three _escAttr() sites are for `data-tooltip` attribute values. The tooltip content is from `product.meta.info_tooltip` (Shopify metafield). The `_showTooltip()` method reads the attribute value and assigns it via `tip.textContent = text` (line 1619) — so the tooltip rendering itself is already XSS-safe. The risk is limited to attribute injection in the HTML string.

### Pattern 1: DOMPurify.sanitize() — Wrap full HTML string

**What:** Call `DOMPurify.sanitize(html)` immediately before `container.innerHTML = html`. No structural changes to the template string.
**When to use:** Complex templates with multiple nested elements and multiple interpolated values. The readability of the string template is preserved.

```javascript
// Source: DOMPurify README (github.com/cure53/DOMPurify)
// BEFORE:
container.innerHTML = html;

// AFTER:
container.innerHTML = DOMPurify.sanitize(html);
```

For inline template literals:
```javascript
// BEFORE:
container.innerHTML = `
  <label class="cfg-radio-card" ...>
    <img src="${p.image}" alt="${p.title}" ...>
    <span class="cfg-radio-card__title">${p.title}</span>
  </label>`;

// AFTER:
container.innerHTML = DOMPurify.sanitize(`
  <label class="cfg-radio-card" ...>
    <img src="${p.image}" alt="${p.title}" ...>
    <span class="cfg-radio-card__title">${p.title}</span>
  </label>`);
```

### Pattern 2: DOM Builder — createElement + setAttribute + textContent

**What:** Build DOM nodes programmatically instead of string concatenation. Attribute values are set via `setAttribute()` (which HTML-encodes automatically), text content via `textContent` (no parsing).
**When to use:** Tooltip button (to eliminate _escAttr completely). Also the established pattern from summary card (quick task 1).

```javascript
// Replacing the _escAttr() tooltip pattern:
// BEFORE (inside a large innerHTML template):
// ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}

// AFTER — append the tooltip button separately after innerHTML:
if (tooltip) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cfg-tooltip-btn';
  btn.setAttribute('data-tooltip', tooltip);  // setAttribute auto-encodes
  btn.setAttribute('aria-label', 'More info');
  btn.textContent = '?';
  container.querySelector('.cfg-radio-card__body, .cfg-checkbox-card__body, .cfg-checkbox-card--compact .cfg-checkbox-card__body')?.appendChild(btn);
}
```

Note: This pattern requires the innerHTML assignment to happen first, then the tooltip button is appended. This is clean and eliminates _escAttr entirely.

**Alternative:** Keep the full block as `DOMPurify.sanitize(html)` and simply delete `_escAttr()` call in the template — DOMPurify will encode the attribute value safely. The tooltip value in the data-tooltip attribute is then read by `_showTooltip()` via `btn.dataset.tooltip` and rendered with `textContent`, so the chain is secure.

### Pattern 3: DOMPurify configuration options

For this project, **use default DOMPurify configuration** (no ALLOWED_TAGS restriction). Restricting tags would strip valid HTML like `<img>`, `<span>`, `<label>` that these templates legitimately generate.

```javascript
// Default — allows all safe HTML:
DOMPurify.sanitize(html)

// Restrictive (NOT appropriate here — would strip img, span, etc.):
DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i'] })
```

### Pattern 4: Script loading order (defer)

Both DOMPurify and configurator.js are loaded with `defer`. With `defer`, scripts execute in document order before DOMContentLoaded fires. Since DOMPurify's script tag is placed before configurator.js, DOMPurify is guaranteed to be initialized when configurator.js executes.

```liquid
{{- comment -}} DOMPurify must be listed BEFORE configurator.js {{- endcomment -}}
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>
<script src="{{ 'configurator.js' | asset_url }}" defer></script>
```

Current state in `sections/configurator.liquid` (line 560):
```liquid
<script src="{{ 'configurator.js' | asset_url }}" defer></script>
```

The DOMPurify script tag goes immediately before this line.

### Anti-Patterns to Avoid

- **Restricting ALLOWED_TAGS:** Would strip `<img>`, `<span>`, `<label>`, `<button>` which these templates legitimately need. Use default sanitization.
- **Using DOMPurify.sanitize() in RETURN_DOM mode:** Not needed here. The string output (default) is correct for innerHTML assignment.
- **Adding a fallback shim that bypasses sanitization:** If DOMPurify CDN fails, the safer fallback is to make `DOMPurify` a no-op that returns an empty string or throws, blocking configurator render rather than silently skipping sanitization. A warning-only fallback is acceptable UX for a store admin tool.
- **Sanitizing at data ingestion time (JSON parse):** Too early — DOMPurify is a DOM operation requiring browser context, not a string utility. Sanitize at the innerHTML assignment point.
- **Calling DOMPurify.sanitize() on `= ''` clear operations:** No value — empty string is safe. Do not add sanitize() to the clear sites.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex sanitizer | DOMPurify.sanitize() | Regex misses mXSS, mutation XSS, and parser-specific quirks. DOMPurify uses the browser's own parser |
| Attribute encoding | _escAttr() | setAttribute() | Browsers auto-encode attribute values in setAttribute(); _escAttr() misses Unicode escapes and context-dependent encoding |
| URL sanitization | Custom URL check | DOMPurify (default) | DOMPurify strips `javascript:`, `data:text/html`, and other dangerous protocols from src/href attributes by default |

**Key insight:** The current `_escAttr()` is the textbook example of hand-rolled sanitization that is subtly wrong — it does not handle Unicode escapes (`\u0022`), HTML5 named character references beyond the four it replaces, or context-sensitive encoding. `setAttribute()` has no such gaps.

## Common Pitfalls

### Pitfall 1: Loading DOMPurify AFTER configurator.js (wrong defer order)

**What goes wrong:** `DOMPurify is not defined` runtime error when configurator.js first calls `DOMPurify.sanitize()` during step rendering.
**Why it happens:** Both scripts are deferred; if DOMPurify appears after configurator.js in the HTML, it executes after, and the first `connectedCallback` render fails.
**How to avoid:** Place the DOMPurify `<script>` tag on the line immediately before the configurator.js `<script>` tag in `sections/configurator.liquid`.
**Warning signs:** Console error `DOMPurify is not defined` on configurator page load; configurator renders empty.

### Pitfall 2: Stripping valid template HTML with ALLOWED_TAGS

**What goes wrong:** DOMPurify strips legitimate tags like `<img>`, `<label>`, `<input>`, `<button>` from the sanitized HTML, causing blank cards or missing UI elements.
**Why it happens:** Using a restrictive ALLOWED_TAGS list that doesn't include the tags used in configurator templates.
**How to avoid:** Use `DOMPurify.sanitize(html)` with no options. Default configuration allows all safe HTML.
**Warning signs:** Rendered step cards appear blank or missing images/prices after applying sanitization.

### Pitfall 3: Applying sanitize() to innerHTML clear operations

**What goes wrong:** Pointless performance overhead and possible null-return confusion.
**Why it happens:** Mechanically wrapping every `innerHTML =` assignment including `= ''`.
**How to avoid:** Only apply `DOMPurify.sanitize()` to assignments that set non-empty HTML with interpolated data. The 7 clear/static sites need no change.

### Pitfall 4: Tooltip button DOM builder appended to wrong parent

**What goes wrong:** Tooltip button appears outside the card body element, breaking CSS positioning or keyboard nav.
**Why it happens:** Appending to `container` directly instead of the specific card body element that was just written by innerHTML.
**How to avoid:** After the innerHTML assignment, query for the specific slot (`.cfg-radio-card__body`, `.cfg-checkbox-card__body`) before appending the tooltip button. Or use the simpler DOMPurify.sanitize() approach on the whole block — then _escAttr() is just removed from the template and DOMPurify handles the attribute encoding.

### Pitfall 5: _escAttr() deleted without replacing its 3 call sites

**What goes wrong:** JS syntax error — the template literal references `this._escAttr(tooltip)` which no longer exists.
**Why it happens:** Deleting the method definition without removing all 3 usage sites.
**How to avoid:** Search-and-replace all 3 occurrences (lines 204, 251, 345) before deleting the method at line 1628. Verify with grep after changes.

### Pitfall 6: Sanitizing data during JSON.parse() step

**What goes wrong:** DOMPurify doesn't work without a DOM context and will throw in non-browser environments; more importantly, sanitizing at parse time produces a string that is then re-parsed by innerHTML, which may differ slightly.
**Why it happens:** Desire to sanitize "early" for defense-in-depth.
**How to avoid:** Sanitize at the innerHTML assignment point only. The data lives in `this.data` as a parsed JSON object; sanitize when it's being serialized back to HTML.

## Code Examples

Verified patterns from official sources:

### DOMPurify script tag (jsDelivr, exact version pin)
```html
<!-- Source: jsDelivr (verified 2026-02-20, returns DOMPurify 3.2.7) -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>
```

### Sanitize string template before innerHTML (default config)
```javascript
// Source: DOMPurify README (github.com/cure53/DOMPurify)
container.innerHTML = DOMPurify.sanitize(html);

// Inline template literal:
container.innerHTML = DOMPurify.sanitize(`
  <div class="cfg-card" data-action="select-model" data-model-key="${product.key}">
    <img src="${product.image}" alt="${product.title}" ...>
    <h4 class="cfg-card__name">${product.title}</h4>
  </div>
`);
```

### Replace _escAttr() tooltip — Option A (remove from template, rely on DOMPurify block sanitize)
```javascript
// BEFORE (inside _renderCollectionStep):
html += `
  <label class="cfg-radio-card" ...>
    ...
    ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}
  </label>`;
container.innerHTML = html;

// AFTER (remove _escAttr(), DOMPurify encodes the attribute):
html += `
  <label class="cfg-radio-card" ...>
    ...
    ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${tooltip}" aria-label="More info">?</button>` : ''}
  </label>`;
container.innerHTML = DOMPurify.sanitize(html);
```

This is the cleanest approach: DOMPurify naturally encodes the `data-tooltip` attribute value when sanitizing the full HTML block. No special treatment needed. The `_showTooltip()` method already reads it back safely with `tip.textContent = text`.

### Replace _escAttr() tooltip — Option B (DOM builder for tooltip button)
```javascript
// Source: OWASP DOM XSS Prevention (setAttribute safe sink)
// After innerHTML renders the card body:
if (tooltip) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cfg-tooltip-btn';
  btn.setAttribute('data-tooltip', tooltip); // browser auto-encodes
  btn.setAttribute('aria-label', 'More info');
  btn.textContent = '?';
  container.querySelector('.cfg-radio-card__body')?.appendChild(btn);
}
```

### Delete _escAttr() — verify zero references remain
```bash
grep -n "_escAttr" assets/configurator.js
# Should return no output after cleanup
```

### CDN fallback shim (optional, if decided)
```javascript
// Lightweight guard to surface CDN failures without silently skipping sanitization:
if (typeof DOMPurify === 'undefined') {
  console.error('[Configurator] DOMPurify failed to load. XSS sanitization unavailable.');
  // Option 1: Hard fail — prevent render
  return;
  // Option 2: Warn-only — log but continue (acceptable for admin-entered data)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled _escAttr() for attribute encoding | setAttribute() (browser-native) / DOMPurify | Best practice pre-2020 | Eliminates encoding gaps (Unicode, context-sensitive) |
| Sanitizer API (native browser) | Still experimental in Safari as of 2026 | N/A | DOMPurify remains the correct choice per REQUIREMENTS.md |
| DOMPurify 2.x | DOMPurify 3.x | 2023 | Breaking: removed IE11 support, improved mXSS protection |

**Deprecated/outdated:**
- `_escAttr()`: Hand-rolled attribute escaping — doesn't handle all encoding edge cases; replaced by `setAttribute()` or DOMPurify
- Native Sanitizer API: Out of scope — experimental in Safari 2026 (explicitly excluded in REQUIREMENTS.md)

## Open Questions

1. **CDN failure UX tradeoff**
   - What we know: DOMPurify is a CDN dependency; if jsDelivr fails, `DOMPurify` is undefined; `connectedCallback` would throw on first `DOMPurify.sanitize()` call
   - What's unclear: Whether a hard-fail (block configurator) or warn-only approach is preferred
   - Recommendation: Add a guard at the top of `connectedCallback` — if `typeof DOMPurify === 'undefined'`, log an error and render a fallback message. This is the same fail-safe pattern used for GSAP in theme.js (Phase 3 decision). The configurator is the primary revenue driver, so a visible error message is better than a broken/silent render.

2. **Tooltip approach across 3 call sites**
   - What we know: All 3 _escAttr() sites are in different render methods (_renderCollectionStep, _renderCheckboxStep, _renderOvenStep). Each wraps the full block in DOMPurify.sanitize(). DOMPurify naturally encodes data-tooltip attribute values during sanitization.
   - What's unclear: Whether the planner should prefer Option A (delete _escAttr from template, rely on DOMPurify) or Option B (DOM builder for tooltip button)
   - Recommendation: Option A for all 3 sites — it's a one-line template change (remove `this._escAttr()` wrapper, keep the tooltip value bare), then DOMPurify handles encoding when sanitizing the full block. This is the least invasive and most consistent approach.

## Sources

### Primary (HIGH confidence)
- DOMPurify GitHub README (github.com/cure53/DOMPurify) — API docs, sanitize() usage, ALLOWED_TAGS config
- jsDelivr CDN URL verified live 2026-02-20: `https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js` serves DOMPurify 3.2.7
- OWASP DOM XSS Prevention Cheat Sheet (cheatsheetseries.owasp.org) — setAttribute safe sink confirmation
- configurator.js (assets/configurator.js) — full line-by-line innerHTML audit performed directly

### Secondary (MEDIUM confidence)
- javascript.info/script-async-defer — defer execution order behavior confirmed: deferred scripts run in document order before DOMContentLoaded
- REQUIREMENTS.md (project) — Sanitizer API exclusion confirmed: "still experimental in Safari as of 2026"

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — DOMPurify 3.2.7 on jsDelivr confirmed live; API verified from official source
- Architecture: HIGH — full call site audit from direct file read; patterns from official docs
- Pitfalls: HIGH — identified from code structure analysis and verified script loading behavior

**Research date:** 2026-02-20
**Valid until:** 2026-08-20 (DOMPurify is stable; revisit if 4.x breaks API)
