import { describe, it, expect, beforeEach, vi } from "vitest";
import VisualGraph from "../components/graphs/VisualGraph.vue";
import { screen, render, getByText } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import NVL from "@neo4j-nvl/base";

describe("VisualGraph Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); // reset mocks before each test

    global.window.electronAPI = {
      invoke: vi.fn(),
      launchNeo4j: vi.fn(),
      onNeo4jLog: vi.fn(),
      onNeo4jError: vi.fn(),
      onNeo4jExit: vi.fn(),
      runTestQuery: vi.fn(),
      openFileDialog: vi.fn(),
      importExcel: vi.fn(),
      checkNeo4jConnection: vi.fn(),
      fetchSchemaData: vi.fn(),
      saveImageToExcel: vi.fn(),
      fetchSummaryCounts: vi.fn(),
    };
  });

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
        layoutDirection: "down",
      },
    });

    expect(screen.queryByText("No nodes to display...")).toBeNull();
  });

  it("captures an image of the graph container", async () => {
    const mockImageDataUrl = "data:image/png;base64,mock-image-data";
    let capturedHref: string | null = null;

    // mock NVL saveFullGraphToLargeFile
    vi.spyOn(NVL.prototype, "saveFullGraphToLargeFile").mockImplementation(
      function () {
        const a = document.createElement("a");
        a.href = mockImageDataUrl;
        document.body.appendChild(a);
        a.dispatchEvent(new Event("click", { bubbles: true }));
        document.body.removeChild(a);
      },
    );

    // mock click handler
    const clickHandler = vi.fn((event: MouseEvent) => {
      const target = event.target as HTMLAnchorElement;
      if (target?.tagName === "A") {
        capturedHref = target.href;
        window.electronAPI.saveImageToExcel(capturedHref);
      }
    });

    document.addEventListener("click", clickHandler, true);

    const wrapper = mount(VisualGraph, {
      props: {
        nodes: [{ id: "1", caption: "Node 1" }],
        rels: [],
        layoutDirection: "down",
      },
    });

    await wrapper.vm.captureGraphImage();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(capturedHref).toBe(mockImageDataUrl);
    expect(window.electronAPI.saveImageToExcel).toHaveBeenCalledWith(
      mockImageDataUrl,
    );

    document.removeEventListener("click", clickHandler, true);
  });
});
