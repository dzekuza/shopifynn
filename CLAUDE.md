# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shopify Liquid theme for **Aurowe** — a Nordic hot and cold tubs e-commerce brand. No build tools or bundlers; pure Liquid templates, vanilla JavaScript, and custom CSS.

## Development Commands

```bash
# Local development with Shopify CLI
shopify theme dev                    # Start local dev server
shopify theme push                   # Push to remote theme
shopify theme pull                   # Pull remote changes

# Configurator setup (requires STORE, CLIENT_ID, CLIENT_SECRET env vars)
node scripts/setup-configurator.mjs  # Create configurator products/metafields via Shopify API
node scripts/fix-collections.mjs     # Fix collection assignments
```

There is no build step, linter, test suite, or package.json in the project root.

## Architecture

### Layout & Theming
- `layout/theme.liquid` — Single layout file. Injects CSS variables from `config/settings_schema.json` into `:root` (colors, fonts). Loads GSAP 3.x from CDN with `defer`.
- `config/settings_schema.json` — Theme editor settings: 7 color tokens, 2 font pickers, logo, social links, favicon.
- `assets/theme.css` — All styling (~3800 lines). Custom CSS with CSS variables, mobile-first responsive. No preprocessor or utility framework.
- `assets/theme.js` — Vanilla JS (~620 lines). Sticky header, mobile menu, dropdown keyboard nav, cart count updates. Uses `data-*` attributes as hooks (e.g., `data-header`, `data-menu-toggle`, `data-dropdown`).

### Templates & Sections
- `templates/*.json` — JSON templates that compose sections. Key pages: `index.json` (homepage), `product.json`, `collection.json`, `page.configurator.json`.
- `sections/*.liquid` — 28 section files. Each section defines its own `{% schema %}` block with settings and blocks.
- `snippets/` — Reusable partials: `product-card.liquid`, `icon.liquid`, `configurator-product-json.liquid`.

### Configurator (Key Feature)
The 15-step hot tub configurator is the most complex part of the theme:
- `sections/configurator.liquid` — Section template that loads product data and renders the configurator shell.
- `assets/configurator.js` — Web Component (~2000+ lines) implementing the multi-step wizard with dynamic pricing, image previews, and model/size selection.
- `snippets/configurator-product-json.liquid` — Serializes Shopify product data (including metafields in `configurator.*` namespace) to JSON for the JS component.
- `templates/page.configurator.json` — Dedicated page template for the configurator.
- `scripts/setup-configurator.mjs` — Node script to provision configurator products, metafield definitions, and collections via Shopify REST API.

Base products use 3 tiers (Classic/Premium/Signature) with variants encoding size (XL/L/M) and oven type (external/internal). Steps cover: model size, fiberglass liner, insulation, heating, exterior panel, hydro massage, air system, filter, LED lighting, thermometer, stairs, pillows, cover, control installation, heater connection.

### Color Palette (Nordic Aurora)
```
Primary:    #1E2D3B   (deep fjord navy — headings)
Secondary:  #5B8A72   (muted aurora green — accents)
Accent:     #4A90A4   (Nordic fjord cyan — CTAs)
Background: #F5F7F6   (icy mist white)
Surface:    #E8EDE9   (frost green tint — cards)
Text:       #1E2D3B
Text Muted: #7A8B8A   (cool sage grey)
```

## Conventions

- JavaScript uses `data-*` attributes for DOM hooks, never class selectors.
- Sections are self-contained with their own schema; section settings are accessed via `section.settings.*`.
- CSS class naming: `.section`, `.container`, `.button`, `.button--primary`, `.button--outline` (BEM-lite).
- Generated product images live in `generated-images/` and are referenced by the configurator setup script.
