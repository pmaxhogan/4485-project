import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import VisualGraph from "../components/graphs/VisualGraph.vue";

describe("VisualGraph Component", () => {
  it("renders the correct header", () => {
    const wrapper = mount(VisualGraph);

    // Look for the first <h2> in the component.
    // VisualGraph.vue has <h2>Graph</h2> in the template.
    const headerWrapper = wrapper.find("h2");

    if (!headerWrapper.exists()) {
      throw new Error("No <h2> element found in VisualGraph component.");
    }

    //checks if the <h2> text is "Graph" (update if needed).
    expect(headerWrapper.text()).toBe("Graph");
  });

  /*
  not completed: image output check
  */
});
