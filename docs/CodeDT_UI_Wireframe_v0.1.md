# CodeDT UI 线框与模块骨架 v0.1

## 1. 设计目标

CodeDT 第一版界面应服务于一个核心任务：让用户清楚地看到 AI 如何理解项目、执行任务、修改文件、验证结果，并在关键节点做出确认。

界面不做营销式首页，也不做复杂 IDE 克隆。第一屏就是工作台。

## 2. 主界面结构

第一版采用三栏布局：

```text
┌──────────────────┬────────────────────────────────────┬──────────────────────────────┐
│ Project Panel    │ Task Panel                         │ Review Panel                 │
│                  │                                    │                              │
│ Workspace        │ Mode Tabs                          │ Tabs                         │
│ File Tree        │ Conversation                       │ - Diff                       │
│ Search           │ Agent Steps                        │ - File Preview               │
│ Git Summary      │ Tool Calls                         │ - Terminal                   │
│                  │ Composer                           │ - Browser Preview            │
└──────────────────┴────────────────────────────────────┴──────────────────────────────┘
```

### 2.1 左侧：Project Panel

职责：承载项目上下文入口。

核心模块：

- 工作区名称与路径。
- 打开项目按钮。
- 文件树。
- 文件搜索。
- Git 状态摘要。
- 项目记忆入口。

第一版状态：

- 未打开项目。
- 正在加载项目。
- 项目加载完成。
- 项目读取失败。

### 2.2 中间：Task Panel

职责：承载用户与 Agent 的主要协作过程。

核心模块：

- 模式切换：Ask / Build / Fix / Review / Design / Docs。
- 对话消息流。
- 当前任务状态。
- Agent 执行步骤。
- 工具调用摘要。
- 输入框。
- 文件引用入口。
- 发送、停止、继续按钮。

第一版状态：

- 空会话。
- 等待用户输入。
- Agent 正在规划。
- Agent 正在读取文件。
- Agent 正在生成修改。
- 等待用户确认 diff。
- Agent 正在运行命令。
- 任务完成。
- 任务失败。

### 2.3 右侧：Review Panel

职责：承载可验证信息和高信任交互。

核心模块：

- Diff 视图。
- 文件预览。
- 终端输出。
- 浏览器预览。
- 任务日志。

右侧面板应使用 tabs 或分段控制切换，不要同时堆满所有内容。

## 3. 初始屏幕

用户首次打开 CodeDT 时，直接进入工作台布局。

左侧：

- 显示 `Open Project` 主操作。
- 显示最近项目列表。

中间：

- 显示简洁输入框。
- 提示用户打开项目后开始任务。

右侧：

- 显示空状态。
- 提示 diff、终端和预览会出现在这里。

## 4. 任务模式

### 4.1 Ask

用途：解释代码、回答架构问题、分析项目结构。

默认行为：

- 优先读取相关文件。
- 不修改文件。
- 不运行高风险命令。

### 4.2 Build

用途：实现新功能。

默认行为：

- 先生成简短计划。
- 搜索并读取相关文件。
- 修改文件。
- 展示 diff。
- 询问是否运行验证命令。

### 4.3 Fix

用途：修复错误、测试失败、构建失败。

默认行为：

- 优先分析错误日志。
- 定位相关文件。
- 修改最小必要范围。
- 运行对应验证。

### 4.4 Review

用途：审查当前改动或指定文件。

默认行为：

- 优先读取 git diff。
- 按严重程度列出问题。
- 不主动修改文件，除非用户要求。

### 4.5 Design

用途：前端 UI、交互、视觉体验优化。

默认行为：

- 读取相关组件和样式。
- 使用浏览器预览辅助验证。
- 后续可接入截图分析。

### 4.6 Docs

用途：生成 README、设计文档、注释、提交说明。

默认行为：

- 读取项目结构和相关文件。
- 修改文档前展示 diff。

## 5. Diff 确认流程

文件修改默认不静默落地，采用确认流程：

```text
Agent 生成修改
      ↓
展示文件列表和 diff
      ↓
用户选择 Apply / Reject / Ask for changes
      ↓
应用后记录审计日志
      ↓
可继续运行验证
```

### 5.1 Diff 操作

- `Apply All`：应用全部变更。
- `Reject All`：拒绝全部变更。
- `Apply File`：应用单个文件变更。
- `Ask Changes`：要求 AI 根据反馈调整。

MVP 可以先实现 `Apply All` 和 `Reject All`，逐步扩展到文件级操作。

## 6. 命令执行面板

第一版命令执行可以分两阶段：

- v0.2：一次性命令执行，适合 `npm test`、`npm run build` 等。
- v0.3+：集成完整 PTY，支持交互式 dev server。

命令执行前需要展示：

- 命令内容。
- 工作目录。
- 风险等级。
- 执行原因。

## 7. 浏览器预览

MVP 内置轻量浏览器预览。

基础能力：

- 用户输入 URL，例如 `http://localhost:3000`。
- 在右侧面板内打开。
- 支持刷新。
- 支持返回和前进。
- 支持在外部浏览器打开。

暂缓能力：

- 自动识别 dev server 端口。
- 截图分析。
- DOM 检查。
- 自动点击测试。

## 8. 设置页

设置页第一版需要包含：

- 模型 Provider 管理。
- DeepSeek API Key。
- OpenAI-compatible Base URL 和 API Key。
- 默认模型选择。
- 命令执行权限偏好。
- 文件修改确认策略。
- 主题设置。

## 9. 导航结构

第一版可以采用顶部窗口栏 + 左侧项目栏：

- 顶部：应用标题、当前项目、设置入口。
- 左侧：项目文件与工作区。
- 中间：任务协作。
- 右侧：审查与预览。

不建议第一版引入复杂多页面路由。设置页可以使用 modal 或独立 view。

## 10. 关键组件清单

### 10.1 App Shell

- `MainWindow`
- `TitleBar`
- `WorkspaceLayout`
- `SettingsDialog`

### 10.2 Project

- `ProjectPanel`
- `OpenProjectButton`
- `FileTree`
- `FileSearch`
- `GitSummary`

### 10.3 Task

- `TaskPanel`
- `ModeTabs`
- `MessageList`
- `AgentStepList`
- `ToolCallItem`
- `Composer`

### 10.4 Review

- `ReviewPanel`
- `ReviewTabs`
- `DiffViewer`
- `FilePreview`
- `TerminalOutput`
- `BrowserPreview`

### 10.5 Settings

- `ProviderSettings`
- `ModelSelector`
- `ApiKeyField`
- `PermissionSettings`
- `ThemeSettings`

## 11. MVP 交互优先级

第一优先级：

- 打开项目。
- 显示文件树。
- 配置 DeepSeek。
- 发送对话。
- 显示流式回复。
- 展示 Agent 步骤。

第二优先级：

- 文件读取与引用。
- 生成 diff。
- 用户确认应用。
- 命令执行。

第三优先级：

- 浏览器预览。
- Git diff 审查。
- 项目记忆。
- 多 Provider 管理。

## 12. 后续设计问题

- 右侧 Review Panel 是否默认打开，还是在有 diff/终端/预览时展开？
- 文件树是否需要支持多选引用？
- 输入框文件引用使用 `@file` 语法，还是使用选择器？
- Diff 是否第一版就支持逐块接受？
- 设置页采用 modal，还是独立页面？

