import { describe, it, expect, vi } from "vitest";

vi.mock("electron", async () => {
  const actual = await vi.importActual<typeof import("electron")>("electron");
  return {
    ...actual,
    contextBridge: {
      exposeInMainWorld: vi.fn(),
    },
    ipcRenderer: {
      on: vi.fn(),
      off: vi.fn(),
      send: vi.fn(),
      invoke: vi.fn(),
    },
  };
});

describe("preload", () => {
  it("should expose in main world", async () => {
    const electron = await import("electron");

    expect(
      vi.mocked(electron.contextBridge.exposeInMainWorld),
    ).not.toHaveBeenCalled();

    await import("../preload.ts");

    expect(
      vi.mocked(electron.contextBridge.exposeInMainWorld),
    ).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(electron.contextBridge.exposeInMainWorld).mock
      .calls;
    expect(calls.length).toBe(2);

    const [[ipcName, ipc], [apiName, api]] = calls;
    expect(ipcName).toBe("ipcRenderer");
    expect(apiName).toBe("electronAPI");
    console.log(ipc, api);

    ipc.on();
    ipc.off();
    ipc.send();
    ipc.invoke();

    api.invoke();
    api.launchNeo4j();
    api.onNeo4jStatus();
    api.onNeo4jLog();
    api.onNeo4jError();
    api.onNeo4jExit();
    api.runTestQuery();
    api.openFileDialog();
    api.importExcel();
    api.checkNeo4jConnection();
    api.fetchSchemaData();
    api.fetchSummaryCounts();
    api.saveImageToExcel();
  });
});
