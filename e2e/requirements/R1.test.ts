import { driver } from "../seleniumDriver";
import { getByText } from "../e2eUtils.ts";

describe("R1 - The system shall work with an Excel spreadsheet as the CMDB.", () => {
  test.todo(
    "R1.1, R1.2 - The system shall support the Excel spreadsheet file format (.xls/.xlsx). The system shall allow the user to select a single spreadsheet to be used as the CMDB.",
    async () => {
      const importButton = await driver.findElement(getByText("Import"));
      expect(importButton).toBeDefined();

      await importButton.click();
    },
  );

  test.todo(
    "R1.3 - The system shall import and understand the structure of the full-size test dataset.",
  );
});
