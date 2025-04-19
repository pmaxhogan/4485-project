import { afterEach, beforeEach } from "vitest";
import { driver, setupDriver } from "./seleniumDriver.ts";
import { getSession } from "../electron/neo4j.ts";

beforeEach(() => setupDriver());

let fail = false;
beforeEach(() => {
  if (
    process.env.VITEST_POOL_ID !== "1" ||
    process.env.TINYPOOL_WORKER_ID !== "1"
  ) {
    if (fail) process.exit(1);
    fail = true;
    throw new Error(`
    
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    Detected parallel execution of e2e tests! Make sure you're running \`npm run test:e2e\` to run e2e tests, and that
    vitest parallelism is not enabled (ie. --no-file-parallelism should be on the cli)
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    
    `);
  }
});

afterEach(async () => {
  const session = getSession();

  try {
    await session.run("MATCH (n) DETACH DELETE n");
  } finally {
    await session.close();
  }
});

afterEach(async () => {
  if (driver) {
    await driver.sleep(500);
    await driver.quit();
  }
});
