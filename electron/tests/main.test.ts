import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { App, BrowserWindow } from "electron";

let messageHandler: ((msg: string) => void) | undefined;

vi.mock("electron", async () => {
  const actual = await vi.importActual<typeof import("electron")>("electron");
  const FakeBW = vi.fn(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    webContents: { on: vi.fn(), send: vi.fn(), reload: vi.fn() },
  }));

  (FakeBW as unknown as typeof BrowserWindow).getAllWindows = vi.fn();

  return {
    ...actual,
    app: {
      on: vi.fn(),
      whenReady: vi.fn(() => Promise.resolve()),
      quit: vi.fn(),
    },
    BrowserWindow: FakeBW,
    ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn() },
  };
});

type MockedBrowserWindow = Mock<
  () => {
    loadURL: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
    webContents: {
      on: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      reload: ReturnType<typeof vi.fn>;
    };
  }
> & {
  getAllWindows: ReturnType<typeof vi.fn>;
};

vi.mock("../neo4jStartup", () => ({
  checkAndSetupNeo4j: vi.fn(),
  launchNeo4j: vi.fn(),
  stopNeo4j: vi.fn(),
  neo4jProcess: { killed: false, pid: 1234 },
}));

vi.mock("../neo4j", () => ({
  checkConnectionStatus: vi.fn(() => Promise.resolve(false)),
}));

import * as neo4jStartup from "../neo4jStartup";
import * as neo4j from "../neo4j";
import path from "node:path";

describe("main.ts", () => {
  let app: App;
  let BrowserWindow: MockedBrowserWindow;

  const OLD_ENV = process.env;

  beforeEach(async () => {
    vi.resetModules();
    BrowserWindow = (await import("electron"))
      .BrowserWindow as unknown as MockedBrowserWindow;
    messageHandler = undefined;
    vi.spyOn(process, "on").mockImplementation((event, handler) => {
      if (event === "message") {
        messageHandler = handler as (msg: string) => void;
      }
      return process;
    });

    process.env = { ...OLD_ENV };
    process.env.APP_ROOT = "/fake/root";
    delete process.env.VITE_DEV_SERVER_URL;

    const main = await import("../main");
    main; // eslint-disable-line

    const electron = await import("electron");
    app = electron.app;

    await Promise.resolve();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.clearAllMocks();
  });

  it("calls checkConnectionStatus and sets up Neo4j if disconnected", () => {
    expect(neo4j.checkConnectionStatus).toHaveBeenCalled();
    expect(neo4jStartup.checkAndSetupNeo4j).toHaveBeenCalled();
    expect(neo4jStartup.launchNeo4j).toHaveBeenCalled();
  });

  it("creates a BrowserWindow on app ready", () => {
    expect(BrowserWindow).toHaveBeenCalled();
    const win = BrowserWindow.mock.results[0].value;
    expect(win.webContents.on).toHaveBeenCalledWith(
      "did-finish-load",
      expect.any(Function),
    );
  });

  it("calls stopNeo4j and quits the app on window-all-closed", async () => {
    const calls = (app.on as Mock).mock.calls as [
      string,
      (...args: string[]) => void,
    ][];
    const handler = calls.find(([evt]) => evt === "window-all-closed")?.[1];
    expect(handler).toBeDefined();
    await handler!();
    expect(neo4jStartup.stopNeo4j).toHaveBeenCalledWith(1234);
    expect(app.quit).toHaveBeenCalled();
  });

  it("reloads all windows on message event", () => {
    const winInstance = BrowserWindow.mock.results[0].value;
    (BrowserWindow.getAllWindows as Mock).mockReturnValue([winInstance]);

    expect(messageHandler).toBeDefined();
    messageHandler!("electron-vite&type=hot-reload");

    expect(winInstance.webContents.reload).toHaveBeenCalled();
  });

  it("throws error if APP_ROOT is undefined", async () => {
    process.env = { ...process.env };
    (process.env as Record<string, string | undefined>).APP_ROOT = undefined;

    vi.resetModules();

    await expect(import("../main")).rejects.toThrow(
      "APP_ROOT environment variable is required",
    );
  });

  it("assigns VITE_PUBLIC based on VITE_DEV_SERVER_URL", async () => {
    process.env.VITE_DEV_SERVER_URL = "http://localhost:3000";
    const pathJoinSpy = vi.spyOn(path, "join");

    vi.resetModules();
    await import("../main");

    expect(pathJoinSpy).toHaveBeenCalledWith("/fake/root", "public");
  });

  it('sends "main-process-message" on did-finish-load', async () => {
    const winInstance = BrowserWindow.mock.results[0].value;

    // Ensure TypeScript knows the signature of `process.on`
    vi.spyOn(process, "on").mockImplementation(
      (
        event: Parameters<NodeJS.EventEmitter["on"]>[0], // event type inferred from the 'on' method
        handler: Parameters<NodeJS.EventEmitter["on"]>[1], // handler type inferred from the 'on' method
      ): NodeJS.Process => {
        if (event === "message") {
          messageHandler = handler as (msg: string) => void; // more specific typing for handler
        }
        return process;
      },
    );

    const didFinishHandler = winInstance.webContents.on.mock.calls.find(
      ([event]: [string]) => event === "did-finish-load",
    )?.[1] as (() => void) | undefined;

    expect(didFinishHandler).toBeDefined();
    didFinishHandler?.();

    expect(winInstance.webContents.send).toHaveBeenCalledWith(
      "main-process-message",
      expect.stringMatching(/\d{4}/), // matches a date-like string
    );
  });

  it("constructs preload path using __dirname", async () => {
    const pathJoinSpy = vi.spyOn(path, "join");

    vi.resetModules();
    await import("../main");

    const preloadPathCall = pathJoinSpy.mock.calls.find(
      ([, filename]) => filename === "preload.mjs",
    );
    expect(preloadPathCall).toBeDefined();
  });
});
