import fs from "fs"; //needed for neo4j stuff - ZT
import { once } from "events"; //needed for avoiding direct promises - ZT
import { Record } from "neo4j-driver";
import { win } from "./main.ts";
import { indentInline } from "./util.ts";
import { getSession } from "./neo4j.ts";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { ChildProcess, spawn, execFile } from "node:child_process";
import { app } from "electron"; //needed for neo4j stuff -ZT

const asyncExecFile = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = app.getAppPath();

const basename = path.basename(root);

// annoying workaround
// see also https://www.electronjs.org/docs/latest/tutorial/asar-archives#adding-unpacked-files-to-asar-archives
const isAsar = basename === "app.asar";
const appRoot = path.join(
  app.getAppPath(),
  isAsar ? path.join("..", "app.asar.unpacked") : "",
);
const resourceRoot = path.join(appRoot, "resources");

const paths = {
  neo4jFolder: path.join(appRoot, "neo4j"),
  startNeo: path.join(appRoot, "neo4j/bin/neo4j.ps1"),

  script1: path.join(resourceRoot, "download-neo4j.ps1"),
  script2: path.join(resourceRoot, "config-neo4j.ps1"),
};

let neo4jProcess: ChildProcess | null; //tracks the process of our LITTLE CHILD - ZT
process.env.APP_ROOT = path.join(__dirname, "..");

//runs the scripts if needed - ZT
async function runPowerShellScript(scriptPath: string) {
  console.log(`Running PowerShell script: ${scriptPath}`);

  const process = spawn(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", scriptPath],
    {
      cwd: appRoot,
    },
  );

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
  if (!fs.existsSync(paths.neo4jFolder)) {
    console.log(
      `Neo4j folder ${paths.neo4jFolder} not found. Running setup scripts...`,
    );

    try {
      await runPowerShellScript(paths.script1);
      await runPowerShellScript(paths.script2);
      console.log("Neo4j setup completed successfully.");
    } catch (error) {
      console.error(
        "Error setting up Neo4j:",
        error && indentInline(error.toString()),
      );
    }
  } else {
    console.log(`Detected neo4j at ${paths.neo4jFolder}`);
  }
}

const allowRunningNeo =
  process.env.ALLOW_RUNNING_NEO ||
  process.execArgv.includes("--allow-running-neo") ||
  true;
console.log("allowRunningNeo", allowRunningNeo);
console.log("env", process.env);
console.log("args", process.argv0, process.argv);

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
    paths.startNeo,
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

//a litte test - ZT
export const runTestQuery = async (): Promise<Record[]> => {
  const session = getSession();
  try {
    console.log("Running test query against Neo4j...");

    const result = await session.run("MATCH (n) RETURN n LIMIT 5");

    console.log("Test Query Result:", result.records);

    if (result.records.length === 0) {
      console.log("No nodes found in the database.");
    } else {
      result.records.forEach((record) => {
        console.log("Node:", record.get("n"));
      });
    }

    return result.records; // return the records
  } catch (error) {
    console.error(
      "Error running test query:",
      error && indentInline(error.toString()),
    );
    throw error; // propagate the error
  } finally {
    await session.close();
  }
};

async function stopNeo4j(pid: number) {
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

export { checkAndSetupNeo4j, launchNeo4j, stopNeo4j, neo4jProcess };
