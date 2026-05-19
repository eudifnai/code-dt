# CodeDT Demo Checklist v0.1

## Goal

Use this checklist to demo CodeDT as a local-first AI coding workspace with a clear loop:

`open workspace -> anchor a file -> ask or draft -> apply -> verify -> preview -> capture -> summarize`

## Preflight

Before the demo starts:

1. Launch CodeDT with `npm run dev`.
2. Make sure a valid DeepSeek or OpenAI-compatible provider is saved.
3. Open a real local workspace with scripts such as `lint`, `build`, `test`, or `dev`.
4. If the project has a frontend, make sure a preview target can be opened or started.
5. Prefer a workspace with at least one small text file that is easy to explain.

## Five-Minute Demo Flow

### 1. Show onboarding and workspace readiness

- Point out the left-side Quickstart progress.
- Open the workspace and select an anchor file.
- Call out session metadata, file search, and workspace index signals.

Success signal:

- The file tree is real, searchable, and grounded in a local project.

### 2. Show task guidance and prompt acceleration

- Point out the center-panel workflow state and starter prompts.
- Use a workflow preset or recent prompt to fill the composer quickly.
- Mention that modes bias the task toward Ask, Build, Fix, Review, Design, or Docs.

Success signal:

- The user does not need to invent the first prompt from scratch.

### 3. Show project-aware reasoning

- Add the selected file to context.
- Optionally attach one or two more files.
- Send a focused request or generate a patch plan.

Success signal:

- The conversation is anchored in real files, not generic chat.

### 4. Show safe edit flow

- Generate an AI Draft for the current file.
- Review the draft and diff.
- Apply the draft only after review.

Success signal:

- CodeDT never hides the code change. The user sees the draft before write-back.

### 5. Show verification and preview loop

- Use the right-side draft-to-verification handoff.
- Run a suggested command or recipe.
- Open or refresh preview if the workspace has a frontend.
- Capture the page and show before/after compare.

Success signal:

- CodeDT moves from code change into verification without losing context.

### 6. Show operational memory

- Open Recent Runs.
- Point out notes, replay, filters, diff-aware verification notes, and visual capture notes.
- Export the verification summary.

Success signal:

- The app remembers what was checked, what changed, and what visual surface was captured.

## Strong Demo Paths

### Path A: Fix loop

- Select a bug-adjacent file.
- Switch to `Fix`.
- Ask for a narrow correction.
- Generate draft.
- Apply.
- Run a test or lint recipe.

Best when:

- You want to show minimal, safe engineering behavior.

### Path B: Frontend polish loop

- Select a UI file.
- Switch to `Design` or `Build`.
- Generate draft.
- Apply.
- Start preview.
- Capture before and after.

Best when:

- You want to show the code-to-visual loop.

### Path C: Review loop

- Select a shared or important file.
- Switch to `Review`.
- Ask for top risks and missing tests.
- Generate a plan or follow-up prompt.
- Run a broader verification recipe.

Best when:

- You want to show judgment rather than only generation.

## Fallback Moves

If the model is unavailable:

- Show workspace opening, file preview, search, draft editing, diff review, preview controls, and recent runs UX.

If preview is unavailable:

- Lean on command output, recipe management, and verification summary export.

If the workspace is large:

- Use file search and multi-file context ranking to show that CodeDT narrows attention instead of dumping everything into chat.

## What To Emphasize

- Local-first workspace control
- Human-reviewed draft apply
- Mode-aware task framing
- Verification as a first-class surface
- Preview and capture tied to code changes
- Operational memory across sessions

## Avoid During Demo

- Giant files with truncated previews
- Projects without any runnable scripts
- Ambiguous prompts that do not demonstrate the workflow shape
- Long waits before the first visible action
