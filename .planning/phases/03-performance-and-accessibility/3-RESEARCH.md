# Phase 3: Performance and Accessibility - Research

**Researched:** 2026-02-20
**Domain:** Browser performance (image preloading, lazy loading, CDN pinning) and web accessibility (ARIA, keyboard navigation, WCAG 2.1 AA)
**Confidence:** HIGH — all findings are grounded in direct codebase inspection with cross-referencing against known web platform standards

---

## Summary

Phase 3 applies performance hardening and accessibility compliance to an existing, working Shopify Liquid theme with a vanilla JS configurator Web Component. No new dependencies are introduced. All work is surgical: targeted edits to `assets/theme.js`, `assets/configurator.js`, `layout/theme.liquid`, `sections/configurator.liquid`, and a sweep of all section/snippet `.liquid` files for img alt text and touch target sizing.

The configurator's image management (`_setMainImage`) currently performs a fade-out, waits 120ms, then sets `.src` on the visible element — resulting in a visible loading spinner between step transitions. The fix is preloading the next image into a hidden `Image()` object before transitioning, so the swap is instantaneous. This is purely additive JS inside the existing class.

GSAP is loaded with `gsap@3` — a floating tag that resolves to the latest 3.x minor at CDN cache time. Pinning to `gsap@3.13.0` eliminates this ambiguity. `theme.js` already guards GSAP with `if (typeof gsap !== 'undefined')` before `initGSAPAnimations()` is called, so PERF-03 requires only verifying (and tightening if needed) that guard — no structural change is needed.

**Primary recommendation:** All 10 requirements are achievable with targeted edits inside existing files. No new libraries, no build tools, no architectural changes. The largest effort is the accessibility sweep (ARIA in configurator, keyboard tab flow, color contrast audit, touch target audit across ~28 section files and 2 snippets).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Implement image preloading for configurator step transitions | Addressed by `_preloadImage()` helper in `HotTubConfigurator`; call before `_setMainImage()` using `new Image()` pattern |
| PERF-02 | Pin GSAP to version 3.13.0 with explicit CDN URL | Change `gsap@3` to `gsap@3.13.0` in two `<script>` tags in `layout/theme.liquid` |
| PERF-03 | Add GSAP existence check before initializing scroll animations in theme.js | Guard already exists (`if (typeof gsap !== 'undefined')`); verify ScrollTrigger is also guarded inside `initGSAPAnimations()` |
| PERF-04 | Cache frequently-accessed DOM nodes in `_cacheEls()` method | `_cacheEls()` already exists; audit which nodes are re-queried on every action and add them |
| PERF-05 | Add `loading="lazy"` to non-critical images across sections and snippets | Audit all `<img>` tags in sections/ and snippets/; hero and above-fold images should be `eager`, all others `lazy` |
| A11Y-01 | Add ARIA labels and roles to configurator custom element (step navigation, option selection) | Steps need `role="group"` + `aria-labelledby`; the locked state needs `aria-disabled`; price total already has `aria-live="polite"` |
| A11Y-02 | Implement keyboard navigation for all configurator steps and options | Existing Enter/Space keydown handler covers `[data-action]` elements; gaps: Tab order through locked steps, focus management after step unlock, radio group arrow-key navigation |
| A11Y-03 | Audit and add alt text to all img tags across sections and snippets | Most sections use `alt="{{ ... | escape }}"` pattern but several use generic fallbacks; configurator JS-generated imgs need descriptive alt text |
| A11Y-04 | Ensure all interactive touch targets are minimum 44x44px on mobile | Configurator qty buttons are 40x40px (need 4px increase); tooltip button is 20x20px (needs enlargement); swatch/pill targets need audit |
| A11Y-05 | Audit color contrast ratios for WCAG 2.1 AA compliance (4.5:1 minimum) | Key problem: `--color-text-muted` (#7D7B78) on `--color-background` (#F4F1EC) calculates to ~3.8:1 — fails AA for normal text |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `Image()` constructor | Browser built-in | Image preloading | Zero-dependency; guaranteed availability; prefetch pattern universally used |
| GSAP | 3.13.0 (pinned) | Scroll animations | Already used; pinning eliminates floating-version risk |
| ARIA 1.2 + HTML semantics | Web standard | Accessibility tree | Native HTML patterns preferred over ARIA overrides where possible |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries | — | — | Project constraint: pure vanilla JS/CSS/Liquid, no bundler |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Image()` preload | `<link rel="preload">` | `<link rel="preload">` requires knowing URLs at render time; configurator URLs are only known at runtime from JSON data. `new Image()` is correct here. |
| CSS `min-width`/`min-height` for touch targets | Padding expansion | Both work; `min-width`/`min-height` is cleaner in existing CSS patterns |
| Manual ARIA | `inert` attribute for locked steps | `inert` has excellent browser support (2023+) and is simpler than `pointer-events: none` + `aria-disabled`; worth using for locked steps |

**Installation:** None required — no new packages.

---

## Architecture Patterns

### Pattern 1: Image Preloading in Configurator
**What:** Before calling `_setMainImage(url)`, create a hidden `Image` object and set its `src`. When it loads, proceed with the transition. This eliminates the visible flash.
**When to use:** Any time the next step's image URL is knowable before the user triggers the transition (which is always — images are in the JSON data).

**Implementation approach:**
```javascript
// Add to HotTubConfigurator class
_preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(); return; }
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve; // resolve on error too — don't block UI
    img.src = url;
  });
}

// Usage: preload next step image when current step selection changes
// For example, in _handleModelSelect():
async _handleModelSelect(modelKey) {
  // ... existing logic ...
  if (tier.image) {
    await this._preloadImage(tier.image);
    this._setMainImage(tier.image);
  }
  // ...
}
```

**Note:** The `_setMainImage` currently waits 120ms then sets `src` — this was a workaround for the flash. With preloading, the 120ms delay and fade class can be simplified or removed.

### Pattern 2: GSAP Version Pinning
**What:** Replace floating `gsap@3` with `gsap@3.13.0` in `layout/theme.liquid`.
**Current state (lines 63-64 of theme.liquid):**
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js" defer></script>
```
**Fixed:**
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
```

### Pattern 3: GSAP Guard Verification (PERF-03)
**Current state in theme.js (lines 613-618):**
```javascript
if (typeof gsap !== 'undefined') {
  initGSAPAnimations();
} else {
  window.addEventListener('load', initGSAPAnimations);
}
```
The `load` path also calls `initGSAPAnimations()` which has an early return `if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;` at line 501. This is already correct. PERF-03 is essentially verified — the guard exists and is sound.

**However:** The `window.addEventListener('load', ...)` fallback will fire after `load`, but GSAP may still not be defined if the CDN fails. The guard inside `initGSAPAnimations` catches this. No change needed beyond confirming this is wired correctly.

### Pattern 4: ARIA for Configurator Steps
**What:** Each step `div.cfg-step[data-step="N"]` needs semantic role markup. The step header has a badge (aria-hidden) and h3 — this is the accessible name source.

**Additions needed in `sections/configurator.liquid`:**
```html
<!-- Current -->
<div class="cfg-step{{ locked }}" data-step="{{ i }}">
  <div class="cfg-step__header">
    <span class="cfg-step__badge" aria-hidden="true">{{ i }}</span>
    <h3 class="cfg-step__title" id="cfg-step-{{ i }}-title">{{ s_title }}</h3>

<!-- Needs: -->
<div class="cfg-step{{ locked }}" data-step="{{ i }}"
     role="group"
     aria-labelledby="cfg-step-{{ i }}-title"
     {%- if i > 1 -%}aria-disabled="true"{%- endif -%}>
```

Locked state management (adding/removing `aria-disabled`) must also be done in JS inside `_unlockThrough()`.

**For configurator JS-generated interactive elements, the existing code already adds:**
- `role="button"` + `aria-pressed` on model/size cards (lines 132, 668)
- `aria-pressed` on swatches (line 766)
- `aria-label` on tooltip buttons (line 177)

**Gaps in JS-generated ARIA:**
- Oven type toggle buttons: have no `aria-pressed` on initial render
- Qty buttons (−/+): no `aria-label` — announced as "−" by screen readers
- The step progression (announcing when step unlocks): needs `aria-live` region or focus management

### Pattern 5: Keyboard Navigation Gaps
**What exists:** `keydown` handler for Enter/Space fires `.click()` on `[data-action]` elements. This covers model cards, size cards, heater connection cards, swatch/pill selections.

**Gaps:**
1. Tab order passes through locked steps — locked steps have `pointer-events: none` but are still in tab order. Fix: add `inert` attribute (or `tabindex="-1"` on all focusable children) when locking a step.
2. Radio group options (liner, exterior, etc.): native radio `<input>` elements are visually hidden but present. Arrow key navigation works for radio groups natively — confirm the CSS `position: absolute; opacity: 0; width: 0; height: 0` does not break this.
3. After completing a step and unlocking the next, focus should move to the next step's first interactive element (or at minimum the step header).

### Pattern 6: Touch Target Sizing
**Current violations found:**
- `.cfg-tooltip-btn`: `width: 20px; height: 20px` — needs minimum 44x44px (use padding to expand hit area without changing visual size)
- `.cfg-qty-btn`: `width: 40px; height: 40px` — needs to be 44x44px
- `.cfg-qty-value`: `line-height: 40px` — companion element, not interactive; OK

**Pattern for expanding tooltip button without changing visual:**
```css
.cfg-tooltip-btn {
  /* Visual size stays 20px, hit area expands */
  padding: 12px; /* adds 24px each side = 44px total hit area */
  /* Or: */
  min-width: 44px;
  min-height: 44px;
}
```

### Pattern 7: Color Contrast Audit
**Palette from settings_data.json:**
- `--color-primary`: #262626 (charcoal)
- `--color-secondary`: #B6754D (bronze)
- `--color-accent`: #C85E3F (terracotta)
- `--color-background`: #F4F1EC (warm beige)
- `--color-surface`: #EDE7DD (light taupe)
- `--color-text`: #262626
- `--color-text-muted`: #7D7B78

**Contrast calculations (WCAG AA requires 4.5:1 for normal text, 3:1 for large text/UI components):**

| Foreground | Background | Ratio (estimated) | Status |
|-----------|-----------|------------------|--------|
| #262626 on #F4F1EC | Primary text on page bg | ~12:1 | PASSES |
| #262626 on #EDE7DD | Primary text on surface | ~11:1 | PASSES |
| #7D7B78 on #F4F1EC | Muted text on page bg | ~3.8:1 | FAILS AA (normal text) |
| #7D7B78 on #EDE7DD | Muted text on surface | ~3.5:1 | FAILS AA (normal text) |
| #7D7B78 on #ffffff | Muted text on white cards | ~4.4:1 | BORDERLINE (fails by ~0.1) |
| #C85E3F on #F4F1EC | Accent/CTA on page bg | ~3.3:1 | FAILS AA for normal text |
| #C85E3F on #ffffff | Accent on white | ~3.1:1 | FAILS AA for normal text; passes for large text/UI (3:1) |
| #B6754D on #F4F1EC | Secondary on page bg | ~3.2:1 | FAILS AA for normal text |
| #262626 on #C85E3F | Text on CTA button | ~7.4:1 | PASSES |

**Key problem:** `--color-text-muted` (#7D7B78) fails WCAG AA for normal-size body text on both background colors. This muted color is used extensively for subtitles, descriptions, labels throughout all sections and the configurator.

**Resolution options:**
1. Darken `--color-text-muted` to approximately #6A6864 (achieves ~4.5:1 on #F4F1EC) — this is a single token change that fixes all usages
2. Reserve `--color-text-muted` only for large text (≥18pt / ≥14pt bold) where 3:1 suffices

**Accent colors (#C85E3F, #B6754D) on light backgrounds:** These are used for price callouts, links, and accent decorations — typically short text or UI components. If used at 14px+ bold or 18px+ regular, the 3:1 requirement applies and they may pass. If used as normal body text, they fail. The configurator uses `--color-accent-dark: #3A8F7D` (not in the settings schema — appears to be hardcoded in configurator CSS) for price displays; need to verify this color's contrast.

### Pattern 8: Lazy Loading Audit
**Current loading attributes in sections (from grep):**
- `sections/configurator.liquid` line 182: default image uses `loading="eager"` — correct (above fold)
- `sections/configurator.liquid` line 188: main-image `loading="eager"` — correct (it's the primary image)
- All product card images in `snippets/product-card.liquid`: `loading="lazy"` — already correct
- `sections/hero.liquid`: `loading="eager"` — correct (above fold)
- `sections/features.liquid`: `loading="lazy"` — correct
- `sections/trust-badges.liquid`: `loading="lazy"` — correct
- `sections/testimonials.liquid`: `loading="lazy"` — correct
- `sections/footer.liquid`: `loading="lazy"` — correct

**Sections that have `<img>` but need verification (may be missing loading attribute or need to be set correctly):**
- `sections/product-tiers.liquid` line 60: needs check
- `sections/collection-list.liquid` lines 26, 38: needs check
- `sections/main-blog.liquid` line 14: needs check
- `sections/featured-collections.liquid` line 23: needs check
- `sections/image-with-text.liquid` line 40: needs check
- `sections/lifestyle-gallery.liquid` line 22: needs check
- `sections/slideshow.liquid` line 7: needs check (slideshows are often above-fold)
- `sections/video.liquid` lines 18, 41: needs check
- `sections/banner.liquid` line 22: needs check
- `sections/blog-posts.liquid` line 22: needs check
- `sections/multicolumn.liquid` line 27: needs check
- `sections/main-product.liquid` lines 16, 41, 53: product gallery — typically above fold, some `lazy` is appropriate for non-featured images

**The configurator JS generates img tags inside `innerHTML` assignments** — these already use `loading="lazy"` (confirmed in `_renderModelSizeStep`, `_renderCollectionStep`, `_renderCheckboxStep`). No changes needed there.

### Anti-Patterns to Avoid
- **Don't use `async/await` for preloading if it blocks rendering:** Call `_preloadImage()` speculatively (start loading when a selection happens), not as a blocking await before showing any UI feedback
- **Don't set `aria-hidden="true"` on focusable elements:** The locked step approach should use `inert` or `tabindex="-1"` on children — not aria-hidden (which hides from screen reader but doesn't prevent focus)
- **Don't hardcode contrast-failing colors in new CSS:** Any new CSS added must use `--color-text` not `--color-text-muted` for normal-size body text until the muted color is fixed

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image preloading | Custom caching system | `new Image()` | Browser already caches; just trigger the load early |
| WCAG contrast checking | Manual ratio calculation | Browser DevTools accessibility panel or online contrast checker | More accurate, faster |
| Focus management on step unlock | Complex focus trap | Simple `el.focus()` call on first focusable child after unlock | Straightforward in this context |

**Key insight:** All 10 requirements in this phase are surgical edits. The most complex single item is the color contrast fix (one CSS variable value change + verification sweep) and the ARIA additions to the configurator Liquid template + JS.

---

## Common Pitfalls

### Pitfall 1: Preloading fires but browser evicts from cache before transition
**What goes wrong:** User selects a model, preload fires, but they take 30+ seconds before the transition. Cache may evict.
**Why it happens:** Browser memory pressure on mobile.
**How to avoid:** Acceptable tradeoff — preloading eliminates flash for normal usage. Don't over-engineer.
**Warning signs:** Only matters on mobile with >1GB memory pressure — not worth solving.

### Pitfall 2: `inert` attribute hides locked step content from screen readers
**What goes wrong:** Screen reader cannot read the step title/subtitle of locked steps, making the configurator structure invisible.
**Why it happens:** `inert` hides from both keyboard and screen reader.
**How to avoid:** Apply `inert` only to the `.cfg-step__body` (the interactive content), not the entire step. Keep the step header (number badge + title + subtitle) readable.
**Warning signs:** VoiceOver announces nothing when tabbing past locked steps.

### Pitfall 3: `aria-disabled="true"` does not prevent keyboard focus
**What goes wrong:** Keyboard users tab into locked step interactive elements even after adding `aria-disabled`.
**Why it happens:** `aria-disabled` is semantic only; it does not remove elements from tab order.
**How to avoid:** Pair `aria-disabled` with `tabindex="-1"` on focusable children, OR use `inert` on the body of locked steps.

### Pitfall 4: Color change for `--color-text-muted` breaks design
**What goes wrong:** Darkening `#7D7B78` to `#6A6864` makes secondary/caption text look too heavy.
**Why it happens:** Visual balance relies on the current lighter tone.
**How to avoid:** Only darken to the minimum compliant value. Run the change past visual review. Consider reserving the lighter value for decorative/large-text-only uses by creating a separate token.

### Pitfall 5: GSAP version pinning breaks animations
**What goes wrong:** GSAP 3.13.0 has a behavior difference from the previously-resolved version.
**Why it happens:** CDN floating tag may have been resolving to a later 3.x.
**How to avoid:** Test scroll animations on the theme after pinning. GSAP 3.x has been stable — this is low risk.

### Pitfall 6: Lazy loading images that are above the fold
**What goes wrong:** Images below hero that load `lazy` are fine, but if a section is sometimes above-fold (e.g., slideshow when it's the first section), `lazy` causes a blank image on load.
**Why it happens:** Shopify theme sections are reorderable. Loading attribute is static in the template.
**How to avoid:** Use `loading="lazy"` for sections that are structurally always below-fold (features, blog posts, testimonials, multicolumn). Use `loading="eager"` only for hero and configurator default image. For reorderable sections like slideshow or banner, `lazy` is acceptable — the LCP image is typically the hero or OG image, not these sections.

---

## Code Examples

### Image Preloading Pattern
```javascript
// Source: MDN Web Docs - HTMLImageElement
_preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(); return; }
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

// Speculatively preload next image on selection change
// In _handleModelSelect(), after resolving tier:
if (tier.image) {
  this._preloadImage(tier.image); // non-blocking — fire and forget
  // Image loads in background; by the time user sees transition, it's ready
}
```

### ARIA Step Group Pattern
```liquid
{# In sections/configurator.liquid - step loop #}
<div class="cfg-step{{ locked }}" data-step="{{ i }}"
     role="group"
     aria-labelledby="cfg-step-title-{{ i }}"
     {% if i > 1 %}aria-disabled="true"{% endif %}>
  <div class="cfg-step__header">
    <span class="cfg-step__badge" aria-hidden="true">{{ i }}</span>
    <h3 class="cfg-step__title" id="cfg-step-title-{{ i }}">{{ s_title }}</h3>
  </div>
  {# ... #}
  <div class="cfg-step__body" {% if i > 1 %}inert{% endif %}>
    {# Interactive content — inert when locked #}
  </div>
</div>
```

### Unlock with ARIA + Focus Management
```javascript
// In _unlockThrough(), after setting maxUnlocked:
_unlockThrough(stepNum) {
  if (stepNum <= this.maxUnlocked) return;
  this.maxUnlocked = stepNum;
  for (let i = 1; i <= STEPS.length; i++) {
    const el = this.querySelector(`[data-step="${i}"]`);
    if (!el) continue;
    const isLocked = i > this.maxUnlocked;
    el.classList.toggle('cfg-step--locked', isLocked);
    el.setAttribute('aria-disabled', String(isLocked));
    const body = el.querySelector('.cfg-step__body');
    if (body) {
      if (isLocked) {
        body.setAttribute('inert', '');
      } else {
        body.removeAttribute('inert');
      }
    }
  }
  // Move focus to newly unlocked step
  const newStep = this.querySelector(`[data-step="${stepNum}"]`);
  if (newStep) {
    const firstFocusable = newStep.querySelector('button, [tabindex="0"], input, [data-action]');
    if (firstFocusable) firstFocusable.focus();
  }
}
```

### Touch Target Fix for Qty and Tooltip Buttons
```css
/* In sections/configurator.liquid {% stylesheet %} */
.cfg-qty-btn {
  width: 44px;   /* was 40px */
  height: 44px;  /* was 40px */
}

.cfg-tooltip-btn {
  /* Expand hit area without changing visual size */
  width: 20px;
  height: 20px;
  padding: 12px;
  box-sizing: content-box; /* ensures padding adds to, not subtracts from, 20px */
  /* Total interactive area: 20 + 12*2 = 44px */
}
```

### GSAP Guard (Already Correct — Verification Only)
```javascript
// theme.js lines 501-502 — existing guard is correct:
function initGSAPAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  // ...
}

// lines 613-618 — calling pattern is also correct:
if (typeof gsap !== 'undefined') {
  initGSAPAnimations();
} else {
  window.addEventListener('load', initGSAPAnimations);
}
// Note: 'load' fires after all deferred scripts execute — GSAP will be defined by then
// The inner guard handles CDN failure gracefully
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tabindex="-1"` on locked elements | `inert` attribute | Chrome 102, Firefox 112, Safari 15.5 (2022-2023) | Single attribute disables all interaction + accessibility tree; simpler than managing tabindex recursively |
| `pointer-events: none` for locked state | `inert` + `pointer-events: none` | 2023+ | `inert` handles keyboard; CSS handles mouse; combine both |
| Separate GSAP and ScrollTrigger CDN requests | Same — no change | — | Could use a bundle, but not appropriate here (no build tools) |

**Deprecated/outdated:**
- `aria-disabled` alone for preventing keyboard interaction: Deprecated practice — must be paired with tabindex management or `inert`
- `onload` inline attribute handlers: Not used here, but avoid in any new code

---

## Open Questions

1. **`--color-accent-dark: #3A8F7D` appears in configurator.liquid CSS but not in settings_schema.json**
   - What we know: It's hardcoded in the `{% stylesheet %}` block, used for price display text (`cfg-radio-card__price`, `cfg-checkbox-card__price`)
   - What's unclear: Whether it was intentionally omitted from the design token system, and its contrast ratio on white (#ffffff) — estimated ~4.7:1, which passes AA
   - Recommendation: Calculate precisely; if it passes (likely does), leave it; if not, darken slightly

2. **`inert` attribute browser support on older iOS Safari**
   - What we know: Safari added `inert` in 15.5 (2022); most users are on current Safari
   - What's unclear: The store's actual user device distribution
   - Recommendation: Use `inert` as primary; the fallback (locked step still being pointer-events:none + opacity 0.25) provides a degraded-but-acceptable experience on very old Safari where `inert` is absent

3. **Whether the 120ms delay in `_setMainImage` should be removed after preloading**
   - What we know: The delay was added to allow the fade CSS class to apply before the src change
   - What's unclear: Whether removing it creates a flash even with preloading (browser may not apply CSS synchronously before src change)
   - Recommendation: Keep the CSS fade transition but remove the 120ms setTimeout; instead, use the preload Promise to know the image is cached, then call a simplified `_setMainImage` that sets src directly without a delay

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `assets/configurator.js`, `assets/theme.js`, `layout/theme.liquid`, `sections/configurator.liquid`, all section files, both snippets
- `config/settings_data.json` — color token values
- MDN HTMLImageElement (`new Image()` preloading) — standard, stable API
- WCAG 2.1 AA specification — 4.5:1 normal text, 3:1 large text/UI components (standardized, not subject to change)

### Secondary (MEDIUM confidence)
- WCAG contrast ratio calculations are approximate (hand-computed from hex values); authoritative verification should use a contrast checker tool during implementation
- `inert` attribute browser support: caniuse.com shows 95%+ global support as of 2024; Safari 15.5+ confirmed

### Tertiary (LOW confidence)
- GSAP 3.13.0 being the correct version to pin: Based on GSAP changelog knowledge; the actual latest stable 3.x should be verified at gsap.com/docs before implementing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns are vanilla JS/CSS/HTML
- Architecture patterns: HIGH — directly derived from existing code structure
- Color contrast findings: MEDIUM — calculations are approximate; implementation must verify with a dedicated contrast tool
- Pitfalls: HIGH — derived from direct codebase analysis and known browser behavior

**Research date:** 2026-02-20
**Valid until:** 2026-08-20 (stable domain; WCAG and browser APIs change slowly)
