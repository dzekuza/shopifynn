# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The hot tub configurator must work flawlessly — it's the primary revenue driver where customers build and price their custom configuration across 15 steps.
**Current focus:** Phase 2 — Configurator Stabilization (Complete — all 4 plans done) / Phase 3 complete

## Current Position

Phase: 3 of 4 (Performance and Accessibility)
Plan: 4 of 4 in phase 02-configurator-stabilization
Status: Phase 02 complete
Last activity: 2026-02-20 — Completed 02-04: Cart validation, error recovery with retry, grouped configuration summary card

Progress: [███████░░░] 75%

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Cart line item property size limit (200 bytes max per Shopify) — validate with a maximum-option configuration during Phase 2
- [Research]: Shopify Theme Editor (designMode) compatibility with configurator connectedCallback — audit during Phase 2
- [Research]: Exact behavior of `defer` on GSAP script tags in Shopify's content_for_header — verify with network throttling in Phase 3

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 02-04-PLAN.md — cart validation with toast, error recovery retry button, grouped config summary card persisted as Shopify cart line item property
Resume file: None
