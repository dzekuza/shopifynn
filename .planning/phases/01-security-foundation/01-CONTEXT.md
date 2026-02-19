# Phase 1: Security Foundation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the codebase before further development — purge leaked Shopify API credentials from git history, eliminate all XSS vectors in the configurator's innerHTML usage, load DOMPurify for sanitization, and modernize theme.js variable declarations from var to const/let. No new features, no visual changes.

</domain>

<decisions>
## Implementation Decisions

### Git history cleanup
- Claude's choice on approach (BFG Repo-Cleaner vs fresh repo) — solo developer, force-push is acceptable
- Create a local backup clone before any history rewriting
- Only Shopify credentials need purging (CLIENT_ID, CLIENT_SECRET, API keys) — no other secrets in the codebase
- Credentials have already been rotated on the Shopify admin side — old values in history are invalidated but still need purging

### Credential management
- .env file is the sole secrets store — scripts read from process.env, never hardcoded values
- Add .env to .gitignore explicitly (currently untracked but not formally ignored)
- Include a .env.example file with placeholder values documenting required variables
- Setup scripts (setup-configurator.mjs, fix-collections.mjs) stay in repo but must read from environment variables

### DOMPurify integration
- Claude's choice on loading method (CDN vs local asset) — should be consistent with existing patterns
- Claude's choice on innerHTML strategy per call site (DOMPurify.sanitize for complex HTML, textContent/DOM APIs for simple text)
- Claude's choice on load scope (configurator-only vs global) — based on where sanitization is actually needed
- Delete _escAttr() function after DOMPurify is in place
- User will manually spot-check the configurator after changes to verify rendering

### Claude's Discretion
- Git history cleanup method (BFG vs git filter-repo vs fresh repo)
- DOMPurify loading strategy (CDN vs local asset)
- DOMPurify load scope (configurator page only vs global)
- Per-call-site innerHTML replacement strategy (DOMPurify vs textContent vs DOM builder APIs)
- var→const/let migration decisions (const vs let per declaration)

</decisions>

<specifics>
## Specific Ideas

- Credentials already rotated — this is a cleanup/prevention task, not an active emergency
- Success criteria requires DOMPurify 3.2.7 specifically
- The 16 innerHTML call sites in configurator.js inject product data from Shopify Admin JSON — not user input, but defense-in-depth matters
- theme.js has 39 var declarations, all function-scoped (inside IIFE) — no global scope pollution, but inconsistent with existing const/let usage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-security-foundation*
*Context gathered: 2026-02-20*
