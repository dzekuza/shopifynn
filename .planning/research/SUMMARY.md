# Project Research Summary

**Project:** Aurowe Shopify Theme Overhaul
**Domain:** Luxury DTC e-commerce — configurable physical products (Nordic hot and cold tubs)
**Researched:** 2026-02-20
**Confidence:** HIGH (stack and architecture verified against Shopify official docs and OWASP; features and pitfalls from multiple industry sources)

---

## Executive Summary

Aurowe operates a 15-step hot tub configurator built on Shopify Liquid with vanilla JS and CSS — a no-build-tools, no-framework constraint that defines the entire technical approach. The configurator is a genuine competitive differentiator: no direct competitor offers self-service online configuration at this price point. The problem is not that the configurator lacks features; it is that it is fragile, insecure, and unvalidated. The priority is hardening what exists, not adding to it. Security must come before stabilization, stabilization before performance, and performance before visual polish — because each phase touches the same code and each dependency flows downward.

Two issues are blocking production readiness regardless of anything else: API credentials are committed to git history (requiring credential rotation plus history rewrite, in that order), and the configurator has 15+ `innerHTML` assignments that interpolate Shopify product data without sanitization. Both are low-complexity fixes with high business risk if left unaddressed. All feature and refactor work should be deferred until these are closed, because adding new code paths to an insecure codebase is strictly worse than doing nothing.

The recommended approach is a four-phase overhaul: (1) security foundation, (2) configurator stabilization via metafield migration and architectural cleanup, (3) performance hardening and code quality, and (4) visual polish and brand content. Phase 2 is the most complex and highest-risk: the metafield migration must fully replace string-matching logic (no fallbacks left active), the configurator's CSS must be extracted to a named asset file, and duplicate price calculation paths must be consolidated before any checkout summary feature is built. Phases 3 and 4 have well-documented patterns and lower risk once the foundation is clean.

---

## Key Findings

### Recommended Stack

The existing stack is fixed and appropriate: Shopify Liquid, vanilla JS (ES6+), vanilla CSS3, and GSAP. No build tools, no frameworks, no package manager installs. The only net-new dependency is **DOMPurify 3.2.7** (loaded from cdnjs CDN), which is the industry-standard XSS sanitizer. GSAP should be pinned to **3.13.0** (currently loaded as unpinned `@3` — a risk vector for surprise breakage). All other improvements are pattern changes, not library additions.

The most impactful stack changes are architectural: CSS `@layer` for organizing the 3800-line `theme.css`, extraction of configurator CSS from the section `{% stylesheet %}` block to `assets/configurator.css` (enables CDN caching), and event delegation to replace per-element listener attachment in the configurator (eliminates the documented listener accumulation bug). Credential management is a one-time fix using `git-filter-repo` — not an ongoing dependency.

**Core technologies:**
- Shopify Liquid (Runtime 2024-10 API): server-side templating — platform requirement, no alternative
- Vanilla JS (ES6+): all client-side interactivity — project constraint
- Vanilla CSS3 + CSS custom properties: all styling — project constraint
- GSAP 3.13.0 (pinned): scroll animations and transitions — already in use; pin version for stability
- DOMPurify 3.2.7 (new, CDN): XSS sanitization for innerHTML call sites — ~30KB, battle-tested

**What NOT to add:** native Sanitizer API (still experimental in Safari 2026), any build tools, localStorage configuration persistence (state versioning complexity outweighs benefit), or 3D/AR visualization (requires asset pipeline and licensing costs that are out of scope).

### Expected Features

The feature research confirms that Aurowe's competitive advantage is the configurator itself — no competitor offers one. The gap to close is reliability and trust, not feature count. A customer who discovers a broken configurator on mobile, or receives a wrong item because of a regex mismatch, is a lost sale and a support escalation. Fix the machine before extending it.

**Must have (table stakes — P1, this milestone):**
- Credential rotation + git history purge — non-negotiable security prerequisite
- XSS sanitization across all configurator innerHTML call sites — revenue-critical code
- Metafield-based product resolution — eliminates the single biggest configurator fragility (regex on product titles)
- Step validation before cart add — prevents malformed orders
- Price calculation consolidation (single source of truth) — prevents display/cart price divergence
- Error recovery on cart failure — UX baseline for 15-step flow
- Accessibility baseline (ARIA, keyboard nav, alt text) — WCAG 2.1 AA and European Accessibility Act compliance
- Mobile configurator testing and fixes — more than 50% of browsing is mobile
- Visual polish on existing sections (hero, testimonials, features) — luxury positioning requires luxury execution
- About/Story page — 91% of high-net-worth buyers cite brand storytelling as a key purchase influence

**Should have (competitive differentiators — P2, after validation):**
- Configurator tooltips per step — surface explanatory copy per option without leaving the flow
- Configuration summary at checkout — confirm what was ordered before payment
- Image preloading per step — eliminate image swap flash on step navigation
- Compatibility filtering — hide incompatible add-ons when base model is selected
- Performance projections/spec callouts per configuration — convert technical buyers

**Defer to v2+:**
- Configuration sharing via link (requires backend storage)
- localStorage persistence (state versioning complexity)
- 3D/AR visualization (asset pipeline + licensing cost)
- User accounts/wishlists (Customer Account API, out of theme-layer scope)
- Blog/journal (content production commitment, sparse template value)

### Architecture Approach

The existing architecture is sound and should be preserved: Shopify platform layer, layout layer (`theme.liquid`), template layer (JSON compositions), section layer (schema-driven components), snippet layer (reusable partials), and asset layer (CSS/JS files). The refactor is about cleaning up violations of this architecture, not replacing it. The most important structural change is treating the data contract between `configurator-product-json.liquid` (Liquid side) and `configurator.js` (JS side) as an explicit, versioned API — right now it relies on product title string patterns, which is not a contract at all.

**Major components and their refactored responsibilities:**
1. `assets/configurator.js` (HotTubConfigurator Web Component): decompose internally into 8 responsibility groups (initialization, step rendering, state management, product resolution, pricing, cart building, UI utilities, event binding) — keep as single file per Shopify/Dawn guidance, improve via internal organization and comment banners
2. `snippets/configurator-product-json.liquid`: the Liquid-to-JS data bridge — extend to include explicit metafield values (`size`, `oven_type`, `addon_type`) so JS never parses product titles
3. `assets/configurator.css` (new): extracted from the `{% stylesheet %}` block in `configurator.liquid` — enables CDN caching; load conditionally in `layout/theme.liquid` only on the configurator template
4. `scripts/setup-configurator.mjs`: add metafield definitions for `configurator.size`, `configurator.oven_type`, `configurator.addon_type`; remove all hardcoded credentials in favor of environment variables

### Critical Pitfalls

All six critical pitfalls identified are specific to this codebase and have a clear phase assignment. None are hypothetical — all are based on direct code observation of `assets/configurator.js` (1183 lines) and `.planning/codebase/CONCERNS.md`.

1. **Rotating credentials without purging git history** — Sequence matters: rotate in Shopify Admin first to invalidate the exposed values, then rewrite history with `git filter-repo`, then force-push, then require all collaborators to re-clone. Skipping the history rewrite leaves the old credentials recoverable via `git log -p`. Address in Phase 1 before any other work.

2. **XSS "fix" that only patches obvious call sites** — There are 15+ `innerHTML` assignments; template literals that embed `${product.title}` or `${s.label}` are the highest risk. Fix as a pattern, not call-by-call: use `textContent` for all plain-text values, DOM builder APIs (`createElement`/`append`) for structural markup, and `DOMPurify.sanitize()` only when markup content from Shopify is genuinely needed. Do not use the existing `_escAttr()` method — it is an incomplete escaper. Address in Phase 1.

3. **Breaking the 15-step unlock logic during state refactor** — The `maxUnlocked` increment logic has no automated tests and touches 25+ interdependent state properties. Before any state management refactoring, document the exact unlock invariant for each step as comments. Centralize all unlocking through a single `_tryUnlockStep(n)` method. After every state-touching commit, manually verify steps 1 through 15 unlock in sequence. Address risk in Phase 2.

4. **Metafield migration with string-matching fallback left active** — When metafield-based lookups replace regex on product titles, delete the old methods entirely in the same commit. Leaving `_getSizeFromProduct()` or `_isInternalOvenProduct()` as fallback paths means the fallback never gets tested and rots silently — until a product is renamed and the fallback fires the wrong result. All base products must have metafields populated via the setup script before the new code deploys. Address in Phase 2.

5. **CSS extraction breaking instance-specific styles** — Audit the `{% stylesheet %}` block for any `{{ }}` or `{% %}` before extracting (these would already be broken, but moving them to `.css` makes the breakage permanent). After extraction, verify theme editor color changes still propagate to configurator styles. Address in Phase 2.

6. **Event listener accumulation surviving the refactor** — The fix for `_showVariants()` stacking listeners must be event delegation on a parent container — not rewriting the method with individual `addEventListener` calls again. Verify after Phase 3 by changing model selection 5+ times and inspecting DevTools event listener count on the swatch container; it should show exactly 1.

---

## Implications for Roadmap

Based on the combined research, a four-phase structure is recommended. The dependency chain is hard: security before stabilization before performance before polish. Attempting to reorder creates compounding risk.

### Phase 1: Security Foundation

**Rationale:** Two critical vulnerabilities exist right now: exposed credentials in git history and XSS-vulnerable innerHTML in revenue-critical code. Every commit added to this repo before the history rewrite extends the exposure window. Every new code path added before innerHTML is fixed creates new injection points. This phase has zero functional changes — it only makes the codebase safe to continue working in.

**Delivers:** Clean git history with no credentials; credential rotation confirmed; all 15+ `innerHTML` call sites audited and fixed or wrapped; DOMPurify loaded on configurator template; `_escAttr()` removed; `var` declarations in `theme.js` cleaned to `const`/`let`; `.env` in `.gitignore`.

**Addresses from FEATURES.md:** XSS-safe output (P1), no credentials in source (P1)

**Avoids from PITFALLS.md:** Credential exposure (Pitfall 1), incomplete XSS fix (Pitfall 2)

**Research flag:** Standard patterns — no additional research needed. OWASP and GitHub docs are definitive.

---

### Phase 2: Configurator Stabilization

**Rationale:** The configurator is the core revenue feature, but it resolves products via fragile regex on product titles, calculates price in two diverging paths, skips step validation before cart add, and has an undocumented silent oven-type downgrade. This phase fixes the configurator's data model and logic so it is production-reliable. CSS extraction is included here because visual polish in Phase 4 cannot proceed cleanly while the configurator's CSS is embedded in the section file.

**Delivers:** Metafield-based product resolution (all regex title-matching deleted); `configurator-product-json.liquid` extended with `size`, `oven_type`, `addon_type` fields; single `_calculateLineItems()` price function used by both display and cart; step validation before cart add; error recovery on cart failure; CSS extracted to `assets/configurator.css` with conditional load in `layout/theme.liquid`; `HotTubConfigurator` class internally decomposed into responsibility groups; event delegation replacing per-element listener attachment; locale-aware currency formatting via `window.Shopify.locale`.

**Addresses from FEATURES.md:** Metafield product resolution (P1), price consolidation (P1), step validation (P1), error recovery (P1), real-time price updates (P1)

**Avoids from PITFALLS.md:** Broken unlock logic (Pitfall 3), metafield fallback left active (Pitfall 4), CSS extraction breaking styles (Pitfall 5), event listener accumulation (Pitfall 6)

**Research flag:** Needs careful execution — the step unlock invariant documentation step is not optional before touching state management. Risk of silent regression is high. Recommend manual 15-step walkthrough after every state-related commit.

---

### Phase 3: Performance and Accessibility

**Rationale:** The configurator's performance problems (DOM queries in loops, image reloads on every variant change, no GSAP CDN load guard) become visible under real traffic conditions, especially on mobile. Accessibility is a legal requirement (European Accessibility Act, June 2025) and a Shopify theme store requirement. Both must be validated before launch traffic arrives.

**Delivers:** Image preloading for configurator steps; `loading="lazy"` on non-critical images; GSAP existence check before scroll animation init; GSAP pinned to 3.13.0 with SRI hash; DOM node caching in `_cacheEls()`; ARIA labels on configurator custom elements; keyboard navigation for step selection; alt text audit across all sections and snippets; touch target sizing (44x44px minimum) for mobile configurator; color contrast audit for warm-beige palette; GSAP version pinned in layout; scroll/resize event debouncing verified.

**Addresses from FEATURES.md:** Mobile configurator (P1), accessibility baseline (P1), image preloading (P2)

**Avoids from PITFALLS.md:** GSAP CDN failure silent error, DOM query loops, image reload flash

**Research flag:** Accessibility implementation is well-documented (WCAG 2.1 AA, Shopify official accessibility docs). No additional research needed. Mobile testing should be on real devices, not just browser DevTools.

---

### Phase 4: Visual Polish and Brand Content

**Rationale:** The configurator is reliable by this point and the codebase is clean. Visual improvements and new brand content can now be added without risk of disturbing the underlying logic. The About/Story page is the highest-ROI new content piece for luxury DTC conversion and can be built independently of all configurator work.

**Delivers:** Luxury-tier visual refinement of hero, features, and testimonials sections; testimonials upgraded with avatar images and star ratings; CSS `@layer` applied to `configurator.css` during its polishing pass; About/Story page (craftsmanship narrative, artisan profiles, Nordic manufacturing story); sticky configurator summary panel visual polish and mobile behavior; progress indicator visual improvements; configurator locked-step helper text ("Complete step 1 to unlock remaining steps"); potential lifestyle video/imagery in hero.

**Addresses from FEATURES.md:** Visual polish (P1), About/Story page (P1), lifestyle imagery (P2), sticky summary panel (P2), trust badges (P2)

**Avoids from PITFALLS.md:** Polishing CSS while it is still embedded in the section file (resolved in Phase 2)

**Research flag:** Standard patterns for luxury DTC visual design. No additional research needed beyond existing competitor analysis in FEATURES.md.

---

### Phase Ordering Rationale

- Security before everything: the two critical vulnerabilities cannot coexist with new feature development safely.
- Metafields before pricing consolidation: the consolidated `_calculateLineItems()` function references clean product data; if it still reads string-matched properties, the consolidation is only cosmetic.
- Price consolidation before any checkout summary feature: if display price and cart price can diverge, a checkout summary feature will show the wrong number and destroy trust.
- CSS extraction before visual polish: editing configurator styles while they live in a section `{% stylesheet %}` block means they will need to be moved later anyway, wasting effort.
- Accessibility before launch traffic: the European Accessibility Act has been enforceable since June 2025; this is a legal requirement, not a nice-to-have.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Stabilization):** The metafield provisioning and deletion of string-matching fallbacks is the highest-risk operation in the overhaul. Recommend reviewing the setup script's current metafield definitions against the target data contract before writing any JS changes.
- **Phase 3 (Accessibility):** WCAG 2.1 AA for custom Web Components (ARIA roles on multi-step wizards) has nuances that require consulting the WAI-ARIA Authoring Practices Guide for the tabpanel or wizard role pattern.

**Phases with standard patterns (skip deep research):**
- **Phase 1 (Security):** OWASP DOM XSS prevention and GitHub's credential removal guide are definitive and directly applicable. Follow the checklist in PITFALLS.md.
- **Phase 4 (Visual Polish):** CSS and Liquid changes with no external dependencies. Well-understood territory.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified against Shopify official docs and cdnjs; DOMPurify 3.2.7 and GSAP 3.13.0 version-confirmed; `@layer` and `@property` browser support verified via MDN |
| Features | MEDIUM-HIGH | Table-stakes features grounded in Shopify official docs and OWASP; differentiator priority informed by multiple e-commerce and luxury DTC sources but not first-party user research |
| Architecture | HIGH | Shopify official architecture docs are comprehensive; patterns verified against Dawn reference theme; first-party codebase analysis (CONCERNS.md) is the primary source for current-state issues |
| Pitfalls | HIGH | All six critical pitfalls based on direct code observation of `assets/configurator.js` and `.planning/codebase/CONCERNS.md` — not hypothetical; prevention strategies from OWASP, GitGuardian, and Shopify official docs |

**Overall confidence: HIGH**

### Gaps to Address

- **GSAP + Shopify defer loading interaction:** The exact behavior of `defer` on two separate GSAP script tags in Shopify's `content_for_header` is not formally documented. The recommended mitigation (existence check before init, or making GSAP synchronous) is well-established but the Shopify-specific interaction has MEDIUM confidence only. Verify in dev with network throttling before shipping Phase 3.

- **Cart property size limits:** Shopify Cart AJAX API enforces a 200-byte max per line item property value. The configurator writes a configuration summary to cart properties, but the total character count of a 15-step full selection has not been measured. Validate in Phase 2 with a maximum-option configuration and check cart property payload size.

- **Shopify Theme Editor compatibility:** The `Shopify.designMode` flag should guard against side effects in `connectedCallback` when the configurator is previewed in the theme editor. This has not been audited against the current configurator code. Add to Phase 2 stabilization checklist.

- **sessionStorage as lightweight persistence:** PITFALLS.md notes that even `sessionStorage` (not full `localStorage`) would prevent same-session configuration loss. This is lower complexity than `localStorage` (no version management). The feature research deferred all persistence to v2+, but `sessionStorage` may be worth reconsidering as a low-cost addition in Phase 3. Validate based on actual session completion analytics after Phase 2 deploys.

---

## Sources

### Primary (HIGH confidence)
- [Shopify Liquid Metafield Docs](https://shopify.dev/docs/api/liquid/objects/metafield) — namespace access syntax, metafield types
- [Shopify Theme Architecture Docs](https://shopify.dev/docs/storefronts/themes/architecture) — layer responsibilities, section/snippet roles
- [Shopify JavaScript and Stylesheet Tags Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags) — `{% stylesheet %}` bundling, caching behavior
- [Shopify Performance Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/performance) — 16KB JS budget, defer loading, CSS-first approach
- [Shopify Accessibility Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/accessibility) — WCAG 2.1 AA, theme store requirements
- [OWASP DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html) — safe DOM APIs, innerHTML alternatives
- [GitHub Docs — Removing Sensitive Data from a Repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) — git-filter-repo workflow
- [DOMPurify on cdnjs](https://cdnjs.com/libraries/dompurify) — version 3.2.7 confirmed
- [GSAP 3.13 Release Notes](https://gsap.com/blog/3-13/) — free for commercial use, all plugins public
- [MDN CSS @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) — browser support matrix
- [GitGuardian — Remediating Shopify Access Token Leaks](https://www.gitguardian.com/remediation/shopify-access-token) — rotation + history rewrite sequence
- `.planning/codebase/CONCERNS.md` — first-party concerns audit, 2026-02-20
- `assets/configurator.js` — direct code read, 1183 lines

### Secondary (MEDIUM confidence)
- [Shopify Blog — Product Configurator Guide](https://www.shopify.com/blog/product-configurator) — configurator UX best practices
- [Vervaunt — eCommerce Product Builders UX Best Practices](https://vervaunt.com/ecommerce-product-builders-configurable-products-considerations-ux-best-practices-examples) — multi-step wizard patterns
- [Dialogue Agency — Luxury Brand Storytelling](https://www.dialogue.agency/blog/5-luxury-brand-storytelling-strategies-engage-hnw-audiences) — 91% HNW buyer storytelling stat
- [AllAccessible — Shopify Accessibility 2025](https://www.allaccessible.org/shopify-accessibility-compliance-2025-guide) — EAA enforcement context
- [GSAP Shopify Community Forums](https://gsap.com/community/forums/topic/27203-getting-started-with-shopify-and-gsap/) — defer loading pattern

### Tertiary (LOW confidence)
- Competitor observation (Finnmark Sauna, Jacuzzi.com, Bullfrog Spas) — feature gap analysis; no configurator offered by any direct competitor

---

*Research completed: 2026-02-20*
*Ready for roadmap: yes*
