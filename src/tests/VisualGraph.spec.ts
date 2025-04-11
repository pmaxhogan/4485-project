import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ComponentPublicInstance } from "vue";
import VisualGraph from "../components/graphs/VisualGraph.vue";
import NVL from "@neo4j-nvl/base";

interface VisualGraphVM extends ComponentPublicInstance {
  selectedNodeIds: string[];
  markSelectedNodeAsFailed(): void;
  zoomToFit(): void;
}

describe("VisualGraph Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

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

  it("renders when there are no nodes", () => {
    const wrapper = mount(VisualGraph, {
      props: { nodes: [], rels: [] },
    });
    expect(wrapper.text()).toContain("No nodes to display...");
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

    // get the "Zoom to Fit" button
    const zoomBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Zoom to Fit");
    await zoomBtn!.trigger("click");

    expect(NVL.prototype.fit).toHaveBeenCalledWith(["1", "2"], {
      animated: true,
    });
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

    const wrapper = mount(VisualGraph, {
      props: { nodes, rels },
    });
    await nextTick();

    const vm = wrapper.vm as unknown as VisualGraphVM;
    vm.selectedNodeIds = ["1"];
    await nextTick();

    // click  "Toggle Node Failure" button
    const toggleBtn = wrapper.get("button.mark-failed-btn");
    await toggleBtn.trigger("click");

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
    const wrapper = mount(VisualGraph, {
      props: { nodes: [{ id: "1", caption: "X" }], rels: [] },
    });
    await nextTick();

    const btn = wrapper.find("button.mark-failed-btn");
    expect(btn.attributes("disabled")).toBeDefined();

    const vm = wrapper.vm as unknown as VisualGraphVM;
    vm.selectedNodeIds = ["1"];
    await nextTick();
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("updates layout options + restarts when layoutDirection changes", async () => {
    const wrapper = mount(VisualGraph, {
      props: { nodes: [{ id: "1", caption: "X" }], rels: [] },
    });
    await nextTick();

    await wrapper.setProps({ layoutDirection: "left" });
    await nextTick();

    expect(NVL.prototype.setLayoutOptions).toHaveBeenCalled();
    expect(NVL.prototype.restart).toHaveBeenCalled();
  });

  it("calls setLayout when layout changes", async () => {
    const wrapper = mount(VisualGraph, {
      props: {
        nodes: [{ id: "1", caption: "X" }],
        rels: [],
        layout: "hierarchical",
      },
    });
    await nextTick();

    await wrapper.setProps({ layout: "forceDirected" });
    await nextTick();

    expect(NVL.prototype.setLayout).toHaveBeenCalledWith("forceDirected");
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
