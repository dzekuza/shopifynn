# Feature Research

**Domain:** Luxury / premium DTC e-commerce — configurable physical products (Nordic hot tubs)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (web sources verified across multiple industry references)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| XSS-safe output | Baseline browser security. Exposed credentials destroy merchant trust permanently | LOW | Use `textContent`, `DOMPurify`, or DOM API instead of raw `innerHTML`. Current codebase has 15+ violation sites |
| No credentials in source | Industry minimum. Any git history exposure = full admin compromise | LOW | Rotate keys, purge from git history with `git-filter-repo`, move to env only |
| Real-time price updates in configurator | Users expect price to update as they make selections — no surprises at checkout | LOW | Already partially exists; consolidate the two price calculation paths into one |
| Step progress indicator | Multi-step wizards without clear progress indicators see high abandonment | LOW | Current step counter exists but visual polish and error states are missing |
| Validation before cart | Users expect invalid/incomplete configurations to be blocked, not silently submitted | MEDIUM | Currently only checks `size` and `baseVariantId` — all 15 steps need required-field logic |
| Error recovery on cart failure | Failed add-to-cart with no next steps causes confusion and abandonment | LOW | Show retry option, explain failure reason, preserve configuration state |
| Mobile-responsive configurator | >50% of browsing is mobile. Configurators that break on phone kill conversion | MEDIUM | The sticky image panel at 990px breakpoint needs thorough mobile testing |
| Image alt text | Accessibility baseline (WCAG 2.1 AA). Required for Shopify theme store. Legal risk post-EAA June 2025 | LOW | Audit all `<img>` tags in sections and snippets |
| Keyboard-navigable UI | WCAG 2.1 AA requirement. 4,605 ADA lawsuits filed in 2024 targeting Shopify stores | MEDIUM | Configurator custom elements lack ARIA labels and keyboard navigation |
| Color contrast 4.5:1 | WCAG 2.1 AA. Shopify theme store minimum accessibility score is 90 | LOW | Current warm-beige palette (#F4F1EC) + text (#262626) needs ratio audit |
| Touch targets ≥ 44×44px | WCAG 2.1 AA, Shopify theme store requirement | LOW | Configurator option buttons and step nav may be undersized on mobile |
| Sticky header | Expected on all modern e-commerce sites | LOW | Already implemented |
| Product image gallery with zoom | Standard for high-ticket physical products | LOW | Already implemented |
| Variant/swatch selection on PDP | Required for multi-variant products | LOW | Already implemented |
| Responsive mobile layout | Universal expectation | LOW | Already implemented at layout level |
| Font-display: swap | Prevents FOIT on font loading — users see unstyled text rather than blank page | LOW | Already configured per CONCERNS.md |
| Consistent price formatting | Wrong locale formatting (e.g., `de-DE` hardcoded) breaks trust with international customers | LOW | Read locale from `window.__shopCurrency` or Shopify shop settings |

### Differentiators (Competitive Advantage)

Features that set Aurowe apart from commodity hot tub retailers. Not required, but valued by the luxury segment.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Metafield-based product resolution | Eliminates configurator breakage when product names change. Makes the configurator maintainable at scale | MEDIUM | Replace regex title-matching with explicit `configurator.*` metafield lookups. Already planned in PROJECT.md |
| Configuration summary at checkout | Customers building 15-step configurations want to confirm what they ordered | MEDIUM | Currently cart properties are set but not formatted for order confirmation. Requires template customization |
| Contextual tooltips per configurator step | Luxury customers buying €5k+ items want to understand each option before committing | MEDIUM | Surface explanatory text, material specs, or "why this matters" copy per step without leaving the flow |
| Brand story / About page | 91% of high-net-worth individuals cite brand storytelling as a key purchase influence (Dialogue Agency, 2025) | MEDIUM | Craftsmanship timelines, artisan profiles, Nordic manufacturing narrative — editorial layout not just text |
| Lifestyle imagery in hero | Luxury browsing = aspirational experience. Hero videos of product in natural Nordic settings command attention | LOW | Replace or supplement static hero with video/immersive imagery |
| Before/after or comparison slider sections | Helps customers see value of premium add-ons (insulation, exterior panels) | LOW | Prestige theme ships this; buildable in vanilla JS with CSS |
| Image hotspots / "discover the features" section | Lets users click on product photography to learn about specific components | MEDIUM | High-end brands use this to educate without cluttering the page with text |
| Sticky configurator summary panel | Keeps selected options and running price visible as user scrolls through steps | LOW | Already partially present; needs visual polish and mobile behavior |
| Real-time compatibility filtering | When a base model or size is selected, incompatible add-ons are hidden automatically | HIGH | Prevents invalid configurations upstream rather than at cart validation. Requires mapping compatibility rules to metafields |
| Performance projections / spec callouts | For hot tubs: heating time, insulation R-value, water capacity, energy consumption — surfaced per configuration | MEDIUM | Requires structured metafield data per product. Converts technical buyers |
| Editorial product pages | Product pages styled like magazine spreads, not data sheets. Narrative-forward | MEDIUM | Layout changes to main-product section — feature callouts, material deep-dives, atmospheric imagery between specs |
| Trust badges and certifications | Nordic quality marks, CE certification, material warranties — luxury buyers need proof of premium | LOW | Already partially implemented (stats bar); expand to product pages |
| Testimonials with photos / video | Social proof for €5k+ purchase decisions. Text-only reviews feel low-rent for luxury segment | MEDIUM | Testimonials section exists; upgrade with avatar images and star ratings |
| FAQ section per product | Reduces pre-sale support tickets for complex configurable products | LOW | Currently out of scope per PROJECT.md but low complexity when needed |
| Color-accurate swatch system | For exterior panel selection in configurator, swatches must match physical product | LOW | CSS/image swatch approach; requires accurate swatch images from product team |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but create more problems than they solve given the current constraints.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| localStorage configuration persistence | Users lose progress on refresh — frustrating for 15-step flow | Complicates state management significantly. Requires versioning strategy (what happens if configurator steps change between sessions?). Dehydration/rehydration bugs are subtle and hard to test | Solve the actual problem: make the configurator fast and low-friction enough that users complete it in one session. Session-length goal: under 10 minutes |
| Share configuration via link | Customers want to share build with partner before purchasing | Requires either URL-encoding all state (breaks on link shorteners) or a backend to store configurations. Neither is achievable in vanilla Liquid/JS without significant infrastructure | Allow PDF/print summary from the summary screen. Lower engineering cost, same sharing intent |
| Real-time 3D or AR visualization | Modern configurator benchmark | ThreeKit, Cylindo, and similar 3D tools require significant licensing cost and implementation effort. AR requires GLTF/USDZ asset pipeline. Completely out of scope for vanilla JS/CSS/Liquid constraint | High-quality photography per configuration step with fast image preloading achieves 80% of the perceived value at 5% of the cost |
| Live chat / concierge in configurator | Luxury buyers appreciate hand-holding | Adds third-party JS weight, GDPR surface area, and staffing dependency. Does not belong in theme layer | Add a prominent "Book a consultation" CTA linking to a Calendly or equivalent. Same intent, no theme complexity |
| Comparison page | Useful for tier selection (Classic/Premium/Signature) | Complex to maintain as products evolve. Easy to go stale | Surface comparison in the configurator's first step (model/tier selection) using a feature comparison table — in context, not on a separate page |
| Blog/journal | Content marketing for SEO | Not requested, significant content production commitment to not go stale. Adds template complexity | Focus on About/Story page depth. One high-quality editorial page beats a sparse blog |
| User accounts / wishlists | Saves configuration for return visits | Requires Customer Account extension, significant Shopify API work, out of scope for theme-layer-only work | Out of scope entirely for this milestone |
| Real-time inventory per configurator step | "Only 2 left at this size" urgency | Hot tubs at this price point are made-to-order. Fake scarcity backfires with luxury buyers who research thoroughly | Show lead time / production timeline instead — it signals craftsmanship and sets expectations |

---

## Feature Dependencies

```
Security Foundation (XSS fix, credential rotation)
    └──enables──> All other feature work safely
                  └──because──> Working on insecure codebase risks new vulnerabilities being introduced during refactors

Metafield-based product lookups
    └──enables──> Compatibility filtering
                  └──because──> Filtering requires structured data, not regex-parsed titles
    └──enables──> Configuration validation (reliable)
                  └──because──> Validation logic needs authoritative product metadata

Configuration validation
    └──enables──> Configuration summary at checkout
                  └──because──> Summary is only trustworthy if configuration is guaranteed complete

Image preloading / caching
    └──enhances──> Real-time image feedback per step
                   └──because──> Without preloading, image swap creates jarring delay

Accessibility baseline (ARIA, keyboard nav)
    └──required for──> WCAG 2.1 AA compliance
                        └──required for──> European Accessibility Act (enforceable June 2025)

About/Story page
    └──independent──> Can ship without any configurator changes
    └──enhances──> Brand trust → higher conversion on configurator

Event delegation refactor
    └──fixes──> Event listener accumulation (performance)
    └──enables──> Reliable re-render of variant sections

Price calculation consolidation
    └──prerequisite──> Configuration summary at checkout
                       └──because──> Cart price must match displayed price exactly
```

### Dependency Notes

- **Security before features:** Any feature work done before XSS and credential fixes creates risk. New code paths added to the configurator before sanitization is in place will likely introduce new injection points.
- **Metafields before compatibility filtering:** Compatibility filtering requires knowing what each product *is* (size, type, tier) from authoritative metadata, not parsed strings. The metafield migration is a hard prerequisite.
- **Price consolidation before summary:** If displayed price and cart price diverge (the current two-path problem), a checkout summary will show the wrong number and destroy customer trust.
- **Validation before summary:** A configuration summary at checkout is only valuable if the configuration is guaranteed complete. Ship validation first.

---

## MVP Definition

### Launch With (This Milestone — v1 Overhaul)

Minimum bar to make the theme production-ready and trust-worthy for real traffic.

- [ ] **Credential rotation + removal from git** — Non-negotiable security prerequisite. Do before any code review or deployment
- [ ] **XSS sanitization across configurator** — Revenue-critical code with multiple injection points. Fix before adding features
- [ ] **Step validation before cart** — Prevents malformed orders. Required for configurator to be "production-ready"
- [ ] **Price calculation consolidation** — Prevents price mismatch between display and cart. Required for trust
- [ ] **Metafield-based product resolution** — Eliminates the single biggest fragility in the configurator. Required for stability
- [ ] **Error recovery on cart failure** — UX baseline for high-friction 15-step flow
- [ ] **Accessibility baseline** — ARIA on configurator, alt text audit, keyboard nav. Legal risk and Shopify compliance
- [ ] **Mobile configurator testing + fixes** — More than half of users are on mobile
- [ ] **Visual polish: hero, features, testimonials** — Bring the existing sections to luxury-tier quality
- [ ] **About/Story page** — Highest-ROI new content for luxury DTC conversion (91% of HNW buyers respond to storytelling)

### Add After Validation (v1.x)

Add when foundation is stable and real user behavior is observable.

- [ ] **Configurator tooltips per step** — Trigger: support tickets asking "what does X option mean?"
- [ ] **Configuration summary / confirmation** — Trigger: customer service complaints about order confusion
- [ ] **Image preloading / prefetch** — Trigger: performance metrics showing image swap lag on real devices
- [ ] **Compatibility filtering** — Trigger: orders arriving with incompatible option combinations
- [ ] **Performance projections / spec callouts** — Trigger: sales team flagging technical buyer drop-off

### Future Consideration (v2+)

Defer until product-market fit is established and revenue justifies infrastructure cost.

- [ ] **Configuration sharing** — Requires backend. Defer until sufficient user demand is demonstrated
- [ ] **localStorage persistence** — Adds state complexity. Defer until session completion analytics show drop-off from multi-session users specifically
- [ ] **3D / AR visualization** — Requires asset pipeline + licensing. Revisit when revenue supports it
- [ ] **User accounts / wishlists** — Requires Customer Account API work, out of theme layer scope
- [ ] **Blog / journal** — Requires content production commitment. Defer until marketing team is ready

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| XSS sanitization | HIGH (trust/security) | LOW | P1 |
| Credential rotation | HIGH (security) | LOW | P1 |
| Step validation | HIGH (prevents bad orders) | MEDIUM | P1 |
| Price calculation consolidation | HIGH (trust) | LOW | P1 |
| Metafield-based product resolution | HIGH (stability) | MEDIUM | P1 |
| Error recovery on cart failure | MEDIUM | LOW | P1 |
| Accessibility baseline | HIGH (legal + UX) | MEDIUM | P1 |
| Mobile configurator | HIGH (>50% of traffic) | MEDIUM | P1 |
| Visual polish (existing sections) | HIGH (luxury positioning) | MEDIUM | P1 |
| About / Story page | HIGH (HNW conversion) | MEDIUM | P1 |
| Configurator tooltips | MEDIUM | MEDIUM | P2 |
| Configuration summary at checkout | HIGH | MEDIUM | P2 |
| Image preloading | MEDIUM (performance) | LOW | P2 |
| Compatibility filtering | HIGH | HIGH | P2 |
| Performance projections / specs | MEDIUM | MEDIUM | P2 |
| Configuration sharing | LOW-MEDIUM | HIGH | P3 |
| localStorage persistence | LOW-MEDIUM | HIGH | P3 |
| 3D / AR visualization | MEDIUM | VERY HIGH | P3 |

**Priority key:**
- P1: Must have for production-ready launch
- P2: Should have, add when foundation is stable
- P3: Nice to have, future milestone

---

## Competitor Feature Analysis

| Feature | Jacuzzi.com | Finnmark Sauna | Bullfrog Spas | Aurowe (Current) | Aurowe (Target) |
|---------|------------|----------------|---------------|------------------|-----------------|
| Product configurator | No self-service configurator; browse-only with dealer contact | None visible | None visible | 15-step wizard (fragile) | 15-step wizard (stable, validated) |
| Visual preview per option | Static product photography | Static photography | Static photography | Image swap (unoptimized) | Image swap (preloaded, smooth) |
| Real-time pricing | No | No | No | Yes (two paths, risk of mismatch) | Yes (consolidated, single source of truth) |
| Educational content | Spec sheets | Buyer guides, blog | Spec sheets | None | About/Story page, tooltips per step |
| Mobile experience | Adequate | Adequate | Adequate | Untested, likely broken | Fully tested, mobile-first |
| About / craftsmanship | Standard corporate | Brief artisan mention | None | None | Editorial craftsmanship narrative |
| Trust signals | Brand recognition | Awards mentioned | None | Trust badges (basic) | Certifications, testimonials with photos |
| Accessibility | Unknown | Unknown | Unknown | Multiple gaps | WCAG 2.1 AA compliant |

**Insight:** No direct competitor offers a self-service online configurator. Aurowe has a genuine differentiator in the configurator itself — the task is to make it *work reliably*, not to add features to it first. The table-stakes gap is stability and security, not feature parity.

---

## Sources

- [eCommerce Product Configurator Guide — Commerce UI](https://commerce-ui.com/insights/ecommerce-product-configurator-2024-guide) — MEDIUM confidence (web only)
- [eCommerce Product Builders UX Best Practices — Vervaunt](https://vervaunt.com/ecommerce-product-builders-configurable-products-considerations-ux-best-practices-examples) — MEDIUM confidence (web only)
- [How to Use a Product Configurator to Improve Ecommerce Sales — Shopify](https://www.shopify.com/blog/product-configurator) — HIGH confidence (official Shopify)
- [How to Design the Perfect eCommerce Product Configurator — Nebulab](https://nebulab.com/blog/ecommerce-product-configurators) — MEDIUM confidence (web only)
- [Luxury eCommerce Product Page Examples — ConvertCart](https://www.convertcart.com/blog/luxury-product-page-ecommerce) — MEDIUM confidence (web only)
- [Shopify Theme Store Requirements — shopify.dev](https://shopify.dev/docs/storefronts/themes/store/requirements) — HIGH confidence (official Shopify docs)
- [Accessibility Best Practices for Shopify Themes — shopify.dev](https://shopify.dev/docs/storefronts/themes/best-practices/accessibility) — HIGH confidence (official Shopify docs)
- [Shopify Accessibility 2025: WCAG 2.2 Compliance — AllAccessible](https://www.allaccessible.org/blog/shopify-accessibility-compliance-2025-guide) — MEDIUM confidence (web only)
- [5 Luxury Brand Storytelling Strategies — Dialogue Agency](https://www.dialogue.agency/blog/5-luxury-brand-storytelling-strategies-engage-hnw-audiences) — MEDIUM confidence (web only)
- [Prestige Shopify Theme for Luxury Brands — BSSCommerce](https://bsscommerce.com/shopify/prestige-shopify-theme/) — MEDIUM confidence (web only)
- [Finnmark Sauna — Nordic Hot Tub Competitor](https://finnmarksauna.com/en-us/collections/hot-tubs-spas) — MEDIUM confidence (direct competitor observation)
- [26 Best Shopify Themes 2026 — Shopify Blog](https://www.shopify.com/blog/shopify-themes) — HIGH confidence (official Shopify)

---

*Feature research for: Aurowe Shopify theme overhaul — luxury Nordic hot tub configurator*
*Researched: 2026-02-20*
