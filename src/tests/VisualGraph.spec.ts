import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import VisualGraph from "../components/graphs/VisualGraph.vue";
import NVL, { Point } from "@neo4j-nvl/base";
import { type Node } from "@neo4j-nvl/base";
import { fireEvent, render, screen } from "@testing-library/vue";
import { ByRoleOptions } from "@testing-library/dom/types/queries";

describe("VisualGraph Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); // reset mocks before each test

    vi.spyOn(NVL.prototype, "addAndUpdateElementsInGraph").mockImplementation(
      () => {},
    );
    vi.spyOn(NVL.prototype, "updateElementsInGraph").mockImplementation(
      () => {},
    );
    vi.spyOn(NVL.prototype, "fit").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "setZoomAndPan").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "setLayoutOptions").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "restart").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "setLayout").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "destroy").mockImplementation(() => {});
    vi.spyOn(NVL.prototype, "getNodes").mockReturnValue([]); // default to no nodes
    vi.spyOn(NVL.prototype, "getSelectedNodes").mockReturnValue([]);

    global.window.electronAPI = {
      invoke: vi.fn(),
      launchNeo4j: vi.fn(),
      onNeo4jStatus: vi.fn(),
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

  // header is commented out, so this test will always fail.
  // commented it out for now
  // ****************
  // it("renders the correct header", () => {
  //   render(VisualGraph);

  //   const h2 = screen.getAllByRole("heading", { level: 2 })[0] as HTMLElement;
  //   getByText(h2, "Graph");
  // });

  it("renders when there are no nodes", () => {
    const wrapper = mount(VisualGraph, {
      props: { nodes: [], rels: [] },
    });
    expect(wrapper.text()).toContain("No nodes to display...");
  });

  it("renders a graph", async () => {
    render(VisualGraph, {
      props: {
        nodes: [
          { id: "1", caption: "Node 1" },
          { id: "2", caption: "Node 2" },
        ],
        rels: [{ from: "1", to: "2", id: "3" }],
        // layoutDirection: "down",
      },
    });
  });

  it("renders selection buttons", async () => {
    render(VisualGraph, {
      props: {
        nodes: [
          { id: "1", caption: "Node 1" },
          { id: "2", caption: "Node 2" },
        ],
        rels: [{ from: "1", to: "2", id: "3" }],
      },
    });

    screen.logTestingPlaygroundURL();

    const btn = (name: ByRoleOptions["name"]) =>
      screen.getByRole("button", {
        name,
      });
    const expectBtn = (name: ByRoleOptions["name"], disabled: boolean) =>
      expect(btn(name)).toHaveProperty("disabled", disabled);

    expectBtn("Pointer", true);
    expectBtn("Move", false);
    expectBtn("Lasso", false);
    expectBtn("Box", false);

    await fireEvent.click(btn("Pointer"));

    expectBtn("Pointer", true);
    expectBtn("Move", false);
    expectBtn("Lasso", false);
    expectBtn("Box", false);

    await fireEvent.click(btn("Move"));

    expectBtn("Pointer", false);
    expectBtn("Move", true);
    expectBtn("Lasso", false);
    expectBtn("Box", false);

    await fireEvent.click(btn("Lasso"));

    expectBtn("Pointer", false);
    expectBtn("Move", false);
    expectBtn("Lasso", true);
    expectBtn("Box", false);

    await fireEvent.click(btn("Box"));

    expectBtn("Pointer", false);
    expectBtn("Move", false);
    expectBtn("Lasso", false);
    expectBtn("Box", true);
  });

  it("calls NVL.fit when clicking 'Zoom to Fit' button", async () => {
    const nodes = [
      { id: "1", caption: "A" },
      { id: "2", caption: "B" },
    ];
    const wrapper = mount(VisualGraph, {
      props: { nodes, rels: [] },
    });
    await nextTick();
    await nextTick();
    await nextTick();

    // get the "Zoom to Fit" button
    const zoomBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Zoom to Fit");
    await zoomBtn!.trigger("click");

    expect(NVL.prototype.fit).toHaveBeenCalledWith(["1", "2"], {
      animated: true,
    });
  });

  it("captures an image of the graph container", async () => {
    const mockImageDataUrl = "data:image/png;base64,mock-image-data";

    vi.spyOn(NVL.prototype, "saveFullGraphToLargeFile").mockImplementation(
      function () {
        const a = document.createElement("a");
        a.href = mockImageDataUrl;
        document.body.appendChild(a);
        a.dispatchEvent(new Event("click", { bubbles: true }));
        document.body.removeChild(a);
      },
    );
  });

  it("toggles failure state for a selected node and its child", async () => {
    const nodes = [
      { id: "1", caption: "Parent" },
      { id: "2", caption: "Child" },
    ];
    const rels = [{ from: "1", to: "2", id: "r1" }];

    // spy getNodes to get two colored nodes
    vi.spyOn(NVL.prototype, "getNodes").mockReturnValue([
      { id: "1", color: "blue" },
      { id: "2", color: "green" },
    ]);

    render(VisualGraph, {
      props: { nodes, rels },
    });

    // let button = screen.getByRole("button", {
    //   name: /Toggle Failure/i,
    // });

    let button = screen.getByText("Toggle Failure (0)");
    expect(button).toHaveProperty("disabled", true);

    vi.spyOn(NVL.prototype, "getSelectedNodes").mockReturnValue([
      nodes[0],
    ] as (Point & Node)[]);

    await fireEvent.click(screen.getByRole("img"));

    // button = screen.getByRole("button", {
    //   name: /Toggle Failure/i,
    // });

    button = screen.getByText("Toggle Failure (1)");
    expect(button).toHaveProperty("disabled", false);

    await fireEvent.click(button);

    expect(NVL.prototype.getSelectedNodes).toHaveBeenCalled();

    expect(NVL.prototype.updateElementsInGraph).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          color: "#ff0000",
          originalColor: "blue",
        }),
        expect.objectContaining({
          id: "2",
          color: "#ff0000",
          originalColor: "green",
        }),
      ]),
      [],
    );
  });

  it("enables the failure toggle button", async () => {
    const nodes = [{ id: "1", caption: "X" }] as (Node & Point)[];
    render(VisualGraph, {
      props: { nodes, rels: [] },
    });

    let button = screen.getByRole("button", {
      name: /Toggle Failure \(0\)/i,
    });
    expect(button).toHaveProperty("disabled", true);

    vi.spyOn(NVL.prototype, "getSelectedNodes").mockReturnValue(
      nodes as (Point & Node)[],
    );
    await fireEvent.click(screen.getByRole("img"));

    expect(NVL.prototype.getSelectedNodes).toHaveBeenCalled();
    button = screen.getByRole("button", {
      name: /Toggle Failure \(1\)/i,
    });
    expect(button).toHaveProperty("disabled", false);
  });

  it("updates layout options + restarts when layoutDirection changes", async () => {
    render(VisualGraph, {
      props: { nodes: [{ id: "1", caption: "X" }], rels: [] },
    });

    await nextTick();

    // graph must be in hierarchical or grid mode to select direction
    await fireEvent.click(screen.getByText("Hierarchical"));

    await nextTick();

    // click the button that changes the layout direction to left
    await fireEvent.click(screen.getByText("⮜"));

    await nextTick();
    console.log("*******************************************");
    expect(NVL.prototype.setLayoutOptions).toHaveBeenCalled();
    expect(NVL.prototype.restart).toHaveBeenCalled();
  });

  it("calls setLayout when layout changes", async () => {
    render(VisualGraph, {
      props: {
        nodes: [{ id: "1", caption: "X" }],
        rels: [],
      },
    });
    await nextTick();

    // start from hierarchical
    await fireEvent.click(screen.getByText("Hierarchical"));

    // wait for graph to update
    await nextTick();

    // change the layout
    await fireEvent.click(screen.getByText("Force Directed"));

    await nextTick();

    expect(NVL.prototype.setLayout).toHaveBeenCalledWith("forceDirected");
  });

  it("rerenders", async () => {
    const { rerender } = render(VisualGraph, {
      props: {
        nodes: [{ id: "1", caption: "X" }],
        rels: [],
      },
    });
    await nextTick();

    // wait for graph to update
    await nextTick();

    await rerender({
      nodes: [{ id: "1", caption: "X" }],
      rels: [],
    });
  });

  it("destroys NVL instance when unmounted", async () => {
    const wrapper = mount(VisualGraph, {
      props: { nodes: [{ id: "1", caption: "X" }], rels: [] },
    });
    await nextTick();

    wrapper.unmount();
    expect(NVL.prototype.destroy).toHaveBeenCalled();
  });
});
