import { driver } from "./seleniumDriver.ts";
import { until } from "selenium-webdriver";
import { e2eBench, getByText } from "./e2eUtils.ts";

e2eBench(
  "webdriver launch",
  async () => {
    const title = await driver.getTitle();
    expect(title).toBeDefined();
  },
  { time: 1000 },
);

e2eBench("neo4j connection", async () => {
  await driver.wait(
    until.elementLocated(getByText("Neo4j connection successful.")),
    10000,
  );
});
