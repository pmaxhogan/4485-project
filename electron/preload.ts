import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
//security isn't an issue currently
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  // You can expose other APTs you need here.
  // ...
})

//Expose API to renderer process - ZT
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  launchNeo4j: () => ipcRenderer.invoke('launch-neo4j'),
  onNeo4jLog: (callback: (data: any) => void) =>
    ipcRenderer.on('neo4j-log', (_event, data) => callback(data)),
  onNeo4jError: (callback: (data: any) => void) =>
    ipcRenderer.on('neo4j-error', (_event, data) => callback(data)),
  onNeo4jExit: (callback: (code: any) => void) =>
    ipcRenderer.on('neo4j-exit', (_event, code) => callback(code)),
  runTestQuery: () => ipcRenderer.invoke('run-test-query'),
  checkNeo4jConnection: () => ipcRenderer.invoke('check-neo4j-connection'),
});

