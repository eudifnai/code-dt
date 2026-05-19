/// <reference types="vite/client" />

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
  topExtensions: Array<{
    extension: string;
    count: number;
  }>;
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

type ProviderSettings = {
  provider: "deepseek" | "openai-compatible";
  model: string;
  baseUrl: string;
  apiKey: string;
};

type AppLanguage = "zh-CN" | "en-US";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatResponse = {
  content: string;
  model: string;
  provider: ProviderSettings["provider"];
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

type ChatThreadStateMessage = ChatMessage & {
  id: string;
  status?: "sending" | "failed";
};

type WorkspaceMode = "Ask" | "Build" | "Fix" | "Review" | "Design" | "Docs";

type SessionSummary = {
  id: string;
  name: string;
  updatedAt: string;
  workspaceName: string | null;
  activeMode: WorkspaceMode;
  messageCount: number;
  hasPreview: boolean;
};

type PatchPlanItem = {
  filePath: string;
  action: "create" | "update" | "review";
  summary: string;
  rationale: string;
};

type SavedCommandRecipe = {
  id: string;
  label: string;
  commands: string[];
  capture: boolean;
};

type RecentRunEntry = {
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
};

type RestoredSessionState = {
  workspace: null | WorkspaceSnapshot;
  workspacePath: null | string;
  selectedPath: null | string;
  composerValue: string;
  promptHistory: string[];
  previewUrl: string;
  contextPaths: string[];
  patchDrafts: Record<string, string>;
  draftStatuses: Record<string, "draft" | "applied">;
  patchPlan: PatchPlanItem[];
  customRecipes: SavedCommandRecipe[];
  recentRuns: RecentRunEntry[];
  activeMode: WorkspaceMode;
  messages: ChatThreadStateMessage[];
};

type SessionBundle = {
  activeSessionId: string;
  session: RestoredSessionState;
  sessions: SessionSummary[];
};

type PreviewReachability = {
  url: string;
  online: boolean;
};

type PreviewServerStatus = {
  state: "idle" | "starting" | "running" | "error";
  command: string;
  cwd: string;
  pid: number | null;
  error?: string;
};

type PreviewInspection = {
  url: string;
  title: string | null;
  appName: string | null;
  description: string | null;
  heading: string | null;
};

type PreviewCapture = {
  url: string;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
};

type WorkspaceCommandStatus = {
  state: "idle" | "running" | "error";
  command: string;
  cwd: string;
  pid: number | null;
  error?: string;
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

type GitCommitResult = {
  status: GitStatusSummary;
  commitSummary: string;
};

type GitPushResult = {
  status: GitStatusSummary;
  pushSummary: string;
};

interface Window {
  codedt?: {
    appName: string;
    version: string;
    ai: {
      chat: (request: { messages: ChatMessage[] }) => Promise<ChatResponse>;
      streamChat: (payload: {
        requestId: string;
        request: { messages: ChatMessage[] };
      }) => void;
      cancelChatStream: (payload: { requestId: string }) => void;
      onChatStream: (listener: (chunk: ChatStreamChunk) => void) => () => void;
    };
    settings: {
      getProvider: () => Promise<ProviderSettings>;
      getUiLanguage: () => Promise<AppLanguage>;
      saveProvider: (settings: ProviderSettings) => Promise<ProviderSettings>;
      saveUiLanguage: (language: AppLanguage) => Promise<AppLanguage>;
    };
    session: {
      get: () => Promise<SessionBundle>;
      save: (payload: {
        sessionId: string;
        state: {
          workspacePath: null | string;
          selectedPath: null | string;
          composerValue: string;
          promptHistory: string[];
          previewUrl: string;
          contextPaths: string[];
          patchDrafts: Record<string, string>;
          draftStatuses: Record<string, "draft" | "applied">;
          patchPlan: PatchPlanItem[];
          customRecipes: SavedCommandRecipe[];
          recentRuns: RecentRunEntry[];
          activeMode: WorkspaceMode;
          messages: ChatThreadStateMessage[];
        };
      }) => Promise<void>;
      load: (sessionId: string) => Promise<SessionBundle>;
      create: (payload?: { name?: string }) => Promise<SessionBundle>;
      rename: (payload: { sessionId: string; name: string }) => Promise<SessionBundle>;
      delete: (sessionId: string) => Promise<SessionBundle>;
    };
    workspace: {
      openProject: () => Promise<WorkspaceSnapshot | null>;
      getSnapshot: () => Promise<WorkspaceSnapshot | null>;
      readFile: (filePath: string) => Promise<WorkspaceFilePreview>;
      writeFile: (payload: {
        filePath: string;
        content: string;
      }) => Promise<WorkspaceFilePreview>;
    };
    git: {
      getStatus: () => Promise<GitStatusSummary>;
      stage: (payload?: { paths?: string[] }) => Promise<GitStatusSummary>;
      unstage: (payload?: { paths?: string[] }) => Promise<GitStatusSummary>;
      commit: (payload: { message: string }) => Promise<GitCommitResult>;
      switchBranch: (payload: { name: string }) => Promise<GitStatusSummary>;
      createBranch: (payload: { name: string }) => Promise<GitStatusSummary>;
      push: () => Promise<GitPushResult>;
    };
    preview: {
      capture: (url: string) => Promise<PreviewCapture>;
      detect: (urls: string[]) => Promise<PreviewReachability[]>;
      inspect: (urls: string[]) => Promise<PreviewInspection[]>;
      getLog: () => Promise<string>;
      getStatus: () => Promise<PreviewServerStatus>;
      onLog: (listener: (log: string) => void) => () => void;
      start: () => Promise<PreviewServerStatus>;
      stop: () => Promise<PreviewServerStatus>;
    };
    command: {
      getLog: () => Promise<string>;
      getStatus: () => Promise<WorkspaceCommandStatus>;
      onLog: (listener: (log: string) => void) => () => void;
      run: (command: string) => Promise<WorkspaceCommandStatus>;
      runRecipe: (payload: {
        commands: string[];
        label?: string;
      }) => Promise<WorkspaceCommandStatus>;
      stop: () => Promise<WorkspaceCommandStatus>;
    };
  };
}
