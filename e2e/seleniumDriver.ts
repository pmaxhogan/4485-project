import { Builder, type ThenableWebDriver, until } from "selenium-webdriver";
import * as path from "path";
import { beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";

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

beforeEach(setupDriver);

afterEach(
  async () => {
    if (driver) {
      await driver.quit();
    }
  },
  1000 * 60 * 5,
); // 5 minutes timeout