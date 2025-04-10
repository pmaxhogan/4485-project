import { By } from "selenium-webdriver";
import { driver, setupDriver } from "./seleniumDriver.ts";
import { bench, BenchFunction } from "vitest";
import type { Options } from "tinybench";

export const getByText = (text: string, element = "*") => {
  // return driver.find_elements_by_xpath('//*[text() = "My Button"]')
  return By.xpath(`//${element}[contains(text(), ${JSON.stringify(text)})]`);
};

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
