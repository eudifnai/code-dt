# CodeDT Electron Final Acceptance Short v0.1

## Goal

Use this short script to confirm the current CodeDT demo build in the real Electron desktop window as quickly as possible.

This is the fastest practical pass for:

`workspace -> file -> draft -> verify -> preview -> git -> handoff`

## Before You Start

Prepare:

- a real local project you are comfortable opening
- at least one small text file in that project
- a valid DeepSeek or OpenAI-compatible API key if you want to verify model flows
- a repo with a configured remote only if you want to include push

## 10-Step Fast Acceptance Pass

### 1. Open settings and save provider configuration

Do:

- open `Settings`
- choose `DeepSeek` or `OpenAI-compatible`
- save the configuration

Pass if:

- settings save successfully
- no blocking error appears

### 2. Open a workspace

Do:

- click `Open Workspace`
- choose a real project directory

Pass if:

- workspace name appears
- file tree loads
- git card becomes live

### 3. Select a text file

Do:

- click one real text file in the file tree

Pass if:

- right-side file preview loads
- file context action becomes available

### 4. Add file context and send one simple prompt

Do:

- add the file to context
- send a small request such as `Explain what this file does`

Pass if:

- the model responds
- the chat loop feels grounded in the selected file

### 5. Generate one AI draft

Do:

- keep the same file selected
- ask for one small safe edit
- trigger `AI Draft`

Pass if:

- a draft appears
- the change is reviewable before write-back

### 6. Apply the draft

Do:

- review the draft
- click `Apply Draft`

Pass if:

- file preview refreshes
- git status refreshes
- verification handoff appears

### 7. Run one verification command

Do:

- run one suggested command or a known safe project command

Pass if:

- command output streams
- recent runs update

### 8. If the project has a frontend, verify preview

Do:

- start the dev server from CodeDT or open a reachable local preview URL
- open preview
- capture once

Pass if:

- preview renders
- capture appears in the right panel

### 9. Verify git flow

Do:

- stage a file
- unstage it
- stage again
- review the commit message draft
- commit staged changes if this repo is safe to use for the test

Pass if:

- counts update correctly
- commit draft is coherent
- commit succeeds if attempted

### 10. Copy handoff summary

Do:

- copy the handoff summary

Pass if:

- the copied summary includes branch, verification context, and latest commit context when available

## Decision Rule

Call the build accepted for demo RC use when:

- steps 1 through 7 pass
- step 8 passes for frontend projects
- step 9 passes for repos where git actions are safe to perform
- step 10 produces a coherent handoff summary

Call it partial-pass when:

- browser shell remains strong
- desktop shell launches
- core workspace and draft flow pass
- but preview, model, or git publication still fails on the chosen project
