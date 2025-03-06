/**
 * file sets up the testing environment for Vitest.
 *
 * - checks if the code is running in a browser-like environment by verifying that `window`
 *   and `window.document` exist. If the environment is correct, it dynamically imports
 *   matchers from @testing-library/jest-dom/matchers to extend Vitest's `expect` with additional
 *   DOM-related assertions.
 * - makes sure that front-end tests can access these matchers without issues in environments without
 *   a full browser API.
 *
 * The imported matchers are cast to a custom type (`MatchersObject`) to satisfy TypeScript's
 * type requirements.
 */

import { expect } from "vitest";

//define the matcher state type.
type MatcherState = object;

//define the expected result type for a matcher function.
type MatcherResult = {
  pass: boolean;
  message: () => string;
};

//define the type for a raw matcher function.
//vitest expects matcher functions to return an object with a pass boolean and a message function
type RawMatcherFn = (this: MatcherState, received: unknown, ...actual: unknown[]) => MatcherResult;

//define the expected matchers object type.
type MatchersObject = Record<string, RawMatcherFn>;

if (typeof window !== "undefined" && typeof window.document !== "undefined") {
  import("@testing-library/jest-dom/matchers")
    .then((module) => {
      const matchers = module.default ?? module;
      //cast the imported matchers to our expected type.
      expect.extend(matchers as unknown as MatchersObject);
    })
    .catch((error) => {
      console.warn("Could not load jest-dom matchers:", error);
    });
}
