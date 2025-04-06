import { Builder } from "selenium-webdriver";
import * as path from "path";

const electronPath = path.resolve(__dirname, "../node_modules/.bin/electron");

async function runTest() {
  console.log("Connecting to ChromeDriver...");

  const driver = await new Builder()
    .usingServer("http://localhost:9515")
    .withCapabilities({
      "goog:chromeOptions": {
        binary: electronPath,
      },
    })
    .forBrowser("chrome")
    .build();

  console.log("Electron launched");

  await driver.get("http://localhost:5173");
  console.log("App loaded at http://localhost:5173");

  await driver.quit();
  console.log("Driver quit, test is done");
}

runTest().catch((err) => {
  console.error("Test error:", err);
});
