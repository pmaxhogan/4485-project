import { app, BrowserWindow, Menu } from "electron";
import "./handlers.ts";
import {
  checkAndSetupNeo4j,
  launchNeo4j,
  stopNeo4j,
  neo4jProcess,
} from "./neo4jStartup.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkConnectionStatus } from "./neo4j.ts";

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.APP_ROOT) {
  throw new Error(
    `APP_ROOT environment variable is required : ${process.env.APP_ROOT}`,
  );
}

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

//neo4j constants

process.env.VITE_PUBLIC =
  VITE_DEV_SERVER_URL ?
    path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

async function checkNeo() {
  if (!(await checkConnectionStatus())) {
    await checkAndSetupNeo4j();
    await launchNeo4j();
  }
}

let win: BrowserWindow | null;

function openWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    width: 900,
    height: 860,
    minWidth: 860,
    minHeight: 860,
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // uncomment to open devtools on startup
  // win?.webContents.openDevTools();
}

Menu.setApplicationMenu(null);

const neoOnly = process.argv.slice(1).includes("--neo-only");

if (neoOnly) {
  checkNeo().then(() => process.exit(0));
} else {
  // quit when all windows are closed
  app.on("window-all-closed", async () => {
    if (neo4jProcess && !neo4jProcess.killed && neo4jProcess.pid) {
      await stopNeo4j(neo4jProcess.pid);
    }
    app.quit();
    win = null;
  });

  app.whenReady().then(async () => {
    openWindow();

    await checkNeo();
  });

  process.on("message", (msg) => {
    if (msg === "electron-vite&type=hot-reload") {
      for (const win of BrowserWindow.getAllWindows()) {
        console.log("reloading window", win);
        // Hot reload preload scripts
        win.webContents.reload();
      }
    }
  });
}

export { win };
