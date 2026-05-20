import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("codedt", {
  appName: "CodeDT",
  version: "0.2.0",
  ai: {
    chat: (request: unknown) => ipcRenderer.invoke("ai:chat", request),
    streamChat: (payload: unknown) => ipcRenderer.send("ai:chatStream", payload),
    cancelChatStream: (payload: unknown) => ipcRenderer.send("ai:cancelChatStream", payload),
    onChatStream: (listener: (chunk: unknown) => void) => {
      const wrappedListener = (_event: unknown, chunk: unknown) => {
        listener(chunk);
      };

      ipcRenderer.on("ai:chatStream", wrappedListener);
      return () => {
        ipcRenderer.removeListener("ai:chatStream", wrappedListener);
      };
    }
  },
  settings: {
    getProvider: () => ipcRenderer.invoke("settings:getProvider"),
    getUiLanguage: () => ipcRenderer.invoke("settings:getUiLanguage"),
    saveProvider: (settings: unknown) => ipcRenderer.invoke("settings:saveProvider", settings),
    saveUiLanguage: (language: string) => ipcRenderer.invoke("settings:saveUiLanguage", language)
  },
  session: {
    get: () => ipcRenderer.invoke("session:get"),
    save: (payload: unknown) => ipcRenderer.invoke("session:save", payload),
    load: (sessionId: string) => ipcRenderer.invoke("session:load", sessionId),
    create: (payload?: { name?: string }) => ipcRenderer.invoke("session:create", payload),
    rename: (payload: { sessionId: string; name: string }) =>
      ipcRenderer.invoke("session:rename", payload),
    delete: (sessionId: string) => ipcRenderer.invoke("session:delete", sessionId)
  },
  workspace: {
    openProject: () => ipcRenderer.invoke("workspace:open"),
    getSnapshot: () => ipcRenderer.invoke("workspace:getSnapshot"),
    readFile: (filePath: string) => ipcRenderer.invoke("workspace:readFile", filePath),
    writeFile: (payload: { filePath: string; content: string }) =>
      ipcRenderer.invoke("workspace:writeFile", payload)
  },
  git: {
    getStatus: () => ipcRenderer.invoke("git:getStatus"),
    stage: (payload?: { paths?: string[] }) => ipcRenderer.invoke("git:stage", payload),
    unstage: (payload?: { paths?: string[] }) => ipcRenderer.invoke("git:unstage", payload),
    commit: (payload: { message: string }) => ipcRenderer.invoke("git:commit", payload),
    switchBranch: (payload: { name: string }) => ipcRenderer.invoke("git:switchBranch", payload),
    createBranch: (payload: { name: string }) => ipcRenderer.invoke("git:createBranch", payload),
    push: () => ipcRenderer.invoke("git:push")
  },
  preview: {
    capture: (url: string) => ipcRenderer.invoke("preview:capture", url),
    detect: (urls: string[]) => ipcRenderer.invoke("preview:detect", urls),
    inspect: (urls: string[]) => ipcRenderer.invoke("preview:inspect", urls),
    getLog: () => ipcRenderer.invoke("preview:getLog"),
    getStatus: () => ipcRenderer.invoke("preview:getStatus"),
    onLog: (listener: (log: string) => void) => {
      const wrappedListener = (_event: unknown, log: string) => {
        listener(log);
      };

      ipcRenderer.on("preview:log", wrappedListener);
      return () => {
        ipcRenderer.removeListener("preview:log", wrappedListener);
      };
    },
    start: () => ipcRenderer.invoke("preview:start"),
    stop: () => ipcRenderer.invoke("preview:stop")
  },
  command: {
    getLog: () => ipcRenderer.invoke("command:getLog"),
    getStatus: () => ipcRenderer.invoke("command:getStatus"),
    onLog: (listener: (log: string) => void) => {
      const wrappedListener = (_event: unknown, log: string) => {
        listener(log);
      };

      ipcRenderer.on("command:log", wrappedListener);
      return () => {
        ipcRenderer.removeListener("command:log", wrappedListener);
      };
    },
    run: (command: string) => ipcRenderer.invoke("command:run", command),
    runRecipe: (payload: { commands: string[]; label?: string }) =>
      ipcRenderer.invoke("command:runRecipe", payload),
    stop: () => ipcRenderer.invoke("command:stop")
  }
});
