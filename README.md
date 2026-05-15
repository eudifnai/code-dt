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

## Next Implementation Slice

The next slice should add file-level workspace behavior:

- Add settings for DeepSeek and OpenAI-compatible providers.
- Add file references from the preview panel into the chat composer.
- Add basic text-file detection and binary-file preview guards.
- Persist basic app settings locally.
