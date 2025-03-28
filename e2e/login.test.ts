import { Builder } from 'selenium-webdriver';

const electronPath = '/Users/maheeramemon/IdeaProjects/NetworksClientServer/4485-project/node_modules/.bin/electron';

async function runTest() {
  console.log("Connecting to ChromeDriver...");

  const driver = await new Builder()
    .usingServer('http://localhost:9515')
    .withCapabilities({
      'goog:chromeOptions': {
        binary: electronPath
      }
    })
    .forBrowser('chrome')
    .build();

  console.log("Electron launched");

  await driver.get('file:///Users/maheeramemon/IdeaProjects/NetworksClientServer/4485-project/e2e/test.html');
  console.log("HTML file loaded");

  await driver.quit();
  console.log("Driver quit, test is done");
}

runTest().catch((err) => {
  console.error("Test error", err);
});
