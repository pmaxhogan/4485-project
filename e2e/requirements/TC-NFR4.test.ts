import { describe, test, expect } from "vitest";
import * as path from "path";
import { execSync } from 'node:child_process';

const neo4jDB = path.resolve("./neo4j/data");
console.log(neo4jDB);

describe("TC-NFR4", () => {
  test("TC-NFR4: Correct setup of OS permissions verified by test case ", async () => {
    // using exec to call a shell command using node js - oli
    // https://stackoverflow.com/questions/1880198/how-to-execute-shell-commands-in-javascript

    // and using the icacls Windows cmd command to determine access privilege - oli
    // https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids

    // users and authusers are most likely all we need, but included everyone just to be sure
    const foundEveryone = execSync('icacls ' + neo4jDB + ' /findsid Everyone', { encoding: 'utf-8' });
    const foundUsers = execSync('icacls ' + neo4jDB + ' /findsid Users /t /c', { encoding: 'utf-8' });
    const foundAuthUsers = execSync('icacls ' + neo4jDB + ' /findsid "Authenticated Users" /t /c', { encoding: 'utf-8' });
    
    // i should probably check command success rather than finding this specific string
    // but i could not figure it out in a timely manner
    expect(foundEveryone.includes("SID Found")).toBe(false);
    expect(foundUsers.includes("SID Found")).toBe(false);
    expect(foundAuthUsers.includes("SID Found")).toBe(false);
  });
});
