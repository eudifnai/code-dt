import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Code2,
  FileCode2,
  Folder,
  FolderOpen,
  GitBranch,
  Globe2,
  KeyRound,
  Play,
  RotateCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Terminal,
  X
} from "lucide-react";
import { CodePreview } from "./components/CodePreview";

type Language = "zh-CN" | "en-US";
type UiMessage = ChatThreadStateMessage;

type AppSessionState = {
  activeSessionId: string | null;
  isReady: boolean;
};

type TranslationKey =
  | "app_title"
  | "workspace"
  | "open_workspace"
  | "opening"
  | "settings"
  | "project_files"
  | "search_files"
  | "no_workspace"
  | "choose_workspace"
  | "file_preview"
  | "binary_file"
  | "cannot_preview_binary"
  | "mode"
  | "ask"
  | "build"
  | "fix"
  | "review"
  | "design"
  | "docs"
  | "context"
  | "add_context"
  | "remove_context"
  | "chat"
  | "send"
  | "stop"
  | "assistant"
  | "user"
  | "preview"
  | "open"
  | "capture"
  | "refresh"
  | "check"
  | "start_dev_server"
  | "stop_server"
  | "command"
  | "run"
  | "stop_command"
  | "git"
  | "refresh_git"
  | "stage_all"
  | "unstage_all"
  | "commit"
  | "push"
  | "commit_message"
  | "provider"
  | "provider_saved"
  | "save_settings"
  | "cancel"
  | "api_key"
  | "base_url"
  | "model"
  | "language"
  | "chinese"
  | "english"
  | "chat_placeholder"
  | "preview_placeholder"
  | "command_placeholder"
  | "welcome_user"
  | "welcome_assistant"
  | "workspace_path"
  | "preview_waiting"
  | "command_waiting"
  | "git_waiting"
  | "working_tree_clean"
  | "working_tree_dirty"
  | "staged"
  | "modified"
  | "untracked"
  | "deleted"
  | "conflicts"
  | "latest_commit"
  | "selected_file"
  | "thinking"
  | "request_failed";

const translations: Record<Language, Record<TranslationKey, string>> = {
  "zh-CN": {
    app_title: "CodeDT",
    workspace: "工作区",
    open_workspace: "打开工作区",
    opening: "处理中...",
    settings: "设置",
    project_files: "项目文件",
    search_files: "搜索文件",
    no_workspace: "还没有打开任何工作区。",
    choose_workspace: "请先打开一个本地项目目录。",
    file_preview: "文件预览",
    binary_file: "二进制文件",
    cannot_preview_binary: "这个文件不能按文本方式预览。",
    mode: "模式",
    ask: "问答",
    build: "构建",
    fix: "修复",
    review: "审查",
    design: "设计",
    docs: "文档",
    context: "上下文",
    add_context: "加入上下文",
    remove_context: "移出上下文",
    chat: "对话",
    send: "发送",
    stop: "停止",
    assistant: "CodeDT 助手",
    user: "用户",
    preview: "预览",
    open: "打开",
    capture: "截图",
    refresh: "刷新",
    check: "检查",
    start_dev_server: "启动开发服务",
    stop_server: "停止服务",
    command: "工作区命令",
    run: "运行",
    stop_command: "停止命令",
    git: "Git",
    refresh_git: "刷新 Git",
    stage_all: "全部暂存",
    unstage_all: "取消全部暂存",
    commit: "提交",
    push: "推送",
    commit_message: "提交说明",
    provider: "模型提供方",
    provider_saved: "模型设置已保存。",
    save_settings: "保存设置",
    cancel: "取消",
    api_key: "API Key",
    base_url: "接口地址",
    model: "模型",
    language: "语言",
    chinese: "中文",
    english: "English",
    chat_placeholder: "输入你的请求，开始和 CodeDT 一起工作...",
    preview_placeholder: "127.0.0.1:5173",
    command_placeholder: "npm run lint",
    welcome_user: "继续把 CodeDT 打造成一个真正可用的 AI 编程工作台。",
    welcome_assistant: "本地工作台已经就绪。先打开工作区或配置模型，我们就能继续推进。",
    workspace_path: "工作区路径",
    preview_waiting: "打开一个 localhost 地址后，这里会显示实时预览。",
    command_waiting: "在这里运行命令，用于验证、构建或测试项目。",
    git_waiting: "打开工作区后，这里会显示仓库状态。",
    working_tree_clean: "工作树干净",
    working_tree_dirty: "工作树有改动",
    staged: "已暂存",
    modified: "已修改",
    untracked: "未跟踪",
    deleted: "已删除",
    conflicts: "冲突",
    latest_commit: "最近提交",
    selected_file: "当前文件",
    thinking: "思考中...",
    request_failed: "请求失败"
  },
  "en-US": {
    app_title: "CodeDT",
    workspace: "Workspace",
    open_workspace: "Open Workspace",
    opening: "Working...",
    settings: "Settings",
    project_files: "Project Files",
    search_files: "Search Files",
    no_workspace: "No workspace opened yet.",
    choose_workspace: "Open a local project directory first.",
    file_preview: "File Preview",
    binary_file: "Binary File",
    cannot_preview_binary: "This file cannot be previewed as text.",
    mode: "Mode",
    ask: "Ask",
    build: "Build",
    fix: "Fix",
    review: "Review",
    design: "Design",
    docs: "Docs",
    context: "Context",
    add_context: "Add Context",
    remove_context: "Remove Context",
    chat: "Chat",
    send: "Send",
    stop: "Stop",
    assistant: "CodeDT Assistant",
    user: "User",
    preview: "Preview",
    open: "Open",
    capture: "Capture",
    refresh: "Refresh",
    check: "Check",
    start_dev_server: "Start Dev Server",
    stop_server: "Stop Server",
    command: "Workspace Command",
    run: "Run",
    stop_command: "Stop Command",
    git: "Git",
    refresh_git: "Refresh Git",
    stage_all: "Stage All",
    unstage_all: "Unstage All",
    commit: "Commit",
    push: "Push",
    commit_message: "Commit Message",
    provider: "Model Provider",
    provider_saved: "Provider settings saved.",
    save_settings: "Save Settings",
    cancel: "Cancel",
    api_key: "API Key",
    base_url: "Base URL",
    model: "Model",
    language: "Language",
    chinese: "中文",
    english: "English",
    chat_placeholder: "Type your request and start working with CodeDT...",
    preview_placeholder: "127.0.0.1:5173",
    command_placeholder: "npm run lint",
    welcome_user: "Keep turning CodeDT into a truly usable AI coding workspace.",
    welcome_assistant:
      "The local workspace is ready. Open a workspace or configure a model provider and we can keep moving.",
    workspace_path: "Workspace Path",
    preview_waiting: "Open a localhost target and the live preview will appear here.",
    command_waiting: "Run commands here to verify, build, or test the project.",
    git_waiting: "Git status will appear here after you open a workspace.",
    working_tree_clean: "Working tree clean",
    working_tree_dirty: "Working tree has changes",
    staged: "Staged",
    modified: "Modified",
    untracked: "Untracked",
    deleted: "Deleted",
    conflicts: "Conflicts",
    latest_commit: "Latest Commit",
    selected_file: "Selected File",
    thinking: "Thinking...",
    request_failed: "Request failed"
  }
};

const modeOrder: WorkspaceMode[] = ["Ask", "Build", "Fix", "Review", "Design", "Docs"];

const defaultProvider: ProviderSettings = {
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  apiKey: ""
};

function getStoredLanguage(): Language {
  const stored = globalThis.localStorage?.getItem("codedt-language");
  return stored === "en-US" ? "en-US" : "zh-CN";
}

function modeLabel(language: Language, mode: WorkspaceMode): string {
  const keyMap: Record<WorkspaceMode, TranslationKey> = {
    Ask: "ask",
    Build: "build",
    Fix: "fix",
    Review: "review",
    Design: "design",
    Docs: "docs"
  };

  return translations[language][keyMap[mode]];
}

function countFiles(nodes: WorkspaceTreeNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === "file") {
      return count + 1;
    }

    return count + countFiles(node.children ?? []);
  }, 0);
}

function filterTree(nodes: WorkspaceTreeNode[], query: string): WorkspaceTreeNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return nodes;
  }

  return nodes.flatMap<WorkspaceTreeNode>((node) => {
    const matches = node.name.toLowerCase().includes(normalized) || node.path.toLowerCase().includes(normalized);
    if (node.type === "file") {
      return matches ? [node] : [];
    }

    const children = filterTree(node.children ?? [], query);
    if (matches || children.length > 0) {
      return [{ ...node, children }];
    }

    return [];
  });
}

function normalizePreviewUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `http://${value}`;
}

function formatRuntimeState(language: Language, state: "idle" | "running" | "error" | "starting"): string {
  if (language === "zh-CN") {
    if (state === "idle") return "空闲";
    if (state === "running") return "运行中";
    if (state === "starting") return "启动中";
    return "需要处理";
  }

  if (state === "idle") return "Idle";
  if (state === "running") return "Running";
  if (state === "starting") return "Starting";
  return "Needs Attention";
}

function formatGitSummary(language: Language, status: GitStatusSummary | null, t: (key: TranslationKey) => string): string {
  if (!status) {
    return t("git_waiting");
  }

  if (!status.isRepo) {
    return language === "zh-CN" ? "当前工作区不在 Git 仓库中。" : "This workspace is not inside a Git repository.";
  }

  return status.hasChanges ? t("working_tree_dirty") : t("working_tree_clean");
}

function translateRuntimeMessage(language: Language, message: string): string {
  if (language !== "zh-CN") {
    return message;
  }

  const replacements: Array<[string, string]> = [
    ["Provider API key is not configured.", "还没有配置 Provider API Key。"],
    ["Provider response did not include assistant content.", "模型响应里没有返回助手内容。"],
    ["Provider request failed", "模型请求失败"],
    ["Provider stream failed", "模型流式请求失败"],
    ["Open the workspace in Electron.", "请在 Electron 中打开工作区。"],
    ["CodeDT could not open that workspace.", "CodeDT 无法打开这个工作区。"],
    ["CodeDT could not read that file.", "CodeDT 无法读取这个文件。"],
    ["CodeDT could not read git status.", "CodeDT 无法读取 Git 状态。"],
    ["Commit failed.", "提交失败。"],
    ["Push failed.", "推送失败。"],
    ["Preview is reachable at", "预览地址已可访问："],
    ["The current preview URL is not online yet.", "当前预览地址还没有在线。"],
    ["CodeDT skipped preview because this file appears to be binary.", "CodeDT 已跳过预览，因为这个文件看起来是二进制文件。"],
    ["File is outside the current workspace.", "文件不在当前工作区内。"],
    ["Selected path is not a file.", "所选路径不是文件。"],
    ["No workspace is open.", "当前还没有打开工作区。"],
    ["Command cannot be empty.", "命令不能为空。"],
    ["No supported package script was found for preview startup.", "没有找到可用于启动预览的 package 脚本。"],
    ["Git is not available in this environment.", "当前环境里无法使用 Git。"],
    ["This workspace is not inside a git repository.", "当前工作区不在 Git 仓库中。"],
    ["Open a workspace before staging git changes.", "请先打开工作区，再暂存 Git 改动。"],
    ["Open a workspace before unstaging git changes.", "请先打开工作区，再取消暂存 Git 改动。"],
    ["Open a workspace before committing git changes.", "请先打开工作区，再提交 Git 改动。"],
    ["Open a workspace before switching branches.", "请先打开工作区，再切换分支。"],
    ["Open a workspace before creating a branch.", "请先打开工作区，再创建分支。"],
    ["Open a workspace before pushing a branch.", "请先打开工作区，再推送分支。"],
    ["Commit message cannot be empty.", "提交说明不能为空。"],
    ["Stage at least one file before committing.", "提交前请至少暂存一个文件。"],
    ["Branch name cannot be empty.", "分支名不能为空。"],
    ["CodeDT could not determine the current branch.", "CodeDT 无法识别当前分支。"],
    ["No git remote is configured for this repository.", "这个仓库还没有配置 Git 远程地址。"],
    ["Unknown streaming error.", "流式请求出现未知错误。"]
  ];

  for (const [source, target] of replacements) {
    if (message.includes(source)) {
      return message.replace(source, target);
    }
  }

  return message;
}

function buildInitialMessages(language: Language): UiMessage[] {
  return [
    {
      id: "welcome-user",
      role: "user",
      content: translations[language].welcome_user
    },
    {
      id: "welcome-assistant",
      role: "assistant",
      content: translations[language].welcome_assistant
    }
  ];
}

function providerOptionLabel(language: Language, provider: ProviderSettings["provider"]): string {
  if (provider === "deepseek") {
    return language === "zh-CN" ? "DeepSeek" : "DeepSeek";
  }

  return language === "zh-CN" ? "OpenAI 兼容接口" : "OpenAI Compatible";
}

function buildContextMessage(files: WorkspaceFilePreview[], language: Language, mode: WorkspaceMode): ChatMessage | null {
  if (files.length === 0) {
    return null;
  }

  const header =
    language === "zh-CN"
      ? `当前模式：${modeLabel(language, mode)}。以下文件由用户显式附加为上下文。`
      : `Current mode: ${modeLabel(language, mode)}. The user explicitly attached these files as context.`;

  const content = files
    .map((file) => [`Path: ${file.path}`, "```", file.content, "```"].join("\n"))
    .join("\n\n");

  return {
    role: "system",
    content: `${header}\n\n${content}`
  };
}

function renderTree(
  nodes: WorkspaceTreeNode[],
  selectedPath: string | null,
  onSelect: (node: WorkspaceTreeNode) => void,
  depth = 0
): ReactNode {
  return nodes.map((node) => {
    const isDirectory = node.type === "directory";
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.id}>
        <button
          className={`file-item ${isSelected ? "active" : ""}`}
          onClick={() => {
            onSelect(node);
          }}
          style={{ paddingLeft: 10 + depth * 14 }}
          type="button"
        >
          {isDirectory ? <Folder size={16} /> : <FileCode2 size={16} />}
          <span title={node.path}>{node.name}</span>
        </button>
        {isDirectory && node.children?.length ? renderTree(node.children, selectedPath, onSelect, depth + 1) : null}
      </div>
    );
  });
}

function SettingsDialog({
  language,
  open,
  settings,
  isSaving,
  message,
  onClose,
  onSave
}: {
  language: Language;
  open: boolean;
  settings: ProviderSettings;
  isSaving: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
}) {
  const t = (key: TranslationKey) => translations[language][key];
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t("provider")}</span>
            <h2>{t("settings")}</h2>
          </div>
          <button className="icon-button" aria-label={t("cancel")} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="provider-toggle" aria-label={t("provider")}>
          <button
            className={draft.provider === "deepseek" ? "active" : ""}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                provider: "deepseek",
                baseUrl: "https://api.deepseek.com",
                model: current.model || "deepseek-chat"
              }));
            }}
            type="button"
          >
            {providerOptionLabel(language, "deepseek")}
          </button>
          <button
            className={draft.provider === "openai-compatible" ? "active" : ""}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                provider: "openai-compatible",
                baseUrl: current.baseUrl || "https://api.openai.com/v1",
                model: current.model || "gpt-4.1"
              }));
            }}
            type="button"
          >
            {providerOptionLabel(language, "openai-compatible")}
          </button>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>{t("base_url")}</span>
            <input
              value={draft.baseUrl}
              onChange={(event) => {
                setDraft((current) => ({ ...current, baseUrl: event.target.value }));
              }}
            />
          </label>
          <label className="settings-field">
            <span>{t("model")}</span>
            <input
              value={draft.model}
              onChange={(event) => {
                setDraft((current) => ({ ...current, model: event.target.value }));
              }}
            />
          </label>
          <label className="settings-field settings-field-wide">
            <span>{t("api_key")}</span>
            <div className="key-input">
              <KeyRound size={17} />
              <input
                type="password"
                value={draft.apiKey}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, apiKey: event.target.value }));
                }}
              />
            </div>
          </label>
        </div>

        {message ? <p className="panel-note">{message}</p> : null}

        <div className="settings-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            {t("cancel")}
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => {
              onSave(draft);
            }}
            type="button"
          >
            <Save size={16} />
            {isSaving ? t("opening") : t("save_settings")}
          </button>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage());
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(defaultProvider);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFilePreview | null>(null);
  const [contextFiles, setContextFiles] = useState<WorkspaceFilePreview[]>([]);
  const [fileSearch, setFileSearch] = useState("");
  const [mode, setMode] = useState<WorkspaceMode>("Build");
  const [messages, setMessages] = useState<UiMessage[]>(() => buildInitialMessages(getStoredLanguage()));
  const [composer, setComposer] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [previewInput, setPreviewInput] = useState("127.0.0.1:5173");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewCapture, setPreviewCapture] = useState<PreviewCapture | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewServerStatus>({
    state: "idle",
    command: "",
    cwd: "",
    pid: null
  });
  const [isCheckingPreview, setIsCheckingPreview] = useState(false);
  const [isCapturingPreview, setIsCapturingPreview] = useState(false);
  const [workspaceCommand, setWorkspaceCommand] = useState("npm run lint");
  const [workspaceCommandStatus, setWorkspaceCommandStatus] = useState<WorkspaceCommandStatus>({
    state: "idle",
    command: "",
    cwd: "",
    pid: null
  });
  const [workspaceLog, setWorkspaceLog] = useState("");
  const [gitStatus, setGitStatus] = useState<GitStatusSummary | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [gitMessage, setGitMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [appSession, setAppSession] = useState<AppSessionState>({
    activeSessionId: null,
    isReady: false
  });

  const streamRequestsRef = useRef<Record<string, { kind: "chat" }>>({});
  const t = useCallback((key: TranslationKey) => translations[language][key], [language]);

  useEffect(() => {
    localStorage.setItem("codedt-language", language);
    void window.codedt?.settings?.saveUiLanguage?.(language);
  }, [language]);

  useEffect(() => {
    setMessages((current) => {
      if (
        current.length === 2 &&
        current[0]?.id === "welcome-user" &&
        current[1]?.id === "welcome-assistant"
      ) {
        return buildInitialMessages(language);
      }

      return current;
    });
  }, [language]);

  const filteredTree = useMemo(() => filterTree(workspace?.tree ?? [], fileSearch), [workspace, fileSearch]);
  const fileCount = useMemo(() => countFiles(filteredTree), [filteredTree]);
  const selectedIsContext = useMemo(
    () => Boolean(selectedFile && contextFiles.some((file) => file.path === selectedFile.path)),
    [contextFiles, selectedFile]
  );

  const loadSelectedFile = useCallback(
    async (filePath: string) => {
      if (!window.codedt?.workspace?.readFile) {
        return null;
      }

      setFileError(null);

      try {
        const preview = await window.codedt.workspace.readFile(filePath);
        setSelectedFile(preview);
        return preview;
      } catch {
      setFileError(translateRuntimeMessage(language, "CodeDT could not read that file."));
        return null;
      }
    },
    [language]
  );

  const refreshGitStatus = useCallback(async () => {
    if (!window.codedt?.git?.getStatus) {
      return;
    }

    try {
      const status = await window.codedt.git.getStatus();
      setGitStatus(status);
    } catch {
      setGitMessage(translateRuntimeMessage(language, "CodeDT could not read git status."));
    }
  }, [language]);

  useEffect(() => {
    const unsubscribeCommandLog = window.codedt?.command?.onLog?.((log) => {
      setWorkspaceLog(log);
    });
    const unsubscribePreviewLog = window.codedt?.preview?.onLog?.((log) => {
      setPreviewMessage(log);
    });
    const unsubscribeChatStream = window.codedt?.ai?.onChatStream?.((chunk) => {
      const meta = streamRequestsRef.current[chunk.requestId];
      if (!meta || meta.kind !== "chat") {
        return;
      }

      if (chunk.kind === "delta") {
        setMessages((current) =>
          current.map((message) =>
            message.id === chunk.requestId ? { ...message, content: `${message.content}${chunk.delta}` } : message
          )
        );
        return;
      }

      if (chunk.kind === "complete") {
        delete streamRequestsRef.current[chunk.requestId];
        setMessages((current) =>
          current.map((message) => (message.id === chunk.requestId ? { ...message, status: undefined } : message))
        );
        setActiveRequestId(null);
        setIsSending(false);
        return;
      }

      if (chunk.kind === "cancelled") {
        delete streamRequestsRef.current[chunk.requestId];
        setActiveRequestId(null);
        setIsSending(false);
        return;
      }

      if (chunk.kind === "error") {
        delete streamRequestsRef.current[chunk.requestId];
        setMessages((current) =>
          current.map((message) =>
            message.id === chunk.requestId ? { ...message, content: chunk.error, status: "failed" } : message
          )
        );
      setChatError(translateRuntimeMessage(language, chunk.error));
        setActiveRequestId(null);
        setIsSending(false);
      }
    });

    void (async () => {
      const provider = await window.codedt?.settings?.getProvider?.();
      if (provider) {
        setProviderSettings(provider);
      }

      const uiLanguage = await window.codedt?.settings?.getUiLanguage?.();
      if (uiLanguage) {
        setLanguage(uiLanguage);
      }

      const bundle = await window.codedt?.session?.get?.();
      if (bundle) {
        const session = bundle.session;
        setAppSession({ activeSessionId: bundle.activeSessionId, isReady: true });
        setWorkspace(session.workspace);
        setSelectedPath(session.selectedPath);
        setComposer(session.composerValue);
        setPreviewInput(session.previewUrl || "127.0.0.1:5173");
        setPreviewUrl(session.previewUrl || "");
        setMode(session.activeMode ?? "Build");
        setMessages(session.messages.length > 0 ? session.messages : buildInitialMessages(language));

        if (session.selectedPath) {
          await loadSelectedFile(session.selectedPath);
        }

        const workspaceApi = window.codedt?.workspace;
        if (session.contextPaths.length > 0 && workspaceApi?.readFile) {
          const restoredContext = await Promise.all(
            session.contextPaths.map(async (path) => {
              try {
                const file = await workspaceApi.readFile(path);
                return file.kind === "text" ? file : null;
              } catch {
                return null;
              }
            })
          );
          setContextFiles(restoredContext.filter((file): file is WorkspaceFilePreview => Boolean(file)));
        }
      } else {
        setAppSession((current) => ({ ...current, isReady: true }));
      }

      const commandStatus = await window.codedt?.command?.getStatus?.();
      if (commandStatus) {
        setWorkspaceCommandStatus(commandStatus);
      }

      const commandLog = await window.codedt?.command?.getLog?.();
      if (typeof commandLog === "string") {
        setWorkspaceLog(commandLog);
      }

      const currentPreviewStatus = await window.codedt?.preview?.getStatus?.();
      if (currentPreviewStatus) {
        setPreviewStatus(currentPreviewStatus);
      }

      await refreshGitStatus();
    })();

    return () => {
      unsubscribeCommandLog?.();
      unsubscribePreviewLog?.();
      unsubscribeChatStream?.();
    };
  }, [language, loadSelectedFile, refreshGitStatus]);

  useEffect(() => {
    const sessionId = appSession.activeSessionId;
    const saveSession = window.codedt?.session?.save;

    if (!appSession.isReady || !sessionId || !saveSession) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveSession({
        sessionId,
        state: {
          workspacePath: workspace?.path ?? null,
          selectedPath,
          composerValue: composer,
          promptHistory: [],
          previewUrl,
          contextPaths: contextFiles.map((file) => file.path),
          patchDrafts: {},
          draftStatuses: {},
          patchPlan: [],
          customRecipes: [],
          recentRuns: [],
          activeMode: mode,
          messages
        }
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [appSession, composer, contextFiles, messages, mode, previewUrl, selectedPath, workspace]);

  async function handleOpenWorkspace() {
    if (!window.codedt?.workspace?.openProject) {
      setFileError(translateRuntimeMessage(language, "Open the workspace in Electron."));
      return;
    }

    setIsOpeningWorkspace(true);
    setFileError(null);

    try {
      const snapshot = await window.codedt.workspace.openProject();
      if (snapshot) {
        setWorkspace(snapshot);
        setSelectedPath(null);
        setSelectedFile(null);
        setContextFiles([]);
        await refreshGitStatus();
      }
    } catch {
      setFileError(translateRuntimeMessage(language, "CodeDT could not open that workspace."));
    } finally {
      setIsOpeningWorkspace(false);
    }
  }

  async function handleSelectNode(node: WorkspaceTreeNode) {
    if (node.type !== "file") {
      return;
    }

    setSelectedPath(node.path);
    await loadSelectedFile(node.path);
  }

  function toggleContextFile() {
    if (!selectedFile || selectedFile.kind !== "text") {
      return;
    }

    setContextFiles((current) => {
      const exists = current.some((file) => file.path === selectedFile.path);
      if (exists) {
        return current.filter((file) => file.path !== selectedFile.path);
      }

      return [...current, selectedFile];
    });
  }

  async function handleSend() {
    if (isSending) {
      if (activeRequestId && window.codedt?.ai?.cancelChatStream) {
        window.codedt.ai.cancelChatStream({ requestId: activeRequestId });
      }
      return;
    }

    const trimmed = composer.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };
    const assistantMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "sending"
    };

    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setComposer("");
    setChatError(null);
    setIsSending(true);

    const contextMessage = buildContextMessage(contextFiles, language, mode);
    const payload = {
      messages: [
        ...(contextMessage ? [contextMessage] : []),
        ...nextMessages
          .filter((message) => message.id !== assistantMessage.id)
          .map(({ role, content }) => ({ role, content }))
      ]
    };

    try {
      if (window.codedt?.ai?.streamChat) {
        streamRequestsRef.current[assistantMessage.id] = { kind: "chat" };
        setActiveRequestId(assistantMessage.id);
        window.codedt.ai.streamChat({
          requestId: assistantMessage.id,
          request: payload
        });
        return;
      }

      const response = await window.codedt?.ai?.chat?.(payload);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: response?.content ?? "",
                status: undefined
              }
            : message
        )
      );
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: t("request_failed"),
                status: "failed"
              }
            : message
        )
      );
      setChatError(t("request_failed"));
    } finally {
      setIsSending(false);
      setActiveRequestId(null);
    }
  }

  function openPreview() {
    const normalized = normalizePreviewUrl(previewInput);
    setPreviewUrl(normalized);
    setPreviewCapture(null);
  }

  async function checkPreview() {
    if (!window.codedt?.preview?.detect || !previewInput.trim()) {
      return;
    }

    setIsCheckingPreview(true);

    try {
      const normalized = normalizePreviewUrl(previewInput);
      const [result] = await window.codedt.preview.detect([normalized]);
      setPreviewMessage(
        result?.online
          ? translateRuntimeMessage(language, `Preview is reachable at ${normalized}`)
          : translateRuntimeMessage(language, "The current preview URL is not online yet.")
      );
    } finally {
      setIsCheckingPreview(false);
    }
  }

  async function startPreviewServer() {
    if (!window.codedt?.preview?.start) {
      return;
    }

    const status = await window.codedt.preview.start();
    setPreviewStatus(status);
  }

  async function stopPreviewServer() {
    if (!window.codedt?.preview?.stop) {
      return;
    }

    const status = await window.codedt.preview.stop();
    setPreviewStatus(status);
  }

  async function capturePreview() {
    if (!previewUrl || !window.codedt?.preview?.capture) {
      return;
    }

    setIsCapturingPreview(true);

    try {
      const capture = await window.codedt.preview.capture(previewUrl);
      setPreviewCapture(capture);
    } finally {
      setIsCapturingPreview(false);
    }
  }

  async function runCommand() {
    if (!window.codedt?.command?.run) {
      return;
    }

    const status = await window.codedt.command.run(workspaceCommand);
    setWorkspaceCommandStatus(status);
  }

  async function stopCommand() {
    if (!window.codedt?.command?.stop) {
      return;
    }

    const status = await window.codedt.command.stop();
    setWorkspaceCommandStatus(status);
  }

  async function stageAll() {
    if (!window.codedt?.git?.stage) {
      return;
    }

    const status = await window.codedt.git.stage();
    setGitStatus(status);
  }

  async function unstageAll() {
    if (!window.codedt?.git?.unstage) {
      return;
    }

    const status = await window.codedt.git.unstage();
    setGitStatus(status);
  }

  async function commitChanges() {
    if (!window.codedt?.git?.commit || !commitMessage.trim()) {
      return;
    }

    try {
      const result = await window.codedt.git.commit({ message: commitMessage.trim() });
      setGitStatus(result.status);
      setGitMessage(result.commitSummary);
      setCommitMessage("");
    } catch {
      setGitMessage(translateRuntimeMessage(language, "Commit failed."));
    }
  }

  async function pushChanges() {
    if (!window.codedt?.git?.push) {
      return;
    }

    try {
      const result = await window.codedt.git.push();
      setGitStatus(result.status);
      setGitMessage(result.pushSummary);
    } catch {
      setGitMessage(translateRuntimeMessage(language, "Push failed."));
    }
  }

  async function saveSettings(nextSettings: ProviderSettings) {
    if (!window.codedt?.settings?.saveProvider) {
      return;
    }

    setIsSavingSettings(true);

    try {
      const saved = await window.codedt.settings.saveProvider(nextSettings);
      setProviderSettings(saved);
      setSettingsMessage(t("provider_saved"));
      setSettingsOpen(false);
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="project-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t("workspace")}</span>
            <h2>{workspace?.name ?? t("app_title")}</h2>
          </div>
          <div className="language-switch">
            <button
              className={`secondary-button language-button ${language === "zh-CN" ? "is-active-filter" : ""}`}
              onClick={() => setLanguage("zh-CN")}
              type="button"
            >
              {t("chinese")}
            </button>
            <button
              className={`secondary-button language-button ${language === "en-US" ? "is-active-filter" : ""}`}
              onClick={() => setLanguage("en-US")}
              type="button"
            >
              {t("english")}
            </button>
            <button className="icon-button" aria-label={t("settings")} onClick={() => setSettingsOpen(true)} type="button">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {workspace ? (
          <div className="workspace-meta" title={workspace.path}>
            {t("workspace_path")}: {workspace.path}
          </div>
        ) : (
          <p className="panel-note">{t("choose_workspace")}</p>
        )}

        <button className="primary-button" disabled={isOpeningWorkspace} onClick={handleOpenWorkspace} type="button">
          <FolderOpen size={18} />
          {isOpeningWorkspace ? t("opening") : t("open_workspace")}
        </button>

        {fileError ? <p className="error-note">{fileError}</p> : null}

        <label className="search-box">
          <Search size={16} />
          <input
            placeholder={t("search_files")}
            value={fileSearch}
            onChange={(event) => {
              setFileSearch(event.target.value);
            }}
          />
        </label>

        <section className="panel-section file-tree-section">
          <div className="section-title">
            <span>{t("project_files")}</span>
            <span>{fileCount}</span>
          </div>
          <div className="file-list">
            {workspace ? (
              renderTree(filteredTree, selectedPath, handleSelectNode)
            ) : (
              <div className="empty-state">
                <Folder size={22} />
                <p>{t("no_workspace")}</p>
              </div>
            )}
          </div>
        </section>

        <section className="git-summary">
          <div>
            <GitBranch size={17} />
            <span>{t("git")}</span>
          </div>
          <strong>{formatGitSummary(language, gitStatus, t)}</strong>
        </section>

        {gitStatus?.isRepo ? (
          <section className="panel-section">
            <div className="command-suggestions">
              <button className="secondary-button" onClick={() => void refreshGitStatus()} type="button">
                {t("refresh_git")}
              </button>
              <button className="secondary-button" onClick={() => void stageAll()} type="button">
                {t("stage_all")}
              </button>
              <button className="secondary-button" onClick={() => void unstageAll()} type="button">
                {t("unstage_all")}
              </button>
            </div>
            <div className="git-summary-chips">
              <span className="session-chip subdued">
                {t("staged")} {gitStatus.staged}
              </span>
              <span className="session-chip subdued">
                {t("modified")} {gitStatus.modified}
              </span>
              <span className="session-chip subdued">
                {t("untracked")} {gitStatus.untracked}
              </span>
              <span className="session-chip subdued">
                {t("deleted")} {gitStatus.deleted}
              </span>
              {gitStatus.conflicts > 0 ? (
                <span className="session-chip">
                  {t("conflicts")} {gitStatus.conflicts}
                </span>
              ) : null}
            </div>
            <label className="session-name-field">
              <span>{t("commit_message")}</span>
              <input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} />
            </label>
            <div className="command-suggestions">
              <button className="secondary-button" onClick={() => void commitChanges()} type="button">
                {t("commit")}
              </button>
              <button className="secondary-button" onClick={() => void pushChanges()} type="button">
                {t("push")}
              </button>
            </div>
            {gitStatus.lastCommitSummary ? (
              <p className="panel-note">
                {t("latest_commit")}: {gitStatus.lastCommitSummary}
              </p>
            ) : null}
            {gitMessage ? <p className="panel-note">{gitMessage}</p> : null}
          </section>
        ) : null}
      </aside>

      <main className="task-panel">
        <div className="titlebar">
          <div>
            <span className="eyebrow">{t("chat")}</span>
            <h1>{t("app_title")}</h1>
          </div>
        </div>

        <div className="mode-strip">
          {modeOrder.map((item) => (
            <button
              className={`tool-button ${item === mode ? "active" : ""}`}
              key={item}
              onClick={() => setMode(item)}
              title={modeLabel(language, item)}
              type="button"
            >
              {modeLabel(language, item)}
            </button>
          ))}
        </div>

        <div className="chat-log">
          {messages.map((message) => (
            <div className={`message-card ${message.role}`} key={message.id}>
              <div className="message-meta">
                {message.role === "assistant" ? <Bot size={16} /> : <Sparkles size={16} />}
                <strong>{message.role === "assistant" ? t("assistant") : t("user")}</strong>
                {message.status === "sending" ? <span>{t("thinking")}</span> : null}
                {message.status === "failed" ? <span>{t("request_failed")}</span> : null}
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        {chatError ? <p className="error-note chat-error">{chatError}</p> : null}

        <div className="context-bar">
          <div className="section-title">
            <span>{t("context")}</span>
            <span>{contextFiles.length}</span>
          </div>
          <div className="context-files">
            {contextFiles.map((file) => (
              <span className="session-chip" key={file.path}>
                {file.name}
              </span>
            ))}
          </div>
        </div>

        <div className="composer">
          <button
            className="tool-button"
            disabled={!selectedFile || selectedFile.kind !== "text"}
            onClick={toggleContextFile}
            title={selectedIsContext ? t("remove_context") : t("add_context")}
            type="button"
          >
            <Code2 size={16} />
          </button>
          <input
            placeholder={t("chat_placeholder")}
            value={composer}
            onChange={(event) => {
              setComposer(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <button className="send-button" onClick={() => void handleSend()} type="button">
            {isSending ? t("stop") : t("send")}
          </button>
        </div>
      </main>

      <aside className="review-panel">
        <section className="review-card">
          <div className="section-title">
            <span>{t("file_preview")}</span>
            <span>{selectedFile ? selectedFile.name : t("selected_file")}</span>
          </div>
          {selectedFile ? (
            selectedFile.kind === "text" ? (
              <CodePreview filePath={selectedFile.path} value={selectedFile.content} />
            ) : (
              <div className="empty-state review-empty-state">
                <FileCode2 size={24} />
                <strong>{t("binary_file")}</strong>
                <p>{selectedFile.reason ? translateRuntimeMessage(language, selectedFile.reason) : t("cannot_preview_binary")}</p>
              </div>
            )
          ) : (
            <div className="empty-state review-empty-state">
              <FileCode2 size={24} />
              <strong>{t("file_preview")}</strong>
              <p>{t("choose_workspace")}</p>
            </div>
          )}
        </section>

        <section className="review-card">
          <div className="section-title">
            <span>{t("preview")}</span>
            <span>{formatRuntimeState(language, previewStatus.state)}</span>
          </div>
          <div className="preview-controls">
            <label className="preview-input">
              <Globe2 size={16} />
              <input
                placeholder={t("preview_placeholder")}
                value={previewInput}
                onChange={(event) => setPreviewInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    openPreview();
                  }
                }}
              />
            </label>
            <button className="secondary-button" onClick={openPreview} type="button">
              <Play size={16} />
              {t("open")}
            </button>
          </div>
          <div className="preview-toolbar">
            <button className="secondary-button" onClick={() => void checkPreview()} type="button">
              {isCheckingPreview ? t("opening") : t("check")}
            </button>
            <button className="secondary-button" onClick={() => void startPreviewServer()} type="button">
              {t("start_dev_server")}
            </button>
            <button className="secondary-button" onClick={() => void capturePreview()} type="button">
              {isCapturingPreview ? t("opening") : t("capture")}
            </button>
            <button className="secondary-button" onClick={openPreview} type="button">
              <RotateCw size={16} />
              {t("refresh")}
            </button>
            <button className="secondary-button" onClick={() => void stopPreviewServer()} type="button">
              {t("stop_server")}
            </button>
          </div>
          <div className="preview-box preview-frame-shell">
            {previewUrl ? (
              <iframe
                className="preview-frame"
                src={previewUrl}
                title={language === "zh-CN" ? "CodeDT 浏览器预览" : "CodeDT Browser Preview"}
              />
            ) : (
              <div className="empty-state review-empty-state">
                <Globe2 size={24} />
                <p>{t("preview_waiting")}</p>
              </div>
            )}
          </div>
          {previewCapture ? (
            <div className="preview-capture-card">
              <img alt="Preview capture" className="preview-capture-image" src={previewCapture.dataUrl} />
              <p className="panel-note">
                {previewCapture.width} x {previewCapture.height}
              </p>
            </div>
          ) : null}
          {previewMessage ? <p className="panel-note">{previewMessage}</p> : null}
        </section>

        <section className="review-card terminal-card">
          <div className="section-title">
            <span>{t("command")}</span>
            <span>{formatRuntimeState(language, workspaceCommandStatus.state)}</span>
          </div>
          <div className="preview-controls">
            <label className="preview-input">
              <Terminal size={16} />
              <input
                placeholder={t("command_placeholder")}
                value={workspaceCommand}
                onChange={(event) => setWorkspaceCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runCommand();
                  }
                }}
              />
            </label>
            <button className="secondary-button" onClick={() => void runCommand()} type="button">
              <Play size={16} />
              {t("run")}
            </button>
            <button className="secondary-button" onClick={() => void stopCommand()} type="button">
              {t("stop_command")}
            </button>
          </div>
          <div className="preview-server-note">
            <strong>{formatRuntimeState(language, workspaceCommandStatus.state)}</strong>
            <span>{workspaceCommandStatus.command || t("command_waiting")}</span>
          </div>
          <code className="terminal-output">{workspaceLog || t("command_waiting")}</code>
        </section>
      </aside>

      <SettingsDialog
        language={language}
        open={settingsOpen}
        settings={providerSettings}
        isSaving={isSavingSettings}
        message={settingsMessage}
        onClose={() => setSettingsOpen(false)}
        onSave={(nextSettings) => {
          void saveSettings(nextSettings);
        }}
      />
    </div>
  );
}
