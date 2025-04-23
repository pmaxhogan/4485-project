import { driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { until } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j.ts";
import { getElementColor } from "../e2eUtils.ts";

describe("TC-R5 - Mark nodes as failed and verify propagation", () => {
  beforeEach(async () => {
    const session = getSession();

    try {
      await session.run("MATCH (n) DETACH DELETE n");

      // Insert minimal test data needed for this test
      const testData = `
        CREATE (srv:Server {name: 'Server 1', id: '1'})
        CREATE (srv2:Server {name: 'Server 2', id: '2'})
        CREATE (app:Application {name: 'App 1', id: '3'})
        CREATE (app)-[:RUNS_ON]->(srv)
        CREATE (app)-[:RUNS_ON]->(srv2)
      `;

      await session.run(testData);
    } finally {
      await session.close();
    }
  });

  afterEach(async () => {
    // Clean up any test state if needed
  });

  test("No node should be initially marked as failed (by color)", async () => {
    const generateGraphButton = await driver.findElement(
      getByText("Data Graph"),
    );
    await generateGraphButton.click();
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);

    const allNodes = await driver.findElements({ css: "[data-node-id]" });

    for (const node of allNodes) {
      const color = await getElementColor(node);
      expect(color.r).toBeLessThan(200);
      expect(color.g).toBeGreaterThan(10);
      expect(color.b).toBeGreaterThan(10);
    }
  });

  test("Mark selected nodes as failed and propagate failure", async () => {
    // Select nodes
    // Switch to Data Graph view
    const generateGraphButton = await driver.findElement(
      getByText("Data Graph"),
    );
    await generateGraphButton.click();

    // Wait for the graph to load
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);
    const allNodes = await driver.findElements({ css: ".graph-node" });

    let nodeApp = null;
    let nodeServer = null;

    for (const node of allNodes) {
      const label = await node.getText();

      if (label === "App 1") {
        await node.click();
        nodeApp = node;
        console.log("Clicked App 1");
      }

      if (label === "Server 1") {
        nodeServer = node;
        console.log("Located Server 1");
      }
    }

    if (!nodeApp || !nodeServer) {
      throw new Error("One or both target nodes not found!");
    }

    // Mark as failed
    const failButton = await driver.findElement(
      getByText("Toggle Failure (1)"),
    );
    await failButton.click();

    // Wait for visual update
    await driver.sleep(1500); // Adjust as needed

    const appColor = await getElementColor(nodeApp, true);
    expect(appColor.r).toBeGreaterThan(100);
    expect(appColor.g).toBeLessThan(20);
    expect(appColor.b).toBeLessThan(20);

    const serverColor = await getElementColor(nodeServer, true);
    expect(serverColor.r).toBeGreaterThan(100);
    expect(serverColor.g).toBeLessThan(20);
    expect(serverColor.b).toBeLessThan(20);
  });
});
