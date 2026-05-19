import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

const targetUrl = globalThis.process.argv[2] || "http://127.0.0.1:5173/";
const outputDir = path.resolve(".tmp");
const screenshotPath = path.join(outputDir, "browser-shell-audit.png");

function delay(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function collectSnapshot(win, language) {
  return win.webContents.executeJavaScript(
    `
      (() => {
        const text = (node) => (node?.textContent || "").trim();
        const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({
          text: text(button),
          disabled: button.disabled
        }));
        const badges = Array.from(document.querySelectorAll(".capability-badge")).map(text);
        const notes = Array.from(document.querySelectorAll(".desktop-feedback, .settings-feedback, .language-feedback, .panel-note"))
          .map(text)
          .filter(Boolean)
          .slice(0, 8);
        const titleRows = Array.from(document.querySelectorAll(".section-title")).map((section) => text(section));
        return {
          language: ${JSON.stringify(language)},
          badges,
          badgeCount: badges.length,
          notes,
          titleRows,
          buttons
        };
      })();
    `,
    true
  );
}

async function clickButtonByText(win, exactText) {
  return win.webContents.executeJavaScript(
    `
      (() => {
        const target = Array.from(document.querySelectorAll("button"))
          .find((button) => (button.textContent || "").trim() === ${JSON.stringify(exactText)});
        if (!target) return false;
        target.click();
        return true;
      })();
    `,
    true
  );
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const win = new BrowserWindow({
    width: 1540,
    height: 980,
    show: false,
    backgroundColor: "#101114",
    webPreferences: {
      contextIsolation: true
    }
  });

  try {
    await win.loadURL(targetUrl);
    await delay(1200);

    await clickButtonByText(win, "中文");
    await delay(500);
    const chinese = await collectSnapshot(win, "zh-CN");
    await clickButtonByText(win, "English");
    await delay(500);
    const english = await collectSnapshot(win, "en-US");

    const image = await win.capturePage();
    await fs.writeFile(screenshotPath, image.toPNG());

    globalThis.process.stdout.write(
      JSON.stringify(
        {
          url: targetUrl,
          screenshotPath,
          chinese,
          english
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
