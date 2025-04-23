import { By, WebElement } from "selenium-webdriver";
import { driver, setupDriver } from "./seleniumDriver.ts";
import { bench, BenchFunction } from "vitest";
import type { Options } from "tinybench";
import { Jimp } from "jimp";

export const getByText = (text: string, element = "*") => {
  // return driver.find_elements_by_xpath('//*[text() = "My Button"]')
  return By.xpath(`//${element}[contains(text(), ${JSON.stringify(text)})]`);
};

export async function getElementColor(
  element: WebElement,
  debug = false,
): Promise<{ r: number; g: number; b: number }> {
  const rect = await element.getRect();
  const centerX = Math.round(rect.width / 2);
  const centerY = Math.round(rect.height / 2);

  const screenshot = await element.takeScreenshot();
  const base64 = Buffer.from(screenshot, "base64");
  if (debug) {
    const dataUri = `data:image/png;base64,${base64.toString("base64")}`;
    console.log(`capturing element ${await element.getText()} as ${dataUri}`);
  }
  const image = await Jimp.read(base64);
  const pixelColor = image.getPixelColor(centerX, centerY);

  return {
    r: (pixelColor >> 24) & 255,
    g: (pixelColor >> 16) & 255,
    b: (pixelColor >> 8) & 255,
  };
}

const e2eBenchOpts = {
  time: 1000,
  iterations: 5,
  warmupIterations: 1,
  setup: () => setupDriver(),
  teardown: () => driver.quit(),
};

export const e2eBench = (
  name: string,
  fn: BenchFunction,
  opts?: Partial<Options>,
) =>
  bench(name, fn, {
    ...e2eBenchOpts,
    ...opts,
  });
