# Requirements: Aurowe Theme Overhaul

**Defined:** 2026-02-20
**Core Value:** The hot tub configurator must work flawlessly — it's the primary revenue driver where customers build and price their custom configuration across 15 steps.

## v1 Requirements

Requirements for production-ready launch. Each maps to roadmap phases.

### Security

- [ ] **SEC-01**: Rotate all exposed Shopify API credentials (CLIENT_ID, CLIENT_SECRET, API key) in Shopify Admin
- [ ] **SEC-02**: Purge credentials from git history using git-filter-repo
- [ ] **SEC-03**: Add .env to .gitignore and remove hardcoded credentials from setup scripts
- [ ] **SEC-04**: Sanitize all 15+ innerHTML call sites in configurator.js using textContent, DOM APIs, or DOMPurify
- [ ] **SEC-05**: Load DOMPurify 3.2.7 from CDN on configurator template for necessary markup sanitization
- [ ] **SEC-06**: Remove insecure custom _escAttr() method and replace with proper sanitization

### Configurator Stability

- [ ] **CONF-01**: Replace regex-based product title matching with metafield-based lookups (configurator.size, configurator.oven_type, configurator.addon_type)
- [ ] **CONF-02**: Extend configurator-product-json.liquid to include size, oven_type, and addon_type from metafields
- [ ] **CONF-03**: Delete all string-matching fallback methods (_getSizeFromProduct, _isInternalOvenProduct) in same commit as metafield migration
- [ ] **CONF-04**: Consolidate two price calculation paths into single _calculateLineItems() function used by both display and cart
- [x] **CONF-05**: Add step validation before cart — user cannot add to cart with incomplete required configuration
- [x] **CONF-06**: Add clear error recovery on cart add failure with retry option and failure explanation
- [ ] **CONF-07**: Replace per-element event listeners with event delegation on parent containers
- [ ] **CONF-08**: Fix locale-aware currency formatting using window.Shopify.locale instead of hardcoded de-DE
- [x] **CONF-09**: Format configuration summary for order confirmation email display

### Performance

- [x] **PERF-01**: Implement image preloading for configurator step transitions
- [x] **PERF-02**: Pin GSAP to version 3.13.0 with explicit CDN URL
- [x] **PERF-03**: Add GSAP existence check before initializing scroll animations in theme.js
- [x] **PERF-04**: Cache frequently-accessed DOM nodes in _cacheEls() method
- [x] **PERF-05**: Add loading="lazy" to non-critical images (thumbnails, below-fold content)

### Accessibility

- [x] **A11Y-01**: Add ARIA labels and roles to configurator custom element (step navigation, option selection)
- [x] **A11Y-02**: Implement keyboard navigation for all configurator steps and options
- [x] **A11Y-03**: Audit and add alt text to all img tags across sections and snippets
- [x] **A11Y-04**: Ensure all interactive touch targets are minimum 44x44px on mobile
- [x] **A11Y-05**: Audit color contrast ratios for WCAG 2.1 AA compliance (4.5:1 minimum)

### Visual Polish

- [x] **VIS-01**: Elevate hero section to luxury tier — refined typography, spacing, and animations
- [x] **VIS-02**: Polish features section — improved layout, icons, and visual hierarchy
- [x] **VIS-03**: Upgrade testimonials section — add avatar images and star ratings
- [x] **VIS-04**: Refine overall typography, spacing, and animation consistency across all sections

### Brand Content

- [x] **BRAND-01**: Create About/Story page with editorial craftsmanship narrative
- [x] **BRAND-02**: Include artisan profiles and Nordic manufacturing story on About page
- [x] **BRAND-03**: Design About page with luxury editorial layout (not plain text)

### Architecture

- [ ] **ARCH-01**: Extract configurator CSS from section {% stylesheet %} block to assets/configurator.css
- [ ] **ARCH-02**: Load configurator.css conditionally only on configurator template
- [x] **ARCH-03**: Internally decompose configurator.js into 8 responsibility groups with clear comment banners
- [ ] **ARCH-04**: Clean up var/const/let inconsistency in theme.js

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Configurator Enhancements

- **CONF-V2-01**: Add contextual tooltips per configurator step explaining each option
- **CONF-V2-02**: Implement compatibility filtering to hide incompatible add-ons based on model selection
- **CONF-V2-03**: Add sessionStorage persistence for same-session configuration recovery
- **CONF-V2-04**: Performance projections/spec callouts per configuration (heating time, R-value, etc.)

### Content

- **CONT-V2-01**: FAQ section for common hot tub questions
- **CONT-V2-02**: Product comparison functionality (in-context at configurator step 1)
- **CONT-V2-03**: Blog/journal for content marketing

### Future Infrastructure

- **INFRA-V2-01**: Configuration sharing via link (requires backend storage)
- **INFRA-V2-02**: Full localStorage persistence with state versioning
- **INFRA-V2-03**: 3D/AR product visualization
- **INFRA-V2-04**: User accounts and wishlists

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Build tools or bundlers | Project constraint — staying with vanilla JS/CSS/Liquid |
| CSS preprocessors (SCSS/PostCSS) | CSS @layer achieves organization without build tools |
| Frontend frameworks (React, Vue, Alpine) | Would require bundler, violates project constraints |
| Testing framework setup | No existing infrastructure, not adding for this milestone |
| Full visual rebrand | Keeping existing Nordic/warm palette and direction |
| Real-time 3D/AR visualization | Requires asset pipeline + licensing, incompatible with vanilla JS |
| Live chat in configurator | Third-party JS weight, GDPR surface area, staffing dependency |
| User accounts/wishlists | Requires Customer Account API, out of theme layer scope |
| Native Sanitizer API | Still experimental in Safari as of 2026 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 5 | Pending |
| SEC-05 | Phase 5 | Pending |
| SEC-06 | Phase 5 | Pending |
| CONF-01 | Phase 6 | Pending |
| CONF-02 | Phase 6 | Pending |
| CONF-03 | Phase 6 | Pending |
| CONF-04 | Phase 6 | Pending |
| CONF-05 | Phase 2 | Complete |
| CONF-06 | Phase 2 | Complete |
| CONF-07 | Phase 7 | Pending |
| CONF-08 | Phase 7 | Pending |
| CONF-09 | Phase 2 | Complete |
| PERF-01 | Phase 3 | Complete |
| PERF-02 | Phase 3 | Complete |
| PERF-03 | Phase 3 | Complete |
| PERF-04 | Phase 3 | Complete |
| PERF-05 | Phase 3 | Complete |
| A11Y-01 | Phase 3 | Complete |
| A11Y-02 | Phase 3 | Complete |
| A11Y-03 | Phase 3 | Complete |
| A11Y-04 | Phase 3 | Complete |
| A11Y-05 | Phase 3 | Complete |
| VIS-01 | Phase 4 | Complete |
| VIS-02 | Phase 4 | Complete |
| VIS-03 | Phase 4 | Complete |
| VIS-04 | Phase 4 | Complete |
| BRAND-01 | Phase 4 | Complete |
| BRAND-02 | Phase 4 | Complete |
| BRAND-03 | Phase 4 | Complete |
| ARCH-01 | Phase 8 | Pending |
| ARCH-02 | Phase 8 | Pending |
| ARCH-03 | Phase 2 | Complete |
| ARCH-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓
- Pending (gap closure): 14

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after gap closure phase creation*
