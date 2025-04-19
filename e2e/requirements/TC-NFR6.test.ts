import { until } from "selenium-webdriver";
import { getByText } from "../e2eUtils";
import { driver } from "../seleniumDriver";
import { describe, test, expect } from "vitest";

describe("TC-NFR6", () => {
  test("Operation of Help Dialog", async () => {
    // open help dialog
    const helpButton = await driver.findElement(getByText("Help"));
    expect(helpButton.isDisplayed()).toBeTruthy();
    await helpButton.click();

    // check that help dialog is open
    const helpDialog = await driver.findElement({ css: ".graph-help" });
    console.log("Graph-help class:", await helpDialog.getAttribute("class"));
    let className = await helpDialog.getAttribute("class");
    expect(className.includes("graph-show-help")).toBe(true);

    // check that instructions are visible
    const heading = await driver.wait(
      until.elementLocated(getByText("Controls")),
    );
    expect(heading.isDisplayed()).toBeTruthy();
    const instruction = await driver.wait(
      until.elementLocated(
        getByText("Right-click and drag the background to move the scene."),
      ),
    );
    expect(instruction.isDisplayed()).toBeTruthy();
    // rest of instructions should exist

    // close help dialog
    const okButton = await driver.findElement(getByText("Ok"));
    expect(okButton.isDisplayed()).toBeTruthy();
    await okButton.click();

    // check that its closed
    console.log("Graph-help class:", await helpDialog.getAttribute("class"));
    className = await helpDialog.getAttribute("class");
    expect(className.includes("graph-show-help")).toBe(false);
  });
});
