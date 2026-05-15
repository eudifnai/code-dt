/// <reference types="vite/client" />

type WorkspaceTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

type WorkspaceSnapshot = {
  name: string;
  path: string;
  tree: WorkspaceTreeNode[];
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

interface Window {
  codedt?: {
    appName: string;
    version: string;
    settings: {
      getProvider: () => Promise<ProviderSettings>;
      saveProvider: (settings: ProviderSettings) => Promise<ProviderSettings>;
    };
    workspace: {
      openProject: () => Promise<WorkspaceSnapshot | null>;
      readFile: (filePath: string) => Promise<WorkspaceFilePreview>;
    };
  };
}
