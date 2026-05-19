# CodeDT Release Checklist v0.1

This checklist is for the final pre-release pass on the current CodeDT demo build.

## 1. Product Readiness

- [ ] Product name and positioning are consistent across the app and docs
- [ ] The browser-hosted demo shell is understandable without extra explanation
- [ ] The Electron build is the clearly recommended path for real workspace work
- [ ] The main workflow can be explained in one sentence:
      `open workspace -> draft -> verify -> review git -> commit -> push -> handoff`

## 2. Browser Demo Pass

Use:

- [CodeDT_InApp_Browser_Walkthrough_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_InApp_Browser_Walkthrough_v0.1.md)

Checklist:

- [ ] Three-panel layout is stable
- [ ] Quickstart is clear
- [ ] Workflow presets work
- [ ] Mode switching feels coherent
- [ ] Review-panel empty states help rather than distract
- [ ] Browser shell clearly communicates its Electron-only limits

## 3. Electron Acceptance Pass

Core local workflow:

- [ ] Open a workspace successfully
- [ ] File tree loads
- [ ] Select a text file and preview it
- [ ] Add the file to context
- [ ] Generate an AI draft
- [ ] Review the diff
- [ ] Apply the draft

Verification:

- [ ] Run a command
- [ ] Save and replay a recipe
- [ ] Recent runs update correctly
- [ ] Verification summary exports correctly

Preview:

- [ ] Start a local dev server
- [ ] Preview target becomes reachable
- [ ] Preview opens in the right panel
- [ ] Capture works
- [ ] Before/after compare works

Git:

- [ ] Git status loads
- [ ] Stage selected file works
- [ ] Unstage selected file works
- [ ] Create branch works
- [ ] Switch branch works
- [ ] Commit staged changes works
- [ ] Push branch works when a remote exists
- [ ] Handoff summary copies correctly

## 4. Validation Commands

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Checklist:

- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes

## 5. Documentation Pass

- [ ] README reflects the current release-candidate shape
- [ ] Demo checklist is present and current
- [ ] Product design doc still matches the actual app
- [ ] UI wireframe still roughly matches the shipped surfaces
- [ ] This release checklist is current

## 6. Packaging Readiness

- [ ] Electron development flow starts cleanly
- [ ] No blocking console errors appear on first launch
- [ ] Browser shell starts on `localhost:5173`
- [ ] Dist output is generated successfully
- [ ] App can be demoed without hidden setup steps beyond provider credentials and workspace choice

## 7. Known Pre-Release Gaps

These are acceptable for the current release-candidate demo as long as they are called out:

- No PR creation flow inside the UI
- No remote browser of git history inside the UI
- No deep semantic project retrieval beyond current heuristics
- No share/sync/team layer
- No production packaging pipeline documented yet

## 8. Release Recommendation

The current build is ready for:

- stakeholder demos
- internal product walkthroughs
- local engineering evaluation

It is not yet positioned as:

- a fully packaged public desktop release
- a team collaboration platform
- a complete Git hosting workflow client
