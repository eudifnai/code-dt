import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

const targetUrl = globalThis.process.argv[2] || "http://127.0.0.1:5173/";
const workspacePath = path.resolve(globalThis.process.argv[3] || globalThis.process.cwd());
const selectedPath = path.join(workspacePath, "README.md");
const outputDir = path.resolve(".tmp");
const screenshotPath = path.join(outputDir, "electron-acceptance-audit.png");

function delay(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function waitFor(check, timeoutMs = 15000, intervalMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await check();
    if (result) {
      return result;
    }
    await delay(intervalMs);
  }
  return null;
}

function buildStoredSessionsState() {
  return {
    activeSessionId: "acceptance-session",
    sessions: [
      {
        id: "acceptance-session",
        name: "Acceptance Session",
        updatedAt: new Date().toISOString(),
        state: {
          workspacePath,
          selectedPath,
          composerValue: "",
          promptHistory: [],
          previewUrl: targetUrl,
          contextPaths: [selectedPath],
          patchDrafts: {},
          draftStatuses: {},
          patchPlan: [],
          customRecipes: [],
          recentRuns: [],
          activeMode: "Build",
          messages: []
        }
      }
    ]
  };
}

async function seedDesktopState() {
  const userDataPath = app.getPath("userData");
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(
    path.join(userDataPath, "settings.json"),
    JSON.stringify({ uiLanguage: "zh-CN" }, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(userDataPath, "session.json"),
    JSON.stringify(buildStoredSessionsState(), null, 2),
    "utf8"
  );
}

async function evaluate(win, source) {
  return win.webContents.executeJavaScript(source, true);
}

async function readSnapshot(win, language) {
  return evaluate(
    win,
    `
      (() => {
        const text = (node) => (node?.textContent || "").trim();
        const previewFrame = document.querySelector(".preview-frame");
        const previewCapture = document.querySelector(".preview-capture-image");
        return {
          language: ${JSON.stringify(language)},
          hasDesktopBridge: Boolean(window.codedt?.workspace?.openProject),
          workspaceTitle: text(document.querySelector(".project-panel h2")),
          selectedLabel: text(document.querySelector(".review-card .section-title span:last-child")),
          gitSummary: text(document.querySelector(".git-summary strong")),
          hasPreviewFrame: Boolean(previewFrame),
          previewFrameSrc: previewFrame?.getAttribute("src") || "",
          terminalOutput: text(document.querySelector(".terminal-output")),
          hasPreviewCapture: Boolean(previewCapture),
          modeButtons: Array.from(document.querySelectorAll(".mode-strip button")).map((button) => text(button)),
          contextChips: Array.from(document.querySelectorAll(".context-files .session-chip")).map(text),
          languageNotes: Array.from(document.querySelectorAll(".language-feedback")).map(text),
          settingsNotes: Array.from(document.querySelectorAll(".settings-feedback")).map(text)
        };
      })();
    `
  );
}

async function clickButtonByExactText(win, exactText) {
  return evaluate(
    win,
    `
      (() => {
        const target = Array.from(document.querySelectorAll("button"))
          .find((button) => (button.textContent || "").trim() === ${JSON.stringify(exactText)});
        if (!(target instanceof HTMLElement)) return false;
        target.click();
        return true;
      })();
    `
  );
}

async function clickSelector(win, selector) {
  return evaluate(
    win,
    `
      (() => {
        const target = document.querySelector(${JSON.stringify(selector)});
        if (!(target instanceof HTMLElement)) return false;
        target.click();
        return true;
      })();
    `
  );
}

async function commandLooksFinished(win) {
  return evaluate(
    win,
    `
      (() => {
        const text = (node) => (node?.textContent || "").trim();
        const terminal = text(document.querySelector(".terminal-output"));
        const status = text(document.querySelector(".terminal-card .section-title span:last-child"));
        return terminal.length > 0 && !/running|starting/i.test(status)
          ? { terminal, status }
          : null;
      })();
    `
  );
}

async function previewCaptureReady(win) {
  return evaluate(
    win,
    `
      (() => {
        const image = document.querySelector(".preview-capture-image");
        return image ? { src: image.getAttribute("src") || "" } : null;
      })();
    `
  );
}

async function readSettingsDialog(win) {
  return evaluate(
    win,
    `
      (() => {
        const text = (node) => (node?.textContent || "").trim();
        return {
          helper: text(document.querySelector(".settings-helper-note")),
          providerButtons: Array.from(document.querySelectorAll(".provider-toggle button")).map(text),
          placeholders: Array.from(document.querySelectorAll(".settings-dialog input")).map((input) => input.getAttribute("placeholder") || "")
        };
      })();
    `
  );
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await seedDesktopState();

  const preloadPath = path.resolve("dist-electron/preload.cjs");
  const win = new BrowserWindow({
    width: 1540,
    height: 980,
    show: false,
    backgroundColor: "#101114",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true
    }
  });

  try {
    await win.loadURL(targetUrl);
    await delay(1800);

    const zhSnapshot = await waitFor(async () => {
      const snapshot = await readSnapshot(win, "zh-CN");
      return snapshot.workspaceTitle && snapshot.modeButtons.length > 0 ? snapshot : null;
    }, 15000);

    if (!zhSnapshot) {
      throw new Error("Desktop acceptance shell did not render in time.");
    }

    const runClicked = zhSnapshot.hasDesktopBridge
      ? await clickSelector(win, ".terminal-card .preview-controls .secondary-button")
      : false;
    if (runClicked) {
      await waitFor(async () => commandLooksFinished(win), 30000, 500);
    }

    const captureClicked = zhSnapshot.hasDesktopBridge
      ? await clickSelector(
          win,
          ".review-card:nth-of-type(2) .preview-toolbar .secondary-button:nth-of-type(3)"
        )
      : false;
    if (captureClicked) {
      await waitFor(async () => previewCaptureReady(win), 15000, 400);
    }

    await clickButtonByExactText(win, "English");
    await delay(700);
    const enSnapshot = await readSnapshot(win, "en-US");

    await clickSelector(win, ".language-switch .icon-button");
    await delay(300);
    const settingsOpen = await evaluate(win, `Boolean(document.querySelector(".settings-dialog"))`);
    const settingsSnapshot = settingsOpen ? await readSettingsDialog(win) : null;

    const image = await win.capturePage();
    await fs.writeFile(screenshotPath, image.toPNG());

    globalThis.process.stdout.write(
      JSON.stringify(
        {
          url: targetUrl,
          workspacePath,
          selectedPath,
          screenshotPath,
          checks: {
            desktopBridgeAvailable: zhSnapshot.hasDesktopBridge,
            workspaceRestored: Boolean(zhSnapshot.selectedLabel),
            contextRestored: Array.isArray(zhSnapshot.contextChips) && zhSnapshot.contextChips.length > 0,
            gitVisible: Boolean(zhSnapshot.gitSummary),
            previewEmbedded: zhSnapshot.hasPreviewFrame,
            commandRunAttempted: runClicked,
            commandProducedOutput: Boolean(
              typeof enSnapshot.terminalOutput === "string" && enSnapshot.terminalOutput.length > 0
            ),
            previewCaptureAttempted: captureClicked,
            previewCaptureVisible: enSnapshot.hasPreviewCapture,
            languageSwitched: enSnapshot.modeButtons.includes("Build"),
            settingsDialogOpened: Boolean(settingsSnapshot)
          },
          chinese: zhSnapshot,
          english: enSnapshot,
          settings: settingsSnapshot
        },
        null,
        2
      )
    );
  } finally {
    win.destroy();
  }
}

app.whenReady()
  .then(main)
  .catch((error) => {
    globalThis.console.error(error);
    globalThis.process.exitCode = 1;
  })
  .finally(() => {
    app.quit();
  });
