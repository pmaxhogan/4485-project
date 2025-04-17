import { driver } from "./seleniumDriver";
import { describe, test, expect } from "vitest";

describe("webdriver", () => {
  test("webdriver test", async () => {
    const title = await driver.getTitle();
    expect(title).toBeDefined();
  });
});
