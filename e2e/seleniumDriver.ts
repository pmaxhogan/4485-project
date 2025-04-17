import { Builder, type ThenableWebDriver, until } from "selenium-webdriver";
import * as path from "path";
import { existsSync, readFileSync } from "node:fs";

const packageFile = path.resolve(__dirname, "..", "package.json");
const { version } = JSON.parse(readFileSync(packageFile, "utf-8").toString());

// linux, win, mac
const osName =
  process.platform === "win32" ? "win"
  : process.platform === "darwin" ? process.platform
  : "linux";

const fileExtension = osName === "win" ? ".exe" : "";

export const electronPath = path.resolve(
  __dirname,
  "../release/",
  version,
  osName + "-unpacked",
  "DisasterRecoveryMapping" + fileExtension,
);

if (!existsSync(electronPath)) {
  const e = new Error(
    "Electron binary not found at " + electronPath + ", try `npm run test:package`",
  );
  console.error(e);
  throw e;
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
  await driver.wait(until.elementLocated({ css: "body" }), 5000);
}
