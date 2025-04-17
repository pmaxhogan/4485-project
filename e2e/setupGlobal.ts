import { electronPath } from "./seleniumDriver.ts";

export default async function setup() {
  console.log(`Setting up webdriver, this may take a while. Check the console where
you're running \`npm run test:e2e:driver\` for progress.`);
  console.time("webdriver setup");
  await runProcess();
  console.timeEnd("webdriver setup");
}

async function runProcess(): Promise<void> {
  const { spawn } = await import("child_process");
  const child = spawn(electronPath, ["--neo-only"]);

  child.stdout?.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`> ${output}`);
    }
  });

  child.stderr?.on("data", (data) => {
    const error = data.toString().trim();
    if (error) {
      console.error(`> ${error}`);
    }
  });

  return new Promise<void>((resolve, reject) => {
    child.on("error", (err) => {
      console.error("Failed to start subprocess.", err);
      reject(err);
    });
    child.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Subprocess exited with code ${code}`);
        reject(new Error(`Subprocess exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
