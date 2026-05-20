# CodeDT

CodeDT is a DeepSeek-first local AI coding workspace. It is currently in the v0.2 project skeleton stage.

## Current Status

- Electron + React + TypeScript + Vite project skeleton.
- Three-panel workspace UI:
  - Project panel
  - Task panel
  - Review panel
- Electron workspace bridge for opening a local project directory.
- Real file tree rendering in the Project panel.
- Selected file reading through Electron IPC.
- File content preview in the Review panel.
- Provider settings dialog for DeepSeek and OpenAI-compatible APIs.
- Local provider settings persistence through Electron app data.
- First non-streaming chat request path through the Electron model gateway.
- Explicit selected-file context attachment for chat requests.
- Basic binary-file preview guard and context-send prevention.
- Streaming chat responses through the Electron model gateway.
- In-progress stream cancellation from the composer.
- Session persistence for workspace, composer text, selected file, and message history.
- Monaco-based read-only code preview for text files.
- Multi-file context attachments for chat requests.
- Context compaction and budget-aware multi-file prompt assembly.
- Prompt-aware relevance ranking before context compaction.
- Lightweight workspace indexing for technology hints and stronger context ranking.
- Editable local patch draft surface with diff preview for selected text files.
- Draft apply flow that writes reviewed text-file changes back into the workspace.
- Model-assisted patch draft generation that lands in the local review panel first.
- Streaming patch draft generation with in-place draft updates and cancellation.
- Structured task modes that steer chat guidance, composer hints, and patch-draft behavior.
- Named local sessions with create, switch, rename, and delete flows.
- Project-aware patch planning from selected and attached workspace context files.
- Plan-to-draft handoff for existing files, including open-from-plan and draft-from-plan actions.
- Create-file execution from patch plans, using new-file drafts and safe apply flow.
- Batch plan drafting that generates multiple file drafts in sequence without auto-applying them.
- Draft queue panel that tracks draft vs applied file states and lets you reopen them quickly.
- Embedded browser preview with a persisted localhost URL for front-end workflows.
- Dev server awareness that suggests likely local preview URLs from project stack and scripts.
- Preview controls that can check candidate URLs and start or stop a local dev server from the workspace.
- Dev server log streaming into the review panel terminal output.
- Preview readiness detection that probes suggested URLs and auto-opens the first one that comes online.
- Preview URL extraction from live dev server logs, feeding smarter suggestions and readiness checks.
- Multi-target preview selection when a workspace exposes several local URLs at once.
- Per-target preview metadata such as framework-style labels and source-aware hints.
- Route-aware preview hints that describe whether a target looks like a root app, docs page, admin route, or component surface.
- Grouped preview targets so app, docs, Storybook, preview, API, admin, and other surfaces are easier to scan.
- Page-aware preview labeling that inspects local HTML titles and headings for richer target names.
- Workspace command runner with live output, stop control, and quick `npm run` suggestions from project scripts.
- Preview refresh workflow with a manual refresh button plus automatic refresh after successful draft apply or command completion.
- Preview capture that snapshots the current local page into the review panel for quick visual verification.
- Before/after preview capture compare using the two most recent snapshots for quick UI change review.
- Run + Capture automation that reruns the current workspace command, refreshes preview, and captures the updated UI in one flow.
- Verification recipes that combine multiple project scripts like lint, typecheck, build, test, and capture into one repeatable action.
- Recipe management for saved verification flows, including rename, delete, and manual ordering inside the workspace.
- Recent run history that records command and recipe executions, success or failure, and whether a capture was produced.
- Replay from recent runs so the latest verification step can be launched again without rebuilding the command by hand.
- Recent run filtering and pinning so long verification histories stay scannable and important checks stay near the top.
- Notes on recent runs so important verification checkpoints can carry a quick explanation of what changed or why they matter.
- Exportable verification summary that rolls recent runs, capture state, and notes into a copyable handoff block.
- Git-aware workspace status that shows the active branch, ahead or behind state, working-tree counts, and latest commit context.
- Lightweight commit draft support that turns current git changes and recent verification context into a copyable commit message draft.
- UI-driven git staging for all workspace changes or just the currently selected file before the final commit step.
- Editable commit message flow that can turn staged changes into a real local `git commit` from inside CodeDT.
- Git branch helpers for creating or switching branches, plus unstage controls for tightening the commit boundary before you commit.
- Remote-aware push support that can publish the current branch after commit, including first-push upstream setup when a remote exists.
- A copyable handoff summary that bundles branch, upstream, latest commit, preview, and verification context into one shareable block.
- Chinese and English UI switching with remembered language preference across restarts.
- Language-aware provider settings copy, desktop feedback, and common runtime error translation in the browser shell.
- Clear browser-shell vs Electron capability boundaries, including `仅桌面版` / `Desktop only` affordances on Electron-only surfaces.
- Reusable browser-shell audit coverage through `scripts/browser-shell-audit.mjs`, with screenshot output in `.tmp/`.
- Product design documents in `docs/`.
- Static review and task panels for the first CodeDT workbench.

## Scripts

```bash
npm run dev
```

Start Vite and Electron together.

```bash
npm run dev:web
```

Start only the Vite web UI at `http://127.0.0.1:5173`.

```bash
npm run typecheck
npm run lint
npm run build
```

Validate the project.

```bash
node_modules/.bin/electron.cmd scripts/browser-shell-audit.mjs http://127.0.0.1:5173/
```

Run the browser-shell acceptance audit and emit a screenshot plus structured UI findings.

```bash
node_modules/.bin/electron.cmd scripts/electron-acceptance-audit.mjs http://127.0.0.1:5173/
```

Run the desktop-shell audit harness to record what a seeded Electron wrapper around the local app can and cannot verify automatically.

## Release Candidate Snapshot

CodeDT is now in a strong demo-ready state for a local-first AI coding workspace. The current build already supports the core loop:

`open workspace -> anchor a file -> ask or draft -> apply -> verify -> preview -> capture -> summarize`

### Best Entry Points

- Demo release notes: [docs/CodeDT_Demo_Release_Notes_v0.2.md](E:/ai_project/CodeDT/docs/CodeDT_Demo_Release_Notes_v0.2.md)
- Demo guide: [docs/CodeDT_Demo_Checklist_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Demo_Checklist_v0.1.md)
- Browser walkthrough: [docs/CodeDT_InApp_Browser_Walkthrough_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_InApp_Browser_Walkthrough_v0.1.md)
- Release checklist: [docs/CodeDT_Release_Checklist_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Release_Checklist_v0.1.md)
- Electron acceptance report: [docs/CodeDT_Electron_Acceptance_Report_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Electron_Acceptance_Report_v0.1.md)
- Electron final acceptance script: [docs/CodeDT_Electron_Final_Acceptance_Script_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Electron_Final_Acceptance_Script_v0.1.md)
- Electron short acceptance pass: [docs/CodeDT_Electron_Final_Acceptance_Short_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Electron_Final_Acceptance_Short_v0.1.md)
- Electron live acceptance CN: [docs/CodeDT_Electron_Final_Acceptance_Live_CN_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Electron_Final_Acceptance_Live_CN_v0.1.md)
- Electron acceptance record CN: [docs/CodeDT_Electron_Final_Acceptance_Record_CN_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Electron_Final_Acceptance_Record_CN_v0.1.md)
- Acceptance result CN: [docs/CodeDT_Acceptance_Result_CN_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Acceptance_Result_CN_v0.1.md)
- Product direction: [docs/CodeDT_Product_Design_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_Product_Design_v0.1.md)
- UI structure: [docs/CodeDT_UI_Wireframe_v0.1.md](E:/ai_project/CodeDT/docs/CodeDT_UI_Wireframe_v0.1.md)

### What Works Well Right Now

- Local workspace opening, indexing, file search, and file preview
- Browser shell onboarding is now bilingual, honest about desktop-only capabilities, and polished enough for guided demo use
- Provider setup for DeepSeek and OpenAI-compatible gateways
- Mode-aware chat with explicit file context and streaming responses
- Patch planning, AI draft generation, manual draft editing, diff review, and safe apply
- Multi-session workspace memory with search, metadata, and restored task state
- Local preview discovery, dev server start and stop, log streaming, and auto-readiness checks
- Preview capture, before-and-after compare, and verification runs tied to visual output
- Browser-shell capability badges and fallback notices make the Electron-vs-web boundary explicit without feeling broken
- Verification commands, context-aware recipes, run history, replay, notes, and summary export
- Git-aware workspace status for branch context and quick change review before verification
- Copyable commit draft text tied to the current workspace changes and validation loop
- Lightweight staging controls that help the review flow move from changed files toward a clean commit boundary
- A first true commit flow for staged changes, while still keeping review and manual confirmation in the loop
- Branch creation, branch switching, and unstage controls close the loop around day-to-day local git hygiene
- Remote and upstream visibility, plus a direct push action, carry the local workflow through to branch publication
- A shareable handoff layer makes it easier to send status, testing, and publication context to another person or system
- Onboarding, workflow presets, active workflow state, active loop overview, and demo flow guidance

### Current Product Shape

This build already demonstrates the main CodeDT product idea clearly:

- Local-first project control
- Human-reviewed code changes
- Model-assisted task flow
- Verification as a first-class surface
- Preview and capture connected to code edits
- Operational memory that stays inside the workspace session

## Known Gaps

These are the main places where the app still feels like an advanced demo rather than a finished daily driver:

- No true in-place code editing beyond the draft surface
- No automated multi-file apply orchestration
- No pull request creation, remote browsing, or richer branch history tooling inside the UI yet
- No deep project-wide semantic search beyond current file and path ranking
- No built-in auth, cloud sync, or shared team workspace model
- Browser-side demo QA is still better documented than fully automated inside the product
- The browser-shell audit script exists, but it is still an external QA utility rather than an in-app self-check surface
- The current desktop audit harness is useful for seeded shell checks, but it does not replace a true operator pass in the real Electron main window
- Preview capture is strong, but there is not yet a richer visual diff or annotation layer

## Next Frontier

The next phase should focus less on isolated feature additions and more on tightening the daily-work loop:

- Git-aware change review and lightweight commit workflow
- Stronger multi-file orchestration after patch planning
- Richer visual verification and screenshot annotation
- Smarter project-wide retrieval beyond current path and content heuristics
- Shareable verification and handoff artifacts
- Packaging and polish for a true desktop release candidate
