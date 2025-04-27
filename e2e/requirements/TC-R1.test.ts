import { driver } from "../seleniumDriver";
import { getByText } from "../e2eUtils";
import { describe, test, expect, beforeEach, afterAll } from "vitest";
import { until, By } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j";
import * as fs from "fs";
import * as path from "path";

const testCMDB = path.resolve("e2e/data/test.xlsx");
const tempFile = path.resolve("e2e/data/test.tmp.xlsx");

describe("TC-R1: E2E Test - Import Excel CMDB and render graph", () => {
  beforeEach(async () => {
    const session = getSession();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
    } finally {
      await session.close();
    }

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    fs.copyFileSync(testCMDB, tempFile);
  });

  afterAll(() => {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  test("Tests import of an Excel (.xls or .xlsx) CMDB file", async () => {
    const importButtonLocator = getByText("Import");
    await driver.wait(until.elementLocated(importButtonLocator), 10000);
    const importButton = await driver.findElement(importButtonLocator);
    await importButton.click();

    // Use Electron API to import the temp Excel file
    await driver.executeScript(
      (filePath: string) => window.electronAPI.importExcel(filePath),
      tempFile,
    );

    // click the "Data Graph" button
    const generateGraphButton = await driver.findElement(
      getByText("Data Graph"),
    );
    expect(generateGraphButton).toBeDefined();
    await generateGraphButton.click();

    // Wait for the graph container
    await driver.wait(until.elementLocated(By.css(".graph")), 15000);
    await driver.sleep(1000); // Let layout stabilize a bit more

    // Wait for at least one node
    await driver.wait(until.elementsLocated(By.css(".graph-node")), 15000);

    // RE-LOCATE the nodes fresh
    const texts = await driver
      .findElements(By.css(".graph-node"))
      .then((nodes) => Promise.all(nodes.map((node) => node.getText())));

    // Spot-check expected labels
    expect(texts.some((text) => text.includes("DC"))).toBe(true);
    expect(texts.some((text) => text.includes("Server"))).toBe(true);
    expect(texts.some((text) => text.includes("App"))).toBe(true);
    expect(texts.some((text) => text.includes("BF"))).toBe(true);
  });
});
