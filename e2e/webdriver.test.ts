import { driver } from "./seleniumDriver";
import { describe, test, expect } from "vitest";
import { until } from "selenium-webdriver";
import { getByText } from "./e2eUtils.ts";

describe("webdriver", () => {
  test("webdriver test", async () => {
    const title = await driver.getTitle();
    expect(title).toBeDefined();
  });

  test("neo4j connection", async () => {
    await driver.wait(
      until.elementLocated(getByText("Neo4j connection successful.")),
      10000,
    );
  });
});
