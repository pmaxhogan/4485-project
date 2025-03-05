import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ChildProcess, spawn, execFile } from "node:child_process"; //needed for neo4j stuff -ZT
import { once } from "events"; //needed for avoiding direct promises - ZT
import fs from "fs"; //needed for neo4j stuff - ZT
import path from "node:path";
import { connectToNeo4j, runTestQuery } from "../src/services/neo4j.ts";
import { indentInline } from "./util.ts";

const asyncExecFile = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

//neo4j constants
const neo4jFolderPath = path.join(__dirname, "..", "neo4j");
const script1 = path.join(__dirname, "..", "download-neo4j.ps1");
const script2 = path.join(__dirname, "..", "config-neo4j.ps1");
const startNeo = path.join(neo4jFolderPath, "bin/neo4j.ps1");

process.env.VITE_PUBLIC =
  VITE_DEV_SERVER_URL ?
    path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let neo4jProcess: ChildProcess | null; //tracks the process of our LITTLE CHILD - ZT

//runs the scripts if needed - ZT
async function runPowerShellScript(scriptPath: string) {
  console.log(`Running PowerShell script: ${scriptPath}`);

  const process = spawn("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
  ]);

  process.stdout.on("data", (data) => {
    console.log(`PowerShell output: ${indentInline(data.toString())}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`PowerShell error: ${indentInline(data.toString())}`);
  });

  const [code] = await once(process, "close");

  console.log(`PowerShell script exited with code ${code}`);

  if (code !== 0) {
    throw new Error(`Process exited with code ${code}`);
  }
}

//sees if the scripts need to be ran -ZT
async function checkAndSetupNeo4j() {
  if (!fs.existsSync(neo4jFolderPath)) {
    console.log("Neo4j folder not found. Running setup scripts...");

    try {
      await runPowerShellScript(script1);
      await runPowerShellScript(script2);
      console.log("Neo4j setup completed successfully.");
    } catch (error) {
      console.error(
        "Error setting up Neo4j:",
        error && indentInline(error.toString()),
      );
    }
  } else {
    console.log(`Detected neo4j at ${neo4jFolderPath}`);
  }
}

//launches database and handles errors - ZT
async function launchNeo4j() {
  console.log("Starting Neo4j in hidden mode...");

  if (neo4jProcess) {
    console.log("Neo4j is already running.");
    return "Neo4j is already running.";
  }

  const cmd = "powershell";
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-NoLogo",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    startNeo,
    "console",
  ];

  console.log("Spawning", cmd, ...args);

  neo4jProcess = spawn(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  // output feed
  neo4jProcess?.stdout?.on("data", (data) => {
    console.log(`Neo4j Output: ${indentInline(data.toString())}`);
    win?.webContents.send("neo4j-log", data.toString().trim());

    if (
      data
        .toString()
        .includes(
          "org.neo4j.io.locker.FileLockException: Lock file has been locked by another process",
        )
    ) {
      console.error(
        '\n\nNeo4j is already running!\n\nMaybe try:\ntaskkill /fi "IMAGENAME eq java.exe" /f\n\n',
      );
      win?.webContents.send("neo4j-error", data.toString().trim());
    }
  });

  neo4jProcess?.stderr?.on("data", (data) => {
    console.error(`Neo4j Error: ${indentInline(data.toString().trim())}`);
    win?.webContents.send("neo4j-error", data.toString().trim());
  });

  neo4jProcess.on("error", (error) => {
    console.error(`Failed to start Neo4j: ${indentInline(error.message)}`);
    throw new Error(error.message);
  });

  neo4jProcess.on("spawn", () => {
    console.log(`Waiting on Neo4j db ${neo4jProcess?.pid} to start`);
  });

  neo4jProcess.on("exit", (code, signal) => {
    console.log(`Neo4j process exited with code: ${code} ${signal}`);
    neo4jProcess = null;
    win?.webContents.send("neo4j-exit", code);
  });

  return await new Promise((resolve) => {
    // resolves when db starts
    const checkStarted = (data: unknown) => {
      if (data?.toString().trimEnd().endsWith(" INFO  Started.")) {
        neo4jProcess?.stdout?.off("data", checkStarted);

        resolve(data.toString().trim());
      }
    };

    neo4jProcess?.stdout?.on("data", checkStarted);
  });
}

ipcMain.handle("check-neo4j-connection", async () => {
  try {
    let finalStatus = "Checking connection...";

    const updateStatus = (status: string) => {
      finalStatus = status;
      win?.webContents.send("connection-status-update", finalStatus);
    };

    await connectToNeo4j(updateStatus);
    return finalStatus;
  } catch (error) {
    console.error(
      "Error checking Neo4j connection:",
      error && indentInline(error.toString()),
    );
    return "Failed to connect to Neo4j.";
  }
});

//test query - ZT
ipcMain.handle("run-test-query", async () => {
  console.log("Received IPC call: run-test-query");
  return runTestQuery();
});

function openWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
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

// quit when all windows are closed
app.on("window-all-closed", async () => {
  if (neo4jProcess && !neo4jProcess.killed && neo4jProcess.pid) {
    await stopNeo4j(neo4jProcess.pid);
  }
  app.quit();
  win = null;
});

app.whenReady().then(async () => {
  await checkAndSetupNeo4j();
  await launchNeo4j();

  openWindow();
});

export async function stopNeo4j(pid: number) {
  // yup, this sucks
  // windows only supports SIGKILL-like behavior
  // and .kill() on a ChildProcess does not properly kill the process either!
  // even the windows api cannot save us
  // https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent?redirectedfrom=MSDN
  // https://github.com/nodejs/node/issues/35172
  // https://stackoverflow.com/questions/42303377/gracefully-terminate-a-command-line-application-on-windows
  const cmd = "taskkill";
  const args = ["/PID", pid.toString(), "/T", "/F"];

  console.log("Killing neo4j via ", cmd, ...args);
  const { stdout, stderr } = await asyncExecFile(cmd, args);
  if (stderr.toString().trim().length) {
    throw new Error(
      `Error stopping neo4j @${pid} ${indentInline(stderr.toString().trim())}`,
    );
  }

  if (!stdout.includes(`SUCCESS: The process with PID ${pid}`)) {
    throw new Error(
      `Error stopping neo4j @${pid} ${indentInline(stdout.toString().trim())}`,
    );
  }

  console.log(`Stopped neo4j @${pid}`);
  neo4jProcess?.unref();
  neo4jProcess = null;
}

process.on("uncaughtExceptionMonitor", () => {
  if (neo4jProcess && !neo4jProcess.killed && neo4jProcess.pid) {
    stopNeo4j(neo4jProcess.pid);
  }
});
