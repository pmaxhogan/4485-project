import { driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { until } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j.ts";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const stat = promisify(fs.stat);
const testCMDB = path.resolve("e2e/data/test.xlsx");
const tempFile = path.resolve("e2e/data/test.tmp.xlsx");

describe("The system shall support saving, loading, and editing of graphs from the CMDB", () => {
  beforeAll(async () => {
    const session = getSession();

    try {
      await session.run("MATCH (n) DETACH DELETE n");

      // insert test data
      const testData = `
          CREATE (dc:Datacenter {name: 'Test DC'})
          CREATE (srv:Server {name: 'Test Server'})
          CREATE (app:Application {name: 'Test App'})
          CREATE (bf:BusinessFunction {name: 'Test Function'})
          CREATE (srv)-[:HOSTED_IN]->(dc)
          CREATE (app)-[:RUNS_ON]->(srv)
          CREATE (bf)-[:USES]->(app)
          CREATE (meta:Metadata {name: 'SummaryCounts', totalDc: 1, totalServer: 1, totalApp: 1, totalBf: 1})
        `;

      await session.run(testData);
    } finally {
      await session.close();
    }

    // clean temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    fs.copyFileSync(testCMDB, tempFile);
  });

  afterAll(async () => {
    // clean temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  test("Create schema graph with valid data", async () => {
    // click the "Schema Graph" button
    const generateGraphButton = await driver.findElement(
      getByText("Schema Graph"),
    );
    expect(generateGraphButton).toBeDefined();
    await generateGraphButton.click();

    // verify the graph is rendered
    const graphCanvas = await driver.findElement({ css: ".graph" });
    expect(graphCanvas).toBeDefined();

    // verify nodes are rendered
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 2000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    expect(nodes.length).toBeGreaterThan(0);

    // verify first node once found
    const firstNode = nodes[0];
    expect(await firstNode.isDisplayed()).toBeTruthy();
    const nodeLabel = await firstNode.getText();
    console.log("First node label:", nodeLabel); // debug
    expect(nodeLabel).toBeTruthy();
  });

  test("Create data graph with valid data", async () => {
    // click the "Data Graph" button
    const generateGraphButton = await driver.findElement(
      getByText("Data Graph"),
    );
    expect(generateGraphButton).toBeDefined();
    await generateGraphButton.click();

    // verify the graph is rendered
    const graphCanvas = await driver.findElement({ css: ".graph" });
    expect(graphCanvas).toBeDefined();

    // verify nodes are rendered
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 2000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    expect(nodes.length).toBeGreaterThan(0);

    // verify first node once found
    const firstNode = nodes[0];
    expect(await firstNode.isDisplayed()).toBeTruthy();
    const nodeLabel = await firstNode.getText();
    console.log("First node label:", nodeLabel); // debug
    expect(nodeLabel).toBeTruthy();
  });

  test("Save image of graph to CMDB", async () => {
    // mock import excel so we can change which file is used
    await driver.executeScript((filePath: string) => {
      return window.electronAPI.importExcel(filePath);
    }, tempFile);

    const statsBefore = await stat(tempFile);

    // click the "Schema Graph" button
    const generateGraphButton = await driver.findElement(
      getByText("Schema Graph"),
    );
    expect(generateGraphButton).toBeDefined();
    await generateGraphButton.click();

    // verify the graph is rendered
    const graphCanvas = await driver.findElement({ css: ".graph" });
    expect(graphCanvas).toBeDefined();

    // verify nodes are rendered
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 2000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    expect(nodes.length).toBeGreaterThan(0);

    // click the "Save Image" button
    const saveImageButton = await driver.findElement(
      getByText("Save Graph Image to CMDB"),
    );
    expect(saveImageButton).toBeDefined();
    await saveImageButton.click();

    await driver.sleep(2000);

    // verify file was modified  by checking that size is different
    const statsAfter = await stat(tempFile);
    expect(statsAfter.size).toBeGreaterThan(statsBefore.size);
    expect(statsAfter.mtime.getTime()).toBeGreaterThan(
      statsBefore.mtime.getTime(),
    );
  });
});
