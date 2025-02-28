import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import { spawn, ChildProcess } from "child_process"; //needed for neo4j stuff -ZT
import { once } from "events"; //needed for avoiding direct promises - ZT
import fs from "fs"; //needed for neo4j stuff - ZT
import path from "node:path";
import { runTestQuery, connectToNeo4j } from "../src/services/neo4j.ts"; //you guessed it pt 2. electric boogaloo - ZT
import { importExcel } from "../src/services/excelJSimport.ts";

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
    console.log(`PowerShell output: ${data.toString()}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`PowerShell error: ${data.toString()}`);
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
      console.error("Error setting up Neo4j:", error);
    }
  } else {
    console.log("Neo4j folder detected. Skipping setup.");
  }
}

//launches database and handles errors - ZT
async function launchNeo4j() {
  console.log("Starting Neo4j in hidden mode...");

  if (neo4jProcess) {
    console.log("Neo4j is already running.");
    return "Neo4j is already running.";
  }

  const psCommand = `Start-Process -FilePath "./neo4j/bin/neo4j.bat" -ArgumentList "console" -WindowStyle Hidden`;

  neo4jProcess = spawn("powershell", ["-Command", psCommand], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  //output feed
  if (neo4jProcess?.stdout) {
    neo4jProcess.stdout.on("data", (data) => {
      console.log(`Neo4j Output: ${data.toString()}`);
      win?.webContents.send("neo4j-log", data.toString());
    });
  }

  if (neo4jProcess?.stderr) {
    neo4jProcess.stderr.on("data", (data) => {
      console.error(`Neo4j Error: ${data}`);
      win?.webContents.send("neo4j-error", data.toString());
    });
  }

  //handling process errors
  neo4jProcess.on("error", (error) => {
    console.error(`Failed to start Neo4j: ${error.message}`);
    throw new Error(error.message); // Throwing an error to be caught
  });

  //when the process exits
  neo4jProcess.on("close", (code) => {
    console.log(`Neo4j process exited with code: ${code}`);
    neo4jProcess = null;
    win?.webContents.send("neo4j-exit", code);
  });
}

//connection handler - ZT
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
    console.error("Error checking Neo4j connection:", error);
    return "Failed to connect to Neo4j.";
  }
});

//test query - ZT
ipcMain.handle("run-test-query", async () => {
  console.log("Received IPC call: run-test-query");
  return runTestQuery();
});

//connect excel - ZT
ipcMain.handle("import-excel", async (_event, filePath: string) => {
  try {
    if (!filePath) throw new Error("No file path provided.");

    console.log(`Importing file: ${filePath}`);
    await importExcel(filePath);
    return {
      success: true,
      message: `Excel file '${filePath}' imported successfully`,
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      catch(error: Error) {
        console.error("Import error:", error);
        return {
          success: false,
          message:
            error instanceof Error ?
              error.message
            : "Failed to import Excel file",
        };
      },
    };
  }
});

//file select - ZT
ipcMain.handle("open-file-dialog", async () => {
  try {
    console.log("Opening file dialog...");
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    });

    console.log("File dialog result:", result);

    if (result.canceled) {
      console.log("File selection was canceled.");
      return { filePaths: [] };
    }

    console.log("Selected file:", result.filePaths[0]);
    return { filePaths: result.filePaths };
  } catch (error) {
    console.error("Error opening file dialog:", error);
    throw error;
  }
});

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });
  //start database - ZT
  launchNeo4j();

  // uncomment to open devtools on startup
  // win?.webContents.openDevTools();

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
}

app.whenReady().then(async () => {
  await checkAndSetupNeo4j();
  console.log("Proceeding with application startup...");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
