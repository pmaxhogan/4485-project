import { By, WebDriver, WebElement } from "selenium-webdriver";
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
  driver: WebDriver,
): Promise<{ r: number; g: number; b: number }> {
  const rect = await element.getRect();
  const centerX = Math.round(rect.x + rect.width / 2);
  const centerY = Math.round(rect.y + rect.height / 2);

  const screenshot = await driver.takeScreenshot();
  const image = await Jimp.read(Buffer.from(screenshot, "base64"));
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
