import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { spawn } from "node:child_process";
import { mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDefaultSessionName as sharedBuildDefaultSessionName,
  formatGitPushSummary,
  translateMain,
  type AppLanguage
} from "./i18n.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
let currentWorkspacePath: string | null = null;
const maxPreviewFileSize = 512 * 1024;
const binarySniffBytes = 8 * 1024;
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
const binaryFileExtensions = new Set([
  ".7z",
  ".avif",
  ".bmp",
  ".dll",
  ".dmg",
  ".doc",
  ".docx",
  ".exe",
  ".gif",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".psd",
  ".rar",
  ".so",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip"
]);

type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

type WorkspaceIndex = {
  configFiles: string[];
  fileCount: number;
  likelyTechnologies: string[];
  topExtensions: Array<{ extension: string; count: number }>;
  topLevelDirectories: string[];
};

type WorkspaceSnapshot = {
  index: WorkspaceIndex;
  name: string;
  path: string;
  tree: WorkspaceTreeNode[];
};

type WorkspaceFilePreview = {
  path: string;
  name: string;
  size: number;
  content: string;
  kind: "text" | "binary";
  reason?: string;
  truncated: boolean;
};

type GitStatusSummary = {
  available: boolean;
  isRepo: boolean;
  branch: string | null;
  localBranches: string[];
  remotes: string[];
  upstreamBranch: string | null;
  rootPath: string | null;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  deleted: number;
  untracked: number;
  conflicts: number;
  hasChanges: boolean;
  lastCommitSummary: string | null;
  changedFiles: Array<{
    path: string;
    indexStatus: string;
    worktreeStatus: string;
    label: string;
  }>;
  error?: string;
};

type GitStageRequest = {
  paths?: string[];
};

type GitUnstageRequest = {
  paths?: string[];
};

type GitCommitRequest = {
  message: string;
};

type GitCommitResult = {
  status: GitStatusSummary;
  commitSummary: string;
};

type GitBranchRequest = {
  name: string;
};

type GitPushResult = {
  status: GitStatusSummary;
  pushSummary: string;
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

type StoredAppSettings = {
  providerSettings?: StoredProviderSettings;
  uiLanguage?: AppLanguage;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
};

type ChatThreadStateMessage = ChatMessage & {
  id: string;
  status?: "sending" | "failed";
};

type ChatResponse = {
  content: string;
  model: string;
  provider: ProviderSettings["provider"];
};

type PreviewInspection = {
  url: string;
  title: null | string;
  appName: null | string;
  description: null | string;
  heading: null | string;
};

type PreviewCapture = {
  url: string;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
};

type ChatStreamChunk =
  | {
      kind: "delta";
      requestId: string;
      delta: string;
    }
  | {
      kind: "complete";
      requestId: string;
      model: string;
      provider: ProviderSettings["provider"];
    }
  | {
      kind: "cancelled";
      requestId: string;
    }
  | {
      kind: "error";
      requestId: string;
      error: string;
    };

type SessionState = {
  workspacePath: null | string;
  selectedPath: null | string;
  composerValue: string;
  promptHistory: string[];
  previewUrl: string;
  contextPaths: string[];
  patchDrafts: Record<string, string>;
  draftStatuses: Record<string, "draft" | "applied">;
  patchPlan: Array<{
    filePath: string;
    action: "create" | "update" | "review";
    summary: string;
    rationale: string;
  }>;
  customRecipes: Array<{
    id: string;
    label: string;
    commands: string[];
    capture: boolean;
  }>;
  recentRuns: Array<{
    id: string;
    label: string;
    command: string;
    commands: string[];
    pinned: boolean;
    note: string;
    status: "success" | "failed";
    startedAt: string;
    finishedAt: string;
    captureRequested: boolean;
    captureCompleted: boolean;
    relatedFilePath?: string;
    relatedChangeSummary?: string;
    captureUrl?: string;
    captureSize?: string;
  }>;
  activeMode: "Ask" | "Build" | "Fix" | "Review" | "Design" | "Docs";
  messages: ChatThreadStateMessage[];
};

type SessionSummary = {
  id: string;
  name: string;
  updatedAt: string;
  workspaceName: string | null;
  activeMode: SessionState["activeMode"];
  messageCount: number;
  hasPreview: boolean;
};

type StoredSessionRecord = {
  id: string;
  name: string;
  updatedAt: string;
  state: SessionState;
};

type StoredSessionsState = {
  activeSessionId: string;
  sessions: StoredSessionRecord[];
};

const defaultProviderSettings: ProviderSettings = {
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  apiKey: ""
};
const activeStreamControllers = new Map<string, AbortController>();
let previewServerLog = "";
let previewServerProcess: null | ReturnType<typeof spawn> = null;
let previewServerStatus: {
  state: "idle" | "starting" | "running" | "error";
  command: string;
  cwd: string;
  pid: number | null;
  error?: string;
} = {
  state: "idle",
  command: "",
  cwd: "",
  pid: null
};
let workspaceCommandLog = "";
let workspaceCommandProcess: null | ReturnType<typeof spawn> = null;
let workspaceCommandStatus: {
  state: "idle" | "running" | "error";
  command: string;
  cwd: string;
  pid: number | null;
  error?: string;
} = {
  state: "idle",
  command: "",
  cwd: "",
  pid: null
};
const technologyRules = [
  { config: "package.json", label: "node" },
  { config: "tsconfig.json", label: "typescript" },
  { config: "vite.config.ts", label: "vite" },
  { config: "vite.config.js", label: "vite" },
  { config: "next.config.js", label: "nextjs" },
  { config: "next.config.mjs", label: "nextjs" },
  { config: "requirements.txt", label: "python" },
  { config: "pyproject.toml", label: "python" },
  { config: "Cargo.toml", label: "rust" },
  { config: "go.mod", label: "go" },
  { config: "pom.xml", label: "java" },
  { config: "build.gradle", label: "java" }
] as const;

type PreviewServerStatus = typeof previewServerStatus;
const maxPreviewServerLogChars = 24_000;
type WorkspaceCommandStatus = typeof workspaceCommandStatus;
const maxWorkspaceCommandLogChars = 48_000;

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getSessionPath() {
  return path.join(app.getPath("userData"), "session.json");
}

function normalizeUiLanguage(language: unknown): AppLanguage {
  return language === "en-US" ? "en-US" : "zh-CN";
}

async function readStoredAppSettings(): Promise<StoredAppSettings> {
  try {
    const rawSettings = await readFile(getSettingsPath(), "utf8");
    const parsedSettings = JSON.parse(rawSettings) as StoredAppSettings;
    return {
      providerSettings: parsedSettings.providerSettings,
      uiLanguage: normalizeUiLanguage(parsedSettings.uiLanguage)
    };
  } catch {
    return {};
  }
}

async function writeStoredAppSettings(settings: StoredAppSettings) {
  await mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

async function readUiLanguage(): Promise<AppLanguage> {
  const settings = await readStoredAppSettings();
  return normalizeUiLanguage(settings.uiLanguage);
}

async function writeUiLanguage(language: AppLanguage) {
  const settings = await readStoredAppSettings();
  settings.uiLanguage = normalizeUiLanguage(language);
  await writeStoredAppSettings(settings);
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
    const parsedSettings = await readStoredAppSettings();

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
  const storedSettings = await readStoredAppSettings();
  storedSettings.providerSettings = {
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    apiKey: encryptApiKey(settings.apiKey)
  };
  await writeStoredAppSettings(storedSettings);
}

async function readSessionState(): Promise<null | SessionState> {
  try {
    const rawSession = await readFile(getSessionPath(), "utf8");
    const parsedSession = JSON.parse(rawSession) as SessionState;

    return {
      workspacePath: parsedSession.workspacePath ?? null,
      selectedPath: parsedSession.selectedPath ?? null,
      composerValue: parsedSession.composerValue ?? "",
      promptHistory: Array.isArray(parsedSession.promptHistory)
        ? parsedSession.promptHistory.filter((item): item is string => typeof item === "string")
        : [],
      previewUrl: parsedSession.previewUrl ?? "",
      contextPaths: Array.isArray(parsedSession.contextPaths)
        ? parsedSession.contextPaths.filter((item): item is string => typeof item === "string")
        : [],
      patchDrafts:
        parsedSession.patchDrafts &&
        typeof parsedSession.patchDrafts === "object" &&
        !Array.isArray(parsedSession.patchDrafts)
          ? Object.fromEntries(
              Object.entries(parsedSession.patchDrafts).filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === "string" && typeof entry[1] === "string"
              )
            )
          : {},
      draftStatuses:
        parsedSession.draftStatuses &&
        typeof parsedSession.draftStatuses === "object" &&
        !Array.isArray(parsedSession.draftStatuses)
          ? Object.fromEntries(
              Object.entries(parsedSession.draftStatuses).filter(
                (
                  entry
                ): entry is [string, "draft" | "applied"] =>
                  typeof entry[0] === "string" &&
                  (entry[1] === "draft" || entry[1] === "applied")
              )
            )
          : {},
      patchPlan: Array.isArray(parsedSession.patchPlan)
        ? parsedSession.patchPlan.filter(
            (
              item
            ): item is {
              filePath: string;
              action: "create" | "update" | "review";
              summary: string;
              rationale: string;
            } =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  typeof item.filePath === "string" &&
                  ["create", "update", "review"].includes(item.action) &&
                  typeof item.summary === "string" &&
                  typeof item.rationale === "string"
              )
          )
        : [],
      customRecipes: Array.isArray(parsedSession.customRecipes)
        ? parsedSession.customRecipes.filter(
            (
              item
            ): item is {
              id: string;
              label: string;
              commands: string[];
              capture: boolean;
            } =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  typeof item.id === "string" &&
                  typeof item.label === "string" &&
                  Array.isArray(item.commands) &&
                  item.commands.every((command) => typeof command === "string") &&
                  typeof item.capture === "boolean"
              )
          )
        : [],
      recentRuns: Array.isArray(parsedSession.recentRuns)
        ? parsedSession.recentRuns.filter(
            (
              item
            ): item is {
              id: string;
              label: string;
              command: string;
              commands: string[];
              pinned: boolean;
              note: string;
              status: "success" | "failed";
              startedAt: string;
              finishedAt: string;
              captureRequested: boolean;
              captureCompleted: boolean;
              relatedFilePath?: string;
              relatedChangeSummary?: string;
              captureUrl?: string;
              captureSize?: string;
            } =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  typeof item.id === "string" &&
                  typeof item.label === "string" &&
                  typeof item.command === "string" &&
                  Array.isArray(item.commands) &&
                  item.commands.every((command) => typeof command === "string") &&
                  typeof item.pinned === "boolean" &&
                  typeof item.note === "string" &&
                  (item.status === "success" || item.status === "failed") &&
                  typeof item.startedAt === "string" &&
                  typeof item.finishedAt === "string" &&
                  typeof item.captureRequested === "boolean" &&
                  typeof item.captureCompleted === "boolean" &&
                  (typeof item.relatedFilePath === "undefined" ||
                    typeof item.relatedFilePath === "string") &&
                  (typeof item.relatedChangeSummary === "undefined" ||
                    typeof item.relatedChangeSummary === "string") &&
                  (typeof item.captureUrl === "undefined" ||
                    typeof item.captureUrl === "string") &&
                  (typeof item.captureSize === "undefined" ||
                    typeof item.captureSize === "string")
              )
          )
        : [],
      activeMode:
        parsedSession.activeMode &&
        ["Ask", "Build", "Fix", "Review", "Design", "Docs"].includes(parsedSession.activeMode)
          ? parsedSession.activeMode
          : "Build",
      messages: Array.isArray(parsedSession.messages) ? parsedSession.messages : []
    };
  } catch {
    return null;
  }
}

function normalizeSessionState(sessionState: Partial<SessionState> | null | undefined): SessionState {
  return {
    workspacePath: sessionState?.workspacePath ?? null,
    selectedPath: sessionState?.selectedPath ?? null,
    composerValue: sessionState?.composerValue ?? "",
    promptHistory: Array.isArray(sessionState?.promptHistory)
      ? sessionState.promptHistory.filter((item): item is string => typeof item === "string")
      : [],
    previewUrl: sessionState?.previewUrl ?? "",
    contextPaths: Array.isArray(sessionState?.contextPaths)
      ? sessionState.contextPaths.filter((item): item is string => typeof item === "string")
      : [],
    patchDrafts:
      sessionState?.patchDrafts &&
      typeof sessionState.patchDrafts === "object" &&
      !Array.isArray(sessionState.patchDrafts)
        ? Object.fromEntries(
            Object.entries(sessionState.patchDrafts).filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === "string" && typeof entry[1] === "string"
            )
          )
        : {},
    draftStatuses:
      sessionState?.draftStatuses &&
      typeof sessionState.draftStatuses === "object" &&
      !Array.isArray(sessionState.draftStatuses)
        ? Object.fromEntries(
            Object.entries(sessionState.draftStatuses).filter(
              (
                entry
              ): entry is [string, "draft" | "applied"] =>
                typeof entry[0] === "string" &&
                (entry[1] === "draft" || entry[1] === "applied")
            )
          )
        : {},
    patchPlan: Array.isArray(sessionState?.patchPlan)
      ? sessionState.patchPlan.filter(
          (
            item
          ): item is {
            filePath: string;
            action: "create" | "update" | "review";
            summary: string;
            rationale: string;
          } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof item.filePath === "string" &&
                ["create", "update", "review"].includes(item.action) &&
                typeof item.summary === "string" &&
                typeof item.rationale === "string"
            )
        )
      : [],
    customRecipes: Array.isArray(sessionState?.customRecipes)
      ? sessionState.customRecipes.filter(
          (
            item
          ): item is {
            id: string;
            label: string;
            commands: string[];
            capture: boolean;
          } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.label === "string" &&
                Array.isArray(item.commands) &&
                item.commands.every((command) => typeof command === "string") &&
                typeof item.capture === "boolean"
            )
        )
      : [],
    recentRuns: Array.isArray(sessionState?.recentRuns)
      ? sessionState.recentRuns.filter(
          (
            item
          ): item is {
            id: string;
            label: string;
            command: string;
            commands: string[];
            pinned: boolean;
            note: string;
            status: "success" | "failed";
            startedAt: string;
            finishedAt: string;
            captureRequested: boolean;
            captureCompleted: boolean;
            relatedFilePath?: string;
            relatedChangeSummary?: string;
            captureUrl?: string;
            captureSize?: string;
          } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.label === "string" &&
                typeof item.command === "string" &&
                Array.isArray(item.commands) &&
                item.commands.every((command) => typeof command === "string") &&
                typeof item.pinned === "boolean" &&
                typeof item.note === "string" &&
                (item.status === "success" || item.status === "failed") &&
                typeof item.startedAt === "string" &&
                typeof item.finishedAt === "string" &&
                typeof item.captureRequested === "boolean" &&
                typeof item.captureCompleted === "boolean" &&
                (typeof item.relatedFilePath === "undefined" ||
                  typeof item.relatedFilePath === "string") &&
                (typeof item.relatedChangeSummary === "undefined" ||
                  typeof item.relatedChangeSummary === "string") &&
                (typeof item.captureUrl === "undefined" ||
                  typeof item.captureUrl === "string") &&
                (typeof item.captureSize === "undefined" ||
                  typeof item.captureSize === "string")
            )
        )
      : [],
    activeMode:
      sessionState?.activeMode &&
      ["Ask", "Build", "Fix", "Review", "Design", "Docs"].includes(sessionState.activeMode)
        ? sessionState.activeMode
        : "Build",
    messages: Array.isArray(sessionState?.messages) ? sessionState.messages : []
  };
}

function createSessionRecord(name: string, state?: Partial<SessionState>): StoredSessionRecord {
  return {
    id: crypto.randomUUID(),
    name,
    updatedAt: new Date().toISOString(),
    state: normalizeSessionState(state)
  };
}

async function readStoredSessionsState(): Promise<StoredSessionsState> {
  const uiLanguage = await readUiLanguage();
  try {
    const rawSession = await readFile(getSessionPath(), "utf8");
    const parsedSession = JSON.parse(rawSession) as Partial<StoredSessionsState> | SessionState;

    if (
      parsedSession &&
      typeof parsedSession === "object" &&
      "sessions" in parsedSession &&
      Array.isArray(parsedSession.sessions)
    ) {
      const sessions = parsedSession.sessions
        .filter((session) => Boolean(session && typeof session === "object"))
        .map((session, index) => ({
          id:
            typeof session.id === "string" && session.id.length > 0
              ? session.id
              : crypto.randomUUID(),
          name:
            typeof session.name === "string" && session.name.trim().length > 0
              ? session.name.trim()
              : sharedBuildDefaultSessionName(index + 1, uiLanguage),
          updatedAt:
            typeof session.updatedAt === "string" && session.updatedAt.length > 0
              ? session.updatedAt
              : new Date().toISOString(),
          state: normalizeSessionState(session.state)
        }));

      if (sessions.length === 0) {
        const defaultSession = createSessionRecord(sharedBuildDefaultSessionName(1, uiLanguage));
        return {
          activeSessionId: defaultSession.id,
          sessions: [defaultSession]
        };
      }

      const activeSessionId =
        typeof parsedSession.activeSessionId === "string" &&
        sessions.some((session) => session.id === parsedSession.activeSessionId)
          ? parsedSession.activeSessionId
          : sessions[0].id;

      return {
        activeSessionId,
        sessions
      };
    }
  } catch {
    // Fallback to legacy or empty session creation below.
  }

  const legacySession = await readSessionState();
  if (legacySession) {
    const migratedSession = createSessionRecord(sharedBuildDefaultSessionName(1, uiLanguage), legacySession);
    return {
      activeSessionId: migratedSession.id,
      sessions: [migratedSession]
    };
  }

  const defaultSession = createSessionRecord(sharedBuildDefaultSessionName(1, uiLanguage));
  return {
    activeSessionId: defaultSession.id,
    sessions: [defaultSession]
  };
}

async function writeStoredSessionsState(storedState: StoredSessionsState) {
  await mkdir(path.dirname(getSessionPath()), { recursive: true });
  await writeFile(getSessionPath(), JSON.stringify(storedState, null, 2), "utf8");
}

async function buildSessionPayload(
  storedState: StoredSessionsState,
  sessionId: string
): Promise<{
  activeSessionId: string;
  session: SessionState & { workspace: null | WorkspaceSnapshot };
  sessions: SessionSummary[];
}> {
  const activeSession =
    storedState.sessions.find((session) => session.id === sessionId) ?? storedState.sessions[0];

  let workspace: null | WorkspaceSnapshot = null;

  if (activeSession.state.workspacePath) {
    try {
      workspace = await restoreWorkspaceSnapshot(activeSession.state.workspacePath);
    } catch {
      workspace = null;
    }
  }

  return {
    activeSessionId: activeSession.id,
    session: {
      ...activeSession.state,
      workspace
    },
    sessions: storedState.sessions
      .map(({ id, name, updatedAt, state }) => ({
        id,
        name,
        updatedAt,
        workspaceName:
          state.workspacePath && path.basename(state.workspacePath)
            ? path.basename(state.workspacePath)
            : null,
        activeMode: state.activeMode,
        messageCount: state.messages.length,
        hasPreview: Boolean(state.previewUrl)
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  };
}

function getPreviewServerStatus(): PreviewServerStatus {
  return { ...previewServerStatus };
}

function broadcastPreviewLog() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("preview:log", previewServerLog);
  }
}

function appendPreviewServerLog(chunk: string) {
  previewServerLog = `${previewServerLog}${chunk}`;
  if (previewServerLog.length > maxPreviewServerLogChars) {
    previewServerLog = previewServerLog.slice(
      previewServerLog.length - maxPreviewServerLogChars
    );
  }
  broadcastPreviewLog();
}

function getPreviewServerLog() {
  return previewServerLog;
}

function getWorkspaceCommandStatus(): WorkspaceCommandStatus {
  return { ...workspaceCommandStatus };
}

function broadcastWorkspaceCommandLog() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("command:log", workspaceCommandLog);
  }
}

function appendWorkspaceCommandLog(chunk: string) {
  workspaceCommandLog = `${workspaceCommandLog}${chunk}`;
  if (workspaceCommandLog.length > maxWorkspaceCommandLogChars) {
    workspaceCommandLog = workspaceCommandLog.slice(
      workspaceCommandLog.length - maxWorkspaceCommandLogChars
    );
  }
  broadcastWorkspaceCommandLog();
}

function getWorkspaceCommandLog() {
  return workspaceCommandLog;
}

function buildSequentialWorkspaceCommand(commands: string[]) {
  const normalizedCommands = commands
    .map((command) => command.trim())
    .filter(Boolean);

  if (normalizedCommands.length === 0) {
    throw new Error("Recipe commands cannot be empty.");
  }

  if (process.platform === "win32") {
    return normalizedCommands
      .map((command, index) =>
        index === normalizedCommands.length - 1
          ? command
          : `${command}; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`
      )
      .join("; ");
  }

  return normalizedCommands.join(" && ");
}

async function runGit(args: string[], cwd: string) {
  return await new Promise<string>((resolve, reject) => {
    const gitProcess = spawn("git", args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    gitProcess.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    gitProcess.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    gitProcess.on("error", reject);
    gitProcess.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `git exited with code ${code ?? -1}`));
    });
  });
}

function parseGitBranchStatus(headerLine: string) {
  const normalized = headerLine.replace(/^##\s*/, "").trim();
  const [branchPart, trackingPart] = normalized.split(" [", 2);
  const branchLabel = branchPart.split("...")[0]?.trim() || null;
  const ahead = Number(trackingPart?.match(/ahead (\d+)/)?.[1] ?? 0);
  const behind = Number(trackingPart?.match(/behind (\d+)/)?.[1] ?? 0);

  return {
    branch:
      branchLabel === "HEAD (no branch)" || branchLabel === "HEAD"
        ? "detached HEAD"
        : branchLabel,
    ahead,
    behind
  };
}

function summarizeGitStatusEntries(lines: string[]) {
  let staged = 0;
  let modified = 0;
  let deleted = 0;
  let untracked = 0;
  let conflicts = 0;

  for (const line of lines) {
    if (!line || line.startsWith("##")) {
      continue;
    }

    const x = line[0] ?? " ";
    const y = line[1] ?? " ";
    const code = `${x}${y}`;

    if (code === "??") {
      untracked += 1;
      continue;
    }

    if (code.includes("U") || code === "AA" || code === "DD") {
      conflicts += 1;
      continue;
    }

    if (x !== " " && x !== "?") {
      staged += 1;
    }

    if (y !== " " && y !== "?") {
      modified += 1;
    }

    if (x === "D" || y === "D") {
      deleted += 1;
    }
  }

  return {
    staged,
    modified,
    deleted,
    untracked,
    conflicts
  };
}

function describeGitChangeCode(indexStatus: string, worktreeStatus: string) {
  if (indexStatus === "?" && worktreeStatus === "?") {
    return "未跟踪";
  }

  if (
    indexStatus === "U" ||
    worktreeStatus === "U" ||
    `${indexStatus}${worktreeStatus}` === "AA" ||
    `${indexStatus}${worktreeStatus}` === "DD"
  ) {
    return "冲突";
  }

  const parts: string[] = [];

  if (indexStatus !== " ") {
    if (indexStatus === "A") {
      parts.push("staged add");
    } else if (indexStatus === "M") {
      parts.push("已暂存");
    } else if (indexStatus === "D") {
      parts.push("已暂存删除");
    } else if (indexStatus === "R") {
      parts.push("已重命名");
    } else if (indexStatus === "C") {
      parts.push("已复制");
    }
  }

  if (worktreeStatus !== " ") {
    if (worktreeStatus === "M") {
      parts.push("已修改");
    } else if (worktreeStatus === "D") {
      parts.push("已删除");
    }
  }

  return parts.length > 0 ? parts.join(" + ") : "有改动";
}

function parseGitChangedFiles(lines: string[]) {
  return lines
    .filter((line) => line && !line.startsWith("##"))
    .map((line) => {
      const indexStatus = line[0] ?? " ";
      const worktreeStatus = line[1] ?? " ";
      const rawPath = line.slice(3).trim();
      const normalizedPath = rawPath.includes(" -> ")
        ? rawPath.split(" -> ").at(-1)?.trim() ?? rawPath
        : rawPath;

      return {
        path: normalizedPath,
        indexStatus,
        worktreeStatus,
        label: describeGitChangeCode(indexStatus, worktreeStatus)
      };
    });
}

async function readLocalGitBranches(rootPath: string) {
  try {
    const output = await runGit(["branch", "--format=%(refname:short)"], rootPath);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readGitRemotes(rootPath: string) {
  try {
    const output = await runGit(["remote"], rootPath);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readGitUpstreamBranch(rootPath: string) {
  try {
    const output = await runGit(
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
      rootPath
    );
    return output || null;
  } catch {
    return null;
  }
}

async function readGitStatusSummary(workspacePath: string | null): Promise<GitStatusSummary> {
  if (!workspacePath) {
    return {
      available: true,
      isRepo: false,
      branch: null,
      localBranches: [],
      remotes: [],
      upstreamBranch: null,
      rootPath: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      modified: 0,
      deleted: 0,
      untracked: 0,
      conflicts: 0,
      hasChanges: false,
      lastCommitSummary: null
      ,
      changedFiles: []
    };
  }

  try {
    const rootPath = await runGit(["rev-parse", "--show-toplevel"], workspacePath);
    const statusOutput = await runGit(["status", "--short", "--branch"], workspacePath);
    const [headerLine = "", ...statusLines] = statusOutput.split(/\r?\n/).filter(Boolean);
    const { branch, ahead, behind } = parseGitBranchStatus(headerLine);
    const counts = summarizeGitStatusEntries(statusLines);
    const changedFiles = parseGitChangedFiles(statusLines);
    const localBranches = await readLocalGitBranches(rootPath);
    const remotes = await readGitRemotes(rootPath);
    const upstreamBranch = await readGitUpstreamBranch(rootPath);
    let lastCommitSummary: string | null = null;

    try {
      const lastCommit = await runGit(["log", "-1", "--pretty=format:%h %s"], workspacePath);
      lastCommitSummary = lastCommit || null;
    } catch {
      lastCommitSummary = null;
    }

    return {
      available: true,
      isRepo: true,
      branch,
      localBranches,
      remotes,
      upstreamBranch,
      rootPath,
      ahead,
      behind,
      staged: counts.staged,
      modified: counts.modified,
      deleted: counts.deleted,
      untracked: counts.untracked,
      conflicts: counts.conflicts,
      hasChanges:
        counts.staged + counts.modified + counts.deleted + counts.untracked + counts.conflicts >
        0,
      lastCommitSummary,
      changedFiles
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect git status.";
    const isRepoError =
      /not a git repository/i.test(message) || /needed a single revision/i.test(message);

    return {
      available: !/ENOENT/i.test(message),
      isRepo: false,
      branch: null,
      localBranches: [],
      remotes: [],
      upstreamBranch: null,
      rootPath: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      modified: 0,
      deleted: 0,
      untracked: 0,
      conflicts: 0,
      hasChanges: false,
      lastCommitSummary: null,
      changedFiles: [],
      error: isRepoError ? undefined : message
    };
  }
}

async function stageGitChanges(
  workspacePath: string | null,
  request?: GitStageRequest
): Promise<GitStatusSummary> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_stage"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  const paths = (request?.paths ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) =>
      path.isAbsolute(entry) ? path.relative(gitStatus.rootPath ?? workspacePath, entry) : entry
    )
    .filter((entry) => entry.length > 0 && !entry.startsWith(".."));

  if (paths.length > 0) {
    await runGit(["add", "--", ...paths], gitStatus.rootPath);
  } else {
    await runGit(["add", "-A"], gitStatus.rootPath);
  }

  return readGitStatusSummary(workspacePath);
}

async function unstageGitChanges(
  workspacePath: string | null,
  request?: GitUnstageRequest
): Promise<GitStatusSummary> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_unstage"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  const paths = (request?.paths ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) =>
      path.isAbsolute(entry) ? path.relative(gitStatus.rootPath ?? workspacePath, entry) : entry
    )
    .filter((entry) => entry.length > 0 && !entry.startsWith(".."));

  if (paths.length > 0) {
    await runGit(["reset", "HEAD", "--", ...paths], gitStatus.rootPath);
  } else {
    await runGit(["reset", "HEAD"], gitStatus.rootPath);
  }

  return readGitStatusSummary(workspacePath);
}

async function commitGitChanges(
  workspacePath: string | null,
  request: GitCommitRequest
): Promise<GitCommitResult> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_commit"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  const message = request.message.trim();
  if (!message) {
    throw new Error(translateMain(uiLanguage, "git_commit_message_required"));
  }

  if (gitStatus.staged <= 0) {
    throw new Error(translateMain(uiLanguage, "git_commit_stage_required"));
  }

  const commitMessagePath = path.join(
    app.getPath("userData"),
    "git-commit-message.txt"
  );
  await mkdir(path.dirname(commitMessagePath), { recursive: true });
  await writeFile(commitMessagePath, message, "utf8");

  try {
    await runGit(["commit", "--file", commitMessagePath], gitStatus.rootPath);
  } finally {
    await rm(commitMessagePath, { force: true }).catch(() => undefined);
  }

  const updatedStatus = await readGitStatusSummary(workspacePath);
  const commitSummary =
    (await runGit(["log", "-1", "--pretty=format:%h %s"], gitStatus.rootPath)) ||
    translateMain(uiLanguage, "git_commit_created");

  return {
    status: updatedStatus,
    commitSummary
  };
}

async function switchGitBranch(
  workspacePath: string | null,
  request: GitBranchRequest
): Promise<GitStatusSummary> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_switch_branch"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  const branchName = request.name.trim();
  if (!branchName) {
    throw new Error(translateMain(uiLanguage, "git_branch_name_required"));
  }

  await runGit(["switch", branchName], gitStatus.rootPath);
  return readGitStatusSummary(workspacePath);
}

async function createGitBranch(
  workspacePath: string | null,
  request: GitBranchRequest
): Promise<GitStatusSummary> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_create_branch"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  const branchName = request.name.trim();
  if (!branchName) {
    throw new Error(translateMain(uiLanguage, "git_branch_name_required"));
  }

  await runGit(["switch", "-c", branchName], gitStatus.rootPath);
  return readGitStatusSummary(workspacePath);
}

async function pushGitBranch(workspacePath: string | null): Promise<GitPushResult> {
  const uiLanguage = await readUiLanguage();
  if (!workspacePath) {
    throw new Error(translateMain(uiLanguage, "git_open_push_branch"));
  }

  const gitStatus = await readGitStatusSummary(workspacePath);
  if (!gitStatus.available) {
    throw new Error(translateMain(uiLanguage, "git_unavailable"));
  }

  if (!gitStatus.isRepo || !gitStatus.rootPath) {
    throw new Error(translateMain(uiLanguage, "git_not_repo"));
  }

  if (!gitStatus.branch) {
    throw new Error(translateMain(uiLanguage, "git_branch_unknown"));
  }

  if (gitStatus.remotes.length === 0) {
    throw new Error(translateMain(uiLanguage, "git_remote_missing"));
  }

  if (gitStatus.upstreamBranch) {
    await runGit(["push"], gitStatus.rootPath);
  } else {
    const preferredRemote = gitStatus.remotes.includes("origin")
      ? "origin"
      : gitStatus.remotes[0];
    await runGit(["push", "-u", preferredRemote, gitStatus.branch], gitStatus.rootPath);
  }

  const status = await readGitStatusSummary(workspacePath);
  return {
    status,
    pushSummary: formatGitPushSummary(uiLanguage, gitStatus.branch, status.upstreamBranch)
  };
}

function extractFirstMatch(source: string, expression: RegExp) {
  const match = source.match(expression);
  if (!match?.[1]) {
    return null;
  }

  const normalized = match[1].replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function extractMetaContent(source: string, attributeName: string, attributeValue: string) {
  const escapedValue = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]*${attributeName}=["']${escapedValue}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attributeName}=["']${escapedValue}["'][^>]*>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const value = extractFirstMatch(source, pattern);
    if (value) {
      return value;
    }
  }

  return null;
}

async function inspectPreviewUrls(urls: string[]) {
  const inspections = await Promise.all(
    urls.map(async (url): Promise<PreviewInspection> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeout);

        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
          return {
            url,
            title: null,
            appName: null,
            description: null,
            heading: null
          };
        }

        const html = await response.text();
        const title =
          extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
          extractMetaContent(html, "property", "og:title");
        const appName =
          extractMetaContent(html, "name", "application-name") ??
          extractMetaContent(html, "property", "og:site_name");
        const description =
          extractMetaContent(html, "name", "description") ??
          extractMetaContent(html, "property", "og:description");
        const heading = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

        return {
          url,
          title,
          appName,
          description,
          heading
        };
      } catch {
        return {
          url,
          title: null,
          appName: null,
          description: null,
          heading: null
        };
      }
    })
  );

  return inspections;
}

async function capturePreviewUrl(url: string): Promise<PreviewCapture> {
  const captureWindow = new BrowserWindow({
    show: false,
    width: 1440,
    height: 900,
    backgroundColor: "#ffffff",
    webPreferences: {
      sandbox: false
    }
  });

  try {
    await captureWindow.loadURL(url);
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve();
      }, 1200);

      captureWindow.webContents.once("did-finish-load", () => {
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, 400);
      });
    });

    const image = await captureWindow.webContents.capturePage();
    const size = image.getSize();

    return {
      url,
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      capturedAt: new Date().toISOString()
    };
  } finally {
    captureWindow.destroy();
  }
}

async function detectPreviewUrls(urls: string[]) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeout);

        return {
          url,
          online: response.ok || response.status < 500
        };
      } catch {
        return {
          url,
          online: false
        };
      }
    })
  );

  return results;
}
async function runWorkspaceCommand(command: string, displayCommand?: string) {
  const uiLanguage = await readUiLanguage();
  if (!currentWorkspacePath) {
    throw new Error(translateMain(uiLanguage, "workspace_open_required"));
  }

  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    throw new Error(translateMain(uiLanguage, "command_empty"));
  }

  if (workspaceCommandProcess && !workspaceCommandProcess.killed) {
    return getWorkspaceCommandStatus();
  }

  const shellCommand =
    process.platform === "win32"
      ? {
          file: "powershell.exe",
          args: ["-NoLogo", "-NoProfile", "-Command", trimmedCommand]
        }
      : {
          file: "sh",
          args: ["-lc", trimmedCommand]
        };

  workspaceCommandLog = "";
  workspaceCommandStatus = {
    state: "running",
    command: displayCommand ?? trimmedCommand,
    cwd: currentWorkspacePath,
    pid: null
  };
  appendWorkspaceCommandLog(`> ${displayCommand ?? trimmedCommand}\n`);

  workspaceCommandProcess = spawn(shellCommand.file, shellCommand.args, {
    cwd: currentWorkspacePath,
    stdio: "pipe",
    windowsHide: true
  });

  workspaceCommandStatus = {
    ...workspaceCommandStatus,
    pid: workspaceCommandProcess.pid ?? null
  };

  workspaceCommandProcess.stdout?.on("data", (chunk) => {
    appendWorkspaceCommandLog(chunk.toString());
  });

  workspaceCommandProcess.stderr?.on("data", (chunk) => {
    appendWorkspaceCommandLog(chunk.toString());
  });

  workspaceCommandProcess.once("exit", (code) => {
    appendWorkspaceCommandLog(`\n[CodeDT] Command exited with code ${code ?? -1}.\n`);
    workspaceCommandStatus = {
      ...workspaceCommandStatus,
      state: code === 0 ? "idle" : "error",
      pid: null,
      error: code === 0 ? undefined : `Command exited with code ${code ?? -1}.`
    };
    workspaceCommandProcess = null;
  });

  workspaceCommandProcess.once("error", (error) => {
    appendWorkspaceCommandLog(`\n[CodeDT] ${error.message}\n`);
    workspaceCommandStatus = {
      ...workspaceCommandStatus,
      state: "error",
      pid: null,
      error: error.message
    };
    workspaceCommandProcess = null;
  });

  return getWorkspaceCommandStatus();
}

async function runWorkspaceRecipe(commands: string[], label?: string) {
  const script = buildSequentialWorkspaceCommand(commands);
  return runWorkspaceCommand(script, label ?? commands.join(" -> "));
}

function stopWorkspaceCommand() {
  if (workspaceCommandProcess && !workspaceCommandProcess.killed) {
    appendWorkspaceCommandLog(`\n[CodeDT] Stopping command.\n`);
    workspaceCommandProcess.kill();
  }

  workspaceCommandProcess = null;
  workspaceCommandStatus = {
    ...workspaceCommandStatus,
    state: "idle",
    pid: null
  };

  return getWorkspaceCommandStatus();
}

async function startPreviewServer() {
  const uiLanguage = await readUiLanguage();
  if (!currentWorkspacePath) {
    throw new Error(translateMain(uiLanguage, "workspace_open_required"));
  }

  if (previewServerProcess && !previewServerProcess.killed) {
    return getPreviewServerStatus();
  }

  const packageJsonPath = path.join(currentWorkspacePath, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scriptName = ["dev:web", "dev", "start", "preview"].find((candidate) =>
    Boolean(packageJson.scripts?.[candidate])
  );

  if (!scriptName) {
    throw new Error(translateMain(uiLanguage, "preview_start_script_missing"));
  }
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  previewServerLog = "";
  previewServerStatus = {
    state: "starting",
    command: `${npmCommand} run ${scriptName}`,
    cwd: currentWorkspacePath,
    pid: null
  };
  appendPreviewServerLog(`> ${npmCommand} run ${scriptName}\n`);

  previewServerProcess = spawn(npmCommand, ["run", scriptName], {
    cwd: currentWorkspacePath,
    stdio: "pipe",
    windowsHide: true
  });

  previewServerStatus = {
    ...previewServerStatus,
    pid: previewServerProcess.pid ?? null,
    state: "running"
  };

  previewServerProcess.stdout?.on("data", (chunk) => {
    appendPreviewServerLog(chunk.toString());
  });

  previewServerProcess.stderr?.on("data", (chunk) => {
    appendPreviewServerLog(chunk.toString());
  });

  previewServerProcess.once("exit", (code) => {
    appendPreviewServerLog(`\n[CodeDT] Dev server exited with code ${code ?? -1}.\n`);
    previewServerStatus = {
      ...previewServerStatus,
      state: code === 0 ? "idle" : "error",
      pid: null,
      error: code === 0 ? undefined : `Dev server exited with code ${code ?? -1}.`
    };
    previewServerProcess = null;
  });

  previewServerProcess.once("error", (error) => {
    appendPreviewServerLog(`\n[CodeDT] ${error.message}\n`);
    previewServerStatus = {
      ...previewServerStatus,
      state: "error",
      pid: null,
      error: error.message
    };
    previewServerProcess = null;
  });

  return getPreviewServerStatus();
}

function stopPreviewServer() {
  if (previewServerProcess && !previewServerProcess.killed) {
    appendPreviewServerLog(`\n[CodeDT] Stopping dev server.\n`);
    previewServerProcess.kill();
  }

  previewServerProcess = null;
  previewServerStatus = {
    ...previewServerStatus,
    state: "idle",
    pid: null
  };

  return getPreviewServerStatus();
}

function buildChatCompletionsUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/chat/completions`;
}

async function sendChatCompletion(request: ChatRequest): Promise<ChatResponse> {
  const providerSettings = await readProviderSettings();
  const uiLanguage = await readUiLanguage();
  if (!providerSettings.apiKey) {
    throw new Error(translateMain(uiLanguage, "provider_api_key_missing"));
  }

  const response = await fetch(buildChatCompletionsUrl(providerSettings.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSettings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: providerSettings.model,
      messages: request.messages,
      temperature: 0.2,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Provider request failed with ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      translateMain(uiLanguage, "provider_missing_content")
    );
  }

  return {
    content,
    model: providerSettings.model,
    provider: providerSettings.provider
  };
}

async function streamChatCompletion(
  targetWindow: BrowserWindow,
  requestId: string,
  request: ChatRequest
) {
  const providerSettings = await readProviderSettings();
  const uiLanguage = await readUiLanguage();

  if (!providerSettings.apiKey) {
    throw new Error(translateMain(uiLanguage, "provider_api_key_missing"));
  }

  const controller = new AbortController();
  activeStreamControllers.set(requestId, controller);

  const response = await fetch(buildChatCompletionsUrl(providerSettings.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSettings.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: providerSettings.model,
      messages: request.messages,
      temperature: 0.2,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || `Provider stream failed with ${response.status}.`);
  }

  const decoder = new TextDecoder("utf8");
  let pendingBuffer = "";

  const sendChunk = (chunk: ChatStreamChunk) => {
    targetWindow.webContents.send("ai:chatStream", chunk);
  };

  try {
    for await (const bodyChunk of response.body) {
      pendingBuffer += decoder.decode(bodyChunk, { stream: true });
      const lines = pendingBuffer.split("\n");
      pendingBuffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;

        if (delta) {
          sendChunk({
            kind: "delta",
            requestId,
            delta
          });
        }
      }
    }

    sendChunk({
      kind: "complete",
      requestId,
      model: providerSettings.model,
      provider: providerSettings.provider
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      sendChunk({
        kind: "cancelled",
        requestId
      });
      return;
    }

    throw error;
  } finally {
    activeStreamControllers.delete(requestId);
  }
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

function hasNullByte(buffer: Buffer) {
  return buffer.includes(0);
}

function isKnownBinaryFile(filePath: string) {
  return binaryFileExtensions.has(path.extname(filePath).toLowerCase());
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

function incrementExtensionCount(
  extensionCounts: Map<string, number>,
  fileName: string
) {
  const extension = path.extname(fileName).toLowerCase() || "[no extension]";
  extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
}

async function buildWorkspaceIndex(workspacePath: string): Promise<WorkspaceIndex> {
  const extensionCounts = new Map<string, number>();
  const configFiles = new Set<string>();
  const topLevelDirectories = new Set<string>();
  let fileCount = 0;

  async function walk(directoryPath: string, depth = 0): Promise<void> {
    if (depth > 3) {
      return;
    }

    const entries = await readdir(directoryPath, { withFileTypes: true });
    const visibleEntries = entries
      .filter((entry) => !entry.name.startsWith(".") || entry.name === ".env")
      .filter((entry) => !entry.isDirectory() || !ignoredDirectoryNames.has(entry.name));

    for (const entry of visibleEntries) {
      const entryPath = path.join(directoryPath, entry.name);
      const relativePath = path.relative(workspacePath, entryPath);

      if (entry.isDirectory()) {
        if (depth === 0) {
          topLevelDirectories.add(entry.name);
        }

        await walk(entryPath, depth + 1);
        continue;
      }

      fileCount += 1;
      incrementExtensionCount(extensionCounts, entry.name);

      if (
        technologyRules.some((rule) => relativePath.replace(/\\/g, "/") === rule.config)
      ) {
        configFiles.add(relativePath.replace(/\\/g, "/"));
      }
    }
  }

  await walk(workspacePath);

  const likelyTechnologies = technologyRules
    .filter((rule) => configFiles.has(rule.config))
    .map((rule) => rule.label);

  return {
    configFiles: [...configFiles].sort(),
    fileCount,
    likelyTechnologies,
    topExtensions: [...extensionCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([extension, count]) => ({ extension, count })),
    topLevelDirectories: [...topLevelDirectories].sort().slice(0, 8)
  };
}

async function restoreWorkspaceSnapshot(workspacePath: string): Promise<WorkspaceSnapshot> {
  const workspaceStats = await stat(workspacePath);
  if (!workspaceStats.isDirectory()) {
    throw new Error("Saved workspace path is not a directory.");
  }

  currentWorkspacePath = workspacePath;
  return {
    index: await buildWorkspaceIndex(workspacePath),
    name: path.basename(workspacePath),
    path: workspacePath,
    tree: await readWorkspaceTree(workspacePath)
  };
}
async function openWorkspace(): Promise<WorkspaceSnapshot | null> {
  const uiLanguage = await readUiLanguage();
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: translateMain(uiLanguage, "open_workspace_dialog_title")
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const workspacePath = result.filePaths[0];
  return restoreWorkspaceSnapshot(workspacePath);
}

ipcMain.handle("workspace:open", async () => {
  return openWorkspace();
});

ipcMain.handle(
  "workspace:readFile",
  async (_event, filePath: string): Promise<WorkspaceFilePreview> => {
    const uiLanguage = await readUiLanguage();
    if (!isPathInsideWorkspace(filePath)) {
      throw new Error(translateMain(uiLanguage, "workspace_file_outside"));
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error(translateMain(uiLanguage, "workspace_path_not_file"));
    }

    const sniffBytesToRead = Math.min(fileStats.size, binarySniffBytes);
    const sniffBuffer = Buffer.alloc(sniffBytesToRead);
    const sniffHandle = await open(filePath, "r");

    try {
      await sniffHandle.read(sniffBuffer, 0, sniffBytesToRead, 0);
    } finally {
      await sniffHandle.close();
    }

    if (isKnownBinaryFile(filePath) || hasNullByte(sniffBuffer)) {
      return {
        path: filePath,
        name: path.basename(filePath),
        size: fileStats.size,
        content: "",
        kind: "binary",
        reason: translateMain(uiLanguage, "binary_preview_skipped"),
        truncated: false
      };
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
      kind: "text",
      truncated: fileStats.size > maxPreviewFileSize
    };
  }
);

ipcMain.handle(
  "workspace:writeFile",
  async (
    _event,
    payload: { filePath: string; content: string }
  ): Promise<WorkspaceFilePreview> => {
    const uiLanguage = await readUiLanguage();
    if (!isPathInsideWorkspace(payload.filePath)) {
      throw new Error(translateMain(uiLanguage, "workspace_file_outside"));
    }

    try {
      const fileStats = await stat(payload.filePath);
      if (!fileStats.isFile()) {
        throw new Error(translateMain(uiLanguage, "workspace_path_not_file"));
      }
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }

      await mkdir(path.dirname(payload.filePath), { recursive: true });
    }

    await writeFile(payload.filePath, payload.content, "utf8");

    const updatedSize = Buffer.byteLength(payload.content, "utf8");
    return {
      path: payload.filePath,
      name: path.basename(payload.filePath),
      size: updatedSize,
      content:
        updatedSize > maxPreviewFileSize
          ? payload.content.slice(0, maxPreviewFileSize)
          : payload.content,
      kind: "text",
      truncated: updatedSize > maxPreviewFileSize
    };
  }
);
ipcMain.handle("workspace:getSnapshot", async () => {
  if (!currentWorkspacePath) {
    return null;
  }

  return restoreWorkspaceSnapshot(currentWorkspacePath);
});

ipcMain.handle("git:getStatus", async () => {
  return readGitStatusSummary(currentWorkspacePath);
});

ipcMain.handle("git:stage", async (_event, request?: GitStageRequest) => {
  return stageGitChanges(currentWorkspacePath, request);
});

ipcMain.handle("git:unstage", async (_event, request?: GitUnstageRequest) => {
  return unstageGitChanges(currentWorkspacePath, request);
});

ipcMain.handle("git:commit", async (_event, request: GitCommitRequest) => {
  return commitGitChanges(currentWorkspacePath, request);
});

ipcMain.handle("git:switchBranch", async (_event, request: GitBranchRequest) => {
  return switchGitBranch(currentWorkspacePath, request);
});

ipcMain.handle("git:createBranch", async (_event, request: GitBranchRequest) => {
  return createGitBranch(currentWorkspacePath, request);
});

ipcMain.handle("git:push", async () => {
  return pushGitBranch(currentWorkspacePath);
});

ipcMain.handle("preview:detect", async (_event, urls: string[]) => {
  return detectPreviewUrls(urls);
});

ipcMain.handle("preview:getStatus", async () => {
  return getPreviewServerStatus();
});

ipcMain.handle("preview:getLog", async () => {
  return getPreviewServerLog();
});

ipcMain.handle("preview:inspect", async (_event, urls: string[]) => {
  return inspectPreviewUrls(urls);
});

ipcMain.handle("preview:capture", async (_event, url: string) => {
  return capturePreviewUrl(url);
});

ipcMain.handle("preview:start", async () => {
  return startPreviewServer();
});

ipcMain.handle("preview:stop", async () => {
  return stopPreviewServer();
});

ipcMain.handle("command:getStatus", async () => {
  return getWorkspaceCommandStatus();
});

ipcMain.handle("command:getLog", async () => {
  return getWorkspaceCommandLog();
});

ipcMain.handle("command:run", async (_event, command: string) => {
  return runWorkspaceCommand(command);
});

ipcMain.handle(
  "command:runRecipe",
  async (_event, payload: { commands: string[]; label?: string }) => {
    return runWorkspaceRecipe(payload.commands, payload.label);
  }
);

ipcMain.handle("command:stop", async () => {
  return stopWorkspaceCommand();
});

ipcMain.handle("settings:getProvider", async () => {
  return readProviderSettings();
});

ipcMain.handle("settings:saveProvider", async (_event, settings: ProviderSettings) => {
  await writeProviderSettings(settings);
  return readProviderSettings();
});

ipcMain.handle("settings:getUiLanguage", async () => {
  return readUiLanguage();
});

ipcMain.handle("settings:saveUiLanguage", async (_event, language: AppLanguage) => {
  await writeUiLanguage(language);
  return readUiLanguage();
});

ipcMain.handle("session:get", async () => {
  const storedState = await readStoredSessionsState();
  return buildSessionPayload(storedState, storedState.activeSessionId);
});

ipcMain.handle(
  "session:save",
  async (
    _event,
    payload: {
      sessionId: string;
      state: SessionState;
    }
  ) => {
    const storedState = await readStoredSessionsState();
    const sessionIndex = storedState.sessions.findIndex(
      (session) => session.id === payload.sessionId
    );

    if (sessionIndex === -1) {
      return;
    }

    storedState.sessions[sessionIndex] = {
      ...storedState.sessions[sessionIndex],
      updatedAt: new Date().toISOString(),
      state: normalizeSessionState(payload.state)
    };
    storedState.activeSessionId = payload.sessionId;
    await writeStoredSessionsState(storedState);
  }
);

ipcMain.handle("session:load", async (_event, sessionId: string) => {
  const storedState = await readStoredSessionsState();
  storedState.activeSessionId = storedState.sessions.some((session) => session.id === sessionId)
    ? sessionId
    : storedState.activeSessionId;
  await writeStoredSessionsState(storedState);
  return buildSessionPayload(storedState, storedState.activeSessionId);
});

ipcMain.handle("session:create", async (_event, payload?: { name?: string }) => {
  const storedState = await readStoredSessionsState();
  const uiLanguage = await readUiLanguage();
  const sessionName =
    payload?.name && payload.name.trim().length > 0
      ? payload.name.trim()
      : sharedBuildDefaultSessionName(storedState.sessions.length + 1, uiLanguage);
  const createdSession = createSessionRecord(sessionName);
  storedState.sessions.unshift(createdSession);
  storedState.activeSessionId = createdSession.id;
  await writeStoredSessionsState(storedState);
  return buildSessionPayload(storedState, createdSession.id);
});

ipcMain.handle(
  "session:rename",
  async (_event, payload: { sessionId: string; name: string }) => {
    const storedState = await readStoredSessionsState();
    const sessionIndex = storedState.sessions.findIndex(
      (session) => session.id === payload.sessionId
    );

    if (sessionIndex === -1) {
      return buildSessionPayload(storedState, storedState.activeSessionId);
    }

    storedState.sessions[sessionIndex] = {
      ...storedState.sessions[sessionIndex],
      name: payload.name.trim() || storedState.sessions[sessionIndex].name,
      updatedAt: new Date().toISOString()
    };
    await writeStoredSessionsState(storedState);
    return buildSessionPayload(storedState, storedState.activeSessionId);
  }
);

ipcMain.handle("session:delete", async (_event, sessionId: string) => {
  const storedState = await readStoredSessionsState();
  const uiLanguage = await readUiLanguage();
  const remainingSessions = storedState.sessions.filter((session) => session.id !== sessionId);

  if (remainingSessions.length === 0) {
    const defaultSession = createSessionRecord(sharedBuildDefaultSessionName(1, uiLanguage));
    const nextState = {
      activeSessionId: defaultSession.id,
      sessions: [defaultSession]
    };
    await writeStoredSessionsState(nextState);
    return buildSessionPayload(nextState, nextState.activeSessionId);
  }

  const nextActiveSessionId =
    storedState.activeSessionId === sessionId
      ? remainingSessions[0].id
      : storedState.activeSessionId;
  const nextState = {
    activeSessionId: nextActiveSessionId,
    sessions: remainingSessions
  };
  await writeStoredSessionsState(nextState);
  return buildSessionPayload(nextState, nextActiveSessionId);
});

ipcMain.handle("ai:chat", async (_event, request: ChatRequest) => {
  return sendChatCompletion(request);
});

ipcMain.on("ai:chatStream", async (event, payload: { requestId: string; request: ChatRequest }) => {
  const targetWindow = BrowserWindow.fromWebContents(event.sender);
  if (!targetWindow) {
    return;
  }

  try {
    await streamChatCompletion(targetWindow, payload.requestId, payload.request);
  } catch (error) {
    const uiLanguage = await readUiLanguage();
    targetWindow.webContents.send("ai:chatStream", {
      kind: "error",
      requestId: payload.requestId,
      error:
        error instanceof Error
          ? error.message
          : translateMain(uiLanguage, "stream_unknown_error")
    } satisfies ChatStreamChunk);
  }
});

ipcMain.on("ai:cancelChatStream", (_event, payload: { requestId: string }) => {
  activeStreamControllers.get(payload.requestId)?.abort();
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "CodeDT",
    backgroundColor: "#101114",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
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




