import { describe, it, expect } from "vitest";
import { elemLabel, hyphenate, wrapLabels } from "../graphs/elemLabel.ts";

describe("elemLabel", () => {
  it("hyphenate", () => {
    expect(hyphenate("Test String")).toBe("test-string");
    expect(hyphenate("Another Test")).toBe("another-test");
  });

  it("wrapLabels", () => {
    expect(wrapLabels("Test 123")).toBe("Test \n123");
    expect(wrapLabels("Another/ Test")).toBe("Another / Test");
  });

  it("elemLabel", () => {
    const node = { type: "Node", label: "Test Label", id: "123" };
    const elem = elemLabel(node);
    expect(elem.classList.contains("graph-node")).toBe(true);
    expect(elem.classList.contains("graph-node-type-node")).toBe(true);
    expect(elem.textContent).toBe("Test Label");
  });
});
