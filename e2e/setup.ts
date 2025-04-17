import { afterEach, beforeEach } from "vitest";
import { driver, setupDriver } from "./seleniumDriver.ts";

beforeEach(() => setupDriver());

afterEach(async () => {
  if (driver) {
    await driver.quit();
  }
});
