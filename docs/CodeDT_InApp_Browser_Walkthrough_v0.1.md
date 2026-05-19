# CodeDT In-App Browser Walkthrough v0.1

This walkthrough is for the browser-hosted demo at `http://localhost:5173/`. It is meant to verify presentation quality, onboarding clarity, and the non-Electron shell experience before a release candidate review.

## Goal

Confirm that the browser-facing demo makes the product legible even before local desktop capabilities are available.

## What This Walkthrough Covers

- First-view layout and hierarchy
- Onboarding clarity
- Workflow preset behavior
- Task-mode switching
- Review-panel empty states
- Preview and verification surface discoverability

## What This Walkthrough Does Not Cover

These still belong to the Electron acceptance pass:

- Open Workspace
- Real file-tree loading
- File preview and local file edits
- Git status, stage, commit, branch, and push actions
- Local command execution
- Real preview capture against a user workspace

## Walkthrough Steps

### 1. Open the demo shell

Open:

- `http://localhost:5173/`

Expected:

- Three-panel layout is visible
- Left panel reads as `Workspace`
- Center panel reads as the main task surface
- Right panel reads as the review and verification surface

### 2. Check first-read onboarding

Expected:

- `Quickstart` appears near the top of the left panel
- The current progress is understandable at a glance
- The shell clearly explains that local workspace actions require Electron

Pass criteria:

- A first-time viewer can tell what CodeDT is and what the next step should be

### 3. Exercise workflow presets

Click:

- `Connect DeepSeek`

Expected:

- The active mode changes to `Ask`
- The composer is prefilled with a provider-setup prompt
- The center panel now reads as a guided first action instead of a blank chat box

Pass criteria:

- Presets feel like a true entry path, not decorative shortcuts

### 4. Check task-mode clarity

Switch through:

- `Ask`
- `Build`
- `Fix`
- `Review`
- `Design`
- `Docs`

Expected:

- Mode label changes
- The mode callout changes
- Composer placeholder and guidance stay aligned with the selected mode

Pass criteria:

- Each mode feels meaningfully different in language and intent

### 5. Review empty-state guidance

Inspect the right panel without opening a workspace.

Expected:

- File preview explains that a file should be selected first
- Patch plan explains that a target file and request are needed
- Draft queue explains that nothing is waiting yet
- Browser preview explains how to start a local app or enter a URL
- Workspace command explains how verification begins

Pass criteria:

- Empty states reduce confusion instead of merely filling space

### 6. Verify Web-shell honesty

Expected:

- Workspace opening is not falsely available inside the browser shell
- The UI clearly signals that the browser version is for demo and orientation
- The shell does not pretend that Git or local editing are available from the browser-only context

Pass criteria:

- The browser demo is honest about its limits while still feeling polished

## Recommended Acceptance Notes

Use these questions during review:

- Does the product read clearly in under 30 seconds?
- Is the next action obvious without explanation?
- Do the presets and empty states create momentum?
- Does the browser demo feel intentionally scoped rather than incomplete?

## Exit Criteria

This walkthrough passes when:

- The layout is stable
- Onboarding is clear
- Presets work
- Mode guidance is coherent
- Empty states are helpful
- Browser-shell constraints are clearly communicated
