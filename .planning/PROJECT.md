# Aurowe Theme Overhaul

## What This Is

A comprehensive overhaul of the Aurowe Shopify theme — a Nordic hot and cold tubs e-commerce store. The project fixes security vulnerabilities, stabilizes the fragile 15-step configurator, improves performance, and then elevates the entire theme with polished visuals and new content sections. The goal is a production-ready storefront that can confidently handle real traffic.

## Core Value

The hot tub configurator must work flawlessly — it's the primary revenue driver where customers build and price their custom configuration across 15 steps.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Homepage with hero, product tiers, features, testimonials, FAQ, newsletter sections — existing
- ✓ Product pages with gallery, variant picker, buy buttons, collapsible descriptions — existing
- ✓ Collection pages with product grid and sorting — existing
- ✓ 15-step hot tub configurator with model/size/tier selection, add-ons, and dynamic pricing — existing
- ✓ Sticky header with mobile menu and dropdown navigation — existing
- ✓ Cart functionality with line item properties for configurator builds — existing
- ✓ Theme settings system (colors, fonts, logo, social links) via Shopify admin — existing
- ✓ Color swatch variant selection on product pages — existing
- ✓ GSAP-powered scroll animations — existing
- ✓ Responsive mobile-first layout — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Fix all security vulnerabilities (XSS, exposed credentials, insecure escaping)
- [ ] Stabilize configurator — eliminate string-matching fragility, use metafield-based lookups
- [ ] Add step validation to configurator — prevent incomplete configurations from reaching cart
- [ ] Improve configurator image previews — better visual feedback as options change
- [ ] Fix performance bottlenecks (event listener accumulation, DOM queries in loops, image preloading)
- [ ] Extract inline CSS from configurator section into dedicated asset file
- [ ] Consolidate duplicated price calculation logic
- [ ] Improve code quality (consistent variable declarations, null checks, remove globals)
- [ ] Visual polish — refine typography, spacing, and animations while keeping Nordic/warm direction
- [ ] Add About/Story page — brand story, team, manufacturing process
- [ ] Elevate section designs — hero, features, testimonials, footer with more polish
- [ ] Improve configurator UX — clearer step progression, better mobile layout

### Out of Scope

- State persistence (localStorage) for configurator — adds complexity, defer to v2
- Share configuration via link — requires backend support, defer to v2
- FAQ section — not requested for v1
- Comparison page — not requested for v1
- Blog/journal — not requested for v1
- Full rebrand — keeping existing Nordic/warm palette and design direction
- Build tools or bundlers — staying with vanilla JS/CSS/Liquid architecture
- Testing framework setup — no test infrastructure exists, not adding one now

## Context

- Shopify Liquid theme with no build tools — pure Liquid, vanilla JS, vanilla CSS
- Codebase mapped on 2026-02-20, concerns audit identified 25+ issues across security, tech debt, performance, and fragility
- Configurator is the most complex piece (~1180 lines JS, 15-step wizard) and the most fragile — relies on regex/string matching for product resolution
- Theme uses GSAP 3.x from CDN for scroll animations
- Color palette: charcoal primary (#262626), bronze accents (#B6754D), terracotta CTAs (#C85E3F), warm beige background (#F4F1EC)
- Three product tiers: Classic/Premium/Signature with size variants (XL/L/M) and oven type (external/internal)
- Setup scripts provision products via Shopify Admin API (REST, version 2024-10)

## Constraints

- **Tech stack**: Vanilla JS, CSS, Liquid only — no frameworks, no bundlers, no preprocessors
- **Platform**: Shopify theme architecture — sections, snippets, templates, assets
- **Design direction**: Keep Nordic/warm aesthetic — polish and elevate, don't reinvent
- **Credentials**: Must rotate exposed API credentials after removing from source

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix foundation before visual updates | Fragile code + security issues make feature work risky | — Pending |
| Metafield-based product lookups over string matching | Eliminates fragility in configurator variant resolution | — Pending |
| Keep vanilla JS/CSS/Liquid stack | No build tools = simpler deployment, matches Shopify theme conventions | — Pending |
| Extract configurator CSS to asset file | Enables caching, reduces section complexity | — Pending |

---
*Last updated: 2026-02-20 after initialization*
