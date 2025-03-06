/**
 * file tests utility functions
 * checks if 'helloWorld()' returns correctly
 */

//import vitest functions
import { describe, it, expect } from "vitest";
//import the hello work function
import { helloWorld } from "../util";

describe("Utility Function Tests", () => {
  it("helloWorld should return 'Hello, World!'", () => {
    //check if the function returns hello world
    expect(helloWorld()).toBe("Hello, World!");
  });
});
