# Phase 9: Cart Count Integration & Milestone Cleanup — Research

**Researched:** 2026-02-20
**Domain:** Vanilla JS event wiring, Shopify Cart AJAX API, documentation bookkeeping
**Confidence:** HIGH

---

## Summary

Phase 9 has two distinct concerns: (1) a live integration gap — a `cart:refresh` CustomEvent that `configurator.js` dispatches after a successful add-to-cart has no listener anywhere in the codebase, so the header cart count badge never updates without a page reload; and (2) documentation bookkeeping — three phases (1, 2, 4) have no VERIFICATION.md, and minor ROADMAP plan-checkbox discrepancies exist.

The integration fix is a small, well-contained change: add ~8 lines to `assets/theme.js` inside the existing IIFE to listen for `cart:refresh` and fetch `/cart.js` (Shopify's Cart AJAX API endpoint) to read `item_count`, then set it as `textContent` on `[data-cart-count]`. No new libraries, no build step, no Liquid changes. The Shopify `/cart.js` endpoint is a stable, unauthenticated JSON endpoint available on all Shopify storefronts.

The documentation work requires creating VERIFICATION.md files for Phases 1, 2, and 4 by cross-referencing existing SUMMARY.md files with the current codebase. Most of the "partial" requirements listed in the audit are not functionally incomplete — they simply lack formal verification files. The REQUIREMENTS.md and ROADMAP.md have already been corrected (SEC-01/02/03 are `[x]`, CONF-04 maps to Phase 7, all phases show Complete) — so the only bookkeeping item remaining is fixing the plan-level `[ ]` checkboxes inside ROADMAP.md Phase 1 and Phase 7 plan lists, and creating three VERIFICATION.md files.

**Primary recommendation:** Implement the `cart:refresh` listener first (highest user-impact), then write the three VERIFICATION.md files, then fix the ROADMAP plan checkboxes.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-06 | Add clear error recovery on cart add failure with retry option and failure explanation | CONF-06 was implemented in Phase 2 (02-04-PLAN.md, commit af020b3 + 4ba365a). The audit flags it as "partial" due to missing VERIFICATION.md, not missing code. The integration gap (cart:refresh → [data-cart-count]) is a separate integration issue also tagged CONF-06 in the audit. Phase 9 closes both: creates Phase 2 VERIFICATION.md (proving CONF-06 code exists) AND wires the cart:refresh listener (proving the full add-to-cart → UI update flow is complete). |

</phase_requirements>

---

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Shopify Cart AJAX API (`/cart.js`) | N/A (Shopify platform) | Fetch current cart JSON including `item_count` | Built-in to all Shopify storefronts — no auth, no extra load, returns cart state synchronously as JSON |
| `window.fetch()` | Browser native | Make the GET request to `/cart.js` | Already used in `configurator.js` `_handleAddToCart()` — consistent pattern |
| `CustomEvent` / `addEventListener` | Browser native | Receive `cart:refresh` signal | Already dispatched by `configurator.js` line 1595 — only the listener is missing |

### Supporting

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| `textContent` on `[data-cart-count]` | Update cart badge text | Preferred over `innerHTML` — no XSS surface, matches project convention |
| `.catch(() => {})` silently ignoring fetch errors | Prevent unhandled promise rejections | Cart count update is non-critical UI — failure should be silent, not noisy |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `/cart.js` fetch | Shopify Sections API (`?sections=header`) | Sections API would re-render the entire header Liquid, updating all cart UI atomically. Overkill for a single integer. `/cart.js` is simpler. |
| `textContent` | Re-rendering the `<span>` | Re-rendering risks removing `data-cart-count` attribute; `textContent` is safer |
| Listening on `window` | Listening on a narrower scope | `cart:refresh` is dispatched on `window` (`window.dispatchEvent(...)`) — listener must also be on `window` |

**Installation:** No packages needed. This is vanilla JS + Shopify platform.

---

## Architecture Patterns

### Recommended Project Structure

No new files for the cart integration fix. Changes go into the existing IIFE in `assets/theme.js`.

```
assets/theme.js                    (add cart:refresh listener inside existing IIFE)
.planning/phases/01-security-foundation/01-VERIFICATION.md    (new)
.planning/phases/02-configurator-stabilization/02-VERIFICATION.md  (new)
.planning/phases/04-visual-polish-and-brand-content/04-VERIFICATION.md  (new)
.planning/ROADMAP.md               (fix plan-level [ ] checkboxes in Phase 1 and phase block details)
```

### Pattern 1: Cart Refresh Listener in theme.js

**What:** Window-level event listener that GETs `/cart.js` and updates `[data-cart-count]` with `item_count`.

**When to use:** After any client-side add-to-cart action that dispatches `cart:refresh`.

**Example (from audit recommendations, adapted to project const/let style):**
```javascript
/* ---- Cart Count Update ---- */

window.addEventListener('cart:refresh', function () {
  fetch('/cart.js')
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      const cartCountEl = document.querySelector('[data-cart-count]');
      if (cartCountEl) cartCountEl.textContent = cart.item_count;
    })
    .catch(function () {});
});
```

**Placement:** Inside the existing `(function () { 'use strict'; ... })();` IIFE in `assets/theme.js`, as a new top-level section with a `/* ---- Cart Count Update ---- */` banner, consistent with the section header style used throughout that file.

**Why `function` declaration instead of arrow function for the outer handler:** The rest of theme.js uses arrow functions freely inside the IIFE. Either is fine. Matching the audit's snippet uses `function` but arrow is acceptable.

### Pattern 2: VERIFICATION.md Creation for Phases 1, 2, 4

**What:** Formal verification documents that test each requirement against the current codebase state.

**Format:** Matches existing `03-VERIFICATION.md`, `05-VERIFICATION.md`, `06-VERIFICATION.md`, `07-VERIFICATION.md`, and `08-VERIFICATION.md` files in the project. Key sections:
- YAML frontmatter with `phase`, `verified`, `status`, `score`, `re_verification`
- Observable Truths table with grep-verifiable evidence
- Required Artifacts table
- Key Link Verification table
- Requirements Coverage table
- Anti-Patterns Found section
- Human Verification Required section

**Source material for each phase:**

**Phase 1 (01-VERIFICATION.md):**
- SEC-01: Credentials already rotated by user before Phase 1 ran — SUMMARY confirms. Verification: `grep -r "CLIENT_ID\|shpss_" scripts/` returns CLEAN.
- SEC-02: Scripts were never tracked in git — no git-filter-repo needed. Verification: `git log --all --full-history -- "scripts/*.mjs"` confirms no tracked history with credentials.
- SEC-03: `.env` in `.gitignore`, scripts use `process.env`. Verification: `grep "\.env" .gitignore` + `grep "process.env" scripts/*.mjs`.
- ARCH-04 was also claimed by 01-01 but superseded by 08-01 (Phase 8 re-did var→const/let). Phase 1 VERIFICATION should note this was superseded.

**Phase 2 (02-VERIFICATION.md):**
- CONF-05: `_validateRequiredSteps()` exists in configurator.js and is called in `_handleAddToCart()`. Verification: grep for method definition and call site.
- CONF-06: `_showError()` creates retry button with `data-action="retry-cart"`, `retry-cart` case in `_bindEvents()`. Verification: grep. NOTE: the cart:refresh integration gap is a separate sub-gap being fixed in Phase 9 — the Phase 2 VERIFICATION should note this.
- CONF-09: `_buildConfigSummary()` produces grouped config string stored as `'Configuration'` line item property in cart payload. Verification: grep for property in `_buildCartItems()`.
- ARCH-03: 8 banner comments `/* ══ N. NAME ══` exist in configurator.js. Verification: `grep -c "══" assets/configurator.js`.

**Phase 4 (04-VERIFICATION.md):**
- VIS-01, VIS-02, VIS-03, VIS-04: CSS changes to `assets/theme.css` — hero `letter-spacing: 0.04em`, features `padding: 40px 32px` + hover `translateY(-4px)`, testimonials `flex-direction: row` on author, GSAP unified to `power3.out`. Verification: grep on `theme.css` and `theme.js`.
- BRAND-01, BRAND-02, BRAND-03: `templates/page.about.json` exists and composes the correct sections. Verification: file existence + `grep` for section types.

### Pattern 3: ROADMAP Plan Checkbox Fix

**What:** The ROADMAP.md Phase 1 and Phase 2 plan blocks have `- [ ]` for individual plan entries even though the phase header says "2/2 plans complete". These need to be `- [x]`.

**Current state (lines 39-40 in ROADMAP.md):**
```
- [ ] 01-01-PLAN.md — ...
- [ ] 01-02-PLAN.md — ...
```

**Should be:**
```
- [x] 01-01-PLAN.md — ...
- [x] 01-02-PLAN.md — ...
```

Same issue exists for Phase 2 (5 plans), Phase 3 (5 plans), Phase 4 (2 plans), Phase 5 (1 plan), Phase 6 (2 plans), Phase 7 (1 plan), Phase 8 (1 plan). All plan-level entries show `[ ]` despite the phase header claiming plans complete. This is a batch fix.

### Anti-Patterns to Avoid

- **Updating header cart count with innerHTML:** Use `textContent` — the count is always an integer, no HTML needed, and `innerHTML` would introduce unnecessary XSS surface area.
- **Listening on `document` instead of `window`:** The dispatch is `window.dispatchEvent(...)` — listening on `document` will NOT receive it.
- **Fetching cart details on every page load:** The listener is event-driven. Do NOT trigger on DOMContentLoaded or scroll — only on `cart:refresh`.
- **Blocking on fetch failure:** The `.catch(() => {})` must swallow errors silently — a cart count update failure should never break other theme JS.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cart state | Custom cart state tracking in JS | `/cart.js` fetch | Shopify maintains authoritative cart state — local tracking gets stale |
| Cart item count | Sum line items client-side | `cart.item_count` field from `/cart.js` | Shopify returns this directly; avoids quantity calculation bugs |

**Key insight:** The Shopify Cart AJAX API (`/cart.js`) is a zero-config, no-auth GET endpoint available on every Shopify store. It returns a full cart object including `item_count` as a top-level integer. Do not derive the count from line items manually.

---

## Common Pitfalls

### Pitfall 1: Listener on `document` Instead of `window`

**What goes wrong:** `cart:refresh` dispatches via `window.dispatchEvent()`. A listener added to `document` will not fire.
**Why it happens:** Developers commonly add listeners to `document` by default.
**How to avoid:** Always match the dispatch target — `window.addEventListener('cart:refresh', ...)`.
**Warning signs:** Listener added but count never updates.

### Pitfall 2: Missing `.catch()` on fetch

**What goes wrong:** Network errors cause an unhandled promise rejection, which surfaces as a browser console error and can interfere with other JS.
**Why it happens:** Omitting error handling on non-critical async operations.
**How to avoid:** Always add `.catch(function() {})` after the `.then()` chain.

### Pitfall 3: Overwriting `data-cart-count` Element Structure

**What goes wrong:** Using `innerHTML` to update the count could add a text node that breaks the surrounding `<span>` or inadvertently remove the `data-cart-count` attribute.
**Why it happens:** Using `innerHTML` when `textContent` is sufficient.
**How to avoid:** Use `cartCountEl.textContent = cart.item_count` exclusively.

### Pitfall 4: VERIFICATION.md Requirements Overstating Gaps

**What goes wrong:** Writing VERIFICATION.md for Phase 2 that claims CONF-06 is "not satisfied" because the cart count doesn't update — but CONF-06 is about "error recovery on cart add failure with retry option", not about the cart count badge.
**Why it happens:** Conflating the audit's integration gap (orphaned event) with the requirement text.
**How to avoid:** Verify each requirement against its exact definition in REQUIREMENTS.md. The cart count integration gap is tracked separately as the Phase 9 code fix. Phase 2 VERIFICATION should confirm CONF-06 code (retry button) exists and is wired, and note that the cart badge update is addressed in Phase 9.

### Pitfall 5: Forgetting to Fix ALL Plan-Level Checkboxes in ROADMAP

**What goes wrong:** Fixing only Phase 1 and Phase 7 plan checkboxes (the ones explicitly called out in the audit) while leaving all other phases' plan entries as `[ ]`.
**Why it happens:** The audit specifically called out Phase 1 ("In Progress") and Phase 7 ("Pending"), but the `[ ]` checkbox problem exists for all completed phases.
**How to avoid:** Update all plan-level entries for Phases 1–8 from `[ ]` to `[x]` in a single pass.

---

## Code Examples

Verified patterns from project source:

### Cart AJAX API Response Shape (Shopify)

```javascript
// GET /cart.js response (relevant fields only)
// Source: Shopify Cart AJAX API — stable endpoint, all storefronts
{
  "token": "...",
  "item_count": 3,          // total quantity across all line items
  "items": [...],
  "total_price": 150000,
  "currency": "EUR"
}
```

### Complete cart:refresh Listener for theme.js

```javascript
/* ---- Cart Count Update ---- */

window.addEventListener('cart:refresh', function () {
  fetch('/cart.js')
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      const cartCountEl = document.querySelector('[data-cart-count]');
      if (cartCountEl) cartCountEl.textContent = cart.item_count;
    })
    .catch(function () {});
});
```

### Header Element (sections/header.liquid line 130)

```html
<!-- data-cart-count is a bare attribute (no value), queried via '[data-cart-count]' -->
<span class="header__cart-count" data-cart-count>{{ cart.item_count }}</span>
```

### configurator.js Dispatch (line 1595 — existing code, no change needed)

```javascript
// This already exists. Phase 9 only adds the LISTENER side.
window.dispatchEvent(new CustomEvent('cart:refresh'));
```

### VERIFICATION.md Frontmatter Pattern (from 08-VERIFICATION.md)

```yaml
---
phase: 09-cart-integration-milestone-cleanup
verified: 2026-02-20T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Server-side cart count only (Liquid `{{ cart.item_count }}`) | `/cart.js` AJAX fetch on `cart:refresh` event | Cart badge reflects real cart state immediately without page reload |
| Phase verification implied by SUMMARY.md claims | Explicit VERIFICATION.md with grep-verifiable evidence | Auditable milestone state, not just author assertions |

**Deprecated/outdated:**
- ROADMAP plan entries with `[ ]` despite completion: Replace with `[x]` — these are inaccurate state.
- SEC-01/02/03 as "partial": Already corrected to `[x]` in REQUIREMENTS.md. The audit's claims about unchecked boxes are outdated relative to the current file state.

---

## Key Discoveries from Codebase Investigation

### 1. REQUIREMENTS.md Is Already Corrected

The audit reported SEC-01/02/03 checkboxes as `[ ]` and CONF-04 as mapping to Phase 6. **The current REQUIREMENTS.md already shows:**
- `[x] **SEC-01**` (line 12)
- `[x] **SEC-02**` (line 13)
- `[x] **SEC-03**` (line 14)
- `| CONF-04 | Phase 7 | Complete |` (line 122)

These were corrected prior to Phase 9. The planner should NOT include "fix REQUIREMENTS.md" tasks — they are already done.

### 2. ROADMAP.md Phase Overview Table Is Already Correct

The progress table (lines 166–175) already shows all phases as "Complete" with correct plan counts. The discrepancy is limited to plan-level `[ ]` checkboxes within phase detail blocks.

### 3. The 09-cart-integration-milestone-cleanup Directory Exists But Is Empty

The phase directory `.planning/phases/09-cart-integration-milestone-cleanup/` exists and is empty, ready for PLAN.md and VERIFICATION.md.

### 4. theme.js Has Zero var Declarations and Is Well-Structured

Phase 8 already completed the var→const/let migration. The IIFE is clean, follows consistent section patterns with `/* ---- Section Name ---- */` banners. The cart listener should be added as a new section after the existing "Slideshow" and "Video Cover Play" sections, before the "Scroll Animations" section — or after it. Either location is fine; cart update is independent of scroll animations.

### 5. Phase 2 ARCH-03 Was Superseded by Phase 5–8

The 02-05 SUMMARY claims ARCH-03 complete (8 banner groups in configurator.js). Phase 5–8 rewrote configurator.js significantly. ARCH-03 verification needs to confirm the 8 banners still exist after all gap-closure phases modified the file.

---

## Open Questions

1. **Where exactly in theme.js should the cart:refresh listener be placed?**
   - What we know: The IIFE has section banners. Cart count is independent of all existing sections.
   - What's unclear: Whether to place it before or after GSAP animations section.
   - Recommendation: Place it immediately after "Video Cover Play" section and before "Scroll Animations" — cart count update is not scroll-related.

2. **Do the 8 banner groups still exist in configurator.js after Phases 5–8 rewrites?**
   - What we know: Phase 5 (XSS), Phase 6 (metafields), Phase 7 (price), Phase 8 (CSS extraction) all modified configurator.js.
   - What's unclear: Whether the banner format `/* ══ N. NAME ══` survived those phases.
   - Recommendation: Grep for `══` in configurator.js during Phase 2 VERIFICATION.md creation to verify ARCH-03.

3. **Phase 4 VERIFICATION: Can VIS-01/04 be fully verified without visual inspection?**
   - What we know: CSS changes (letter-spacing, padding, flex-direction) are grep-verifiable. GSAP parameter changes are grep-verifiable.
   - What's unclear: Whether "elevated hero section" and "luxury tier" are subjective enough to require human sign-off.
   - Recommendation: Verify what can be verified (CSS values, GSAP parameters, file existence) and include a human verification section for visual quality (matching Phase 3's VERIFICATION.md pattern).

---

## Sources

### Primary (HIGH confidence)

- `assets/configurator.js` — Confirmed `cart:refresh` dispatch at line 1595; `_handleAddToCart()` at line 1562; `_showError()` with retry button; `_validateRequiredSteps()`.
- `assets/theme.js` — Confirmed zero existing `cart:refresh` listeners; IIFE structure with `/* ---- Section ---- */` banners; section order.
- `sections/header.liquid` — Confirmed `data-cart-count` on line 130 is a bare attribute on `<span>`.
- `.planning/v1.0-MILESTONE-AUDIT.md` — Authoritative gap list with exact file locations.
- `.planning/REQUIREMENTS.md` — Confirmed SEC-01/02/03 already `[x]`, CONF-04 already mapped to Phase 7.
- `.planning/ROADMAP.md` — Confirmed plan checkboxes are `[ ]` even for completed phases; progress table is accurate.
- Phase SUMMARY.md files (01-01, 01-02, 02-04, 02-05, 04-01, 04-02) — Source of truth for what each phase actually implemented.
- Existing VERIFICATION.md files (03, 05, 06, 07, 08) — Format templates.

### Secondary (MEDIUM confidence)

- Shopify Cart AJAX API (`/cart.js`) — `item_count` field existence inferred from Shopify platform documentation patterns and the audit's code recommendation. The endpoint is a stable Shopify primitive.

---

## Metadata

**Confidence breakdown:**
- Cart count integration fix: HIGH — exact dispatch location confirmed (line 1595), exact listener target confirmed (`[data-cart-count]` line 130), implementation is 8 lines of vanilla JS.
- VERIFICATION.md creation: HIGH — source materials (SUMMARY files) are complete, grep patterns are clear, format is defined by existing VERIFICATIONs.
- ROADMAP bookkeeping: HIGH — the exact lines to change are identified (`[ ]` → `[x]` for plan entries in all completed phases).
- REQUIREMENTS.md bookkeeping: HIGH — already done, no action needed.

**Research date:** 2026-02-20
**Valid until:** Indefinite — this is a closed-scope cleanup phase with no external dependencies.
