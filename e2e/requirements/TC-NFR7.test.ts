import { until } from "selenium-webdriver";
import { setupDriver, driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect } from "vitest";
import { getSession } from "../../electron/neo4j.ts";

async function restartApp() {
  if (driver) {
    await driver.quit();
  }
  await setupDriver(); // relaunch Electron app + get fresh driver
}

describe("TC-NFR7 - Import, simulate crash, and verify persistence", () => {
  test("Import data, simulate app crash, and verify graph renders after relaunch", async () => {
    // Prepare DB
    const session = getSession();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
      await session.run(`
          CREATE (dc:Datacenter {name: 'Test DC'})
          CREATE (dc2:Datacenter {name: 'Test DC 2'})
          CREATE (srv:Server {name: 'Test Server'})
          CREATE (srv2:Server {name: 'Test Server 2'})
          CREATE (srv3:Server {name: 'Test Server 3'})
          CREATE (srv4:Server {name: 'Test Server 4'})
          CREATE (app:Application {name: 'Test App'})
          CREATE (app2:Application {name: 'Test App 2'})
          CREATE (app3:Application {name: 'Test App 3'})
          CREATE (bf:BusinessFunction {name: 'Test Function'})
          CREATE (bf2:BusinessFunction {name: 'Test Function 2'})
          CREATE (srv)-[:HOSTED_IN]->(dc)
          CREATE (srv2)-[:HOSTED_IN]->(dc)
          CREATE (srv3)-[:HOSTED_IN]->(dc)
          CREATE (srv4)-[:HOSTED_IN]->(dc2)
          CREATE (app)-[:RUNS_ON]->(srv)
          CREATE (app2)-[:RUNS_ON]->(srv)
          CREATE (app3)-[:RUNS_ON]->(srv)
          CREATE (app)-[:RUNS_ON]->(srv2)
          CREATE (app2)-[:RUNS_ON]->(srv)
          CREATE (app3)-[:RUNS_ON]->(srv3)
          CREATE (app2)-[:RUNS_ON]->(srv3)
          CREATE (app3)-[:RUNS_ON]->(srv4)
          CREATE (bf)-[:USES]->(app)
          CREATE (bf)-[:USES]->(app2)
          CREATE (bf)-[:USES]->(app3)
          CREATE (bf2)-[:USES]->(app2)
          CREATE (meta:Metadata {name: 'SummaryCounts', totalDc: 2, totalServer: 4, totalApp: 3, totalBf: 2})
        `);
    } finally {
      await session.close();
    }

    // After relaunch, go to graph view
    const graphButton = await driver.findElement(getByText("Data Graph"));
    await graphButton.click();

    // Verify nodes are rendered
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    const nodeText = await Promise.all(nodes.map((node) => node.getText()));
    expect(nodeText.sort()).toEqual([
      "Test App",
      "Test App 2",
      "Test App 3",
      "Test DC",
      "Test DC 2",
      "Test Function",
      "Test Function 2",
      "Test Server",
      "Test Server 2",
      "Test Server 3",
      "Test Server 4",
    ]);

    await driver.sleep(2000); // waits 1 second

    // Simulate app crash + restart (restartApp should handle relaunching the Electron app + resetting `driver`)
    await restartApp();

    // After relaunch, go to graph view
    const graphButtonRetry = await driver.findElement(getByText("Data Graph"));
    await graphButtonRetry.click();

    // Verify nodes are rendered
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);
    const nodesRetry = await driver.findElements({ css: ".graph-node" });
    const nodeTextRetry = await Promise.all(
      nodesRetry.map((node) => node.getText()),
    );
    expect(nodeTextRetry.sort()).toEqual([
      "Test App",
      "Test App 2",
      "Test App 3",
      "Test DC",
      "Test DC 2",
      "Test Function",
      "Test Function 2",
      "Test Server",
      "Test Server 2",
      "Test Server 3",
      "Test Server 4",
    ]);
  });
});
