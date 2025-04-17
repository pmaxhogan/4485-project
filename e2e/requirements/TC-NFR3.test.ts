import { driver } from "../seleniumDriver";
import { describe, test, expect } from "vitest";

describe("TC-NFR3", () => {
  test("Network access is disabled within the application, and failure of network requests is validated by test case", async () => {
    expect(
      (await driver.executeAsyncScript(function (
        callback: (_: unknown) => void,
      ) {
        fetch("https://example.com")
          .then((resp) => callback("No error: " + resp.statusText))
          .catch((err) => callback(err.toString()));
      })) as string,
    ).to.include("TypeError: ");
  });
});
