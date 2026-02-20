---
phase: quick-02
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/theme.css
  - sections/dynamic-content.liquid
  - snippets/product-card.liquid
autonomous: true
requirements: [RESPONSIVE-01, UI-01, DYNAMIC-CONTENT-01]

must_haves:
  truths:
    - "All grid sections collapse gracefully on mobile with proper intermediate tablet breakpoints"
    - "Dynamic content section renders correctly with proper responsive CSS at all breakpoints"
    - "Product cards show 2-per-row on mobile in grid contexts instead of single column"
    - "Touch targets meet 44px minimum on mobile for interactive elements"
  artifacts:
    - path: "assets/theme.css"
      provides: "Responsive fixes for grids, dynamic content CSS, touch target improvements"
    - path: "sections/dynamic-content.liquid"
      provides: "Dynamic content section with correct Liquid template"
    - path: "snippets/product-card.liquid"
      provides: "Product card with clean hover states"
  key_links:
    - from: "sections/dynamic-content.liquid"
      to: "assets/theme.css"
      via: "CSS class references"
      pattern: "dynamic-content__"
    - from: "snippets/product-card.liquid"
      to: "assets/theme.css"
      via: "CSS class references"
      pattern: "product-card__"
---

<objective>
Fix responsive design issues across all theme sections and add proper CSS for the new dynamic-content section.

Purpose: The theme has several responsive gaps — grid sections jump abruptly from 1-column mobile to full desktop without tablet breakpoints, the new dynamic-content section needs CSS integrated into theme.css, product grids force single-column on mobile when 2-column would be more appropriate, and some touch targets are undersized.

Output: Updated theme.css with comprehensive responsive fixes, polished dynamic-content section, improved product card hover states.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@assets/theme.css
@sections/dynamic-content.liquid
@snippets/product-card.liquid
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix responsive breakpoints and grid behavior across all sections</name>
  <files>assets/theme.css</files>
  <action>
Add intermediate tablet breakpoints and fix mobile grid behavior. All changes go in assets/theme.css.

**1. Product card grids — allow 2-col on mobile:**
Currently, dynamic-content products/featured grids and collection-page grids collapse to `1fr` on mobile (max-width: 767px). Change the mobile breakpoint for product-containing grids to use `repeat(2, 1fr)` on mobile instead of `1fr`. This applies to:
- `.dynamic-content__products--2-col` through `--4-col` at max-width: 767px → `repeat(2, 1fr)` (not 1fr)
- `.dynamic-content__featured-grid--2-col` through `--4-col` at max-width: 767px → `repeat(2, 1fr)` (not 1fr)
- `.collection-page__grid` base already is `repeat(2, 1fr)` so it's fine
Keep gallery and testimonial grids at 1fr on mobile (images/text need full width).

**2. Add tablet breakpoint for 4-column sections:**
For multicolumn, blog-posts, and collection-list grids with `--4` variant, add a tablet breakpoint (768px to 1023px) that uses `repeat(2, 1fr)` instead of jumping to 4 columns. Currently they jump from 1-col to 4-col at 768px. Add:
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .multicolumn__grid--4 { grid-template-columns: repeat(2, 1fr); }
  .blog-posts__grid--3 { grid-template-columns: repeat(2, 1fr); }
  .collection-list__grid--4 { grid-template-columns: repeat(2, 1fr); }
}
```
Then change the existing 768px rules for these `--4` variants to `min-width: 1024px`.

**3. Fix dynamic content group block mobile stacking:**
The `.dynamic-content__group[style*="flex-direction: row"]` rule only adds `flex-wrap: wrap` but children have no width constraint. Add:
```css
.dynamic-content__group[style*="flex-direction: row"] > * {
  min-width: 0;
}
```
And in the max-width: 767px media query, force row groups to column:
```css
.dynamic-content__group[style*="flex-direction: row"] {
  flex-direction: column !important;
}
```
(Replace the existing `flex-wrap: wrap` rule with this — column stacking is cleaner on mobile.)

**4. Slideshow dot touch targets:**
The `.slideshow__dot` is only 10x10px. Add min-width/min-height 44px with the visual dot centered using a pseudo-element approach (similar to the existing cfg-tooltip-btn pattern from Phase 3):
```css
.slideshow__dot {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Keep visual size at 10px using existing background */
}
```
This expands the tap target without changing visual appearance.

**5. Fix featured collection banner image in dynamic content:**
Add `object-fit: cover` and a reasonable max-height to `.dynamic-content__featured-banner`:
```css
.dynamic-content__featured-banner {
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 16px;
}
.dynamic-content__featured-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**6. Mobile section padding reduction:**
The existing mobile rule reduces `.section` padding from 100px to 64px. This is good. No change needed here, just confirming.
  </action>
  <verify>
Visually inspect theme.css for:
- No syntax errors (search for unclosed braces)
- All new media queries are properly nested/closed
- No duplicate selectors that conflict
- The dynamic-content responsive rules at lines ~4097-4138 are updated correctly
  </verify>
  <done>
All grid sections have smooth responsive breakpoints: 1-col or 2-col on mobile (< 768px), 2-col on tablet (768-1023px) for dense grids, full columns on desktop (1024px+). Product grids show 2-per-row on mobile. Slideshow dots have 44px touch targets. Dynamic content group blocks stack vertically on mobile.
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish product card hover states and dynamic content section refinements</name>
  <files>assets/theme.css, snippets/product-card.liquid</files>
  <action>
**1. Fix product card hover state conflict:**
Currently `.product-card__link:hover .product-card__image` sets `opacity: 0.85` which conflicts with the secondary image hover reveal (both fire on hover). The primary image should NOT dim when a secondary image exists. Fix by making the opacity hover only apply when there's no secondary image. Since we can't use `:has()` reliably, change the approach:
- Remove the `.product-card__link:hover .product-card__image` opacity rule (line ~1609-1612)
- Add a more targeted rule: `.product-card__link:hover .product-card__image:only-child` with `opacity: 0.92; transition: opacity 0.3s ease;` — this only fires when there's no secondary image sibling
- Keep the existing secondary image opacity transition as-is (it works correctly)

**2. Product card image srcset improvement in snippets/product-card.liquid:**
The current srcset maxes at 480w. For retina displays on desktop grids showing cards at ~300px wide, a 600w and 720w variant would improve sharpness. Update the srcset in product-card.liquid to:
```
srcset="
  {{ product.featured_image | image_url: width: 240 }} 240w,
  {{ product.featured_image | image_url: width: 360 }} 360w,
  {{ product.featured_image | image_url: width: 480 }} 480w,
  {{ product.featured_image | image_url: width: 720 }} 720w
"
```
Same for the secondary image. Update `sizes` to `(max-width: 767px) 45vw, (max-width: 1023px) 30vw, 25vw` to better match actual rendered widths. Update the `src` fallback to `width: 720` as well.

**3. Dynamic content section — add missing CSS to theme.css:**
Verify ALL dynamic-content CSS classes used in dynamic-content.liquid have corresponding styles in theme.css. Based on audit, these classes need CSS rules added (they are used in the Liquid but have no styles):

- `.dynamic-content--full` — needs `width: 100%` (full-width container alternative)
- `.dynamic-content__blocks` — the wrapper for all blocks, needs basic layout
- `.dynamic-content__block` — base block class, needs margin-bottom for spacing between blocks

Add before the existing dynamic-content responsive rules:
```css
/* Dynamic Content — Layout */
.dynamic-content--full {
  width: 100%;
  padding: 0 24px;
}

.dynamic-content__blocks {
  display: flex;
  flex-direction: column;
}

.dynamic-content__block {
  /* Blocks stack vertically with no extra margin — spacing handled by spacer blocks */
}
```

**4. Add focus-visible styles for dynamic content buttons:**
Ensure keyboard accessibility for the dynamic content section's buttons and links:
```css
.dynamic-content__link-button {
  color: var(--color-secondary);
  font-weight: 600;
  font-size: 15px;
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dynamic-content__link-button:hover {
  color: var(--color-accent);
}
```
  </action>
  <verify>
- Check that `.product-card__link:hover .product-card__image` opacity rule is removed and replaced with `:only-child` variant
- Verify product-card.liquid srcset includes 720w
- Verify dynamic-content layout classes exist in theme.css
- Search for any undefined CSS classes referenced in dynamic-content.liquid that still lack styles
  </verify>
  <done>
Product card hover state no longer conflicts between primary opacity dim and secondary image reveal. Product card images have higher-resolution srcset for retina displays. Dynamic content section has all required CSS rules in theme.css. Link-style buttons are properly styled with hover states.
  </done>
</task>

</tasks>

<verification>
1. Open theme locally with `shopify theme dev` and test all grid sections at 3 breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop)
2. Verify product cards show 2-per-row on mobile in collection and dynamic content grids
3. Verify the dynamic-content section renders all block types (heading, text, image, gallery, testimonials, products_grid, featured_collection, group, button, spacer, divider)
4. Test product card hover — primary image should dim slightly when no secondary image exists, secondary image should fade in cleanly when it exists
5. Verify slideshow dots are easy to tap on mobile (44px touch target)
6. Check 4-column grids (multicolumn, collection-list) show 2-col on tablet
</verification>

<success_criteria>
- All sections responsive at mobile (375px), tablet (768px), desktop (1280px) without layout breaks
- Product grids show 2-per-row on mobile instead of 1-per-row
- Dynamic content section fully styled with all block types rendering correctly
- No hover state conflicts on product cards
- Touch targets meet WCAG 2.5.5 minimum 44px on mobile
- No CSS syntax errors
</success_criteria>

<output>
After completion, create `.planning/quick/2-review-and-update-sections-for-responsiv/2-SUMMARY.md`
</output>
