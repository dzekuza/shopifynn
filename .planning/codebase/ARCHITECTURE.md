# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Shopify Liquid theme with component-based section architecture and decoupled JavaScript interactivity.

**Key Characteristics:**
- Liquid-based server-side template rendering for pages and sections
- JSON configuration files (templates/*.json) that compose sections into page layouts
- Modular section components with embedded JSON schemas for customization
- Progressive enhancement with vanilla JavaScript for interactive features
- Static asset compilation (CSS, JavaScript) loaded globally
- Settings-driven customization via Shopify admin using `config/settings_schema.json`

## Layers

**Presentation Layer:**
- Purpose: Render UI components and user-facing content
- Location: `sections/`, `snippets/`, `templates/`, `layout/`
- Contains: Liquid template files for sections, page layouts, and reusable snippets
- Depends on: Settings data, product data, collection data from Shopify
- Used by: Browser (renders HTML), CSS/JS assets

**Styling Layer:**
- Purpose: Apply visual design and responsive layouts
- Location: `assets/theme.css`
- Contains: Global CSS with CSS custom properties (CSS variables) for theming, section-specific styles via `{% stylesheet %}` blocks in Liquid
- Depends on: Settings (color, font values from `config/settings_schema.json`)
- Used by: All HTML elements in presentation layer

**Interactivity Layer:**
- Purpose: Add dynamic behavior (dropdowns, mobile menu, gallery, form validation)
- Location: `assets/theme.js`, `assets/configurator.js`
- Contains: Vanilla JavaScript modules for sticky header, mobile navigation, dropdown menus, product gallery, form handling
- Depends on: DOM selectors with `data-*` attributes
- Used by: Specific components that need event handling

**Configuration Layer:**
- Purpose: Define customizable theme settings and provide admin interface
- Location: `config/settings_schema.json`, `config/settings_data.json`
- Contains: Schema definitions for colors, typography, logo, section-specific settings
- Depends on: Shopify's settings data type definitions
- Used by: Layout and all sections to access user-configured values

**Configurator Engine Layer:**
- Purpose: Manage complex multi-step product customization for hot tub configuration
- Location: `sections/configurator.liquid`, `assets/configurator.js`, `snippets/configurator-product-json.liquid`
- Contains: 15-step wizard for selecting model tier, size, finishes, systems, and accessories
- Depends on: Product and collection data from Shopify, variant relationships
- Used by: `templates/page.configurator.json` page

## Data Flow

**Page Render Flow:**

1. Browser requests URL (e.g., `/collections/hot-tubs`)
2. Shopify router matches URL to `templates/{template-name}.json` or `.liquid`
3. Template JSON references sections in `order` array
4. Each section in `sections/` is rendered with settings and blocks
5. `layout/theme.liquid` wraps content in `{{ content_for_layout }}`
6. CSS and JS assets are loaded from `assets/`
7. JavaScript initializes interactive features using data attributes

**Settings Application Flow:**

1. Admin configures theme in Shopify
2. Settings saved to `config/settings_data.json` (auto-managed by Shopify)
3. Liquid accesses via `settings.*` variable
4. CSS custom properties set in `<style>` in `layout/theme.liquid`
5. Liquid also references settings in section outputs (e.g., `{{ settings.color_primary }}`)
6. Rendered HTML includes style rules with configured values

**Configurator Flow:**

1. User visits configurator page (`page.configurator.json`)
2. `sections/configurator.liquid` renders step HTML + embeds product data JSON
3. `assets/configurator.js` loads, parses embedded JSON, initializes class
4. 15 steps render conditionally based on state (unlocked by previous choices)
5. User selections update internal state object
6. UI renders summary, updates total price, enables/disables next steps
7. User clicks "Add to Cart" → builds cart object with selected variant + add-on variant IDs

**State Management:**

- Templates/sections: No persistent state; stateless render
- JavaScript modules: Function-scoped or closure-based state (header scroll position, mobile menu open/close)
- Configurator: ES6 class instance state with `this.state` object containing all selections
- Form state: DOM state (input values, checked checkboxes)
- Cart state: Shopify backend

## Key Abstractions

**Section:**
- Purpose: Reusable, configurable page component with schema for admin editor
- Examples: `sections/hero.liquid`, `sections/product-tiers.liquid`, `sections/features.liquid`
- Pattern: Each file contains Liquid markup + inline `{% schema %}` JSON + optional `{% stylesheet %}` and `{% javascript %}` blocks
- Block system: Sections can have multiple blocks (repeatable sub-components) defined in schema

**Snippet:**
- Purpose: Reusable partial template, not directly editable in admin
- Examples: `snippets/product-card.liquid`, `snippets/icon.liquid`
- Pattern: Simple Liquid file included via `{% include 'snippet-name' %}` with optional parameter passing

**Template:**
- Purpose: Page layout definition; maps URL to sections
- Examples: `templates/index.json`, `templates/product.json`, `templates/collection.json`
- Pattern: JSON structure with `sections` object and `order` array; auto-generated by Shopify admin

**Settings Schema:**
- Purpose: Define customizable theme options exposed in Shopify admin
- Examples: `config/settings_schema.json` (global) + schemas embedded in `sections/` (section-specific)
- Pattern: JSON array of setting group objects, each with `settings` array of input field definitions

**Component Classes (JavaScript):**
- Purpose: Encapsulate related functionality (e.g., HotTubConfigurator)
- Examples: `HotTubConfigurator extends HTMLElement` in `assets/configurator.js`
- Pattern: Web Components (custom HTML elements) or IIFE-wrapped modules with event listeners

## Entry Points

**Page Render:**
- Location: `layout/theme.liquid`
- Triggers: Any URL request to store
- Responsibilities:
  - Set up HTML document structure
  - Inject global CSS (theme.css) and fonts
  - Include header and footer sections
  - Render page content via `{{ content_for_layout }}`
  - Load global JavaScript

**Home Page:**
- Location: `templates/index.json`
- Triggers: Request to `/`
- Responsibilities: Compose hero, product tiers, features, testimonials, FAQ, newsletter sections

**Product Page:**
- Location: `templates/product.json`
- Triggers: Request to `/products/{handle}`
- Responsibilities: Render main-product section with blocks for title, price, variant picker, buy buttons, description

**Collection Page:**
- Location: `templates/collection.json`
- Triggers: Request to `/collections/{handle}`
- Responsibilities: Render main-collection section with product grid, sorting, filtering

**Configurator Page:**
- Location: `templates/page.configurator.json`
- Triggers: Request to `/pages/configurator`
- Responsibilities: Embed and initialize HotTubConfigurator custom element with product data

**Global JavaScript:**
- Location: `assets/theme.js`
- Triggers: On page load (deferred)
- Responsibilities:
  - Sticky header on scroll
  - Mobile menu toggle
  - Desktop dropdown menus
  - Product gallery navigation
  - Form handling
  - Common utility functions

## Error Handling

**Strategy:** Graceful degradation with fallback content

**Patterns:**
- Liquid conditional guards: `{% if product %}...{% else %}{{ 'placeholder' }}{% endif %}` prevent rendering errors
- Image fallback placeholders: If no image, render SVG placeholder icon
- JavaScript feature detection: Mobile menu only toggles if elements exist
- Try-catch in configurator: JSON parsing wrapped to handle malformed data
- Cart error display: `[data-cart-error]` element shows checkout errors
- Missing settings: Default values in schema prevent undefined references

## Cross-Cutting Concerns

**Logging:** No persistent logging layer; browser console for debugging

**Validation:**
- Server-side: Shopify validates product data, variants, inventory
- Client-side: Form validation in contact form, configurator quantity validation

**Authentication:**
- Shopify handles customer authentication
- No custom auth layer; cart operations use Shopify's built-in endpoints

**Accessibility:**
- Skip link in layout (`layout/theme.liquid`)
- ARIA labels and roles throughout (dropdowns, buttons, gallery navigation)
- Keyboard navigation for dropdown menus in `assets/theme.js`
- Semantic HTML structure

**Performance:**
- Lazy image loading (`loading="lazy"`)
- Responsive image srcset for multiple breakpoints
- CSS custom properties for theming without duplicating styles
- Deferred script loading (`defer` attribute)
- GSAP library for smooth animations (included via CDN)

---

*Architecture analysis: 2026-02-20*
