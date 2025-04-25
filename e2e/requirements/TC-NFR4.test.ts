import { describe, test, expect } from "vitest";
import * as path from "path";
import { execSync } from "node:child_process";
// have to import version; using process.env.npm_package_version results in build failure
import { version } from "../../package.json";

// if there's an easier and less hard-coded way to get neo4j's location let me know - oli
const neo4jPath = path.resolve(
  "release",
  version,
  "win-unpacked/resources/app.asar.unpacked/neo4j",
);

describe("TC-NFR4", () => {
  test("TC-NFR4: Correct setup of OS permissions verified by test case ", async () => {
    // using the icacls Windows cmd command to determine access privilege - oli
    // https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids

    // checks auth users and everyone, tried the "users" group too initially which worked
    // locally on my machine but not in github actions runner. i dont think we need to check for that group tho
    const args = "/t /c";
    const groups = ["Guests", "Everyone", "Authenticated Users"];
    let foundAccessViolation = false;

    groups.forEach((g) => {
      // for each group, check if icacls finds permissions for that group
      const command = "icacls " + neo4jPath + ' /findsid "' + g + '" ' + args;

      const results = execSync(command, {
        encoding: "utf-8",
      });

      // if we do find perms, this is an access violation
      if (results.includes("SID Found")) {
        foundAccessViolation = true;
      }
    });

    expect(foundAccessViolation).toBe(false);
  });
});
