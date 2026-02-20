# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The hot tub configurator must work flawlessly — it's the primary revenue driver where customers build and price their custom configuration across 15 steps.
**Current focus:** Phase 6 — Metafield Resolution & Event Delegation (Plan 01 of 01 complete)

## Current Position

Phase: 6 of 7 (Metafield Resolution & Event Delegation)
Plan: 1 of 1 in phase 06-metafield-resolution-event-delegation
Status: Phase 06 plan 01 complete — metafield resolution, connectedCallback guard, event delegation
Last activity: 2026-02-20 - Completed 06-01-PLAN.md: metafield-based product resolution, connectedCallback null guard, event delegation

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3 min
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02-configurator-stabilization | 1 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 02-01 (3 min)
- Trend: —

*Updated after each plan completion*
| Phase 02-configurator-stabilization P01 | 562b691,4310b82 | 2 tasks | 3 files |
| Phase 03-performance-and-accessibility P01 | 8 | 2 tasks | 3 files |
| Phase 03-performance-and-accessibility P02 | 15 | 2 tasks | 5 files |
| Phase 02-configurator-stabilization P02 | 2 | 2 tasks | 2 files |
| Phase 02-configurator-stabilization P04 | 4 | 2 tasks | 2 files |
| Phase 02-configurator-stabilization P04 | 3 | 2 tasks | 2 files |
| Phase 02-configurator-stabilization P05 | 5 | 1 tasks | 1 files |
| Phase 02-configurator-stabilization P05 | 8 | 1 tasks | 1 files |
| Phase 03-performance-and-accessibility P05 | 2 | 2 tasks | 1 files |
| Phase 03-performance-and-accessibility P04 | 2 | 2 tasks | 1 files |
| Phase 06-metafield-resolution-event-delegation P01 | 7 | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Fix foundation before visual updates — fragile code and security issues make feature work risky
- [Init]: Metafield-based product lookups over string matching — eliminates fragility in configurator variant resolution
- [Init]: Extract configurator CSS to asset file — enables caching, reduces section complexity
- [Phase 04-visual-polish-and-brand-content]: About page uses section composition only (no main-page) — all content editable via theme editor per BRAND-03
- [Phase 04-visual-polish-and-brand-content]: Heritage stats bar uses Aurowe bronze accent (#B6754D) for brand consistency
- [Phase 03-performance-and-accessibility]: Pin CDN versions to exact semver (gsap@3.13.0) to prevent silent breaking changes from floating tags
- [Phase 03-performance-and-accessibility]: Darkened muted text to #6A6864 (from #7D7B78) — minimum change to achieve 4.5:1 WCAG AA contrast on #F4F1EC
- [Phase 03-performance-and-accessibility]: Article featured image gets loading=eager as primary LCP candidate for article page
- [Phase 03-performance-and-accessibility]: Filter order for alt text: pipe default before escape to ensure all dynamic fallbacks are XSS-escaped
- [Phase 03-performance-and-accessibility]: inert on .cfg-step__body only keeps step heading accessible while removing body from tab order (WCAG 2.1 keyboard)
- [Phase 03-performance-and-accessibility]: Fire-and-forget _preloadImage() resolves on both load and error — missing images never block UI transitions
- [Phase 02-configurator-stabilization]: Metafield-based product lookups replace string matching — eliminates fragility in configurator variant resolution
- [Phase 02-configurator-stabilization]: Empty string default for absent metafields ensures JS reads never encounter undefined
- [Phase 02-configurator-stabilization]: connectedCallback guard added to prevent null reference when section loads in Shopify theme editor
- [Phase 01-security-foundation]: DOMPurify loaded via jsDelivr CDN with defer before configurator.js — mixed strategy: sanitize() for product data, DOM builder for summary list, static strings left as-is
- [Phase 01-security-foundation]: _escAttr() deleted — tooltip interpolation relies on outer DOMPurify.sanitize() call wrapping the full HTML block
- [01-01]: All 5 setup scripts sanitized (not just 2 planned) — fix-metafields.mjs, list-products.mjs, update-products.mjs also had hardcoded credentials
- [01-01]: Git history clean for source files — scripts were never committed, no rewrite needed
- [01-01]: STORE kept as env var with hardcoded default — not a secret but allows flexibility
- [01-01]: hiddenSelect uses let in theme.js because it is reassigned via chained querySelector on next line
- [02-01]: Use template.suffix == 'configurator' (not template.name) — page.configurator.json has suffix 'configurator', name 'page'
- [02-01]: Retain {% style %} block in configurator.liquid for dynamic per-section Liquid variable styles
- [Phase 02-configurator-stabilization]: _calculateLineItems() returns full line item array enabling display and cart from one source
- [Phase 02-configurator-stabilization]: money() uses Intl.NumberFormat with window.__shopLocale — de-DE/EUR fallbacks for backward compatibility
- [02-04]: Required steps for cart validation: model/size, liner, baseVariantId (oven), exterior — all others optional
- [02-04]: Summary card uses DOM builder (not innerHTML) for XSS safety with product title data
- [02-04]: _buildConfigSummary() measures TextEncoder byte length and falls back to compact pipe format if >200 bytes
- [02-04]: CSS for new UI components added to configurator.liquid stylesheet block (separate CSS file was deleted by prior tooling)
- [Phase 02-configurator-stabilization]: CSS added to configurator.liquid stylesheet block — no separate assets/configurator.css file exists in this project architecture
- [Phase 02-configurator-stabilization]: Summary card renders to data-summary-card element before CTA button — always visible regardless of step scroll position
- [Phase 02-configurator-stabilization]: _currentTotal cached in _updatePrice() so _updateSummary() never independently recalculates prices
- [Phase 02-configurator-stabilization]: _renderSizeCards/_showVariants/_showQtySelector in STEP RENDERING (build step-specific DOM, not general UI helpers)
- [Phase 02-configurator-stabilization]: _buildConfigSummary in PRICE CALCULATION — consumed by both display and cart, core concern is canonical config description
- [Phase 02-configurator-stabilization]: _unlockThrough/_scrollToStep in UI UTILITIES — manage UX progression/scroll state, general utilities not tied to business logic
- [Phase 02-configurator-stabilization]: configurator.js reorganized into 8 banner-delimited responsibility groups using /* ══ N. NAME ══ */ format — pure code movement, no logic changes
- [Phase 03-performance-and-accessibility]: inert on .cfg-step__body only keeps step heading accessible while removing body from tab order; aria-disabled+inert set via Liquid on initial render, JS manages dynamic removal
- [Phase 03-performance-and-accessibility]: min-width/min-height on .cfg-tooltip-btn expands touch target to 44px WCAG 2.5.5 minimum without changing 20px visual circle appearance
- [Phase 03-performance-and-accessibility]: Arrow key group containers: .cfg-cards, .cfg-product-list, .cfg-swatches, .cfg-toggle-group, .cfg-card-options — matches actual rendered wrapper classes
- [Phase 03-performance-and-accessibility]: _stepEls built during _cacheEls before _renderSteps — step shell elements exist in Liquid template, body content added by _renderSteps
- [Phase 06-metafield-resolution-event-delegation]: Metafield reads use p.meta?.size and p.meta?.oven_type — no regex fallback, products missing metafields are skipped with console.warn
- [Phase 06-metafield-resolution-event-delegation]: connectedCallback null guard shows branded Aurowe placeholder when data element absent — theme editor safe
- [Phase 06-metafield-resolution-event-delegation]: Deleted _getSizeFromProduct() and _isInternalOvenProduct() in same commit as metafield migration per CONF-03

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Cart line item property size limit (200 bytes max per Shopify) — validate with a maximum-option configuration during Phase 2
- [Research]: Shopify Theme Editor (designMode) compatibility with configurator connectedCallback — audit during Phase 2
- [Research]: Exact behavior of `defer` on GSAP script tags in Shopify's content_for_header — verify with network throttling in Phase 3

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Update configurator summary card UI with option images, prices, and edit buttons | 2026-02-20 | dd2d3f4 | [1-update-configurator-summary-card-ui-with](./quick/1-update-configurator-summary-card-ui-with/) |

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 02-04-PLAN.md — cart validation with toast, error recovery retry button, grouped config summary card persisted as Shopify cart line item property
Resume file: None
