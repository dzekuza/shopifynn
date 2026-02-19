# Architecture Research

**Domain:** Shopify Liquid theme — complex configurator refactor
**Researched:** 2026-02-20
**Confidence:** HIGH (Shopify official docs verified; Web Component split patterns from Dawn reference theme)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    SHOPIFY PLATFORM LAYER                        │
│  Renders Liquid → injects content_for_header → serves via CDN   │
├──────────────────────────────────────────────────────────────────┤
│                    LAYOUT LAYER                                   │
│  layout/theme.liquid                                             │
│  • HTML shell, CSS variables (:root), font-face                  │
│  • Loads theme.css, theme.js (defer), GSAP CDN (defer)          │
│  • Provides template-body class for page-specific targeting      │
├──────────────────────────────────────────────────────────────────┤
│                    TEMPLATE LAYER                                 │
│  templates/*.json                                                │
│  • Compose sections into page layouts                            │
│  • index.json / product.json / collection.json / page.*.json    │
├──────────────────────────────────────────────────────────────────┤
│                    SECTION LAYER                                  │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐    │
│  │ header.liq │  │ footer.liq │  │ configurator.liquid      │    │
│  │ hero.liq   │  │ features   │  │ main-product.liquid      │    │
│  │ testimonials│  │ collection │  │ (page-specific sections) │    │
│  └────────────┘  └────────────┘  └─────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                    SNIPPET LAYER                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ product-card.liq │  │ icon.liquid  │  │ cfg-product-json  │  │
│  └──────────────────┘  └──────────────┘  └───────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                    ASSET LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  theme.css   │  │  theme.js    │  │  configurator.js   │     │
│  │ (3811 lines) │  │  (619 lines) │  │  (1183 lines)      │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
├──────────────────────────────────────────────────────────────────┤
│                    CONFIG LAYER                                   │
│  config/settings_schema.json → settings_data.json               │
│  • Color tokens, font pickers, logo, social links               │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `layout/theme.liquid` | HTML shell, global CSS vars, asset loading | All sections via `content_for_layout` |
| `config/settings_schema.json` | Defines admin customization surface | `layout/theme.liquid` reads `settings.*` |
| `templates/*.json` | Composes sections into page layouts | Sections (by type reference) |
| `sections/*.liquid` | Renderable, schema-driven page components | Snippets (via render), asset JS/CSS |
| `snippets/*.liquid` | Reusable partials without admin surface | Called from sections |
| `assets/theme.css` | All global and section styling | Loaded in layout head |
| `assets/theme.js` | Sticky header, mobile menu, gallery, dropdowns | DOM via `data-*` attributes |
| `assets/configurator.js` | 15-step wizard: state, pricing, cart build | `data-configurator-products` JSON embedded by Liquid |
| `snippets/configurator-product-json.liquid` | Serializes Shopify product/metafield data → JSON | Read by configurator.js on `connectedCallback` |
| `scripts/setup-configurator.mjs` | Admin API provisioning (one-time) | Shopify REST API 2024-10 |

---

## Recommended Project Structure (Post-Refactor)

```
assets/
├── theme.css                    # Global styles — keep as single file
├── configurator.css             # Extracted from sections/configurator.liquid {% stylesheet %}
├── theme.js                     # Global interactivity (header, nav, gallery)
└── configurator.js              # Web Component — refactored into sub-concerns (see below)

config/
├── settings_schema.json         # Theme settings (colors, fonts, logo)
└── settings_data.json           # Shopify-managed active settings

layout/
└── theme.liquid                 # Add: <link rel="stylesheet" href="{{ 'configurator.css' | asset_url }}">
                                 # Conditioned on template: {% if template.name == 'page' and template.suffix == 'configurator' %}

sections/
├── configurator.liquid          # Remove {% stylesheet %} block; keep Liquid + data embed only
├── main-product.liquid          # Extract inline CSS to theme.css product section
├── header.liquid
├── footer.liquid
└── [all other sections]         # Inline {% stylesheet %} blocks: acceptable for small, section-specific CSS only

snippets/
├── product-card.liquid
├── configurator-product-json.liquid  # Add metafield reads (size, oven-type) to eliminate string parsing
└── icon.liquid

templates/
├── index.json
├── product.json
├── collection.json
└── page.configurator.json

scripts/
├── setup-configurator.mjs       # Move credentials to env-only; no hardcoded values
└── fix-collections.mjs
```

### Structure Rationale

- **`assets/configurator.css`:** The 267-line `{% stylesheet %}` block in `configurator.liquid` cannot be cached by the browser because Shopify bundles all `{% stylesheet %}` blocks into a single `styles.css` injected via `content_for_header`. However, inline stylesheet blocks are re-generated per page render. Extracting to a named asset file enables CDN caching and browser cache reuse across sessions. Load it conditionally in layout only on the configurator template to avoid payload on other pages.

- **`assets/configurator.js` (single file, internal structure split):** Shopify's official stance is that a single file compresses better with GZip than many small files. Dawn (Shopify's reference theme) demonstrates this: complex behavior stays in one file while internal structure is decomposed into focused method groups. Keep the IIFE/class in one file; split concerns *within* the class by grouping methods into clearly named responsibility blocks using comment banners.

- **`sections/*.liquid` inline `{% stylesheet %}`:** Keep only for genuinely section-specific, small CSS (< 50 lines) that no other component reuses. Shopify bundles all section stylesheet blocks into one `styles.css` — so there is no per-section caching benefit. Use for convenience only, not as a CSS architecture strategy.

---

## Architectural Patterns

### Pattern 1: Liquid-to-JS Data Bridge via Embedded JSON

**What:** Liquid serializes Shopify product/variant/metafield data into a `<script type="application/json">` embedded in the section. The Web Component reads it once in `connectedCallback()`.

**When to use:** Any time JS needs Shopify data (products, variants, prices, metafields). This is the canonical pattern — avoids Storefront API calls from the browser and keeps data server-authoritative.

**Trade-offs:** Data is static per page load. Dynamic re-fetching (e.g., after variant change) requires AJAX to Shopify's Storefront API or `routes.root_url` endpoints.

**Applies to:** `snippets/configurator-product-json.liquid` → read by `configurator.js connectedCallback()`

**Example (current pattern, keep this):**
```liquid
<!-- In configurator.liquid -->
<script type="application/json" data-configurator-products>
  {% render 'configurator-product-json' %}
</script>
```
```javascript
// In configurator.js
connectedCallback() {
  this.data = JSON.parse(
    this.querySelector('[data-configurator-products]').textContent
  );
}
```

### Pattern 2: Metafield-Based Product Resolution (Replace String Matching)

**What:** Instead of parsing product titles with regex (`/\bXL\b/i`, `/\bI\s*$/`), read explicit metafield values set on each product (`configurator.size`, `configurator.oven_type`). The metafields are defined via `scripts/setup-configurator.mjs` and read in `configurator-product-json.liquid`.

**When to use:** Any product property that the configurator uses for logic — size, oven type, addon type. This eliminates all string-matching fragility.

**Trade-offs:** Requires metafield provisioning (already supported by setup script). No downside for this codebase.

**Build order implication:** Metafield schema definitions in `setup-configurator.mjs` must be provisioned *before* this pattern works in production. Refactor the Liquid snippet and JS class together in the same phase.

**Example (target state):**
```liquid
<!-- In configurator-product-json.liquid -->
{
  "id": {{ product.id }},
  "size": {{ product.metafields.configurator.size | json }},
  "oven_type": {{ product.metafields.configurator.oven_type | json }},
  ...
}
```
```javascript
// In configurator.js — no regex, direct lookup
_getSizeFromProduct(product) {
  return product.size || null; // 'XL', 'L', 'M' from metafield
}
_isInternalOvenProduct(product) {
  return product.oven_type === 'internal';
}
```

### Pattern 3: Configurator Class Internal Decomposition (Single Responsibility Groups)

**What:** Split the 1183-line `HotTubConfigurator` class into clearly bounded responsibility groups, separated by comment banners, without splitting into multiple files. Each group owns one concern.

**When to use:** When a single class exceeds ~400 lines and mixes rendering, state mutation, pricing, and cart logic. The key is that Dawn's approach (and Shopify's guidance) favors one file per component but with strong internal organization.

**Responsibility groups for HotTubConfigurator:**

| Group | Methods | Lines (est.) |
|-------|---------|-------------|
| Initialization & lifecycle | `connectedCallback`, `_cacheEls` | ~30 |
| Step rendering | `_renderSteps`, `_render*Step` (per step) | ~400 |
| State management | `_handleModelSelect`, `_handleSizeSelect`, all `_handle*` | ~200 |
| Product resolution | `_resolveBaseProduct`, `_getSizeFromProduct`, `_isInternalOvenProduct`, `_extractSizes` | ~80 |
| Pricing | `_updatePrice`, `_getSelectedVariantPrice`, `_getProductPrice`, `_getAddonPrice` | ~80 |
| Cart building | `_buildCartItems`, `_buildConfigSummary`, `_handleAddToCart` | ~120 |
| UI utilities | `_setMainImage`, `_scrollToStep`, `_showTooltip`, `_updateSummary` | ~100 |
| Event binding | `_bindEvents` | ~100 |

**Trade-offs:** Does not allow tree-shaking (no build tools). Gains: readability, clear ownership for future engineers, easier to audit specific concerns.

### Pattern 4: Consolidated Price Calculator (Single Source of Truth)

**What:** Replace two separate price-calculation paths (display `_updatePrice` at line 847 and cart `_buildCartItems` at line 1037) with a single `_calculateLineItems(state)` function that returns `{ display: total, items: [...] }`. Both UI display and cart submission call the same function.

**When to use:** Whenever the same business logic (price calculation) runs in two different code paths. Current code has confirmed duplication of add-on detection logic at lines 860-862 and 1062-1068.

**Build order implication:** Implement this in the same phase as security fixes — the string-matching addon lookups (lines 1063, 1067) are both a fragility concern and duplicated. One fix covers both.

**Example (target structure):**
```javascript
_calculateLineItems(state) {
  const items = [];
  let total = state.basePrice || 0;

  // Each add-on: same logic drives both display and cart
  if (state.insulation) {
    const p = this._findProduct('insulations');
    if (p) { total += p.price; items.push({ id: p.variants[0].id, quantity: 1 }); }
  }
  // ... all other add-ons ...

  return { total, items };
}

_updatePrice() {
  const { total } = this._calculateLineItems(this.state);
  this.totalPriceEl.textContent = money(total);
}

_handleAddToCart() {
  const { items } = this._calculateLineItems(this.state);
  // POST items to /cart/add.js
}
```

### Pattern 5: Event Delegation (Replace Per-Element Listeners)

**What:** Instead of adding click listeners to individual swatch/card elements in `_showVariants()` (which accumulates duplicates on repeated calls), attach a single listener to the step container and route by `event.target.closest('[data-action]')`.

**When to use:** Any UI pattern where elements are dynamically created/destroyed. Eliminates the listener accumulation bug documented in CONCERNS.md.

**Example:**
```javascript
_bindEvents() {
  // ONE listener on the root element handles all actions
  this.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    this._dispatch(action, target);
  });
}

_dispatch(action, el) {
  const handlers = {
    'select-model': () => this._handleModelSelect(el.dataset.modelKey),
    'select-size':  () => this._handleSizeSelect(el.dataset.size),
    'oven-type':    () => this._handleOvenType(el.dataset.value),
    // ...
  };
  handlers[action]?.();
}
```

### Pattern 6: Deferred Configurator CSS Loading

**What:** Load `configurator.css` only on the configurator template. Other pages do not pay the CSS cost.

**When to use:** Any asset that is only used on one page type. Shopify's `template.name` and `template.suffix` variables make this conditional possible.

**Example (in layout/theme.liquid):**
```liquid
<link rel="stylesheet" href="{{ 'theme.css' | asset_url }}">
{%- if template.name == 'page' and template.suffix == 'configurator' -%}
  <link rel="stylesheet" href="{{ 'configurator.css' | asset_url }}">
{%- endif -%}
```

---

## Data Flow

### Page Render Flow

```
Browser request (e.g. /pages/configurator)
    ↓
Shopify matches → templates/page.configurator.json
    ↓
Sections listed in template order are rendered
    ↓
sections/configurator.liquid renders:
  - HTML shell (steps, image panel, price bar)
  - {% render 'configurator-product-json' %} → embeds product JSON
    ↓
layout/theme.liquid wraps: content_for_layout
  - Injects CSS vars (:root), loads theme.css
  - Deferred: loads theme.js, configurator.css (conditional)
    ↓
Browser receives HTML + starts rendering
    ↓
Deferred scripts execute:
  - theme.js → sticky header, mobile menu
  - configurator.js → HotTubConfigurator.connectedCallback()
      → parses [data-configurator-products] JSON
      → _renderSteps() → _bindEvents()
```

### Configurator State Flow

```
User interaction (click/select)
    ↓
[data-action="select-model"] → click event → _dispatch()
    ↓
_handleModelSelect(key)
  → state.model = key
  → state.selectedTier = matchingTier
  → _resolveBaseProduct()  [uses metafields, not regex — target state]
  → _renderSizeCards()
  → _unlockStep(2)
  → _updatePrice()
    ↓
_updatePrice()
  → _calculateLineItems(state)  [single source of truth — target state]
  → totalPriceEl.textContent = money(total)
  → _updateSummary()
    ↓
User clicks "Add to Cart"
    ↓
_handleAddToCart()
  → _validateRequiredSteps()   [missing feature — must add]
  → _calculateLineItems(state).items
  → POST /cart/add.js { items: [...] }
  → redirect to /cart
```

### Settings Application Flow

```
Shopify Admin (theme editor)
    ↓
settings_data.json (auto-managed by Shopify)
    ↓
layout/theme.liquid reads settings.*
  → <style>:root { --color-primary: {{ settings.color_primary }}; ... }</style>
    ↓
All CSS rules use var(--color-primary) etc.
  → No Liquid in theme.css; pure CSS custom properties
```

### Liquid-to-JS Data Contract

The data contract between `configurator-product-json.liquid` and `configurator.js` is the most critical interface in the system. It must be treated as an explicit API.

**Current contract (fragile):**
```json
{
  "base": [{ "id": 123, "title": "Classic XL External", "price": 450000, ... }],
  "liners": [...],
  "oven_addons": [{ "title": "Glass Door...", ... }]
}
```

**Target contract (stable):**
```json
{
  "base": [{
    "id": 123,
    "title": "Classic XL External",
    "size": "XL",
    "oven_type": "external",
    "tier": "classic",
    "price": 450000,
    "variants": [{ "id": 456, "price": 450000 }]
  }],
  "liners": [...],
  "oven_addons": [{
    "id": 789,
    "addon_type": "glass-door",
    "title": "Glass Door ...",
    ...
  }]
}
```

JS reads `product.size`, `product.oven_type`, `addon.addon_type` — never parses `.title`.

---

## Anti-Patterns

### Anti-Pattern 1: CSS in `{% stylesheet %}` for Large Component Styles

**What people do:** Put 267+ lines of component CSS inside a section's `{% stylesheet %}` block, as the current `configurator.liquid` does.

**Why it's wrong:**
- Shopify bundles all `{% stylesheet %}` blocks into a single `styles.css` re-generated per page. No CDN cache key stability.
- No browser long-term caching (unlike named asset files with content-addressed URLs).
- Cannot be shared between sections.
- Cannot be audited in isolation.
- Makes the section file a 520-line mixed-concern blob.

**Do this instead:** Extract to `assets/configurator.css`. Load conditionally in `layout/theme.liquid` using `template` guards. Use `{% stylesheet %}` only for genuinely small (< 50 line), section-unique styles.

**Confidence:** HIGH — Shopify official docs state asset files are preferred "when reusability isn't a concern" and that `{% stylesheet %}` blocks "inject once per file, not per instance."

---

### Anti-Pattern 2: String Matching on Product Titles for Business Logic

**What people do:** Use regex like `/\bXL\b/i` on `product.title` to determine size, or `.title.toLowerCase().includes('glass')` to identify addon types.

**Why it's wrong:**
- A product rename in Shopify Admin silently breaks the configurator with no error — wrong variant gets added to cart.
- Revenue-critical code depending on naming conventions is unacceptable.
- The fallback behavior (lines 694-704) silently changes user's oven selection without informing them.

**Do this instead:** Use metafields (`configurator.size`, `configurator.oven_type`, `configurator.addon_type`). The setup script already provisions metafield definitions. Add metafield reads to `configurator-product-json.liquid` and update JS to read from the data contract properties.

**Confidence:** HIGH — documented in CONCERNS.md as critical fragility; pattern is well-established in Shopify ecosystem.

---

### Anti-Pattern 3: Duplicate Price Calculation Paths

**What people do:** Maintain separate pricing logic for display (lines 847-902) and cart submission (lines 1037-1127) that must stay synchronized manually.

**Why it's wrong:**
- Price shown to user can diverge from price charged at checkout.
- Every pricing rule change requires two edits.
- Current code has confirmed duplication: addon detection at lines 860-862 mirrors lines 1062-1068.

**Do this instead:** Single `_calculateLineItems(state)` function returns both `{ total, items }`. Display and cart both call the same function.

---

### Anti-Pattern 4: Per-Element Event Listener Attachment on Dynamic Elements

**What people do:** Call `element.addEventListener('click', handler)` inside `_showVariants()` (line 782) each time a variant selector is re-rendered.

**Why it's wrong:**
- Each re-render stacks additional identical listeners.
- Cannot be removed without reference tracking.
- Memory leak pattern in long-lived Web Components.

**Do this instead:** Single delegated listener on the Web Component root. Route via `event.target.closest('[data-action]')`. See Pattern 5 above.

---

### Anti-Pattern 5: Unconditional Global Asset Loading

**What people do:** Load `configurator.js` on every page, even though it is only needed on `/pages/configurator`.

**Why it's wrong:** Shopify's performance guideline: minified JS should not exceed 16 KB for non-critical scripts. The configurator is 1183 lines and should not execute on product or collection pages.

**Do this instead:** In `sections/configurator.liquid`, use `{% javascript %}` block or add a `<script>` tag with `asset_url` only in that section. Shopify will defer it automatically when loaded via section. Alternatively, load conditionally in `layout/theme.liquid` using `template` guard.

---

## Component Boundaries (What Talks to What)

```
layout/theme.liquid
  ↓ renders
  sections/* (via content_for_layout + section tags)
    ↓ renders
    snippets/* (via render tags, scoped variables)
  ↓ loads (browser)
  assets/theme.css         — styling for all non-configurator components
  assets/configurator.css  — styling for configurator only (conditional)
  assets/theme.js          — global interactivity (header, nav, gallery)
  assets/configurator.js   — configurator Web Component

  configurator.js reads:
    DOM: [data-configurator-products]  ← written by configurator.liquid
    DOM: [data-step], [data-main-image], [data-gallery], etc.
    POST: /cart/add.js  (Shopify Ajax API)

  theme.js reads:
    DOM: [data-header], [data-menu-toggle], [data-dropdown], etc.
    GET:  /cart.js (for cart count)
```

**Strict boundaries:**
- `configurator.js` must not read DOM outside its custom element root (except document-level tooltip dismissal).
- `theme.js` must not know anything about the configurator.
- `snippets/configurator-product-json.liquid` is the only place that reads Shopify product data and transforms it to the JS data contract.
- No Liquid logic should depend on product title strings — all classification via metafields.

---

## Build Order Implications

The refactor must respect these dependency chains:

**Phase 1 — Security & Foundation (no functional changes)**
1. Rotate exposed API credentials, remove from source.
2. Replace `innerHTML` with `textContent`/`createElement` for user-controlled data (product titles, prices).
3. Fix `_escAttr()` to use proper HTML entity encoding or DOMPurify.
4. Fix `var` declarations to `const`/`let` in theme.js.
5. *Dependency:* Nothing else depends on these changes. Safe to ship independently.

**Phase 2 — Metafield Integration (data contract stabilization)**
1. Provision metafield definitions via setup script (if not already present): `configurator.size`, `configurator.oven_type`, `configurator.addon_type`.
2. Update `snippets/configurator-product-json.liquid` to include metafield values in JSON output.
3. Update `configurator.js`: replace `_getSizeFromProduct()`, `_isInternalOvenProduct()`, `_getAddonPrice()` string logic with metafield lookups.
4. *Dependency:* Phase 2 must complete before Phase 3 (pricing consolidation references the clean data model).

**Phase 3 — Refactor (CSS extraction + class decomposition + pricing)**
1. Extract `{% stylesheet %}` from `configurator.liquid` → `assets/configurator.css`.
2. Add conditional CSS load in `layout/theme.liquid`.
3. Consolidate duplicate price calculation into `_calculateLineItems()`.
4. Add event delegation pattern (replace per-element listeners).
5. Add step validation before cart add.
6. *Dependency:* Steps 1-2 are independent of 3-5 and can be done in any order within Phase 3.

**Phase 4 — Visual Polish**
1. Refine section CSS in `assets/theme.css` and section `{% stylesheet %}` blocks.
2. Improve configurator UX layout (progress indicator, mobile layout).
3. *Dependency:* Phase 4 requires Phase 3 to be complete so CSS is in the right file and easy to edit.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Shopify CDN | `asset_url` filter in Liquid → versioned CDN URL | All assets in `/assets` automatically CDN-served |
| Shopify Admin API | Node.js scripts with REST (2024-10) | Setup-only; credentials must stay in `.env`, never source |
| Shopify Cart Ajax API | `POST /cart/add.js` from configurator.js | Returns JSON; current code handles errors minimally |
| jsDelivr CDN (GSAP) | `<script src="cdn.jsdelivr.net/...">` with `defer` | Single point of failure; consider vendoring |
| Shopify Storefront | Liquid globals: `product`, `collection`, `settings.*` | Server-side only; not accessible from client JS |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Liquid → JS | `<script type="application/json" data-*>` embedded JSON | Must be treated as explicit API contract |
| JS → DOM | `data-*` attributes on elements; never class selectors | CSS classes are presentation-only |
| Settings → CSS | `layout/theme.liquid` writes `:root { --color-* }` | Theme.css reads `var(--color-*)` |
| Settings → Liquid | `{{ settings.color_primary }}` in sections | Never hardcode colors in sections |
| Section → Snippet | `{% render 'snippet-name', param: value %}` | Snippets are isolated scope (render tag, not include) |

---

## Sources

- [Shopify — JavaScript and Stylesheet Tags (Official)](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags) — HIGH confidence: describes bundling behavior, caching limitations, instance-specific CSS guidance
- [Shopify — Theme Architecture (Official)](https://shopify.dev/docs/storefronts/themes/architecture) — HIGH confidence: layers, section/snippet/template roles
- [Shopify — Performance Best Practices (Official)](https://shopify.dev/docs/storefronts/themes/best-practices/performance) — HIGH confidence: JS budget (16 KB), defer loading, CSS-first approach
- [Nama Studio — Dawn Theme Code Analysis](https://namastudio.it/en/blogs/blog/codice-dawn-shopify) — MEDIUM confidence: third-party analysis of Dawn's modular JS/CSS approach; consistent with official docs
- [OWASP — DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html) — HIGH confidence: textContent vs innerHTML, sink selection
- `/Users/gvozdovic/Desktop/WEB Projects/shopifynn/.planning/codebase/ARCHITECTURE.md` — HIGH confidence: first-party codebase analysis, 2026-02-20
- `/Users/gvozdovic/Desktop/WEB Projects/shopifynn/.planning/codebase/CONCERNS.md` — HIGH confidence: first-party concerns audit, 2026-02-20
- `/Users/gvozdovic/Desktop/WEB Projects/shopifynn/assets/configurator.js` — Direct code read, 1183 lines

---
*Architecture research for: Shopify Liquid theme — Aurowe configurator refactor*
*Researched: 2026-02-20*
