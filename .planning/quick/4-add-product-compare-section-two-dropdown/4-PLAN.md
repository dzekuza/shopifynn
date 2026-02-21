---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - sections/product-compare.liquid
  - assets/theme.css
autonomous: true
requirements: [COMPARE-01]

must_haves:
  truths:
    - "Merchant can add section to any page via theme editor"
    - "Two dropdown selectors allow choosing cold tub products independently"
    - "Selecting a product shows its image, name, shop link, and full specs"
    - "Compare panel toggles open/closed via button and close link"
    - "All product data (specs, images, names, URLs) is editable via section schema blocks"
  artifacts:
    - path: "sections/product-compare.liquid"
      provides: "Complete compare section with Liquid, JS, and schema"
      contains: "{% schema %}"
    - path: "assets/theme.css"
      provides: "Styling for product compare section"
      contains: ".product-compare"
  key_links:
    - from: "sections/product-compare.liquid"
      to: "assets/theme.css"
      via: "CSS classes .product-compare*"
      pattern: "product-compare"
---

<objective>
Create a product compare section for cold tub models with two side-by-side dropdown selectors, product images, shop links, and detailed spec comparison tables.

Purpose: Let customers compare cold tub models (IceBarrel, IceBarrel Stairs, IceBarrel XL, IceBarrel XL Stairs, IceBath, IceBath XL, ProBath) side-by-side to make informed purchase decisions.
Output: `sections/product-compare.liquid` section file and CSS styles in `assets/theme.css`.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@sections/collapsible-content.liquid (pattern for section structure, collapsible toggle, data-* hooks)
@sections/product-tiers.liquid (pattern for product block schema with image/name/price overrides)
@assets/theme.css (existing styles — append new styles at end)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create product-compare.liquid section</name>
  <files>sections/product-compare.liquid</files>
  <action>
Create `sections/product-compare.liquid` with this structure:

**Section HTML:**
- Outer `<section class="product-compare section">` with color_scheme and padding settings (follow collapsible-content.liquid pattern)
- `.container` wrapper
- Section header: heading (default "Which bath suits you?") and subheading, centered
- "Compare models" button (`data-compare-toggle`) that reveals the compare panel
- Compare panel (`data-compare-panel`, hidden by default with `display: none`)
  - Two columns side by side (`.product-compare__grid` — CSS grid, 2 columns on desktop, stack on mobile)
  - Each column has:
    - A `<select>` dropdown (`data-compare-select="left"` / `data-compare-select="right"`) with `<option>` for each product block. Option value = block index. First option "Select a model..." with empty value.
    - Product display area (`data-compare-display="left"` / `data-compare-display="right"`), initially hidden, containing:
      - Product image (`data-compare-img`)
      - Product name (`data-compare-name`)
      - "Shop now" link (`data-compare-link`, class `button button--primary`)
      - Specs table (`data-compare-specs`) with rows for each spec field
  - "Close compare models" link at bottom (`data-compare-close`)

**Inline JavaScript (in a `<script>` tag at the end of the section, NOT in a separate file):**
- Use `data-*` attribute selectors per project conventions (NEVER class selectors)
- On DOMContentLoaded, scope all queries to the section container using `data-section-id="{{ section.id }}"`
- Toggle button (`data-compare-toggle`): shows/hides `data-compare-panel`, updates button text to "Close compare models" when open
- Close link (`data-compare-close`): hides panel, resets button text
- Each `<select>` change handler:
  - Read selected block index from option value
  - Look up product data from a JSON object embedded in the Liquid template
  - Populate the display area: set image src/alt, name text, shop link href, and specs table rows
  - Show the display area; hide it if "Select a model..." chosen

**Product data JSON:** Render a `<script type="application/json" data-compare-products>` tag containing an array of product objects built from section blocks:
```json
[
  {
    "name": "IceBarrel",
    "image": "url",
    "url": "/products/icebarrel",
    "specs": {
      "Design": "Round barrel",
      "Access": "Step over",
      ...
    }
  }
]
```

**Section Schema (`{% schema %}`):**
- Section name: "Product Compare"
- Section settings:
  - heading (text, default "Which bath suits you?")
  - subheading (textarea)
  - button_text (text, default "Compare models")
  - color_scheme (select: default/surface/dark)
  - padding_top (range 0-100, default 40)
  - padding_bottom (range 0-100, default 40)
- Blocks of type "product" with settings:
  - product_name (text, required — e.g. "IceBarrel")
  - product_image (image_picker)
  - product_url (url)
  - spec_design (text, label "Design")
  - spec_access (text, label "Access")
  - spec_heater (text, label "Heater")
  - spec_materials (text, label "Materials")
  - spec_dimensions (text, label "Dimensions")
  - spec_volume (text, label "Volume")
  - spec_weight (text, label "Weight")
  - spec_capacity (text, label "Capacity")
  - spec_insulation (text, label "Insulation")
  - spec_warranty (text, label "Warranty")
- Presets with section name "Product Compare" and 2 empty product blocks

**Spec table rendering:** In the JSON data, build the specs object from all spec_* fields. In JS, iterate over spec keys to build table rows. Only show rows where at least one selected product has a non-empty value for that spec.
  </action>
  <verify>
    Confirm file exists: `ls sections/product-compare.liquid`
    Confirm schema is valid JSON: search for `{% schema %}` block
    Confirm data-* hooks used (no class-based selectors in JS): grep for `querySelector` calls — all should use `[data-` selectors
  </verify>
  <done>
    Section file exists with complete HTML structure (header, toggle button, two-column compare panel with selects and display areas, close link), inline JS using data-* attributes, JSON product data block, and valid schema with heading/subheading settings and product blocks containing name, image, URL, and 10 spec fields.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add product compare CSS styles to theme.css</name>
  <files>assets/theme.css</files>
  <action>
Read `assets/theme.css` first, then append product compare styles at the end (before any final closing comments if present). Use the existing BEM-lite naming convention and CSS custom properties from the theme.

**Classes to style:**

`.product-compare` — Section wrapper, inherits section padding pattern from existing sections.

`.product-compare__header` — Centered text, margin-bottom 2rem.

`.product-compare__toggle-btn` — Styled as `button button--outline` pattern. Centered with `margin: 0 auto; display: block`.

`.product-compare__panel` — Max-width 1100px, margin 2rem auto 0, padding 2rem 0.

`.product-compare__grid` — CSS grid: `grid-template-columns: 1fr 1fr` on desktop (min-width: 750px), single column on mobile. Gap: 2rem.

`.product-compare__column` — Contains select and display area.

`.product-compare__select` — Full-width select dropdown. Style: border 1px solid var(--color-border, #E8EDE9), border-radius 4px, padding 0.75rem 1rem, font-size 1rem, color var(--color-text, #1E2D3B), background white, appearance none with custom chevron via background-image SVG data URI.

`.product-compare__display` — Shows when product selected. Padding-top 1.5rem.

`.product-compare__image` — Width 100%, aspect-ratio 1/1, object-fit cover, border-radius 8px, margin-bottom 1rem, background var(--color-surface, #E8EDE9).

`.product-compare__name` — Font-size 1.25rem, font-weight 600, color var(--color-primary, #1E2D3B), margin-bottom 0.75rem.

`.product-compare__shop-link` — Use existing `.button.button--primary` styles. Display block, text-align center, margin-bottom 1.5rem.

`.product-compare__specs` — Width 100%, border-collapse collapse.

`.product-compare__specs th` — Text-align left, padding 0.5rem 0, font-weight 600, color var(--color-primary, #1E2D3B), font-size 0.875rem, border-bottom 1px solid var(--color-border, #E8EDE9).

`.product-compare__specs td` — Padding 0.5rem 0, color var(--color-text-muted, #7A8B8A), font-size 0.875rem, border-bottom 1px solid var(--color-border, #E8EDE9).

`.product-compare__close` — Display block, text-align center, margin-top 2rem, color var(--color-accent, #4A90A4), text-decoration underline, cursor pointer, font-size 0.875rem, background none, border none.

**Responsive:** On screens below 750px, `.product-compare__grid` becomes single column. Image max-height 300px.

**Color scheme variants:** `.product-compare.section--surface` uses surface background. `.product-compare.section--dark` inverts text colors (white text on dark bg).
  </action>
  <verify>
    Grep for `.product-compare` in assets/theme.css to confirm styles were appended.
    Confirm responsive breakpoint at 750px exists.
    Confirm no duplicate class definitions were introduced.
  </verify>
  <done>
    theme.css contains all product-compare styles: grid layout, select dropdown, image, specs table, toggle/close interactions, responsive breakpoint at 750px, and color scheme variants — all using CSS variables consistent with the Aurowe Nordic brand palette.
  </done>
</task>

</tasks>

<verification>
1. `sections/product-compare.liquid` exists with valid `{% schema %}` block
2. JS uses only `data-*` attribute selectors (no `.className` queries)
3. CSS appended to `assets/theme.css` with `.product-compare*` classes
4. Section can be added via Shopify theme editor (has presets in schema)
5. Schema blocks support all 7 products with 10 spec fields each
</verification>

<success_criteria>
- Product compare section file created with toggle open/close, two dropdown selectors, product display (image + name + shop link + specs table), and inline JS
- All product data editable via theme editor schema blocks
- Styled to match Aurowe Nordic brand using CSS variables
- JavaScript uses data-* attributes per project conventions
- Section is self-contained and addable to any page via theme editor
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-product-compare-section-two-dropdown/4-SUMMARY.md`
</output>
