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
import { getModeLabel, getProviderLabel, translateUi, type AppLanguage, type TranslationKey } from "../electron/i18n";
import { CodePreview } from "./components/CodePreview";

type Language = AppLanguage;
type UiMessage = ChatThreadStateMessage;

type AppSessionState = {
  activeSessionId: string | null;
  isReady: boolean;
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
  return getModeLabel(language, mode);
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
    ["Provider API key is not configured.", "尚未配置 Provider API Key。"],
    ["Provider response did not include assistant content.", "模型响应中没有返回助手内容。"],
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
      content: translateUi(language, "welcome_user")
    },
    {
      id: "welcome-assistant",
      role: "assistant",
      content: translateUi(language, "welcome_assistant")
    }
  ];
}

function providerOptionLabel(language: Language, provider: ProviderSettings["provider"]): string {
  return getProviderLabel(language, provider);
}

function providerHelperText(language: Language, provider: ProviderSettings["provider"]): string {
  if (provider === "deepseek") {
    return language === "zh-CN"
      ? "适合把 DeepSeek 作为默认主力模型，通常只需要填写 API Key。"
      : "Best when DeepSeek is your default primary model. Usually only the API key is required.";
  }

  return language === "zh-CN"
    ? "用于接入 OpenAI 兼容接口，自定义 Base URL 和模型名会更常见。"
    : "Use this for OpenAI-compatible endpoints where custom base URLs and model names are common.";
}

function providerFieldPlaceholder(
  provider: ProviderSettings["provider"],
  field: "baseUrl" | "model" | "apiKey"
): string {
  if (field === "apiKey") {
    return provider === "deepseek" ? "sk-..." : "api-key";
  }

  if (field === "baseUrl") {
    return provider === "deepseek" ? "https://api.deepseek.com" : "https://api.openai.com/v1";
  }

  return provider === "deepseek" ? "deepseek-chat" : "gpt-4.1";
}

function desktopOnlyMessage(
  language: Language,
  capability: "workspace" | "settings" | "preview" | "command" | "git"
): string {
  if (language === "zh-CN") {
    if (capability === "workspace") return "请在 Electron 桌面版中打开工作区。";
    if (capability === "settings") return "请在 Electron 桌面版中保存模型设置。";
    if (capability === "preview") return "请在 Electron 桌面版中使用预览检测、启动和截图功能。";
    if (capability === "command") return "请在 Electron 桌面版中运行工作区命令。";
    return "请在 Electron 桌面版中使用 Git 操作。";
  }

  if (capability === "workspace") return "Open a workspace in the Electron desktop app.";
  if (capability === "settings") return "Save provider settings in the Electron desktop app.";
  if (capability === "preview") return "Use preview checks, dev server controls, and captures in the Electron desktop app.";
  if (capability === "command") return "Run workspace commands in the Electron desktop app.";
  return "Use Git actions in the Electron desktop app.";
}

function desktopOnlyBadgeLabel(language: Language): string {
  return language === "zh-CN" ? "仅桌面版" : "Desktop only";
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
  showDesktopBadge,
  message,
  onClose,
  onSave
}: {
  language: Language;
  open: boolean;
  settings: ProviderSettings;
  isSaving: boolean;
  showDesktopBadge: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
}) {
  const t = (key: TranslationKey) => translateUi(language, key);
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

        {showDesktopBadge ? <p className="capability-note">{desktopOnlyBadgeLabel(language)}</p> : null}

        <div className="provider-toggle" aria-label={t("provider")}>
          <button
            className={draft.provider === "deepseek" ? "active" : ""}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                provider: "deepseek",
                baseUrl: "https://api.deepseek.com",
                model: "deepseek-chat"
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
                baseUrl: "https://api.openai.com/v1",
                model: "gpt-4.1"
              }));
            }}
            type="button"
          >
            {providerOptionLabel(language, "openai-compatible")}
          </button>
        </div>

        <p className="settings-helper-note">{providerHelperText(language, draft.provider)}</p>

        <div className="settings-grid">
          <label className="settings-field">
            <span>{t("base_url")}</span>
            <input
              placeholder={providerFieldPlaceholder(draft.provider, "baseUrl")}
              value={draft.baseUrl}
              onChange={(event) => {
                setDraft((current) => ({ ...current, baseUrl: event.target.value }));
              }}
            />
          </label>
          <label className="settings-field">
            <span>{t("model")}</span>
            <input
              placeholder={providerFieldPlaceholder(draft.provider, "model")}
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
                placeholder={providerFieldPlaceholder(draft.provider, "apiKey")}
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
  const [languageFeedback, setLanguageFeedback] = useState<string | null>(null);
  const [desktopFeedback, setDesktopFeedback] = useState<string | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
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
  const languageFeedbackTimeoutRef = useRef<number | null>(null);
  const desktopFeedbackTimeoutRef = useRef<number | null>(null);
  const settingsFeedbackTimeoutRef = useRef<number | null>(null);
  const t = useCallback((key: TranslationKey) => translateUi(language, key), [language]);
  const hasDesktopWorkspaceApi = Boolean(window.codedt?.workspace?.openProject);
  const hasDesktopPreviewApi = Boolean(window.codedt?.preview?.start);
  const hasDesktopCommandApi = Boolean(window.codedt?.command?.run);
  const hasDesktopGitApi = Boolean(window.codedt?.git?.stage);
  const hasDesktopSettingsApi = Boolean(window.codedt?.settings?.saveProvider);

  useEffect(() => {
    return () => {
      if (languageFeedbackTimeoutRef.current) {
        window.clearTimeout(languageFeedbackTimeoutRef.current);
      }
      if (desktopFeedbackTimeoutRef.current) {
        window.clearTimeout(desktopFeedbackTimeoutRef.current);
      }
      if (settingsFeedbackTimeoutRef.current) {
        window.clearTimeout(settingsFeedbackTimeoutRef.current);
      }
    };
  }, []);

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

  function handleLanguageChange(nextLanguage: Language) {
    if (nextLanguage === language) {
      return;
    }

    if (languageFeedbackTimeoutRef.current) {
      window.clearTimeout(languageFeedbackTimeoutRef.current);
    }

    setLanguage(nextLanguage);
    setLanguageFeedback(
      nextLanguage === "zh-CN"
        ? "已切换到中文，并会记住这个选择。"
        : "Switched to English and saved your preference."
    );
    languageFeedbackTimeoutRef.current = window.setTimeout(() => {
      setLanguageFeedback(null);
      languageFeedbackTimeoutRef.current = null;
    }, 2400);
  }

  function showDesktopOnlyNotice(
    capability: "workspace" | "settings" | "preview" | "command" | "git",
    options?: {
      setInlineMessage?: (message: string) => void;
    }
  ) {
    const message = desktopOnlyMessage(language, capability);
    options?.setInlineMessage?.(message);
    setDesktopFeedback(message);
    if (desktopFeedbackTimeoutRef.current) {
      window.clearTimeout(desktopFeedbackTimeoutRef.current);
    }
    desktopFeedbackTimeoutRef.current = window.setTimeout(() => {
      setDesktopFeedback(null);
      desktopFeedbackTimeoutRef.current = null;
    }, 2800);
  }

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
      showDesktopOnlyNotice("workspace", {
        setInlineMessage: setFileError
      });
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
      if (!window.codedt?.preview?.detect) {
        showDesktopOnlyNotice("preview", {
          setInlineMessage: setPreviewMessage
        });
      }
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
      showDesktopOnlyNotice("preview", {
        setInlineMessage: setPreviewMessage
      });
      return;
    }

    const status = await window.codedt.preview.start();
    setPreviewStatus(status);
  }

  async function stopPreviewServer() {
    if (!window.codedt?.preview?.stop) {
      showDesktopOnlyNotice("preview", {
        setInlineMessage: setPreviewMessage
      });
      return;
    }

    const status = await window.codedt.preview.stop();
    setPreviewStatus(status);
  }

  async function capturePreview() {
    if (!previewUrl || !window.codedt?.preview?.capture) {
      if (!window.codedt?.preview?.capture) {
        showDesktopOnlyNotice("preview", {
          setInlineMessage: setPreviewMessage
        });
      }
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
      showDesktopOnlyNotice("command", {
        setInlineMessage: setPreviewMessage
      });
      return;
    }

    const status = await window.codedt.command.run(workspaceCommand);
    setWorkspaceCommandStatus(status);
  }

  async function stopCommand() {
    if (!window.codedt?.command?.stop) {
      showDesktopOnlyNotice("command", {
        setInlineMessage: setPreviewMessage
      });
      return;
    }

    const status = await window.codedt.command.stop();
    setWorkspaceCommandStatus(status);
  }

  async function stageAll() {
    if (!window.codedt?.git?.stage) {
      showDesktopOnlyNotice("git", {
        setInlineMessage: setGitMessage
      });
      return;
    }

    const status = await window.codedt.git.stage();
    setGitStatus(status);
  }

  async function unstageAll() {
    if (!window.codedt?.git?.unstage) {
      showDesktopOnlyNotice("git", {
        setInlineMessage: setGitMessage
      });
      return;
    }

    const status = await window.codedt.git.unstage();
    setGitStatus(status);
  }

  async function commitChanges() {
    if (!window.codedt?.git?.commit) {
      showDesktopOnlyNotice("git", {
        setInlineMessage: setGitMessage
      });
      return;
    }

    if (!commitMessage.trim()) {
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
      showDesktopOnlyNotice("git", {
        setInlineMessage: setGitMessage
      });
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
      const fallbackMessage = desktopOnlyMessage(language, "settings");
      setSettingsMessage(fallbackMessage);
      showDesktopOnlyNotice("settings");
      setSettingsFeedback(fallbackMessage);
      if (settingsFeedbackTimeoutRef.current) {
        window.clearTimeout(settingsFeedbackTimeoutRef.current);
      }
      settingsFeedbackTimeoutRef.current = window.setTimeout(() => {
        setSettingsFeedback(null);
        settingsFeedbackTimeoutRef.current = null;
      }, 2600);
      return;
    }

    setIsSavingSettings(true);

    try {
      const saved = await window.codedt.settings.saveProvider(nextSettings);
      setProviderSettings(saved);
      setSettingsMessage(t("provider_saved"));
      setSettingsOpen(false);
      if (settingsFeedbackTimeoutRef.current) {
        window.clearTimeout(settingsFeedbackTimeoutRef.current);
      }
      setSettingsFeedback(
        language === "zh-CN"
          ? `已保存 ${providerOptionLabel(language, saved.provider)} 设置。`
          : `${providerOptionLabel(language, saved.provider)} settings saved.`
      );
      settingsFeedbackTimeoutRef.current = window.setTimeout(() => {
        setSettingsFeedback(null);
        settingsFeedbackTimeoutRef.current = null;
      }, 2600);
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
              onClick={() => handleLanguageChange("zh-CN")}
              type="button"
            >
              {t("chinese")}
            </button>
            <button
              className={`secondary-button language-button ${language === "en-US" ? "is-active-filter" : ""}`}
              onClick={() => handleLanguageChange("en-US")}
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

        {languageFeedback ? <p className="panel-note language-feedback">{languageFeedback}</p> : null}
        {desktopFeedback ? <p className="panel-note desktop-feedback">{desktopFeedback}</p> : null}
        {settingsFeedback ? <p className="panel-note settings-feedback">{settingsFeedback}</p> : null}

        <button className="primary-button" disabled={isOpeningWorkspace} onClick={handleOpenWorkspace} type="button">
          <FolderOpen size={18} />
          {isOpeningWorkspace ? t("opening") : t("open_workspace")}
          {!hasDesktopWorkspaceApi ? <span className="capability-badge">{desktopOnlyBadgeLabel(language)}</span> : null}
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
            {!hasDesktopGitApi ? <span className="capability-badge">{desktopOnlyBadgeLabel(language)}</span> : null}
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
            <span className="section-title-meta">
              {!hasDesktopPreviewApi ? <span className="capability-badge">{desktopOnlyBadgeLabel(language)}</span> : null}
              <span>{formatRuntimeState(language, previewStatus.state)}</span>
            </span>
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
            <span className="section-title-meta">
              {!hasDesktopCommandApi ? <span className="capability-badge">{desktopOnlyBadgeLabel(language)}</span> : null}
              <span>{formatRuntimeState(language, workspaceCommandStatus.state)}</span>
            </span>
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
        showDesktopBadge={!hasDesktopSettingsApi}
        message={settingsMessage}
        onClose={() => setSettingsOpen(false)}
        onSave={(nextSettings) => {
          void saveSettings(nextSettings);
        }}
      />
    </div>
  );
}

