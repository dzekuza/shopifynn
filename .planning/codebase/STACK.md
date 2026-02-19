# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- Liquid (Shopify template language) - Template engine for all sections, layouts, and snippets
- JavaScript (ES6+) - Vanilla JS for client-side interactivity (~1800 lines total)
- CSS3 - Vanilla CSS with CSS variables, no preprocessor (~3800 lines)

**Secondary:**
- Node.js (modern ES modules) - CLI scripts for Shopify API provisioning

## Runtime

**Environment:**
- Shopify Liquid Runtime - Theme rendering and server-side template processing
- Browser ES6+ - Client-side execution for vanilla JavaScript

**Package Manager:**
- Node.js native (no package.json in root) - Scripts use native fetch and built-in modules
- Shopify CLI - Theme development and deployment

## Frameworks

**Core:**
- Shopify Liquid - Template markup language for theme structure
- No frontend framework (pure Liquid templates and vanilla JavaScript)

**Testing:**
- Not detected

**Build/Dev:**
- Shopify CLI - Theme development server and deployment
- No build bundler or transpiler
- Live reload via Shopify theme dev server

## Key Dependencies

**Critical:**
- GSAP 3.x - Animation library loaded from CDN (v3, with ScrollTrigger plugin)
  - Source: `https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js`
  - Used for scroll animations and smooth transitions
  - Loaded with `defer` attribute in `layout/theme.liquid` (lines 63-64)

**Infrastructure:**
- Shopify Admin API (REST & GraphQL) - Version 2024-10
- Shopify Storefront API - For product data and cart operations
- jsDelivr CDN - Serves GSAP library

## Configuration

**Environment:**
- `.env` file present - Contains Shopify store configuration
- Required variables: `STORE`, `CLIENT_ID`, `CLIENT_SECRET` (for scripts)
- Variables exposed to theme: Shop currency via `window.__shopCurrency` (set in `layout/theme.liquid` line 62)

**Build:**
- `config/settings_schema.json` - Theme customization settings (colors, fonts, logo, social media, favicon)
- `config/settings_data.json` - Current theme configuration values
- No build configuration files (webpack, vite, rollup, etc.)

## Platform Requirements

**Development:**
- Shopify CLI installed
- Node.js (for running setup scripts: `scripts/setup-configurator.mjs`, `scripts/fix-collections.mjs`)
- Modern browser with ES6 support

**Production:**
- Shopify Plus/Standard plan
- Store: `aurowe-2.myshopify.com` (configured in scripts)
- Theme served via Shopify's CDN

## Asset Management

**CSS:**
- `assets/theme.css` (~3800 lines) - Complete theme styling with CSS variables
- Scoped inline styles within section `{% stylesheet %}` blocks
- Mobile-first responsive design, no utility framework

**JavaScript:**
- `assets/theme.js` (~620 lines) - Core theme interactivity: sticky header, mobile menu, dropdowns, cart updates
- `assets/configurator.js` (~1180 lines) - Web Component for 15-step hot tub configurator
- No module bundling; script tags use `| asset_url` Liquid filter for versioning

**Images:**
- `generated-images/` directory - Product images for configurator (referenced by setup script)
- Shopify image CDN for theme assets

## APIs Integrated

**Shopify Admin API:**
- Version: 2024-10
- Authentication: OAuth2 (client credentials flow)
- Used in: `scripts/setup-configurator.mjs`, `scripts/fix-collections.mjs`
- REST endpoints for: products, metafields, collections, variants
- GraphQL for: metafield definitions

**Shopify Storefront API:**
- Implicit - Product data loaded via Liquid `product` global in templates

---

*Stack analysis: 2026-02-20*
