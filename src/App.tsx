import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCode2,
  Folder,
  FolderOpen,
  GitBranch,
  Globe2,
  KeyRound,
  Play,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wand2,
  X
} from "lucide-react";

const modes = ["Ask", "Build", "Fix", "Review", "Design", "Docs"];

const steps = [
  {
    title: "Workspace bridge is ready",
    detail: "Electron can open a local directory and pass its file tree to React."
  },
  {
    title: "File preview is online",
    detail: "Selecting a file now reads its content through the Electron bridge."
  },
  {
    title: "Next slice",
    detail: "Add provider settings, persistent preferences, and file references for chat."
  }
];

type ProjectPanelProps = {
  workspace: WorkspaceSnapshot | null;
  selectedPath: string | null;
  isOpening: boolean;
  error: string | null;
  onOpenProject: () => void;
  onOpenSettings: () => void;
  onSelectFile: (node: WorkspaceTreeNode) => void;
};

function countFiles(nodes: WorkspaceTreeNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === "file") {
      return count + 1;
    }

    return count + countFiles(node.children ?? []);
  }, 0);
}

function FileTreeNode({
  node,
  selectedPath,
  onSelectFile,
  depth = 0
}: {
  node: WorkspaceTreeNode;
  selectedPath: string | null;
  onSelectFile: (node: WorkspaceTreeNode) => void;
  depth?: number;
}) {
  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        className={`file-item ${isSelected ? "active" : ""}`}
        onClick={() => {
          onSelectFile(node);
        }}
        style={{ paddingLeft: 10 + depth * 14 }}
      >
        {isDirectory ? <Folder size={16} /> : <FileCode2 size={16} />}
        <span title={node.path}>{node.name}</span>
      </button>
      {isDirectory && node.children && node.children.length > 0 ? (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              depth={depth + 1}
              key={child.id}
              node={child}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProjectPanel({
  workspace,
  selectedPath,
  isOpening,
  error,
  onOpenProject,
  onOpenSettings,
  onSelectFile
}: ProjectPanelProps) {
  const fileCount = useMemo(() => countFiles(workspace?.tree ?? []), [workspace]);
  const canOpenProject = Boolean(window.codedt?.workspace);

  return (
    <aside className="project-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h2>{workspace?.name ?? "CodeDT"}</h2>
        </div>
        <button className="icon-button" aria-label="Open settings" onClick={onOpenSettings}>
          <Settings size={18} />
        </button>
      </div>

      {workspace ? (
        <div className="workspace-meta" title={workspace.path}>
          {workspace.path}
        </div>
      ) : null}

      <button
        className="primary-button"
        disabled={!canOpenProject || isOpening}
        onClick={onOpenProject}
      >
        <FolderOpen size={18} />
        {isOpening ? "Opening..." : "Open Project"}
      </button>

      {!canOpenProject ? (
        <p className="panel-note">
          Open this app in Electron to choose local folders. The web preview shows
          the UI shell only.
        </p>
      ) : null}

      {error ? <p className="error-note">{error}</p> : null}

      <label className="search-box">
        <Search size={16} />
        <input placeholder="Search files" />
      </label>

      <section className="panel-section file-tree-section">
        <div className="section-title">
          <span>Files</span>
          <span>{fileCount}</span>
        </div>
        <div className="file-list">
          {workspace ? (
            workspace.tree.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
              />
            ))
          ) : (
            <div className="empty-state">
              <FolderOpen size={22} />
              <p>No workspace opened yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="git-summary">
        <div>
          <GitBranch size={17} />
          <span>Git status</span>
        </div>
        <strong>Not initialized</strong>
      </section>
    </aside>
  );
}

const defaultProviderSettings: ProviderSettings = {
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  apiKey: ""
};

function SettingsDialog({
  isOpen,
  providerSettings,
  isSaving,
  settingsMessage,
  onClose,
  onSave
}: {
  isOpen: boolean;
  providerSettings: ProviderSettings;
  isSaving: boolean;
  settingsMessage: string | null;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
}) {
  const [draft, setDraft] = useState(providerSettings);

  useEffect(() => {
    if (isOpen) {
      setDraft(providerSettings);
    }
  }, [isOpen, providerSettings]);

  if (!isOpen) {
    return null;
  }

  function updateDraft<K extends keyof ProviderSettings>(
    key: K,
    value: ProviderSettings[K]
  ) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function selectProvider(provider: ProviderSettings["provider"]) {
    if (provider === "deepseek") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        provider,
        baseUrl: "https://api.deepseek.com",
        model: currentDraft.model || "deepseek-chat"
      }));
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      provider,
      baseUrl: currentDraft.baseUrl || "https://api.openai.com/v1",
      model: currentDraft.model || "gpt-4.1"
    }));
  }

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true">
        <header className="settings-header">
          <div>
            <span className="eyebrow">Model provider</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" aria-label="Close settings" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="provider-toggle" aria-label="Provider">
          <button
            className={draft.provider === "deepseek" ? "active" : ""}
            onClick={() => {
              selectProvider("deepseek");
            }}
          >
            <Sparkles size={17} />
            DeepSeek
          </button>
          <button
            className={draft.provider === "openai-compatible" ? "active" : ""}
            onClick={() => {
              selectProvider("openai-compatible");
            }}
          >
            <Server size={17} />
            OpenAI-compatible
          </button>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Base URL</span>
            <input
              value={draft.baseUrl}
              onChange={(event) => {
                updateDraft("baseUrl", event.target.value);
              }}
              placeholder="https://api.deepseek.com"
            />
          </label>

          <label className="settings-field">
            <span>Model</span>
            <input
              value={draft.model}
              onChange={(event) => {
                updateDraft("model", event.target.value);
              }}
              placeholder="deepseek-chat"
            />
          </label>

          <label className="settings-field settings-field-wide">
            <span>API Key</span>
            <div className="key-input">
              <KeyRound size={17} />
              <input
                type="password"
                value={draft.apiKey}
                onChange={(event) => {
                  updateDraft("apiKey", event.target.value);
                }}
                placeholder="sk-..."
              />
            </div>
          </label>
        </div>

        <p className="panel-note">
          Keys are stored locally in the Electron app data directory. CodeDT uses
          Electron safe storage when available.
        </p>

        {settingsMessage ? <p className="settings-message">{settingsMessage}</p> : null}

        <footer className="settings-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => {
              onSave(draft);
            }}
          >
            <Save size={17} />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function TaskPanel({ workspace }: { workspace: WorkspaceSnapshot | null }) {
  return (
    <main className="task-panel">
      <header className="titlebar">
        <div>
          <span className="eyebrow">DeepSeek-first AI workspace</span>
          <h1>CodeDT</h1>
        </div>
        <div className="status-pill">
          <ShieldCheck size={16} />
          Local-first
        </div>
      </header>

      <nav className="mode-tabs" aria-label="Task modes">
        {modes.map((mode) => (
          <button className={mode === "Build" ? "active" : ""} key={mode}>
            {mode}
          </button>
        ))}
      </nav>

      <section className="conversation">
        <article className="message user-message">
          <div className="avatar">T</div>
          <div>
            <span>User</span>
            <p>Continue with the next implementation slice for CodeDT.</p>
          </div>
        </article>

        <article className="message assistant-message">
          <div className="avatar">
            <Bot size={18} />
          </div>
          <div>
            <span>CodeDT Agent</span>
            <p>
              I will connect the Electron shell to the project panel so CodeDT can
              open a real local workspace and render its file tree.
            </p>
          </div>
        </article>

        <div className="agent-steps">
          {steps.map((step, index) => (
            <div className="step" key={step.title}>
              <CheckCircle2 size={18} />
              <div>
                <strong>
                  {index + 1}. {step.title}
                </strong>
                <p>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {workspace ? (
          <div className="workspace-callout">
            <strong>{workspace.name}</strong>
            <p>Workspace context is ready for future file reading and edits.</p>
          </div>
        ) : null}
      </section>

      <footer className="composer">
        <button className="tool-button" aria-label="Reference file">
          <Code2 size={18} />
        </button>
        <input placeholder="Ask CodeDT to build, fix, review, or explain..." />
        <button className="send-button">
          <Sparkles size={18} />
          Send
        </button>
      </footer>
    </main>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function ReviewPanel({
  selectedPath,
  filePreview,
  isReadingFile,
  fileError
}: {
  selectedPath: string | null;
  filePreview: WorkspaceFilePreview | null;
  isReadingFile: boolean;
  fileError: string | null;
}) {
  return (
    <aside className="review-panel">
      <div className="review-tabs">
        <button className="active">
          <Wand2 size={16} />
          Diff
        </button>
        <button>
          <Terminal size={16} />
          Terminal
        </button>
        <button>
          <Globe2 size={16} />
          Preview
        </button>
      </div>

      <section className="review-card">
        <div className="section-title">
          <span>File preview</span>
          <span>{filePreview ? formatBytes(filePreview.size) : "Workspace"}</span>
        </div>
        <div className="file-preview">
          {isReadingFile ? (
            <p className="diff-note">Reading selected file...</p>
          ) : fileError ? (
            <p className="error-note">{fileError}</p>
          ) : filePreview ? (
            <>
              <div className="file-preview-meta">
                <strong>{filePreview.name}</strong>
                <span title={filePreview.path}>{filePreview.path}</span>
              </div>
              {filePreview.truncated ? (
                <p className="panel-note">
                  Preview is limited to the first 512 KB of this file.
                </p>
              ) : null}
              <pre>
                <code>{filePreview.content}</code>
              </pre>
            </>
          ) : selectedPath ? (
            <p className="diff-note">Selected file is waiting for preview.</p>
          ) : (
            <p className="diff-note">
              Select a file from the project panel to prepare it for preview.
            </p>
          )}
        </div>
        <div className="review-actions">
          <button className="primary-button">
            <CheckCircle2 size={17} />
            Apply All
          </button>
          <button className="secondary-button">Reject</button>
        </div>
      </section>

      <section className="review-card">
        <div className="section-title">
          <span>Browser preview</span>
          <span>v0.2</span>
        </div>
        <div className="preview-box">
          <Globe2 size={34} />
          <p>Open a localhost URL here once the app can manage dev servers.</p>
          <button className="secondary-button">
            <Play size={16} />
            Open Preview
          </button>
        </div>
      </section>

      <section className="review-card terminal-card">
        <div className="section-title">
          <span>Command output</span>
          <ChevronRight size={16} />
        </div>
        <code>npm run dev</code>
      </section>
    </aside>
  );
}

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<WorkspaceFilePreview | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [providerSettings, setProviderSettings] = useState(defaultProviderSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.codedt?.settings) {
      return;
    }

    void window.codedt.settings.getProvider().then((settings) => {
      setProviderSettings(settings);
    });
  }, []);

  async function handleOpenProject() {
    if (!window.codedt?.workspace) {
      setError("Local workspace access is only available inside Electron.");
      return;
    }

    setIsOpening(true);
    setError(null);

    try {
      const snapshot = await window.codedt.workspace.openProject();
      if (snapshot) {
        setWorkspace(snapshot);
        setSelectedPath(null);
        setFilePreview(null);
        setFileError(null);
      }
    } catch {
      setError("CodeDT could not open that workspace.");
    } finally {
      setIsOpening(false);
    }
  }

  async function handleSelectFile(node: WorkspaceTreeNode) {
    if (node.type === "file") {
      setSelectedPath(node.path);
      setFilePreview(null);
      setFileError(null);

      if (!window.codedt?.workspace) {
        setFileError("File preview is only available inside Electron.");
        return;
      }

      setIsReadingFile(true);

      try {
        const preview = await window.codedt.workspace.readFile(node.path);
        setFilePreview(preview);
      } catch {
        setFileError("CodeDT could not read that file.");
      } finally {
        setIsReadingFile(false);
      }
    }
  }

  async function handleSaveSettings(settings: ProviderSettings) {
    if (!window.codedt?.settings) {
      setProviderSettings(settings);
      setSettingsMessage("Settings are only persisted inside Electron.");
      return;
    }

    setIsSavingSettings(true);
    setSettingsMessage(null);

    try {
      const savedSettings = await window.codedt.settings.saveProvider(settings);
      setProviderSettings(savedSettings);
      setSettingsMessage("Provider settings saved.");
    } catch {
      setSettingsMessage("CodeDT could not save provider settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="app-shell">
      <ProjectPanel
        error={error}
        isOpening={isOpening}
        onOpenProject={handleOpenProject}
        onOpenSettings={() => {
          setSettingsMessage(null);
          setIsSettingsOpen(true);
        }}
        onSelectFile={(node) => {
          void handleSelectFile(node);
        }}
        selectedPath={selectedPath}
        workspace={workspace}
      />
      <TaskPanel workspace={workspace} />
      <ReviewPanel
        fileError={fileError}
        filePreview={filePreview}
        isReadingFile={isReadingFile}
        selectedPath={selectedPath}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        isSaving={isSavingSettings}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        onSave={(settings) => {
          void handleSaveSettings(settings);
        }}
        providerSettings={providerSettings}
        settingsMessage={settingsMessage}
      />
    </div>
  );
}
