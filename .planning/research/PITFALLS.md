# Pitfalls Research

**Domain:** Shopify Liquid theme overhaul — security hardening, Web Component stabilization, performance, visual polish
**Researched:** 2026-02-20
**Confidence:** HIGH (critical pitfalls verified against Shopify official docs and OWASP; Shopify-specific behaviors verified via official developer documentation)

---

## Critical Pitfalls

### Pitfall 1: Rotating Credentials Without Purging Git History First

**What goes wrong:**
Team rotates exposed Shopify API credentials in Shopify Admin and removes them from the current codebase, but forgets that the old values are preserved in git history. Anyone with repo access (or who clones the repo later) can run `git log -p` and recover the original CLIENT_ID, CLIENT_SECRET, and API key.

**Why it happens:**
Credential rotation feels like it "fixes" the problem. The git history angle is non-obvious. Developers close the issue when the secret no longer appears in the working tree.

**How to avoid:**
Rotation and history rewrite must happen as a single atomic action. The correct sequence is: (1) immediately rotate credentials in Shopify Admin to invalidate the exposed values, (2) rewrite git history with `git filter-repo --path .env --invert-paths` or BFG Repo Cleaner to remove every commit that ever contained `.env` or hardcoded values, (3) force-push all branches, (4) notify all collaborators to re-clone — their local copies still have the old history. Add `.env` to `.gitignore` before the next commit. Only then is the exposure closed.

**Warning signs:**
- `.env` file appears in `git log --all --full-history -- .env` output
- `git log -S "CLIENT_SECRET"` returns any commits
- No `.gitignore` entry for `.env`

**Phase to address:**
Security phase (first phase). Must be completed before any other work because every subsequent commit adds to a history that still contains secrets.

---

### Pitfall 2: XSS "Fix" That Only Addresses the Call Site, Not the Pattern

**What goes wrong:**
Developer audits the 15+ `innerHTML` call sites in `configurator.js` and switches the obvious ones to `textContent`. But several call sites use template literal HTML strings that embed `${product.title}`, `${s.label}`, `${money(price)}` — data coming from Shopify product metafields. The fix is applied inconsistently: some sites are fixed, some are missed, and the ones generating card HTML via `sizes.map(s => \`...\`)` are left because "Shopify controls that data."

**Why it happens:**
Shopify product data feels trusted — it comes from your own admin. But product titles, descriptions, and metafield values can contain injected markup if an admin account is compromised, or if an integration writes to those fields. The distinction between "safe DOM API calls" and "template-literal-to-innerHTML" is easy to lose when refactoring 1,000+ lines piecemeal.

**How to avoid:**
Treat the fix as a pattern change, not a call-site patch. The rule is: `innerHTML` never receives a string containing interpolated product data. For plain text fields (titles, prices, labels), use `el.textContent = value`. For structured card markup, build DOM nodes with `document.createElement` / `el.append()` chains. If template literals are kept for structural convenience, strip any product data interpolation and inject text separately via `textContent`. The `_renderSizeCards()` method at line 667 is the canonical example of what must change.

**Warning signs:**
- Any grep for `innerHTML` that returns lines containing `${` or string concatenation with variable names
- Template literal HTML strings assigned to `.innerHTML`
- The custom `_escAttr()` method at line 1163 being used as the "solution" — it only escapes quotes and angle brackets and is not a complete sanitizer

**Phase to address:**
Security phase. Complete before stabilization work because refactoring the configurator's rendering methods will touch the same lines.

---

### Pitfall 3: Breaking the Configurator's Step Unlock Logic During Refactor

**What goes wrong:**
The 15-step wizard uses `this.maxUnlocked` to gate which steps are interactive. During a refactor to extract state into separate objects (UI state, product state, pricing state), the `maxUnlocked` increment logic gets moved or duplicated. Steps 2–15 become permanently locked, or unlock prematurely, because a mutation happened in the old code path that no longer fires.

**Why it happens:**
The configurator's state object has 25+ properties with undocumented interdependencies. No automated tests exist. Changes to `_handleModelSelect`, `_handleSizeSelect`, or `_resolveBaseProduct` can silently alter the unlock sequence. The "test" is manually clicking through all 15 steps every time.

**How to avoid:**
Before touching any state management code, write down (as comments or a doc) the exact sequence of state mutations that unlock each step. Treat each step's unlock condition as an invariant. When refactoring, keep `maxUnlocked` logic in one place — a single `_tryUnlockStep(n)` method — so it cannot be duplicated or missed. After any state refactor, manually verify steps 1 → 15 unlock in sequence and that skipping step 1 leaves step 2 locked.

**Warning signs:**
- Multiple places in the code increment `maxUnlocked` directly rather than through one method
- A refactor commit that touches `this.state = {...}` initialization
- Removing or renaming properties on the state object without a full text search for references

**Phase to address:**
Stabilization phase (after security). The risk is highest when extracting state into sub-objects or splitting the file.

---

### Pitfall 4: Metafield Migration That Leaves the String-Matching Fallback Active

**What goes wrong:**
The metafield-based product lookup is added to replace `_getSizeFromProduct()` and `_isInternalOvenProduct()`, but the old string-matching methods are left in place as fallbacks "just in case." Products that haven't been backfilled with metafields silently fall back to regex parsing. Six months later someone renames a product and the fallback breaks — but the new metafield path works fine. The failure is invisible until a customer selects a configuration that resolves to the wrong variant.

**Why it happens:**
Gradual migration with fallbacks feels safe. The problem is that the fallback path is never exercised in testing because the happy path always wins, so the fallback rots silently.

**How to avoid:**
When the metafield-based lookup is deployed, ensure ALL base products (Classic/Premium/Signature in all sizes and oven types) have the required metafields populated via the setup script before deploying. Remove the string-matching methods entirely in the same commit — do not leave fallback paths. If a product lacks the metafield, the configurator should show a clear error ("configuration unavailable") rather than guessing via regex.

**Warning signs:**
- `_getSizeFromProduct` or `_isInternalOvenProduct` still present after metafield work is merged
- Setup script run on only some products, not all
- Any code path with `|| legacyStringMatch()` style fallback

**Phase to address:**
Stabilization phase. The migration to metafields is the central stabilization task — the fallback removal is what makes it safe, not the migration itself.

---

### Pitfall 5: CSS Extraction That Breaks Instance-Specific Styles

**What goes wrong:**
The 900+ lines of CSS inside `{% stylesheet %}` in `configurator.liquid` are moved to `assets/configurator.css`. This works correctly for global configurator styles. But if any styles inside the `{% stylesheet %}` block use Liquid variables (e.g., `{{ section.settings.some_color }}`), those will silently fail — Shopify does not render Liquid inside `{% stylesheet %}` tags. The block also currently uses CSS custom properties that resolve to Shopify CSS variables set in `:root` (e.g., `var(--color-accent, #5EC2AA)`). If the extraction misses the fallback values and the theme CSS variable isn't loaded before `configurator.css`, the accent color falls back to the hardcoded value instead of the theme setting.

**Why it happens:**
Developers extract the CSS block mechanically without auditing it for Liquid interpolation. The `{% stylesheet %}` documentation is clear that Liquid is not processed inside it, but CSS variables that look like Liquid variables are easy to confuse.

**How to avoid:**
Before extraction, grep the `{% stylesheet %}` block for any `{{` or `{%` — if any exist, they will already be broken in the current code, but extracting them to a `.css` file makes the breakage permanent and harder to detect. After extraction, load `configurator.css` via a `<link>` tag in `layout/theme.liquid` (before `</head>`) so it is always available and cached. Verify in the theme editor that no hardcoded color values appear where CSS variables should be resolving.

**Warning signs:**
- Any `{{ }}` or `{% %}` inside the `{% stylesheet %}` block (currently broken, will be broken in `.css` too)
- Colors in the configurator that don't change when theme settings are updated
- `configurator.css` loaded via `{{ 'configurator.css' | asset_url | stylesheet_tag }}` inside the section rather than in layout — means it only loads on the configurator page, not preloaded

**Phase to address:**
Tech debt / stabilization phase. Must happen before visual polish — polishing styles that still live in a section-embedded stylesheet wastes effort if they need to be moved later.

---

### Pitfall 6: Event Listener Accumulation Surviving the Refactor

**What goes wrong:**
The known bug where `_showVariants()` (line 782) adds new click listeners on swatches every time it is called — without removing prior listeners — is "fixed" by rewriting the method. But the fix uses `addEventListener` on individual swatch elements again, just inside a cleaner method. The accumulation returns as soon as user changes selection multiple times. The correct fix (event delegation on the parent) is skipped because the individual-element pattern is "simpler."

**Why it happens:**
Event delegation requires restructuring how the handler identifies which element was clicked (via `event.target.closest('[data-swatch]')`). This feels like more code than the existing pattern and gets deprioritized in a performance pass.

**How to avoid:**
The variant swatch container (`[data-variants]` or equivalent) must have a single delegated listener added once in `_bindEvents()`. The listener pattern is: `container.addEventListener('click', e => { const swatch = e.target.closest('[data-action="select-variant"]'); if (!swatch) return; ... })`. This listener is never added again regardless of how many times products are re-rendered. Use the AbortController pattern for the configurator's `_bindEvents` to allow clean teardown if the element is removed.

**Warning signs:**
- `addEventListener` calls inside `_showVariants()`, `_renderSizeCards()`, or any render method
- Performance profiling showing duplicate handler calls on swatch click (each click fires N times where N = number of times the user changed model)
- Console logs inside a handler showing multiple executions per single click

**Phase to address:**
Performance phase. Also catches any regressions introduced during stabilization refactors.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `_escAttr()` as the XSS fix | No new dependencies, one-line change | Incomplete escape — misses `&`, `'`, numeric entities; false sense of security | Never — remove it, use `textContent` |
| Leaving `var` declarations alongside `const`/`let` in theme.js | No regression risk | Unintended global scope bugs when `var` hoists out of blocks; harder future audits | Never in new code; fix existing `var` on first touch of that function |
| Using `{% stylesheet %}` in the configurator section as-is after extracting to .css | Avoids the extraction work | CSS injected inline on every page render, not cached; cannot be shared | Never for production; extract before polishing |
| Hardcoding `de-DE` locale in `money()` function (line 14) | Works for current single market | Breaks for any non-Euro market; wrong thousands separator for many locales | Only acceptable for MVP if store is confirmed single-market forever |
| Price calculation in two places (display vs. cart) | No refactor needed now | Display price and cart price diverge silently when one is updated | Never — consolidate before any pricing logic changes |
| Leaving GSAP on external CDN without load-order guard | Simple setup | GSAP not available when `theme.js` runs, scroll animations fail silently in degraded network | Acceptable only with explicit `if (window.gsap)` guard around all GSAP calls |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Shopify Cart AJAX API | Adding configurator line items without checking Shopify cart item property size limits (max 200 bytes per property value) | Compress configuration summary; use order notes for long summaries; test with maximum add-on selection |
| Shopify Admin REST API 2024-10 (setup scripts) | Assuming the API version is stable indefinitely | Store version in an environment variable; add a check in setup scripts that warns if version is more than 2 years old |
| GSAP from CDN (jsdelivr.net) | Initializing scroll triggers unconditionally before confirming GSAP is loaded | Wrap all GSAP init in `if (window.gsap && window.ScrollTrigger)` or use `defer` + `DOMContentLoaded` with a GSAP readiness check |
| Shopify metafields (configurator namespace) | Creating metafield definitions in setup script but not validating they exist before the configurator reads them | Configurator snippet should gracefully handle missing metafields — log warning, fall back to "unavailable" state rather than silently resolving via broken string match |
| Shopify Theme Editor | Using JavaScript that reads `window.location` or DOM-specific state — breaks in editor preview mode | Use `Shopify.designMode` flag to detect editor context; avoid side effects in `connectedCallback` that assume a real storefront session |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| DOM queries inside render loops (`querySelectorAll` inside `.map()`) | Configurator step render gets slower as more steps are rendered; noticeable on low-end mobile | Cache all frequently-accessed node lists in `_cacheEls()` at initialization; pass containers as arguments to render methods | Noticeable at 15 steps with complex DOM; worse if steps re-render on every state change |
| Image reloads on every variant change without preloading | Visible flash/loader on each configurator step click | Preload next-likely image when current step completes; cache `Image` objects in a map keyed by URL | Immediate on any configurator interaction on 3G or slower connections |
| Event listener accumulation on swatch re-render | Each swatch click fires N handlers where N = number of model changes | Event delegation on parent container, bound once | Becomes noticeable after 3+ model changes in a session; extreme after 10+ |
| `{% stylesheet %}` CSS in the section body | CSS re-injected on every page render instead of being cached by CDN | Extract to `assets/configurator.css` loaded via `layout/theme.liquid` | All page loads — performance penalty is constant, not scale-dependent |
| Synchronous GSAP init before scroll | Scroll animations jank or fail silently if GSAP CDN is slow | Add GSAP load detection; make animations progressive enhancement | Intermittently on any page load with CDN latency >200ms |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating Shopify product data as trusted HTML | Admin compromise or third-party integration can write XSS payloads into product titles/metafields; rendered via `innerHTML` in configurator | Use `textContent` for all product title/price/label data; use DOM APIs for structural markup; never interpolate product fields into `innerHTML` template literals |
| Exposed credentials in git history after rotation | Rotated credentials visible to anyone with repo access via `git log -p`; rotation does not close the exposure | Rewrite history with `git filter-repo` immediately after discovery; force-push; require all collaborators to re-clone |
| `_escAttr()` custom escaper as the XSS fix | Only escapes `"`, `'`, `<`, `>`; misses `&`, numeric character references, and edge cases — creates false confidence | Remove `_escAttr()` entirely; use `textContent` for text, `setAttribute` for attribute values (auto-escapes), or `encodeURIComponent` for URL contexts |
| `.env` committed to git without `.gitignore` | Credentials available to anyone who clones the repo now or in the future | Add `.env` to `.gitignore` before first commit; verify with `git check-ignore -v .env` |
| Shopify Admin API scopes too broad in setup credentials | If exposed, attacker has full admin access (products, orders, customers) | Create a separate limited-scope API key for the setup script with only `write_products` and `write_metafields`; rotate after setup is complete |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent oven type downgrade (internal → external fallback at line 694) | User selects "internal oven" and continues; configurator silently switches them to external without clear notification; they reach cart with wrong configuration | Show a visible inline message: "Internal oven not available in [size]. Switching to external." Do not mutate state silently |
| Step validation only at cart add time | User completes 14 steps, clicks add to cart, gets an error about step 3 — loses context for what to fix | Show per-step completion indicators; validate step N when user advances to step N+1, not at the end |
| No configurator progress persistence | User builds 12-step configuration, accidentally closes tab — all work lost | Even a `sessionStorage` persistence (not full localStorage) prevents same-session loss with minimal code |
| Configurator locked steps at 25% opacity with no explanation | User confused about why most steps are greyed out on first load | Add a helper text: "Complete step 1 to unlock the remaining steps" — visible below step 1, not below step 15 |
| Mobile layout: sticky image panel scrolls out of view | On mobile, the tub image disappears after scrolling past it; user can't see their configuration changes | For mobile, move the image above the active step using CSS scroll snapping or sticky positioning with a smaller image area |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **XSS fix:** All `innerHTML` call sites converted — verify with `grep -n 'innerHTML' assets/configurator.js`; should return zero results with interpolated variables, or zero results total
- [ ] **Credential rotation:** Both the working tree AND git history are clean — verify with `git log -S "CLIENT_SECRET" --all`; must return no commits
- [ ] **CSS extraction:** `{% stylesheet %}` block in `configurator.liquid` is empty or removed — verify no `.cfg-` rules remain in the section file; verify `configurator.css` loads before first paint in DevTools Network tab
- [ ] **Metafield migration:** ALL base products have the required metafields — verify by running the setup script in read-only mode and confirming every product ID resolves via metafield, not string match
- [ ] **Event listener fix:** Swatch listener accumulation resolved — verify by changing model 5 times then clicking a swatch; DevTools event listener inspector should show exactly 1 listener on the swatch container
- [ ] **Price deduplication:** Single `calculatePrice()` function used by both display and cart — verify `_buildCartItems` and price display both call the same function with the same inputs and return matching totals
- [ ] **GSAP guard:** All GSAP usage wrapped in existence check — verify by blocking `cdn.jsdelivr.net` in DevTools and confirming page loads without console errors
- [ ] **Step validation:** Cannot add to cart with only size selected — verify by selecting only step 1 and clicking "Add to Cart"; should show validation error, not attempt cart addition

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Credentials not purged from git history after rotation | HIGH | 1. Rotate credentials again in Shopify Admin (the ones in history are now exposed). 2. Run `git filter-repo` to rewrite history. 3. Force-push. 4. Notify all collaborators to re-clone. Cost is HIGH because any deployed credentials between discovery and this recovery are compromised. |
| Metafield migration breaks product resolution | MEDIUM | 1. Temporarily re-enable string-match fallback. 2. Backfill metafields for broken products via Admin API. 3. Remove fallback again. Keep a rollback commit that re-adds the string match methods. |
| Configurator step unlock broken by state refactor | MEDIUM | Revert the state refactor commit. Re-apply changes incrementally, verifying step 1 → 2 transition after each change. Do not attempt to fix forward in a 25-property state object without a revert point. |
| CSS extraction breaks configurator visual | LOW | Re-add the `{% stylesheet %}` block content temporarily. Compare extracted `.css` file against original character by character for any Liquid interpolations that silently broke. |
| Event listener accumulation causes duplicate cart additions | HIGH | Immediate: Add `{ once: true }` to the add-to-cart button listener as a hotfix. Proper fix: Event delegation audit of all render methods. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Credentials exposed in git history | Phase 1: Security | `git log -S "CLIENT_SECRET" --all` returns no results |
| XSS via innerHTML with product data | Phase 1: Security | `grep -n 'innerHTML' assets/configurator.js` returns no interpolated-variable lines |
| Broken step unlock during refactor | Phase 2: Stabilization | Manual 15-step walkthrough after every state-touching commit |
| Metafield fallback left active | Phase 2: Stabilization | String-match methods deleted from codebase; all products verified via setup script |
| CSS extraction breaking instance styles | Phase 2: Stabilization (tech debt) | Theme editor color changes reflect in configurator; DevTools shows `configurator.css` from CDN |
| Event listener accumulation | Phase 3: Performance | DevTools shows 1 listener per container after 10+ model changes |
| Silent oven type downgrade (UX) | Phase 2: Stabilization | Manual test: select internal oven in M size (if unavailable) — visible warning displayed |
| GSAP not guarded against CDN failure | Phase 3: Performance | Block CDN in DevTools; page loads without errors |
| Price calculation duplication | Phase 2: Stabilization | Single `calculatePrice()` exists; display and cart prices match for complex configurations |
| Step validation missing | Phase 2: Stabilization | Attempt cart add with only step 1 complete; error displayed |

---

## Sources

- Shopify Official: [JavaScript and Stylesheet Tags Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags) — `{% stylesheet %}` concatenation, Liquid-not-rendered limitation, one-tag-per-file rule (HIGH confidence)
- Shopify Community: [Cache and Theme Customizer issues with stylesheet tags](https://community.shopify.com/t/cache-and-theme-customiser-issues-with-stylesheet-and-javascript/268421) — reported caching inconsistencies (MEDIUM confidence)
- OWASP: [DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html) — innerHTML/textContent distinction, safe sinks (HIGH confidence)
- Go Make Things: [Preventing XSS with innerHTML in vanilla JS](https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript/) — safe alternative patterns (MEDIUM confidence)
- GitGuardian: [Remediating Shopify Access Token leaks](https://www.gitguardian.com/remediation/shopify-access-token) — rotation + history rewrite sequence (HIGH confidence)
- MDN: [Safely inserting external content](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page) — textContent vs innerHTML (HIGH confidence)
- Internal: `assets/configurator.js` lines 643–654, 667–676, 694–703, 782, 1163–1165 — direct code observation (HIGH confidence)
- Internal: `.planning/codebase/CONCERNS.md` — 25+ concerns audit performed 2026-02-20 (HIGH confidence)

---
*Pitfalls research for: Aurowe Shopify theme overhaul — security, stabilization, performance, polish*
*Researched: 2026-02-20*
