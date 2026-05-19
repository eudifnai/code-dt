import Editor from "@monaco-editor/react";

const extensionLanguageMap: Record<string, string> = {
  ".c": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".css": "css",
  ".go": "go",
  ".html": "html",
  ".java": "java",
  ".js": "javascript",
  ".json": "json",
  ".jsx": "javascript",
  ".md": "markdown",
  ".mjs": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".rs": "rust",
  ".scss": "scss",
  ".sh": "shell",
  ".sql": "sql",
  ".svg": "xml",
  ".toml": "ini",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".txt": "plaintext",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yaml"
};

function detectLanguage(filePath: string) {
  const lowerPath = filePath.toLowerCase();
  const extensionMatch = lowerPath.match(/(\.[^.\\/]+)$/);
  if (!extensionMatch) {
    return "plaintext";
  }

  return extensionLanguageMap[extensionMatch[1]] ?? "plaintext";
}

export function CodePreview({
  value,
  filePath
}: {
  value: string;
  filePath: string;
}) {
  return (
    <div className="monaco-shell">
      <Editor
        height="430px"
        language={detectLanguage(filePath)}
        options={{
          automaticLayout: true,
          contextmenu: false,
          fontFamily: "Cascadia Code, Fira Code, ui-monospace, monospace",
          fontLigatures: true,
          fontSize: 12,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          overviewRulerBorder: false,
          padding: { top: 12, bottom: 12 },
          readOnly: true,
          renderLineHighlight: "gutter",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          wordWrap: "on"
        }}
        path={filePath}
        theme="vs-dark"
        value={value}
      />
    </div>
  );
}
