---
phase: 02-configurator-stabilization
plan: 01
subsystem: configurator-css
tags: [css, performance, caching, layout]
dependency_graph:
  requires: []
  provides: [assets/configurator.css, conditional-css-loading, locale-injection]
  affects: [layout/theme.liquid, sections/configurator.liquid]
tech_stack:
  added: []
  patterns: [conditional-stylesheet-tag, template-suffix-check]
key_files:
  created:
    - assets/configurator.css
  modified:
    - sections/configurator.liquid
    - layout/theme.liquid
decisions:
  - "Use template.suffix == 'configurator' (not template.name) to correctly identify page.configurator.json template"
  - "Kept {% style %} block in configurator.liquid for dynamic per-section Liquid variable styles"
metrics:
  duration: "3 minutes"
  completed: "2026-02-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 2 Plan 1: Extract Configurator CSS to Asset File Summary

**One-liner:** Extracted 155 CSS rules from section {% stylesheet %} block into standalone assets/configurator.css with conditional template.suffix-based loading.

## What Was Built

Configurator CSS extracted from the embedded `{% stylesheet %}` block in `sections/configurator.liquid` into a standalone `assets/configurator.css` file. The layout `layout/theme.liquid` now conditionally loads this file only when `template.suffix == 'configurator'`, ensuring zero CSS overhead on non-configurator pages. Also injected `window.__shopLocale` globally for future locale-aware configurator behavior (CONF-08 prep).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract configurator CSS to asset file | 562b691 | assets/configurator.css (created), sections/configurator.liquid (removed stylesheet block) |
| 2 | Add conditional CSS loading in theme.liquid | 4310b82 | layout/theme.liquid (conditional load + locale injection) |

## Decisions Made

1. **Use `template.suffix == 'configurator'`** — The template file is `page.configurator.json`, so `template.name` is `'page'` and `template.suffix` is `'configurator'`. Using `template.name` would incorrectly load configurator CSS on ALL pages.

2. **Retain `{% style %}` block in configurator.liquid** — The `{% style %}` block uses Liquid variables (`section.settings.background_color`, padding values) that must be rendered server-side. Only the static `{% stylesheet %}` block was extracted.

3. **Place configurator.css after theme.css** — Ensures configurator-specific styles can override theme defaults if needed.

## Success Criteria Verification

- [x] `assets/configurator.css` exists with all configurator styles (115 `.cfg*` rules)
- [x] `sections/configurator.liquid` has no `{% stylesheet %}` block (0 matches)
- [x] `layout/theme.liquid` conditionally loads configurator.css only when `template.suffix == 'configurator'`
- [x] `window.__shopLocale` is injected on all pages

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `assets/configurator.css` — FOUND
- `sections/configurator.liquid` stylesheet block — REMOVED (0 grep matches)
- `layout/theme.liquid` `template.suffix == 'configurator'` — FOUND at line 45
- `layout/theme.liquid` `configurator.css` asset — FOUND at line 46
- `layout/theme.liquid` `window.__shopLocale` — FOUND at line 66
- Commit 562b691 — FOUND
- Commit 4310b82 — FOUND
