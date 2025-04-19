import { driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect, beforeEach } from "vitest";
import { until } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j.ts";

describe("TC-R2 - Trigger schema graph creation and check high-level overview", () => {
  beforeEach(async () => {
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
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    expect(nodes.length).toBeGreaterThan(0);

    // verify nodes once found
    const nodeText = await Promise.all(nodes.map((node) => node.getText()));
    expect(nodeText).toBeTruthy();

    expect(nodeText.sort()).toEqual([
      "Business Function (1)",
      "Datacenter (1)",
      "IT Application (1)",
      "Server (1)",
    ]);
  });
});
