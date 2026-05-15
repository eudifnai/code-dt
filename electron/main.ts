import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { mkdir, open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
let currentWorkspacePath: string | null = null;
const maxPreviewFileSize = 512 * 1024;
const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vite",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules"
]);

type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

type WorkspaceFilePreview = {
  path: string;
  name: string;
  size: number;
  content: string;
  truncated: boolean;
};

type ProviderSettings = {
  provider: "deepseek" | "openai-compatible";
  model: string;
  baseUrl: string;
  apiKey: string;
};

type StoredProviderSettings = Omit<ProviderSettings, "apiKey"> & {
  apiKey: {
    encoding: "safeStorage" | "base64" | "plain";
    value: string;
  };
};

const defaultProviderSettings: ProviderSettings = {
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  apiKey: ""
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function encryptApiKey(apiKey: string): StoredProviderSettings["apiKey"] {
  if (!apiKey) {
    return { encoding: "plain", value: "" };
  }

  if (safeStorage.isEncryptionAvailable()) {
    return {
      encoding: "safeStorage",
      value: safeStorage.encryptString(apiKey).toString("base64")
    };
  }

  return {
    encoding: "base64",
    value: Buffer.from(apiKey, "utf8").toString("base64")
  };
}

function decryptApiKey(apiKey: StoredProviderSettings["apiKey"]) {
  if (!apiKey.value) {
    return "";
  }

  if (apiKey.encoding === "safeStorage") {
    return safeStorage.decryptString(Buffer.from(apiKey.value, "base64"));
  }

  if (apiKey.encoding === "base64") {
    return Buffer.from(apiKey.value, "base64").toString("utf8");
  }

  return apiKey.value;
}

async function readProviderSettings(): Promise<ProviderSettings> {
  try {
    const rawSettings = await readFile(getSettingsPath(), "utf8");
    const parsedSettings = JSON.parse(rawSettings) as {
      providerSettings?: StoredProviderSettings;
    };

    if (!parsedSettings.providerSettings) {
      return defaultProviderSettings;
    }

    return {
      provider: parsedSettings.providerSettings.provider,
      model: parsedSettings.providerSettings.model,
      baseUrl: parsedSettings.providerSettings.baseUrl,
      apiKey: decryptApiKey(parsedSettings.providerSettings.apiKey)
    };
  } catch {
    return defaultProviderSettings;
  }
}

async function writeProviderSettings(settings: ProviderSettings) {
  const storedSettings: { providerSettings: StoredProviderSettings } = {
    providerSettings: {
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey: encryptApiKey(settings.apiKey)
    }
  };

  await mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await writeFile(getSettingsPath(), JSON.stringify(storedSettings, null, 2), "utf8");
}

function isPathInsideWorkspace(filePath: string) {
  if (!currentWorkspacePath) {
    return false;
  }

  const relativePath = path.relative(currentWorkspacePath, filePath);
  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

async function readWorkspaceTree(
  directoryPath: string,
  depth = 0
): Promise<WorkspaceTreeNode[]> {
  if (depth > 4) {
    return [];
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !entry.name.startsWith(".") || entry.name === ".env")
    .filter((entry) => {
      return !entry.isDirectory() || !ignoredDirectoryNames.has(entry.name);
    })
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 250);

  const nodes = await Promise.all(
    visibleEntries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      const node: WorkspaceTreeNode = {
        id: entryPath,
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? "directory" : "file"
      };

      if (entry.isDirectory()) {
        node.children = await readWorkspaceTree(entryPath, depth + 1);
      }

      return node;
    })
  );

  return nodes;
}

ipcMain.handle("workspace:open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Open CodeDT Workspace"
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const workspacePath = result.filePaths[0];
  currentWorkspacePath = workspacePath;
  return {
    name: path.basename(workspacePath),
    path: workspacePath,
    tree: await readWorkspaceTree(workspacePath)
  };
});

ipcMain.handle(
  "workspace:readFile",
  async (_event, filePath: string): Promise<WorkspaceFilePreview> => {
    if (!isPathInsideWorkspace(filePath)) {
      throw new Error("File is outside the current workspace.");
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("Selected path is not a file.");
    }

    const bytesToRead = Math.min(fileStats.size, maxPreviewFileSize);
    const contentBuffer = Buffer.alloc(bytesToRead);
    const fileHandle = await open(filePath, "r");

    try {
      await fileHandle.read(contentBuffer, 0, bytesToRead, 0);
    } finally {
      await fileHandle.close();
    }

    return {
      path: filePath,
      name: path.basename(filePath),
      size: fileStats.size,
      content: contentBuffer.toString("utf8"),
      truncated: fileStats.size > maxPreviewFileSize
    };
  }
);

ipcMain.handle("settings:getProvider", async () => {
  return readProviderSettings();
});

ipcMain.handle("settings:saveProvider", async (_event, settings: ProviderSettings) => {
  await writeProviderSettings(settings);
  return readProviderSettings();
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "CodeDT",
    icon: path.join(__dirname, "../assets/app-icon.png"),
    backgroundColor: "#101114",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
