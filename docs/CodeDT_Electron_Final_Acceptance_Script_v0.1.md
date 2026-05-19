# CodeDT Electron Final Acceptance Script v0.1

This script is the operator-facing final acceptance pass for the running Electron app.

Use it while the CodeDT desktop window is open.

## Goal

Verify the full local workflow in the real desktop shell:

`workspace -> file -> draft -> verify -> preview -> git -> commit -> push -> handoff`

## Preparation

Before starting:

- Make sure the Electron app window is open
- Make sure you have a workspace available to open
- If you want to test model flows, have a valid DeepSeek or compatible API key ready
- If you want to test push, use a repository with a configured remote you are comfortable pushing to

## 1. Provider Setup

1. Click `Open settings`
2. Confirm the settings dialog opens
3. Choose `DeepSeek` or `OpenAI-compatible`
4. Fill:
   - model
   - base URL
   - API key
5. Save settings

Expected:

- Settings save successfully
- The main task panel no longer reads as blocked on provider setup
- Quickstart progress advances

Pass if:

- Provider credentials save without error

## 2. Workspace Opening

1. Click `Open Workspace`
2. Choose a real local project directory

Expected:

- Workspace name appears in the left panel
- Project index appears
- File tree appears
- Git status panel becomes live

Pass if:

- The workspace loads and the file tree is visible

## 3. File Selection

1. In the left file tree, click a text file

Expected:

- Right panel file preview loads
- Draft-related buttons become available
- `Add to Context` becomes available

Pass if:

- A real file preview is rendered

## 4. Context and Chat

1. Click `Add to Context`
2. In the composer, enter a small request such as:
   - `Explain what this file does`
3. Send the message

Expected:

- The assistant responds
- The selected file is treated as explicit context

Pass if:

- A model response arrives and the chat loop works

## 5. AI Draft Flow

1. Keep the same file selected
2. In the composer, enter a small safe edit request
3. Click `AI Draft`

Expected:

- Draft generation starts
- A draft appears in the right panel
- Diff view reflects the change

Pass if:

- A draft is generated and visibly reviewable before write-back

## 6. Apply Flow

1. Review the draft
2. Click `Apply Draft`

Expected:

- File preview refreshes
- Patch status confirms apply
- Git status refreshes
- Verification handoff appears

Pass if:

- The draft writes to disk and the app reflects the new state

## 7. Verification Flow

1. Use a suggested command or enter one manually
2. Click `Run`
3. Optionally save it as a recipe
4. Replay it from `Recent runs`

Expected:

- Command output streams into the terminal area
- Recent runs records the result
- Replay works

Pass if:

- Commands run, results are recorded, and replay works

## 8. Preview Flow

If the workspace has a frontend:

1. In `Browser preview`, click `Start Dev Server`
2. Wait for the preview target to become reachable
3. Open the preview
4. Click `Capture`

Expected:

- Preview opens
- Capture succeeds
- A preview image or compare state appears

Pass if:

- Preview and capture work against the chosen project

## 9. Git Review Flow

1. Inspect the Git status card
2. Confirm changed file list reflects the draft apply
3. Click `Stage selected file`
4. Click `Unstage selected`
5. Click `Stage all`

Expected:

- Counts update correctly
- Selected-file messages are accurate
- Stage and unstage actions refresh the panel

Pass if:

- Git state changes are reflected correctly in the UI

## 10. Branch Flow

1. Enter a branch name
2. Click `Create branch`
3. Optionally switch to another local branch

Expected:

- Current branch updates
- Branch chips update

Pass if:

- Branch creation and switching succeed

## 11. Commit Flow

1. Review the suggested commit draft
2. Edit it if needed
3. Click `Commit staged`

Expected:

- Commit succeeds
- Latest commit summary updates
- Working tree state refreshes

Pass if:

- A real commit is created from the staged changes

## 12. Push Flow

1. Click `Push branch`

Expected:

- Push succeeds
- If there was no upstream, CodeDT sets one on first push
- Git status updates afterward

Pass if:

- The current branch is published successfully

## 13. Handoff Flow

1. Click `Copy` in `Handoff summary`

Expected:

- Clipboard capture succeeds
- Summary includes:
  - branch
  - upstream
  - latest commit
  - preview
  - verification context

Pass if:

- The copied summary is coherent and shareable

## Final Decision

Mark the build as accepted when:

- The workspace loop works
- Draft apply works
- Verification works
- Preview works where applicable
- Git stage / branch / commit / push work
- Handoff summary is copyable and useful

Mark the build as partial-pass when:

- Browser shell is strong
- Electron shell launches
- Core editing works
- But one of preview, model, or git publishing still fails on the chosen workspace
