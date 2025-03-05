/**
 * this file sets up testing environment for vitest
 * checks if the code is running in a browser like environment by checking
 * if window and window.document exist
 *
 * if the environment is correct it loads matchers from @testing-library/jest-dom/matchers
 * which give extra testing functions
 *
 * the setup makes sure that front end tests can access the matchers without errors in backend
 *
 */

import { cleanup } from "@testing-library/vue";
import { afterEach, expect } from "vitest";

afterEach(cleanup);

if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    import("@testing-library/jest-dom/matchers")
        .then((module) => {
            const matchers = module.default ?? module;
            expect.extend(matchers as unknown as Record<string, any>);
        })
        .catch((error) => {
            console.warn("Could not load jest-dom matchers:", error);
        });
}