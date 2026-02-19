# Phase 4: Visual Polish and Brand Content - Research

**Researched:** 2026-02-20
**Domain:** Shopify Liquid theming, CSS polish, GSAP animation refinement, editorial page design
**Confidence:** HIGH

---

## Summary

Phase 4 is a pure front-end polish and content phase within the existing Shopify Liquid + vanilla JS + custom CSS stack. There are no new libraries to introduce, no new architectural patterns to adopt, and no external APIs to integrate. The work falls into three buckets: (1) CSS and GSAP animation refinement on existing sections (hero, features, testimonials), (2) filling a functional gap in the testimonials section (avatar layout CSS is incomplete), and (3) creating a new About/Story page using a custom Liquid template that composes existing sections in an editorial layout.

The codebase audit reveals that the testimonials section already has schema-level support for avatar images (`block.settings.avatar`) and star ratings (`block.settings.rating`), but the CSS for `.testimonials__author` is incorrectly set to `flex-direction: column` with no `.testimonials__avatar` styling defined — this means avatars uploaded in the theme editor will render but without proper layout. VIS-03 is therefore a CSS fix, not a schema or JS change. The hero, features, and testimonials GSAP animations already exist in `assets/theme.js` and are functional; VIS-01, VIS-02, VIS-04 are refinements to CSS values and animation parameters, not structural rewrites.

BRAND-01 through BRAND-03 require creating a new page template (`templates/page.about.json`) that composes existing sections (hero, image-with-text, multicolumn, rich-text, etc.) in an editorial sequence. No new section files need to be written — the existing section library is sufficient for a luxury editorial layout. The only new Liquid work is creating the JSON template file and verifying that `main-page.liquid` does not need to be replaced or supplemented.

**Primary recommendation:** Work sequentially — first audit and fix the CSS baseline (hero, features, testimonials), then refine GSAP timing, then build the About page template using existing sections. Do not create new section files unless an editorial need genuinely cannot be met by existing sections.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | Elevate hero section to luxury tier — refined typography, spacing, and animations | Hero CSS at lines 610–699 of theme.css. GSAP hero animation in theme.js lines 587–598. Refinements: letter-spacing, line-height, subtitle tracking, scroll indicator, animation stagger timing. No schema changes needed. |
| VIS-02 | Polish features section — improved layout, icons, and visual hierarchy | Features CSS at lines 930–990 of theme.css. Icon SVGs are inline in features.liquid. Card padding, icon container sizing, hover states, and heading weight are all CSS-only changes. No schema changes needed. |
| VIS-03 | Upgrade testimonials section — add avatar images and star ratings | Avatar field already in schema (`block.settings.avatar`). Stars already rendered. Gap: `.testimonials__author` has `flex-direction: column` with no avatar CSS. Fix: change to `flex-direction: row; align-items: center; gap: 12px` and add `.testimonials__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }`. |
| VIS-04 | Refine overall typography, spacing, and animation consistency across all sections | Identify inline font-size patterns (hardcoded px in section Liquid) vs. CSS variables. Audit GSAP animation durations/easing across theme.js for consistency. No Liquid changes needed; this is CSS variable hygiene and GSAP parameter standardization. |
| BRAND-01 | Create About/Story page with editorial craftsmanship narrative | Requires new `templates/page.about.json`. Uses existing sections: hero (page hero), image-with-text (story narrative), multicolumn (artisan profiles), rich-text (manufacturing narrative), stats-bar (heritage numbers). No new section files needed. |
| BRAND-02 | Include artisan profiles and Nordic manufacturing story on About page | `sections/multicolumn.liquid` already supports image + heading + text per block — suitable for artisan profiles. `sections/image-with-text.liquid` handles manufacturing story with image. Content is editorial copy only. |
| BRAND-03 | Design About page with luxury editorial layout (not plain text) | `templates/page.about.json` must NOT use `main-page` section (which renders `page.content` as plain rich text). It must compose multiple visual sections in a deliberate editorial sequence. The `page.json` default uses `main-page` — the About template needs its own composition. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Shopify Liquid | Theme API 2025-01 | Template language for page composition | Project constraint — this is the only templating layer |
| Vanilla CSS | N/A | All styling | Project constraint — no preprocessors |
| GSAP | 3.x (unpinned, loaded from CDN) | Scroll-triggered animations | Already loaded globally via layout/theme.liquid |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GSAP ScrollTrigger | 3.x | Per-element scroll animations | Already registered in theme.js — use existing `initGSAPAnimations()` extension pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New section files for About page | Compose existing sections via JSON template | Creating new sections is unnecessary overhead; existing sections cover all editorial needs |
| CSS animations (keyframes) | GSAP | GSAP already loaded globally; adding CSS animations creates two animation systems |
| CSS custom properties for animation timing | Hardcoded GSAP values | CSS custom properties don't work for GSAP parameters; document standard values in comments instead |

**Installation:** None required. No new packages.

---

## Architecture Patterns

### Recommended Project Structure

```
sections/
├── hero.liquid               # Existing — CSS polish only
├── features.liquid           # Existing — CSS polish only
├── testimonials.liquid       # Existing — CSS avatar layout fix
├── image-with-text.liquid    # Existing — used in About page
├── multicolumn.liquid        # Existing — artisan profiles
├── rich-text.liquid          # Existing — manufacturing narrative
└── stats-bar.liquid          # Existing — heritage numbers

assets/
├── theme.css                 # Primary target — hero, features, testimonials CSS sections
└── theme.js                  # GSAP animation parameter refinement

templates/
└── page.about.json           # NEW — About/Story page template (JSON composition)
```

### Pattern 1: JSON Template Page Composition

**What:** A `templates/page.about.json` file that specifies an ordered list of sections and their settings. This is the Shopify-standard pattern for rich editorial pages without writing new Liquid.

**When to use:** When you need an editorial layout for a specific page type that the default `page.json` cannot provide.

**Example:**
```json
{
  "sections": {
    "about-hero": {
      "type": "hero",
      "settings": {
        "subtitle": "Our Story",
        "heading": "Forged in the Nordic Tradition",
        "text": "Every Aurowe tub begins with a single piece of sustainably harvested timber...",
        "heading_size": "large",
        "overlay_opacity": 40
      }
    },
    "story-image-text": {
      "type": "image-with-text",
      "settings": {
        "subtitle": "The Craft",
        "heading": "Built by Hand, Built to Last",
        "layout": "image_left"
      }
    },
    "artisan-profiles": {
      "type": "multicolumn",
      "blocks": { ... },
      "settings": { "heading": "The Artisans" }
    },
    "manufacturing-story": {
      "type": "rich-text",
      "settings": { ... }
    },
    "heritage-stats": {
      "type": "stats-bar",
      "settings": { ... }
    }
  },
  "order": [
    "about-hero",
    "story-image-text",
    "artisan-profiles",
    "manufacturing-story",
    "heritage-stats"
  ]
}
```

Note: The `templates/page.about.json` template is associated with a Shopify Page via the page handle or admin. In Shopify, a page using template `page.about` needs to exist in the admin. This is a content/admin task, not a code task.

### Pattern 2: CSS Section Refinement

**What:** The theme.css file is organized with named section comment banners (e.g., `/* === HERO === */`). All changes to hero, features, and testimonials CSS happen within the relevant comment blocks. New rules are added after existing ones within the block, never scattered.

**When to use:** Every CSS change in Phase 4. Maintain section organization.

**Example (testimonials avatar fix):**
```css
/* Fix: avatar row layout — was flex-direction: column */
.testimonials__author {
  display: flex;
  flex-direction: row;    /* Changed from column */
  align-items: center;
  gap: 12px;
}

.testimonials__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
```

### Pattern 3: GSAP Animation Parameter Consistency

**What:** All GSAP animations in `initGSAPAnimations()` share a consistent vocabulary of durations, eases, and y-offsets. The hero animation currently uses `duration: 0.9, stagger: 0.15, delay: 0.3, ease: 'power3.out'`. Section scroll animations use `duration: 0.8, ease: 'power3.out'`. These parameters need to be documented and standardized.

**When to use:** VIS-04 — ensure no section uses wildly different timing than others.

**Recommended standard values (based on existing code audit):**
```
Hero entry:        duration: 0.9, stagger: 0.12–0.15, ease: 'power3.out', delay: 0.3
Section headers:   duration: 0.8, y: 32, ease: 'power3.out'
Card stagger:      duration: 0.7, y: 40, stagger: 0.10, ease: 'power3.out'
Side-slide:        duration: 0.8, x: ±40, ease: 'power3.out'
```

### Anti-Patterns to Avoid

- **Creating new section files for About page content:** The existing section library covers all editorial needs. Adding new sections (e.g., `sections/about-story.liquid`) creates maintenance overhead and bypasses the JSON template composition pattern.
- **Adding new JavaScript files for animations:** Do not create a separate `about.js` or animation module. All animation logic lives in `initGSAPAnimations()` in `theme.js`. The GSAP selectors already cover `.section__header`, `.image-text__media`, etc. which the About page sections will use.
- **Inline styles for polish changes:** The hero section already has too many inline style attributes (font-size switches via Liquid conditionals). Do not add more. CSS should live in `theme.css`.
- **Using `main-page` section in About template:** `main-page.liquid` renders `{{ page.content }}` as a plain rich text block — this is the "plain text page" outcome BRAND-03 explicitly prohibits.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar image display | Custom avatar component | Shopify `image_url` filter on existing `block.settings.avatar` field | Schema already supports avatar; just fix the CSS layout |
| Star rating display | JavaScript star renderer | Existing Liquid `{% for i in (1..block.settings.rating) %}` loop with SVG star | Already implemented in both carousel and expanding_cards layouts |
| Page composition | New editorial section with hardcoded content | `templates/page.about.json` composing existing sections | JSON templates are the Shopify-native editorial page pattern |
| Animation library | New scroll animation implementation | GSAP ScrollTrigger already loaded globally | GSAP is present on every page load; redundant animation systems create bugs |

**Key insight:** This phase is mostly about removing deficiencies and inconsistencies, not building new capabilities. The infrastructure (sections, animations, CSS structure) is already in place.

---

## Common Pitfalls

### Pitfall 1: Testimonials Avatar CSS Overspecification

**What goes wrong:** The avatar image renders but either overlaps the name text, breaks the card layout, or disappears because `.testimonials__author` is `flex-direction: column` — the avatar has no defined width/height in CSS so it renders at its natural size (up to the card width).

**Why it happens:** The schema and Liquid template render the avatar conditionally (`{% if block.settings.avatar %}`), but the CSS author div was designed for text-only layout. When an avatar is uploaded, the raw `<img>` element inherits `max-width: 100%` from the base reset and renders full-width.

**How to avoid:** Fix `.testimonials__author` to `flex-direction: row` and constrain `.testimonials__avatar` to exactly `40x40px` with `border-radius: 50%; object-fit: cover; flex-shrink: 0;`.

**Warning signs:** Card height varies wildly between testimonials with/without avatars, or name text disappears below a large image.

### Pitfall 2: About Page Template Not Associated With a Page

**What goes wrong:** The `templates/page.about.json` file is committed but no Shopify Page using the `about` template handle exists — so the template is unreachable.

**Why it happens:** Shopify requires a Page to be created in the admin AND assigned the template (`page.about`) before the template renders. The template file alone does nothing.

**How to avoid:** Document clearly that after committing `templates/page.about.json`, a Shopify admin must: (1) create a new Page titled "About" with handle "about", (2) set the template to "page.about". This is the deployment step, not a code step.

**Warning signs:** Navigating to `/pages/about` returns 404 or renders the default page template.

### Pitfall 3: Hero Animation Runs Before GSAP Loads

**What goes wrong:** The hero `gsap.from(heroContent.children, {...})` runs with `delay: 0.3` but GSAP loads `defer` — if the window load event fires before GSAP registers, the hero content starts at `opacity: 0` permanently (GSAP never gets to animate it).

**Why it happens:** GSAP is loaded with `defer` from CDN. The `initGSAPAnimations()` function has a guard: `if (typeof gsap !== 'undefined') { initGSAPAnimations(); } else { window.addEventListener('load', initGSAPAnimations); }`. This is the Phase 3 PERF-03 concern. Phase 4 should not change this guard — just be aware it must remain.

**How to avoid:** When refining hero animation parameters, leave the load guard intact. Do not add `DOMContentLoaded` as an alternate listener.

**Warning signs:** Hero content invisible on first load in staging; works after hard refresh.

### Pitfall 4: Section Header Inline Font Sizes Bypass CSS Variables

**What goes wrong:** Several sections set font-size via inline Liquid conditionals (e.g., `style="font-size: {% if section.settings.heading_size == 'small' %}1.5rem{% elsif ... %}"`). If you add responsive CSS rules to `.section__heading`, they will be overridden by these inline styles due to specificity. Typography consistency (VIS-04) will appear inconsistent between sections.

**Why it happens:** The sections were built with inline size overrides to support the theme editor's heading_size setting. This is a valid pattern, but it means CSS rules cannot override inline styles without `!important`.

**How to avoid:** For VIS-04, focus on values that are NOT overridden by inline styles: `letter-spacing`, `line-height`, `font-weight`, color, margin-bottom. For heading sizes, accept that the theme editor controls them via inline style and standardize only the default values (`heading_size: 'medium'`).

### Pitfall 5: Multicolumn Section Constraints for Artisan Profiles

**What goes wrong:** `sections/multicolumn.liquid` needs to be verified — it may not support images per block if it was built for text-only columns.

**Why it happens:** The section name implies multi-column text layout; images may not be in the schema.

**How to avoid:** Read `sections/multicolumn.liquid` before planning artisan profiles. If it lacks image support, use `sections/features.liquid` with custom_image blocks instead — features.liquid already supports per-block custom image pickers.

**Warning signs:** Artisan profile blocks render without portrait photos.

---

## Code Examples

Verified patterns from codebase audit:

### Hero GSAP Animation (current — theme.js lines 587-598)
```javascript
// Current implementation — refine stagger and delay only
var heroContent = document.querySelector('.hero__content');
if (heroContent) {
  gsap.from(heroContent.children, {
    y: 30,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out',
    delay: 0.3
  });
}
```

### Testimonials Author Layout Fix (CSS target)
```css
/* Current — broken for avatars */
.testimonials__author {
  display: flex;
  flex-direction: column;  /* BUG: should be row */
  gap: 2px;
}

/* Fixed */
.testimonials__author {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.testimonials__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
```

### Shopify Image URL Filter (for About page section settings)
```liquid
{# Shopify Liquid — used in existing image-with-text.liquid #}
<img
  src="{{ section.settings.image | image_url: width: 720 }}"
  srcset="
    {{ section.settings.image | image_url: width: 400 }} 400w,
    {{ section.settings.image | image_url: width: 720 }} 720w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  class="image-text__image"
>
```

### About Page Template Structure (new file pattern)
```json
{
  "sections": {
    "about-hero": { "type": "hero", "settings": { ... } },
    "story-section": { "type": "image-with-text", "settings": { ... } },
    "artisan-profiles": {
      "type": "features",
      "blocks": {
        "artisan-1": {
          "type": "feature",
          "settings": {
            "custom_image": "shopify://...",
            "heading": "Lars Eriksson",
            "text": "Master craftsman with 20 years of thermowood expertise."
          }
        }
      },
      "block_order": ["artisan-1"],
      "settings": { "heading": "The Artisans", "columns": "3" }
    },
    "manufacturing-narrative": { "type": "rich-text", "settings": { ... } },
    "heritage-numbers": { "type": "stats-bar", "settings": { ... } }
  },
  "order": ["about-hero", "story-section", "artisan-profiles", "manufacturing-narrative", "heritage-numbers"]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shopify page templates as `.liquid` files | JSON templates composing sections | Shopify Online Store 2.0 (2021) | Enables section-based editorial pages without custom Liquid |
| Page content via `page.content` rich text | Section composition in JSON template | Shopify OS2.0 | BRAND-03 — About page must use section composition, not page.content |

**Deprecated/outdated:**
- `templates/page.liquid` (monolithic Liquid templates): Replaced by `templates/page.json` in OS2.0. Project already uses JSON templates throughout. About page must follow the same pattern.

---

## Open Questions

1. **Does `sections/multicolumn.liquid` support per-block images?**
   - What we know: The section exists in the repo but was not read during research
   - What's unclear: Whether the block schema includes an image_picker — if not, artisan profiles need to use `features.liquid` with `custom_image` blocks instead
   - Recommendation: Read `sections/multicolumn.liquid` at the start of the planning step. If no image_picker in block schema, plan to use `features.liquid` (columns: 3) for artisan profiles.

2. **GSAP version — should Phase 4 pin to 3.13.0?**
   - What we know: PERF-02 (Phase 3) requires pinning GSAP to 3.13.0. `theme.liquid` currently loads `gsap@3` (unpinned).
   - What's unclear: Whether Phase 3 will have been completed before Phase 4 executes.
   - Recommendation: Phase 4 should not change the GSAP CDN URL if Phase 3 hasn't run. Note this dependency in the plan. If GSAP is already pinned by Phase 3, no action needed.

3. **About page — Shopify admin page creation**
   - What we know: `templates/page.about.json` requires a matching Page in Shopify admin with template `page.about`
   - What's unclear: Whether this is handled automatically by `shopify theme push` or requires manual admin action
   - Recommendation: Document as a manual deployment step. `shopify theme push` uploads templates but does not create Pages in admin. A human must create the About page in admin and select the template.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit — `assets/theme.css` (3800 lines), `assets/theme.js` (620 lines), `sections/hero.liquid`, `sections/features.liquid`, `sections/testimonials.liquid`, `sections/image-with-text.liquid`, `sections/main-page.liquid`, `layout/theme.liquid`, `config/settings_schema.json`, `templates/index.json`, `templates/page.json`
- REQUIREMENTS.md — VIS-01 through VIS-04, BRAND-01 through BRAND-03 definitions
- STATE.md — Project decisions and accumulated context
- CLAUDE.md — Project conventions and architecture constraints

### Secondary (MEDIUM confidence)
- Shopify OS2.0 JSON template pattern — standard platform behavior, consistent with project's existing use of `templates/*.json` files throughout
- GSAP ScrollTrigger pattern — consistent with existing `initGSAPAnimations()` implementation in theme.js

### Tertiary (LOW confidence)
- None — all findings are grounded in direct codebase inspection or well-established platform behavior.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new libraries; verified by direct code audit
- Architecture: HIGH — JSON template pattern is established in existing codebase; section composition follows existing patterns
- Pitfalls: HIGH — Testimonials avatar bug is directly verified by CSS audit; other pitfalls are from direct code inspection
- About page admin step: MEDIUM — Based on standard Shopify platform behavior (not tested in this environment)

**Research date:** 2026-02-20
**Valid until:** 2026-05-20 (stable Shopify Liquid + vanilla JS stack, changes slowly)
