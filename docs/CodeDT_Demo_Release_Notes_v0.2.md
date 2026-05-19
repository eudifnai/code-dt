# CodeDT Demo Release Notes v0.2

## Summary

CodeDT v0.2 is now in a strong demo-ready state as a local-first AI coding workspace.

This build is best understood as:

- a guided browser-shell demo for product framing and onboarding
- a real Electron desktop workbench for local workspace, preview, verification, and git workflows

The clearest story of the product is now:

`open workspace -> anchor a file -> ask or draft -> apply -> verify -> preview -> capture -> summarize -> commit -> push -> handoff`

## What Is New In This Release

### 1. Browser shell is now presentation-ready

The browser-hosted shell at `http://127.0.0.1:5173/` now does a better job of showing the product without pretending to be the full desktop app.

Highlights:

- clearer onboarding
- more coherent empty states
- better workflow presets
- cleaner browser-only capability boundaries
- explicit `仅桌面版` / `Desktop only` markers on the right surfaces
- less visual noise than earlier badge-heavy versions

### 2. Chinese and English UI switching is now a first-class experience

The app now supports:

- Chinese and English language switching
- remembered language preference
- immediate feedback after switching
- bilingual browser-shell and desktop-shell presentation
- language-aware settings labels and helper copy

### 3. Desktop-only capability boundaries are now honest and consistent

Electron-only actions no longer fail silently in the browser shell.

When browser users try Electron-only capabilities such as:

- open workspace
- save provider settings
- run workspace commands
- use preview controls
- trigger git actions

CodeDT now gives a clear explanation instead of acting broken or ambiguous.

### 4. Browser-shell QA is now repeatable

A reusable audit script now exists:

- `scripts/browser-shell-audit.mjs`

It produces:

- structured findings for both Chinese and English shells
- a browser-shell screenshot at `.tmp/browser-shell-audit.png`

This makes it easier to catch regressions in:

- capability-badge density
- bilingual text rendering
- first-view demo clarity

## Recommended Demo Shape

### Browser shell

Use the browser shell to show:

- product framing
- bilingual UX
- workflow presets
- mode clarity
- review-panel structure
- preview and verification surface discoverability
- honest Electron-only boundaries

### Electron desktop app

Use the Electron app to show:

- real workspace opening
- real file selection and preview
- context-aware chat
- AI draft generation
- draft apply
- verification commands and recipes
- preview and capture
- git stage, branch, commit, push, and handoff

## Strongest Demo Moments

These are the most compelling moments in the current build:

1. A selected real file becomes explicit model context
2. AI Draft lands in a reviewable patch surface instead of writing directly
3. Verification happens next to the edit, not in a separate forgotten step
4. Preview and capture tie the code change to visual output
5. Git and handoff keep the workflow grounded in real engineering work

## Current Limitations

This is still a strong release-candidate demo, not a finished public desktop release.

Main limits:

- no PR creation flow inside the UI
- no deeper semantic project retrieval beyond current heuristics
- no richer visual annotation or screenshot diff layer yet
- browser-shell QA exists as an external script rather than an in-app self-check panel
- packaging and distribution pipeline are not yet the focus of this stage

## Acceptance Status

### Browser shell

Current status:

- passed for layout, bilingual presentation, and capability-boundary clarity

### Electron shell

Current status:

- launches successfully
- core surfaces are present
- final operator acceptance still belongs to the live desktop walkthrough on a real workspace

## Recommended Next Step

Move from polish-heavy iteration into release-candidate consolidation:

- finish the live Electron acceptance pass
- package the demo story cleanly for stakeholders
- tighten the remaining desktop-only workflow edges instead of adding broad new surfaces
