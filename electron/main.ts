import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { exec, spawn } from 'child_process' //needed for neo4j stuff -ZT
import fs from 'fs'; //needed for neo4j stuff - ZT
import path from 'node:path'
import neo4j from 'neo4j-driver'; //you guessed it - ZT
import { runTestQuery } from '../src/services/neo4j.ts';//you guessed it pt 2. electric boogaloo - ZT

const require = createRequire(import.meta.url)//whatthefuckisthisfor
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

//neo4j constants
const neo4jFolderPath = path.join(__dirname, '..', 'neo4j')
const script1 = path.join(__dirname, '..', 'download-neo4j.ps1');
const script2 = path.join(__dirname, '..', 'config-neo4j.ps1');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let neo4jProcess: any; //tracks the process of our LITTLE CHILD - ZT

//runs the scripts if needed - ZT
function runPowerShellScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running PowerShell script: ${scriptPath}`);

    const process = exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptPath}:`, error);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`PowerShell script warning: ${stderr}`);
      }
      console.log(`PowerShell script output: ${stdout}`);
      resolve();
    });

    process.on('exit', (code) => {
      console.log(`PowerShell script ${scriptPath} exited with code ${code}`);
    });
  });
}

//sees if the scripts need to be ran -ZT
async function checkAndSetupNeo4j(): Promise<void> {
  if (!fs.existsSync(neo4jFolderPath)) {
    console.log('Neo4j folder not found. Running setup scripts...');

    try {
      await runPowerShellScript(script1);
      await runPowerShellScript(script2);
      console.log('Neo4j setup completed successfully.');
    } catch (error) {
      console.error('Error setting up Neo4j:', error);
    }
  } else {
    console.log('Neo4j folder detected. Skipping setup.');
  }
}

//launches database and handles errors - ZT
function launchNeo4j(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('Starting Neo4j in hidden mode...');

    //process check
    if (neo4jProcess) {
      console.log('Neo4j is already running.');
      return resolve('Neo4j is already running.');
    }

    const psCommand = `Start-Process -FilePath "./neo4j/bin/neo4j.bat" -ArgumentList "console" -WindowStyle Hidden`;

    //starting seperate terminal
    neo4jProcess = spawn('powershell', ['-Command', psCommand], {
      stdio: ['ignore', 'pipe', 'pipe'], //capturing data
      shell: true,
    });

    //capturing std output
    neo4jProcess.stdout.on('data', (data) => {
      console.log(`Neo4j Output: ${data}`);
      win?.webContents.send('neo4j-log', data.toString()); //logs to renderer
    });

    //capturing errors
    neo4jProcess.stderr.on('data', (data) => {
      console.error(`Neo4j Error: ${data}`);
      win?.webContents.send('neo4j-error', data.toString()); //error to renderer
    });

    //handles proc errors
    neo4jProcess.on('error', (error) => {
      console.error(`Failed to start Neo4j: ${error.message}`);
      reject(error.message);
    });

    //handles exit event
    neo4jProcess.on('close', (code) => {
      console.log(`Neo4j process exited with code: ${code}`);
      neo4jProcess = null;
      win?.webContents.send('neo4j-exit', code);
    });

    resolve('Neo4j started successfully.');
  });
}

//this is just magic as far as I'm concerned - ZT
function connectToNeo4j(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Replace with your Neo4j connection details
      const uri = 'bolt://localhost:7687';
      const username = 'neo4j';
      const password = 'changethis'; // Consider making this more secure

      //declare driver and session with const or let
      const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      const session = driver.session();

      //test the connection
      session.run('RETURN 1')
        .then(result => {
          console.log('Neo4j connection successful.');
          resolve('Neo4j connected successfully.');
        })
        .catch(error => {
          console.error('Error connecting to Neo4j:', error);
          reject('Error connecting to Neo4j.');
        })
        .finally(() => {
          session.close();
        });
    } catch (error: any) {
      reject(`Error connecting to Neo4j: ${error.message}`);
    }
  });
}

//handles IPC call from renderer to launch Neo4j - ZT
ipcMain.handle('check-neo4j-connection', async (): Promise<string> => {
  console.log('Checking Neo4j connection...');
  return connectToNeo4j();
});

//test query - ZT
ipcMain.handle('run-test-query', async () => {
  console.log('Received IPC call: run-test-query');
  return runTestQuery();
});


function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  
  //start database - ZT
  launchNeo4j();

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.whenReady().then(async () => {
  await checkAndSetupNeo4j();
  console.log('Proceeding with application startup...');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)