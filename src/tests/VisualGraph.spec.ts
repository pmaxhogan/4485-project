import { describe, it, expect } from "vitest";
import VisualGraph from "../components/graphs/VisualGraph.vue";
import { screen, render, getByText } from "@testing-library/vue";

describe("VisualGraph Component", () => {
  it("renders the correct header", () => {
    render(VisualGraph);

    // Look for the first <h2> in the component.
    // VisualGraph.vue has <h2>Graph</h2> in the template.
    const h2 = screen.getAllByRole("heading", { level: 2 })[0];

    //checks if the <h2> text is "Graph"
    getByText(h2, "Graph");
  });

  it("renders a graph", async () => {
    render(VisualGraph, {
      props: {
        nodes: [
          { id: "1", caption: "Node 1" },
          { id: "2", caption: "Node 2" },
        ],
        rels: [{ from: "1", to: "2", id: "3" }],
      },
    });

    expect(screen.queryByText("No nodes to display...")).toBeNull();
  });
});
