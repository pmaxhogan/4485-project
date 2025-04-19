import { driver } from "../seleniumDriver.ts";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect, beforeEach } from "vitest";
import { until } from "selenium-webdriver";
import { getSession } from "../../electron/neo4j.ts";

describe("TC-R3 - Switch to data graph view and verify item rendering", () => {
  beforeEach(async () => {
    const session = getSession();

    try {
      await session.run("MATCH (n) DETACH DELETE n");

      // insert test data
      const testData = `
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
        `;

      await session.run(testData);
    } finally {
      await session.close();
    }
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
    await driver.wait(until.elementsLocated({ css: ".graph-node" }), 10000);
    const nodes = await driver.findElements({ css: ".graph-node" });
    expect(nodes.length).toBeGreaterThan(0);

    // verify nodes once found
    const nodeText = await Promise.all(nodes.map((node) => node.getText()));
    expect(nodeText).toBeTruthy();
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
  });
});
