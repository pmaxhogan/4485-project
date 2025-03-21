import { ipcRenderer, contextBridge, IpcRendererEvent } from "electron";
import { Record } from "neo4j-driver";

// --------- Expose some API to the Renderer process ---------
//security isn't an issue currently
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  // You can expose other APTs you need here.
  // ...
});

//Expose API to renderer process - ZT
contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),

  launchNeo4j: (): Promise<string> => ipcRenderer.invoke("launch-neo4j"),

  onNeo4jLog: (callback: (data: string) => void) =>
    ipcRenderer.on("neo4j-log", (_event: IpcRendererEvent, data: string) =>
      callback(data),
    ),

  onNeo4jError: (callback: (data: string) => void) =>
    ipcRenderer.on("neo4j-error", (_event: IpcRendererEvent, data: string) =>
      callback(data),
    ),

  onNeo4jExit: (callback: (code: number) => void) =>
    ipcRenderer.on("neo4j-exit", (_event: IpcRendererEvent, code: number) =>
      callback(code),
    ),

  runTestQuery: (): Promise<Record[]> => ipcRenderer.invoke("run-test-query"),

  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  importExcel: (filePath: string) =>
    ipcRenderer.invoke("import-excel", filePath),

  checkNeo4jConnection: (): Promise<string> =>
    ipcRenderer.invoke("check-neo4j-connection"),

  fetchSchemaData: () => ipcRenderer.invoke("fetchSchemaData"),
  
  saveImageToExcel: (imageDataUrl: string) =>
    ipcRenderer.invoke("save-image-to-excel", imageDataUrl),

});
