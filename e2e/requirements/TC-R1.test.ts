import { driver } from "../seleniumDriver";
import { getByText } from "../e2eUtils.ts";
import { describe, test, expect } from "vitest";

describe("TC-R1 - The system shall work with an Excel spreadsheet as the CMDB.", () => {
  test.todo("Importing an Excel CMDB and generating a graph", async () => {
    const importButton = await driver.findElement(getByText("Import"));
    expect(importButton).toBeDefined();

    await importButton.click();
  });
});
