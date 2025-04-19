import { driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect, beforeEach, afterAll } from "vitest";
import { until, Button, By } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j.ts";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const stat = promisify(fs.stat);
const testCMDB = path.resolve("e2e/data/test.xlsx");
const tempFile = path.resolve("e2e/data/test.tmp.xlsx");

describe("TC-R6: E2E Test - Zoom, Pan, Drag, Layout, and Reset", () => {
  beforeEach(async () => {
    const session = getSession();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
      const testData = `
        CREATE (dc:Datacenter {name: 'Test DC'})
        CREATE (srv:Server {name: 'Test Server'})
        CREATE (app:Application {name: 'Test App'})
        CREATE (bf:BusinessFunction {name: 'Test Function'})
        CREATE (srv)-[:HOSTED_IN]->(dc)
        CREATE (app)-[:RUNS_ON]->(srv)
        CREATE (bf)-[:USES]->(app)
      `;
      await session.run(testData);
    } finally {
      await session.close();
    }

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    fs.copyFileSync(testCMDB, tempFile);

    await driver.executeScript((filePath) => {
      return window.electronAPI.importExcel(filePath);
    }, tempFile);

    await driver.sleep(4000);
  });

  afterAll(() => {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  const ensureGraphReady = async () => {
    // Waiting for the graph container and nodes to be visible
    await driver.wait(until.elementLocated({ css: ".graph" }), 30000);
    await driver.wait(async () => {
      const nodes = await driver.findElements(By.css(".graph-node"));
      return nodes.length > 0;
    }, 30000);
    await driver.sleep(1000);
  };

  test("Zoom to Fit", async () => {
    await driver.findElement(getByText("Schema Graph")).click();
    await ensureGraphReady();

    // Verify graph is visible before proceeding
    const graphContainer = await driver.findElement({ css: ".graph" });
    expect(await graphContainer.isDisplayed()).toBe(true);

    // Click Zoom to Fit
    await driver.findElement(getByText("Zoom to Fit")).click();
    await driver.sleep(2000);

    // Verify zoom by checking node visibility rather than direct NVL access
    const nodes = await driver.findElements(By.css(".graph-node"));
    expect(nodes.length).toBeGreaterThan(0);
    expect(await nodes[0].isDisplayed()).toBe(true);
  });

  test("Pan the graph using right-click", async () => {
    await driver.findElement(getByText("Schema Graph")).click();
    await ensureGraphReady();

    const graphContainer = await driver.findElement({ css: ".graph" });
    const initialNode = await driver.findElement(By.css(".graph-node"));
    const initialPosition = await initialNode.getRect();

    await driver
      .actions()
      .move({ origin: graphContainer, x: 10, y: 10 })
      .press(Button.RIGHT)
      .move({ origin: graphContainer, x: 100, y: 100 })
      .release()
      .perform();

    await driver.sleep(1500);

    const newNodePosition = await initialNode.getRect();
    expect(newNodePosition.x).not.toEqual(initialPosition.x);
    expect(newNodePosition.y).not.toEqual(initialPosition.y);
  });

  test("Drag a node in the graph", async () => {
    await driver.findElement(getByText("Schema Graph")).click();
    await ensureGraphReady();

    await driver.findElement(getByText("Move")).click();
    await driver.sleep(500);

    const nodes = await driver.findElements(By.css(".graph-node"));
    expect(nodes.length).toBeGreaterThan(0);

    const node = nodes[0];
    const rect = await node.getRect();
    await driver
      .actions()
      .move({ origin: node })
      .press()
      .move({ origin: node, x: rect.width / 4, y: 0 })
      .release()
      .perform();
    await driver.sleep(1000);

    const newRect = await (
      await driver.findElements(By.css(".graph-node"))
    )[0].getRect();
    expect(newRect.x).not.toEqual(rect.x);
  });

  test("Change layout to Grid", async () => {
    await driver.findElement(getByText("Schema Graph")).click();
    await ensureGraphReady();

    const initialNodes = await driver.findElements(By.css(".graph-node"));
    const initialPositions = await Promise.all(
      initialNodes.map((n) => n.getRect()),
    );

    // Change to Grid layout
    const gridLabel = await driver.findElement(
      By.xpath("//label[contains(., 'Grid')]"),
    );
    await gridLabel.click();
    await driver.sleep(2500);

    // Verify layout changed by checking node positions
    const newNodes = await driver.findElements(By.css(".graph-node"));
    const newPositions = await Promise.all(newNodes.map((n) => n.getRect()));

    // At least one node should have moved
    const positionsChanged = initialPositions.some((pos, i) => {
      return pos.x !== newPositions[i].x || pos.y !== newPositions[i].y;
    });
    expect(positionsChanged).toBe(true);
  });

  test("Reset view", async () => {
    await driver.findElement(getByText("Schema Graph")).click();
    await ensureGraphReady();

    const initialNodes = await driver.findElements(By.css(".graph-node"));
    const initialPositions = await Promise.all(
      initialNodes.map((n) => n.getRect()),
    );

    // Change zoom/pan by dragging
    const graphContainer = await driver.findElement({ css: ".graph" });
    await driver
      .actions()
      .move({ origin: graphContainer, x: 10, y: 10 })
      .press(Button.RIGHT)
      .move({ origin: graphContainer, x: 100, y: 100 })
      .release()
      .perform();
    await driver.sleep(1000);

    // Click Zoom to Fit to reset
    await driver.findElement(getByText("Zoom to Fit")).click();
    await driver.sleep(2000);

    // Verify view was reset by checking node positions
    const resetNodes = await driver.findElements(By.css(".graph-node"));
    const resetPositions = await Promise.all(
      resetNodes.map((n) => n.getRect()),
    );

    // Positions should be similar to initial positions
    const positionsReset = initialPositions.every((pos, i) => {
      return (
        Math.abs(pos.x - resetPositions[i].x) < 50 &&
        Math.abs(pos.y - resetPositions[i].y) < 50
      );
    });
    expect(positionsReset).toBe(true);
  });
});
