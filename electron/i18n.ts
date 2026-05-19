export type AppLanguage = "zh-CN" | "en-US";

export type TranslationKey =
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

export const uiTranslations: Record<AppLanguage, Record<TranslationKey, string>> = {
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

export type UiMode = "Ask" | "Build" | "Fix" | "Review" | "Design" | "Docs";

const modeKeyMap: Record<UiMode, TranslationKey> = {
  Ask: "ask",
  Build: "build",
  Fix: "fix",
  Review: "review",
  Design: "design",
  Docs: "docs"
};

export function translateUi(language: AppLanguage, key: TranslationKey): string {
  return uiTranslations[language][key];
}

export function getModeLabel(language: AppLanguage, mode: UiMode): string {
  return translateUi(language, modeKeyMap[mode]);
}

export function getProviderLabel(
  language: AppLanguage,
  provider: "deepseek" | "openai-compatible"
): string {
  if (provider === "deepseek") {
    return "DeepSeek";
  }

  return language === "zh-CN" ? "OpenAI 兼容接口" : "OpenAI Compatible";
}

export function localizeByLanguage(language: AppLanguage, zh: string, en: string): string {
  return language === "zh-CN" ? zh : en;
}

export function buildDefaultSessionName(index: number, language: AppLanguage): string {
  return language === "zh-CN" ? `会话 ${index}` : `Session ${index}`;
}

export type MainMessageKey =
  | "git_open_stage"
  | "git_open_unstage"
  | "git_open_commit"
  | "git_open_switch_branch"
  | "git_open_create_branch"
  | "git_open_push_branch"
  | "git_unavailable"
  | "git_not_repo"
  | "git_commit_message_required"
  | "git_commit_stage_required"
  | "git_branch_name_required"
  | "git_branch_unknown"
  | "git_remote_missing"
  | "git_commit_created"
  | "workspace_open_required"
  | "command_empty"
  | "provider_api_key_missing"
  | "provider_missing_content"
  | "workspace_file_outside"
  | "workspace_path_not_file"
  | "preview_start_script_missing"
  | "open_workspace_dialog_title"
  | "binary_preview_skipped"
  | "stream_unknown_error";

const mainTranslations: Record<AppLanguage, Record<MainMessageKey, string>> = {
  "zh-CN": {
    git_open_stage: "请先打开工作区，再暂存 Git 改动。",
    git_open_unstage: "请先打开工作区，再取消暂存 Git 改动。",
    git_open_commit: "请先打开工作区，再提交 Git 改动。",
    git_open_switch_branch: "请先打开工作区，再切换分支。",
    git_open_create_branch: "请先打开工作区，再创建分支。",
    git_open_push_branch: "请先打开工作区，再推送分支。",
    git_unavailable: "当前环境里无法使用 Git。",
    git_not_repo: "当前工作区不在 Git 仓库中。",
    git_commit_message_required: "提交说明不能为空。",
    git_commit_stage_required: "提交前请至少暂存一个文件。",
    git_branch_name_required: "分支名不能为空。",
    git_branch_unknown: "CodeDT 无法识别当前分支。",
    git_remote_missing: "这个仓库还没有配置 Git 远程地址。",
    git_commit_created: "已创建提交",
    workspace_open_required: "当前还没有打开工作区。",
    command_empty: "命令不能为空。",
    provider_api_key_missing: "还没有配置 Provider API Key。",
    provider_missing_content: "模型响应里没有返回助手内容。",
    workspace_file_outside: "文件不在当前工作区内。",
    workspace_path_not_file: "所选路径不是文件。",
    preview_start_script_missing: "没有找到可用于启动预览的 package 脚本。",
    open_workspace_dialog_title: "打开 CodeDT 工作区",
    binary_preview_skipped: "CodeDT 已跳过预览，因为这个文件看起来是二进制文件。",
    stream_unknown_error: "流式请求出现未知错误。"
  },
  "en-US": {
    git_open_stage: "Open a workspace before staging git changes.",
    git_open_unstage: "Open a workspace before unstaging git changes.",
    git_open_commit: "Open a workspace before committing git changes.",
    git_open_switch_branch: "Open a workspace before switching branches.",
    git_open_create_branch: "Open a workspace before creating a branch.",
    git_open_push_branch: "Open a workspace before pushing a branch.",
    git_unavailable: "Git is not available in this environment.",
    git_not_repo: "This workspace is not inside a git repository.",
    git_commit_message_required: "Commit message cannot be empty.",
    git_commit_stage_required: "Stage at least one file before committing.",
    git_branch_name_required: "Branch name cannot be empty.",
    git_branch_unknown: "CodeDT could not determine the current branch.",
    git_remote_missing: "No git remote is configured for this repository.",
    git_commit_created: "Commit created",
    workspace_open_required: "No workspace is open.",
    command_empty: "Command cannot be empty.",
    provider_api_key_missing: "Provider API key is not configured.",
    provider_missing_content: "Provider response did not include assistant content.",
    workspace_file_outside: "File is outside the current workspace.",
    workspace_path_not_file: "Selected path is not a file.",
    preview_start_script_missing: "No supported package script was found for preview startup.",
    open_workspace_dialog_title: "Open CodeDT Workspace",
    binary_preview_skipped: "CodeDT skipped preview because this file appears to be binary.",
    stream_unknown_error: "Unknown streaming error."
  }
};

export function translateMain(language: AppLanguage, key: MainMessageKey): string {
  return mainTranslations[language][key];
}

export function formatGitPushSummary(
  language: AppLanguage,
  branch: string,
  upstreamBranch: string | null
): string {
  if (upstreamBranch) {
    return language === "zh-CN"
      ? `已将 ${branch} 推送到 ${upstreamBranch}。`
      : `Pushed ${branch} to ${upstreamBranch}.`;
  }

  return language === "zh-CN" ? `已推送 ${branch}。` : `Pushed ${branch}.`;
}
