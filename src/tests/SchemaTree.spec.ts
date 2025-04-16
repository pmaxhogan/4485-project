import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SchemaTree from "../components/graphs/SchemaTree.vue";

vi.mock("../graphs/genSchemaTree.ts", () => {
  const mockGenerateSchemaTree = vi.fn();
  return {
    generateSchemaTree: mockGenerateSchemaTree,
  };
});

import { generateSchemaTree } from "../graphs/genSchemaTree.ts";

//general SchemaTree tests - zt
describe("SchemaTree.vue", () => {
  beforeEach(() => {
    vi.mocked(generateSchemaTree).mockClear();
  });

  it("toggles layout direction when toggle button is clicked", async () => {
    const wrapper = mount(SchemaTree);

    //find the toggle button
    const buttons = wrapper.findAll("button");
    const toggleButton = buttons.find((btn) =>
      btn.text().includes("Toggle Direction"),
    );

    if (!toggleButton) {
      throw new Error("Toggle Direction button not found");
    }

    //initial state
    expect(toggleButton.text()).toContain("down");

    //first click
    await toggleButton.trigger("click");
    expect(toggleButton.text()).toContain("right");

    //second click
    await toggleButton.trigger("click");
    expect(toggleButton.text()).toContain("down");
  });

  it("has correct generation buttons", () => {
    const wrapper = mount(SchemaTree);

    //get all buttons first
    const buttons = wrapper.findAll("button");

    //check for existence
    const hasSchemaButton = buttons.some((btn) =>
      btn.text().includes("Generate Schema Graph"),
    );
    const hasDataButton = buttons.some((btn) =>
      btn.text().includes("Generate Data Graph"),
    );

    expect(hasSchemaButton).toBe(true);
    expect(hasDataButton).toBe(true);
  });

  it("generates 4 summary nodes when schema button is clicked", async () => {
    //mock summary data
    const mockSummaryData = {
      nodes: [
        {
          id: "summary-0",
          label: "Datacenter (5)",
          captions: [{ value: "Datacenters: 5" }],
          size: 17,
          color: "#f47535",
          html: document.createElement("div"),
          type: "node",
        },
        {
          id: "summary-1",
          label: "Server (10)",
          captions: [{ value: "Servers: 10" }],
          size: 17,
          color: "#b86eac",
          html: document.createElement("div"),
          type: "node",
        },
        {
          id: "summary-2",
          label: "IT Application (20)",
          captions: [{ value: "Applications: 20" }],
          size: 17,
          color: "#3dbfdf",
          html: document.createElement("div"),
          type: "node",
        },
        {
          id: "summary-3",
          label: "Business Function (8)",
          captions: [{ value: "Business Functions: 8" }],
          size: 17,
          color: "#46a64e",
          html: document.createElement("div"),
          type: "node",
        },
      ],
      edges: [
        {
          from: "summary-0",
          to: "summary-1",
          id: "summary-bf-app",
          color: "#f6a565",
        },
        {
          from: "summary-1",
          to: "summary-2",
          id: "summary-app-dc",
          color: "#d89edc",
        },
        {
          from: "summary-2",
          to: "summary-3",
          id: "summary-dc-sv",
          color: "#ffffff",
        },
      ],
    };
    vi.mocked(generateSchemaTree).mockResolvedValue(mockSummaryData);

    const wrapper = mount(SchemaTree);

    //find and click schema button
    const buttons = wrapper.findAll("button");
    const schemaButton = buttons.find((btn) =>
      btn.text().includes("Generate Schema Graph"),
    );
    if (!schemaButton) throw new Error("Schema button not found");

    await schemaButton.trigger("click");
    await wrapper.vm.$nextTick();

    //verify nodes
    expect(wrapper.vm.nodes).toEqual(mockSummaryData.nodes);
    expect(wrapper.vm.nodes).toHaveLength(4);
  });

  it("generates detailed nodes when data button is clicked", async () => {
    //mock detailed data
    const mockDetailedData = {
      nodes: [
        {
          id: "1",
          label: "Node 1",
          captions: [{ value: "Node 1" }],
          size: 100,
          captionSize: 1,
          maxLength: null,
          color: "#FFC0CB",
          html: document.createElement("div"),
          type: "node",
        },
        {
          id: "2",
          label: "Node 2",
          captions: [{ value: "Node 2" }],
          size: 100,
          captionSize: 1,
          maxLength: null,
          color: "#FFC0CB",
          html: document.createElement("div"),
          type: "node",
        },
        {
          id: "3",
          label: "Node 3",
          captions: [{ value: "Node 3" }],
          size: 100,
          captionSize: 1,
          maxLength: null,
          color: "#FFC0CB",
          html: document.createElement("div"),
          type: "node",
        },
      ],
      edges: [
        {
          from: "1",
          to: "2",
          id: "edge-1-2",
          width: 15,
          arrowSize: 5,
          color: "#FFC0CB",
        },
        {
          from: "2",
          to: "3",
          id: "edge-2-3",
          width: 15,
          arrowSize: 5,
          color: "#FFC0CB",
        },
      ],
    };
    vi.mocked(generateSchemaTree).mockResolvedValue(mockDetailedData);

    const wrapper = mount(SchemaTree);

    //find and click the data button
    const buttons = wrapper.findAll("button");
    const dataButton = buttons.find((btn) =>
      btn.text().includes("Generate Data Graph"),
    );
    if (!dataButton) throw new Error("Data button not found");

    await dataButton.trigger("click");
    await wrapper.vm.$nextTick();

    //verify nodes
    expect(wrapper.vm.nodes).toEqual(mockDetailedData.nodes);
    expect(wrapper.vm.nodes).toHaveLength(mockDetailedData.nodes.length);
  });
});
