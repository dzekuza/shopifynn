# Roadmap: Aurowe Theme Overhaul

## Overview

A four-phase overhaul of the Aurowe Shopify theme, moving in a strict dependency order: security hardening first to eliminate active vulnerabilities, then configurator stabilization to make the revenue-critical 15-step wizard production-reliable, then performance and accessibility to handle real traffic and meet legal requirements, and finally visual polish and brand content to complete the luxury presentation. Each phase builds a foundation the next one requires — no phase can safely be reordered.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Foundation** - Rotate credentials, purge git history, and fix all XSS-vulnerable innerHTML call sites
- [x] **Phase 2: Configurator Stabilization** - Replace fragile string-matching with metafield lookups, consolidate pricing, add validation, and clean up architecture (completed 2026-02-20)
- [x] **Phase 3: Performance and Accessibility** - Eliminate DOM performance problems and meet WCAG 2.1 AA baseline (completed 2026-02-20)
- [x] **Phase 4: Visual Polish and Brand Content** - Elevate section designs to luxury tier and create About/Story page (completed 2026-02-19)

## Phase Details

### Phase 1: Security Foundation
**Goal**: The codebase is safe to continue developing — credentials are rotated and purged from history, and all XSS vectors in the configurator are eliminated
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, ARCH-04
**Success Criteria** (what must be TRUE):
  1. No Shopify API credentials exist anywhere in git history or source files — `git log -p` contains no CLIENT_ID, CLIENT_SECRET, or API key values
  2. The .env file is listed in .gitignore and the setup scripts read credentials from environment variables only
  3. All innerHTML call sites in configurator.js use textContent, DOM builder APIs, or DOMPurify.sanitize() — no raw string interpolation into innerHTML
  4. DOMPurify 3.2.7 loads on the configurator template and _escAttr() is deleted from the codebase
  5. theme.js uses const/let exclusively — no var declarations remain
**Plans:** 1/2 plans executed
Plans:
- [ ] 01-01-PLAN.md — Credential management (.gitignore, .env.example, script refactoring) and theme.js var→const/let migration
- [ ] 01-02-PLAN.md — DOMPurify integration and innerHTML XSS sanitization in configurator.js

### Phase 2: Configurator Stabilization
**Goal**: The configurator resolves products reliably via metafields, calculates price from a single source of truth, validates steps before cart add, and is architecturally clean enough to support visual polish
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, CONF-07, CONF-08, CONF-09, ARCH-01, ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. A customer can complete all 15 steps and add to cart — the correct product variant and all add-ons appear in the cart with matching prices
  2. The displayed configuration price and the cart line item total match exactly for any combination of model, size, and add-ons
  3. Attempting to add to cart with an incomplete configuration shows a clear validation error — not a silent failure or wrong cart payload
  4. On a cart add failure, the user sees an error message with a retry option rather than a spinner that never resolves
  5. Configurator CSS loads from assets/configurator.css (not embedded in the section file) and only on the configurator template
**Plans:** 5/5 plans complete
Plans:
- [ ] 02-01-PLAN.md — Extract configurator CSS to asset file and add conditional loading
- [ ] 02-02-PLAN.md — Replace string-matching with metafield-based product resolution
- [ ] 02-03-PLAN.md — Unify price calculation, fix event delegation, locale-aware formatting
- [ ] 02-04-PLAN.md — Step validation, error recovery with retry, grouped configuration summary
- [ ] 02-05-PLAN.md — Reorganize configurator.js into 8 responsibility groups + human verification

### Phase 3: Performance and Accessibility
**Goal**: The configurator and storefront perform well on real devices and meet WCAG 2.1 AA accessibility requirements
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05
**Success Criteria** (what must be TRUE):
  1. Navigating between configurator steps does not cause a visible image flash — the next step's image is already loaded before the transition
  2. A keyboard-only user can complete all 15 configurator steps without requiring a mouse
  3. All interactive elements in the configurator have appropriate ARIA labels and roles — a screen reader announces step number, option names, and selection state
  4. All images across sections and snippets have descriptive alt text, and all touch targets are at minimum 44x44px on mobile
  5. GSAP loads from a pinned CDN URL and theme.js guards against GSAP being undefined before initializing scroll animations
**Plans:** 5 plans
Plans:
- [ ] 03-01-PLAN.md — Pin GSAP CDN version, verify existence guard, fix muted text color contrast
- [ ] 03-02-PLAN.md — Lazy loading sweep and alt text audit across all sections and snippets
- [ ] 03-03-PLAN.md — Configurator image preloading, DOM caching, ARIA semantics, keyboard nav, touch targets
- [ ] 03-04-PLAN.md — [Gap closure] Image preloading, DOM caching expansion, keyboard nav + ARIA management in configurator.js
- [ ] 03-05-PLAN.md — [Gap closure] ARIA group structure on step markup + touch target CSS fixes in configurator.liquid

### Phase 4: Visual Polish and Brand Content
**Goal**: The storefront presents the Aurowe brand at luxury tier — elevated hero, features, and testimonials sections, plus a new About/Story page
**Depends on**: Phase 3
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (what must be TRUE):
  1. The hero section uses refined typography, spacing, and GSAP animations consistent with luxury Nordic positioning — visibly more polished than the pre-overhaul state
  2. Testimonials display avatar images and star ratings alongside review text
  3. The About/Story page exists and presents the craftsmanship narrative, artisan profiles, and Nordic manufacturing story in an editorial layout — not a plain text page
  4. Typography, spacing, and animation timing are consistent across all sections with no visual inconsistencies between pages
**Plans:** 2/2 plans complete
Plans:
- [ ] 04-01-PLAN.md — CSS polish for hero, features, testimonials sections + GSAP animation consistency
- [ ] 04-02-PLAN.md — Create About/Story page JSON template with editorial section composition

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation | 1/2 | In Progress|  |
| 2. Configurator Stabilization | 5/5 | Complete   | 2026-02-20 |
| 3. Performance and Accessibility | 3/3 | Complete | 2026-02-20 |
| 4. Visual Polish and Brand Content | 2/2 | Complete   | 2026-02-19 |
