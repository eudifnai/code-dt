import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("codedt", {
  appName: "CodeDT",
  version: "0.2.0",
  settings: {
    getProvider: () => ipcRenderer.invoke("settings:getProvider"),
    saveProvider: (settings: unknown) =>
      ipcRenderer.invoke("settings:saveProvider", settings)
  },
  workspace: {
    openProject: () => ipcRenderer.invoke("workspace:open"),
    readFile: (filePath: string) => ipcRenderer.invoke("workspace:readFile", filePath)
  }
});
