import { Builder, type ThenableWebDriver, until } from "selenium-webdriver";
import * as path from "path";
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "child_process";
import * as http from "http";

const packageFile = path.resolve(__dirname, "..", "package.json");
const { version } = JSON.parse(readFileSync(packageFile, "utf-8").toString());

// linux, win, mac
const osName =
  process.platform === "win32" ? "win"
  : process.platform === "darwin" ? process.platform
  : "linux";

const fileExtension = osName === "win" ? ".exe" : "";

const electronPath = path.resolve(
  __dirname,
  "../release/",
  version,
  osName + "-unpacked",
  "DisasterRecoveryMapping" + fileExtension,
);
//
// const electronPath = path.resolve(
//   __dirname,
//   "../node_modules/.bin/electron" +
//     (process.platform === "win32" ? ".cmd" : ""),
// );

if (!existsSync(electronPath)) {
  console.error("Electron binary not found at", electronPath);
  process.exit(1);
}

export let driver: ThenableWebDriver;
let chromedriverProcess: ReturnType<typeof spawn>;

export async function setupDriver() {
  driver = new Builder()
    .usingServer("http://localhost:9515")
    .withCapabilities({
      "goog:chromeOptions": {
        binary: electronPath,
        args: ["--allow-running-neo", "--no-sandbox"],
      },
    })
    .forBrowser("chrome")
    .build();

  // Wait for the app to load
  await driver.wait(until.elementLocated({ css: "body" }), 10000);
}

const chromedriverPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "electron-chromedriver",
  "bin",
  "chromedriver" + (process.platform === "win32" ? ".exe" : ""),
);

if (!existsSync(chromedriverPath)) {
  console.error("Chromedriver not found at:", chromedriverPath);
  process.exit(1);
}

beforeAll(async () => {
  const spawnCommand = process.platform === "win32" ? "cmd" : chromedriverPath;
  const spawnArgs =
    process.platform === "win32" ?
      ["/c", chromedriverPath, "--port=9515"]
    : ["--port=9515"];

  chromedriverProcess = spawn(spawnCommand, spawnArgs, {
    stdio: "inherit",
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ":0" },
  });

  chromedriverProcess.on("error", (err) => {
    console.error("Failed to start chromedriver:", err);
    process.exit(1);
  });

  // exit handler for additional debugging
  chromedriverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`chromedriver exited with code ${code}`);
    }
  });

  // wait for ChromeDriver to be ready by polling the port
  const waitForChromeDriver = async (timeout = 30000, interval = 1000) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await new Promise<boolean>((resolve, reject) => {
          const req = http.get("http://localhost:9515/status", (res) => {
            const status = res.statusCode ?? 0;
            if (status === 200) {
              console.log("ChromeDriver is ready");
              resolve(true);
            } else {
              reject(new Error(`Status code: ${status}`));
            }
          });

          req.on("error", () => {
            // ignore connection errors during polling
          });

          req.end();
        });

        return true; // chromeDriver is ready
      } catch {
        // wait before trying again
        await new Promise((r) => setTimeout(r, interval));
      }
    }

    throw new Error("Timed out waiting for ChromeDriver to start");
  };

  try {
    await waitForChromeDriver();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("Unknown error occurred while waiting for ChromeDriver");
    }

    if (chromedriverProcess) {
      chromedriverProcess.kill();
    }
    throw error;
  }
}, 20 * 1000);

afterAll(() => {
  if (chromedriverProcess) {
    chromedriverProcess.kill();
  }
});

beforeEach(setupDriver);

afterEach(async () => {
  if (driver) {
    await driver.quit();
  }
}, 1000 * 20);
