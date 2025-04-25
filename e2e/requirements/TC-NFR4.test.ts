import { describe, test, expect } from "vitest";
import * as path from "path";
import { execSync } from "node:child_process";
// have to import version; using process.env.npm_package_version results in build failure
import { version } from "../../package.json";

// if there's an easier and less hard-coded way to get neo4j's location let me know.
// this code brings me pain - oli
const neo4jPath = path.resolve(
  "release",
  version,
  "win-unpacked/resources/app.asar.unpacked/neo4j",
);

// console.log(neo4jDB); // for debug purposes

describe("TC-NFR4", () => {
  test("TC-NFR4: Correct setup of OS permissions verified by test case ", async () => {
    // using the icacls Windows cmd command to determine access privilege - oli
    // https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids

    // checks auth users and everyone, tried the "users" group too initially which worked
    // locally on my machine but not in github actions runner. i dont think we need to check for that group tho
    const args = "/t /c";
    const groups = ["Guests", "Everyone", "Authenticated Users"];
    let unAuthAccess = false;
    // for each group to be tested,
    groups.forEach((g) => {
      // find if it is included in the permissions list,
      const command = "icacls " + neo4jPath + ' /findsid "' + g + '" ' + args;
      console.log(command);
      const results = execSync(command, {
        encoding: "utf-8",
      });

      // if it is, set foundGroup to be true
      if (results.includes("SID Found")) {
        unAuthAccess = true;
      }
    });

    expect(unAuthAccess).toBe(false);
  });
});
