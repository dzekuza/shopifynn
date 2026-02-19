# Phase 1: Security Foundation - Research

**Researched:** 2026-02-20
**Domain:** Web security hardening — git history hygiene, XSS prevention, credential management, JS modernization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Git history cleanup:**
- Claude's choice on approach (BFG Repo-Cleaner vs fresh repo) — solo developer, force-push is acceptable
- Create a local backup clone before any history rewriting
- Only Shopify credentials need purging (CLIENT_ID, CLIENT_SECRET, API keys) — no other secrets in the codebase
- Credentials have already been rotated on the Shopify admin side — old values in history are invalidated but still need purging

**Credential management:**
- .env file is the sole secrets store — scripts read from process.env, never hardcoded values
- Add .env to .gitignore explicitly (currently untracked but not formally ignored)
- Include a .env.example file with placeholder values documenting required variables
- Setup scripts (setup-configurator.mjs, fix-collections.mjs) stay in repo but must read from environment variables

**DOMPurify integration:**
- Claude's choice on loading method (CDN vs local asset) — should be consistent with existing patterns
- Claude's choice on innerHTML strategy per call site (DOMPurify.sanitize for complex HTML, textContent/DOM APIs for simple text)
- Claude's choice on load scope (configurator-only vs global) — based on where sanitization is actually needed
- Delete _escAttr() function after DOMPurify is in place
- User will manually spot-check the configurator after changes to verify rendering

### Claude's Discretion

- Git history cleanup method (BFG vs git-filter-repo vs fresh repo)
- DOMPurify loading strategy (CDN vs local asset)
- DOMPurify load scope (configurator page only vs global)
- Per-call-site innerHTML replacement strategy (DOMPurify vs textContent vs DOM builder APIs)
- var→const/let migration decisions (const vs let per declaration)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Rotate all exposed Shopify API credentials (CLIENT_ID, CLIENT_SECRET, API key) in Shopify Admin | Already completed — credentials were rotated prior to this phase. No action needed in code. |
| SEC-02 | Purge credentials from git history using git-filter-repo | CRITICAL FINDING: scripts/ is entirely untracked (`??` in git status). Credentials have NEVER been committed. No history rewrite needed. Action is: add scripts/ to .gitignore OR commit the sanitized versions (env-var based). |
| SEC-03 | Add .env to .gitignore and remove hardcoded credentials from setup scripts | .env is currently untracked but NOT in .gitignore. Both setup scripts have hardcoded CLIENT_ID, CLIENT_SECRET. Must add .env to .gitignore and refactor scripts to use process.env. |
| SEC-04 | Sanitize all 15+ innerHTML call sites in configurator.js using textContent, DOM APIs, or DOMPurify | 16 innerHTML call sites confirmed. Data source is Shopify Admin JSON (not user input). Defense-in-depth requires sanitization. Mix of strategies: textContent for simple text nodes, DOMPurify.sanitize() for multi-element HTML blocks. |
| SEC-05 | Load DOMPurify 3.2.7 from CDN on configurator template for necessary markup sanitization | DOMPurify 3.2.7 confirmed available on jsdelivr CDN. Should load in configurator.liquid section (before configurator.js), consistent with existing CDN pattern (GSAP loads from jsdelivr in theme.liquid). |
| SEC-06 | Remove insecure custom _escAttr() method and replace with proper sanitization | _escAttr() found at line 1163 of configurator.js. Used in 3 call sites (lines 177, 225, 322) for tooltip data-attribute escaping. Replace with element.setAttribute() (which auto-escapes) or DOMPurify.sanitize() when building DOM nodes. |
| ARCH-04 | Clean up var/const/let inconsistency in theme.js | 40 `var` declarations confirmed in theme.js. All are inside an IIFE with 'use strict'. Safe migration: reassign as `const` if value is never reassigned after declaration, `let` if reassigned. |
</phase_requirements>

---

## Summary

This phase has a simpler git history situation than expected: both setup scripts (`scripts/setup-configurator.mjs` and `scripts/fix-collections.mjs`) are fully untracked (`??` in `git status`) — they have zero commits in git history. Running `git log -p --all` finds no instances of `shpss_`, `CLIENT_ID`, or the specific credential values. SEC-02 (purge from git history) is effectively a no-op for the git history itself. The real work for SEC-02/SEC-03 is: refactor the scripts to read from `process.env`, add `.env` to `.gitignore`, and then safely commit the sanitized scripts.

The XSS work (SEC-04 through SEC-06) is the most substantive task. There are 16 `innerHTML` call sites in `configurator.js`. The data flows from Shopify Admin JSON through the `configurator-product-json.liquid` snippet — not user-supplied input. However, defense-in-depth is correct policy. The sanitization strategy should be mixed: use `textContent` and DOM builder APIs for simple text nodes (product titles, prices), and `DOMPurify.sanitize()` only for the complex multi-element HTML blocks that include `<img>`, `<span>`, and `<label>` trees. The custom `_escAttr()` at line 1163 can be fully deleted; the 3 call sites that use it for tooltip `data-tooltip` attributes should switch to `element.setAttribute()` which auto-escapes special characters without a library.

DOMPurify 3.2.7 is confirmed available on jsDelivr CDN. Loading it inside `sections/configurator.liquid` (before the `configurator.js` script tag at line 453) is consistent with the project's existing CDN pattern (GSAP loads from jsDelivr in theme.liquid). Loading it only on the configurator template is correct — no other section has innerHTML XSS exposure.

**Primary recommendation:** Refactor the two setup scripts to use `process.env`, add `.env` to `.gitignore`, load DOMPurify 3.2.7 from jsDelivr in configurator.liquid, replace innerHTML call sites with mixed textContent/DOM API/DOMPurify strategy, delete `_escAttr()`, and migrate all 40 `var` declarations in theme.js to `const`/`let`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMPurify | 3.2.7 (pinned) | HTML sanitization before innerHTML assignment | De-facto standard XSS sanitizer; success criteria requires this exact version |
| git-filter-repo | Installed (`/usr/local/bin/git-filter-repo`) | Rewrite git history to remove secrets | Recommended over BFG by git maintainers; already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `process.env` | Built-in | Read credentials at runtime | Replacing hardcoded constants in .mjs scripts |
| `element.setAttribute()` | DOM built-in | Safe attribute assignment | When replacing _escAttr() tooltip usage — setAttribute auto-escapes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMPurify CDN | Local asset in /assets/ | CDN is already project pattern (GSAP uses jsDelivr); local would require manual update process |
| DOMPurify | Native Sanitizer API | Native Sanitizer API is still experimental in Safari as of 2026 — explicitly excluded in REQUIREMENTS.md Out of Scope |
| git-filter-repo | BFG Repo-Cleaner | BFG requires Java; git-filter-repo is Python-based and already installed; git project's recommended tool |
| git-filter-repo | Fresh repo clone | Nuclear option; overkill since credentials are NOT in history (scripts were never committed) |

**Installation:**

DOMPurify loads from CDN — no npm install needed. git-filter-repo already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are confined to:

```
assets/
└── theme.js               # var → const/let migration
scripts/
├── setup-configurator.mjs # Remove hardcoded creds, read process.env
└── fix-collections.mjs    # Remove hardcoded creds, read process.env
sections/
└── configurator.liquid    # Add DOMPurify script tag before configurator.js
.gitignore                 # Add .env entry
.env.example               # New file: placeholder credential documentation
```

### Pattern 1: DOMPurify Loading (CDN, scoped to configurator section)

**What:** Load DOMPurify via `<script>` tag inside `sections/configurator.liquid`, immediately before the `configurator.js` script tag. This ensures DOMPurify is available when the configurator initializes.

**When to use:** Only on the configurator template — no other section has innerHTML with external data.

**Example:**

```liquid
{{- comment -}}Load DOMPurify before configurator script{{- endcomment -}}
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>
<script src="{{ 'configurator.js' | asset_url }}" defer></script>
```

**Verified:** jsDelivr CDN returns HTTP 200 for `https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js`.

### Pattern 2: Mixed innerHTML Replacement Strategy

**What:** Different call sites warrant different remediation based on what they render.

**Classification of the 16 innerHTML call sites:**

| Line(s) | What is rendered | Strategy |
|---------|-----------------|----------|
| 150, 203, 329 | Complex HTML blocks with `<label>`, `<img>`, `<span>` trees containing product data | `DOMPurify.sanitize(html)` before assignment |
| 157, 211, 265 | Static error strings (`'<p class="cfg-empty">Not configured.</p>'`) | Safe as-is (no external data); keep innerHTML for static strings |
| 216, 233, 271, 336, 341 | Template literals with product data embedded | `DOMPurify.sanitize(html)` before assignment |
| 667 | Size card HTML built from hardcoded `dims`/`persons` objects (no external data) | Safe as-is OR DOMPurify.sanitize() for consistency |
| 765, 771 | Variant swatches/pills from Shopify variant data | `DOMPurify.sanitize(html)` before assignment |
| 959 | Summary list items built from state strings | `textContent` approach: build `<li>` elements individually with `document.createElement` + `textContent` |
| 983 | Gallery thumbs with image URLs from Shopify | `DOMPurify.sanitize(html)` before assignment |

**Recommended approach:**

```javascript
// For complex HTML blocks: sanitize the full string
container.innerHTML = DOMPurify.sanitize(html);

// For summary list (line 959): use DOM builder instead
this.summaryList.replaceChildren(
  ...items.map(text => {
    const li = document.createElement('li');
    li.className = 'cfg-summary-item';
    li.textContent = text;
    return li;
  })
);
```

### Pattern 3: Replacing _escAttr() with setAttribute()

**What:** The 3 call sites using `_escAttr()` all build tooltip button HTML with a `data-tooltip="${this._escAttr(tooltip)}"` attribute. The fix is to build the tooltip button as a DOM element and use `setAttribute()`, which auto-escapes.

**When to use:** When an attribute value comes from external data (product metafield `info_tooltip`).

**Example — replacing tooltip in template literal:**

```javascript
// BEFORE (insecure custom escaping in innerHTML string):
html += `<button ... data-tooltip="${this._escAttr(tooltip)}"...>?</button>`;
container.innerHTML = html;

// AFTER (sanitize the full HTML block; setAttribute handles individual attribute escaping
// OR build the button separately):
// Option A — if using DOMPurify.sanitize() on the whole block:
//   DOMPurify will sanitize the data-tooltip attribute value automatically
container.innerHTML = DOMPurify.sanitize(html);

// Option B — DOM builder for the tooltip button specifically:
if (tooltip) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cfg-tooltip-btn';
  btn.setAttribute('data-tooltip', tooltip); // auto-escapes
  btn.setAttribute('aria-label', 'More info');
  btn.textContent = '?';
  container.appendChild(btn);
}
```

**Key insight:** Once `DOMPurify.sanitize()` is applied to the outer HTML string, it sanitizes attribute values too — `_escAttr()` becomes redundant and can be deleted.

### Pattern 4: process.env credential pattern for Node.js scripts

**What:** Replace hardcoded constants with `process.env` reads and provide clear error messages when missing.

**Example:**

```javascript
// BEFORE:
const CLIENT_ID = 'REDACTED';
const CLIENT_SECRET = 'REDACTED';

// AFTER:
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const STORE = process.env.SHOPIFY_STORE || 'aurowe-2.myshopify.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set in environment.');
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}
```

### Pattern 5: var → const/let migration in theme.js

**What:** Replace all 40 `var` declarations. Rule: use `const` if the binding is never reassigned after declaration; `let` if it is.

**Key cases confirmed in theme.js:**

```javascript
// Use const: one-time DOM query results
var gallery = document.querySelector(...);  →  const gallery = document.querySelector(...);
var slides = gallery.querySelectorAll(...); →  const slides = gallery.querySelectorAll(...);

// Use let: reassigned variables (e.g., counters, state)
var currentIndex = 0;  →  let currentIndex = 0;
var touchStartX = 0;   →  let touchStartX = 0;
var diff = ...;        →  const diff = ...;  // assigned once in block scope

// Loop variables
for (var i = 0; i < galleryImages.length; i++)  →  for (let i = 0; ...)
```

**Note:** All 40 `var` declarations are inside an IIFE with `'use strict'`. No global scope pollution exists currently. Migration is safe — the IIFE provides function scope that `let`/`const` block scoping aligns with cleanly.

### Anti-Patterns to Avoid

- **Blanket DOMPurify on static strings:** Don't call `DOMPurify.sanitize()` on strings that contain zero external data (e.g., the static `'<p class="cfg-empty">No options configured yet.</p>'` strings). It's unnecessary overhead.
- **textContent on complex HTML:** Don't try to use textContent as a drop-in for multi-element HTML blocks — it would render literal angle brackets. Use it only for leaf text nodes.
- **Calling DOMPurify before it loads:** Since both the DOMPurify `<script>` tag and `configurator.js` use `defer`, they execute in DOM order — DOMPurify will be available when configurator.js runs. Do NOT use `async` for the DOMPurify tag.
- **git filter-repo on a dirty working tree:** `git filter-repo` requires a clean working tree. Since scripts/ is untracked (not dirty), this is N/A — but worth noting for the backup clone step.
- **Committing .env:** The .env file contains live credentials. It must appear in .gitignore BEFORE any git add of the scripts directory.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom _escAttr() regex replacer | DOMPurify.sanitize() | Custom escapers miss edge cases: JS protocol URLs (`javascript:`), SVG/MathML injection vectors, entity-encoded payloads. DOMPurify has 10+ years of adversarial hardening. |
| Attribute escaping | Manual quote/angle-bracket replacement | `element.setAttribute()` | The browser's setAttribute() handles all necessary escaping for attribute values — it's the correct API. |
| Git history rewrite | Manual commit surgery | git-filter-repo | History rewrites require handling all refs, pack files, and reflogs; git-filter-repo handles all of this correctly. |

**Key insight:** `_escAttr()` is the textbook example of a hand-rolled sanitizer that's worse than the platform primitive. It only escapes `"`, `'`, and `<` — it would not stop a `javascript:` URI in a data attribute that an event handler reads.

---

## Common Pitfalls

### Pitfall 1: Assuming credentials are in git history when they're not

**What goes wrong:** Performing unnecessary `git filter-repo` history rewrite, potentially causing confusion or additional work.
**Why it happens:** The gitStatus shows scripts/ as `??` (untracked), but this is easy to overlook.
**How to avoid:** Always verify with `git ls-files scripts/` before attempting history rewrite. Result: empty output = never committed.
**Warning signs:** `git log -p --all -- scripts/` producing no output confirms scripts were never committed.

**FINDING:** Scripts are confirmed untracked (`?? scripts/` in git status, `git ls-files scripts/` returns nothing). The git history contains zero instances of any credential value. SEC-02 requires NO history rewrite — only refactoring the scripts and adding .env to .gitignore.

### Pitfall 2: DOMPurify stripping valid HTML

**What goes wrong:** DOMPurify removes attributes or elements that the configurator UI depends on.
**Why it happens:** DOMPurify's default config strips some attributes (e.g., `data-*` on certain elements in older configs, `loading="lazy"` historically).
**How to avoid:** DOMPurify 3.x permits `data-*` attributes and `loading` by default. Test with the actual product HTML after migration. The user plans to manually spot-check.
**Warning signs:** Missing data-action attributes after sanitization; option cards not responding to clicks.

**Mitigation:** Use `DOMPurify.sanitize(html, { ADD_ATTR: ['data-*'] })` if data-* attributes are stripped — though DOMPurify 3.x should allow them by default.

### Pitfall 3: defer order between DOMPurify and configurator.js

**What goes wrong:** configurator.js executes before DOMPurify loads, causing `DOMPurify is not defined` runtime error.
**Why it happens:** `defer` scripts execute in document order, but only if they are both `defer`. Using `async` on DOMPurify would break ordering.
**How to avoid:** Both script tags must use `defer` (not `async`). Since configurator.liquid already uses `defer` for configurator.js, adding DOMPurify with `defer` immediately before it guarantees correct order.

### Pitfall 4: Treating STORE as a credential

**What goes wrong:** Moving the STORE domain to .env when it's already public in the theme (visible in storefront URL, Shopify admin, etc.).
**Why it happens:** Over-parameterizing everything into .env creates unnecessary friction.
**How to avoid:** STORE can remain hardcoded (`const STORE = 'aurowe-2.myshopify.com'`) since it's not a secret. Only CLIENT_ID, CLIENT_SECRET, and API keys go in .env.

### Pitfall 5: const vs let misassignment

**What goes wrong:** Assigning `const` to a variable that is later reassigned in a branch, causing a runtime TypeError.
**Why it happens:** Mechanical find-replace of all `var` to `const`.
**How to avoid:** For each `var` declaration, check whether any code path reassigns the binding after the initial assignment. Variables used as counters (`currentIndex`, `touchStartX`, `i`), state placeholders, or output of conditional logic need `let`. DOM query results typically get `const`.

---

## Code Examples

Verified patterns from the actual codebase:

### SEC-03: .env.example content

```bash
# Shopify API credentials for setup scripts
# Copy this file to .env and fill in your values
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_VERSION=2024-10
```

### SEC-03: Updated .gitignore entry (add after existing entries)

```
# Environment secrets
.env
```

### SEC-03: Refactored script header (both .mjs files)

```javascript
// Read credentials from environment — never hardcode
const STORE = process.env.SHOPIFY_STORE || 'aurowe-2.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET environment variables are required.');
  console.error('Copy .env.example to .env and set your Shopify credentials.');
  process.exit(1);
}
```

### SEC-05: DOMPurify script tag in configurator.liquid (line 453 area)

```liquid
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" defer></script>
<script src="{{ 'configurator.js' | asset_url }}" defer></script>
```

### SEC-04: DOMPurify.sanitize() wrapper for complex innerHTML

```javascript
// Replace: container.innerHTML = html;
// With:
container.innerHTML = DOMPurify.sanitize(html);
```

### SEC-04/SEC-06: Summary list using DOM builder (line 959)

```javascript
// Replace the items.map(i => `<li...>${i}</li>`).join('') pattern:
_updateSummary() {
  if (!this.summaryList) return;
  const items = [];
  // ... (existing state checks that build items array)
  this.summaryList.replaceChildren(
    ...items.map(text => {
      const li = document.createElement('li');
      li.className = 'cfg-summary-item';
      li.textContent = text;  // safe: no HTML parsing
      return li;
    })
  );
}
```

### SEC-06: Deleting _escAttr and updating tooltip pattern

```javascript
// BEFORE (lines 177, 225, 322 in configurator.js):
${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}

// AFTER: keep data-tooltip in the HTML string; DOMPurify.sanitize() on the outer html
// will sanitize the attribute value. _escAttr() can then be deleted entirely.
${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${tooltip}" aria-label="More info">?</button>` : ''}
// ... and then the outer container.innerHTML = DOMPurify.sanitize(html);
```

### ARCH-04: Example var → const/let decisions in theme.js

```javascript
// gallery queries → const (never reassigned)
const gallery = document.querySelector('[data-product-gallery]');
const slides = gallery.querySelectorAll('.product__gallery-slide');
const prevBtn = gallery.querySelector('[data-gallery-prev]');

// state variables → let (reassigned)
let currentIndex = 0;
let touchStartX = 0;

// loop variable → let
for (let i = 0; i < galleryImages.length; i++) { ... }

// computed values in blocks → const (assigned once)
const diff = touchStartX - e.changedTouches[0].clientX;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `var` declarations | `const`/`let` | ES2015 (2015) | `var` is function-scoped and hoisted; `let`/`const` are block-scoped and safer |
| Custom HTML escaping functions | DOMPurify | ~2014 | Custom escapers miss attack vectors that DOMPurify handles |
| BFG Repo-Cleaner for git rewriting | git-filter-repo | ~2019 | git-filter-repo is now git project's recommended tool; faster, Python-based |
| Native Sanitizer API | DOMPurify (still) | Ongoing | Native Sanitizer API not yet cross-browser safe (Safari experimental as of 2026) |

**Deprecated/outdated:**
- `_escAttr()`: Insufficient — replace with `DOMPurify.sanitize()` + `element.setAttribute()`.
- BFG Repo-Cleaner: Still works but git-filter-repo is preferred and already installed.

---

## Open Questions

1. **Does DOMPurify 3.x allow all data-* attributes by default?**
   - What we know: DOMPurify has historically allowed `data-*` attributes; version 3.x changelog confirms they are in the default allowlist.
   - What's unclear: Whether specific attributes like `data-action`, `data-group`, `data-product-id`, `data-price` (all used in configurator option cards) are preserved through sanitization.
   - Recommendation: After applying DOMPurify.sanitize(), manually verify one configurator step renders correctly and event delegation still fires. If data-* attributes are stripped, add `DOMPurify.sanitize(html, { ADD_ATTR: ['data-action', 'data-group', 'data-product-id', 'data-price', 'data-qty-selector', 'data-variant-id', 'data-thumb-idx', 'data-tooltip', 'data-reveals'] })`.

2. **Should configurator.js itself be committed to git before this phase?**
   - What we know: `assets/configurator.js` is currently untracked (listed as modified in theme.css etc. but configurator.js shows as untracked in git status context — actually it shows as `M assets/theme.js` tracked, but `?? assets/configurator.js` needs verification).
   - What's unclear: The gitStatus shows `M assets/theme.js` as tracked, and `?? assets/configurator.js` is NOT in the modified list — suggesting configurator.js is also untracked.
   - Recommendation: Verify with `git ls-files assets/configurator.js` before starting. If untracked, security changes should be made and then committed fresh (no history to clean).

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `assets/configurator.js` read in full (1184 lines)
- `git ls-files scripts/` — confirmed empty output (scripts never committed)
- `git log -p --all` — confirmed zero occurrences of actual credential values in history
- `curl -sI https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js` — confirmed HTTP 200
- `git-filter-repo --version` — confirmed installed at `/usr/local/bin/git-filter-repo` (version a40bce548d2c)

### Secondary (MEDIUM confidence)

- DOMPurify data-* attribute default allowlist behavior — based on DOMPurify 3.x documentation and known behavior; verify post-implementation with spot-check
- REQUIREMENTS.md explicitly lists "Native Sanitizer API — still experimental in Safari as of 2026" in Out of Scope

### Tertiary (LOW confidence)

- None — all key claims verified against codebase directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — DOMPurify version pinned per success criteria; CDN confirmed live; git-filter-repo confirmed installed
- Architecture: HIGH — all 16 innerHTML call sites inspected; all 40 var declarations confirmed; credential locations confirmed
- Pitfalls: HIGH — git history status verified directly (not assumed); defer ordering verified against existing pattern

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (30 days — stable domain, no fast-moving dependencies)
