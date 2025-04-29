import { describe, it, vi, beforeEach } from "vitest";
import { generateSchemaTree } from "../graphs/genSchemaTree.ts";

const exampleTree = {
  nodes: [
    {
      id: "1",
      label: "1",
      type: "test",
    },
    {
      id: "2",
      label: "2",
      type: "test",
    },
  ],
  edges: [
    {
      id: "1",
      source: "1",
      target: "2",
    },
  ],
};

describe("generateSchemaTree", () => {
  beforeEach(() => {
    window.electronAPI = {
      fetchSchemaData: vi.fn(),
      fetchSummaryCounts: vi.fn(),
      onNeo4jStatus: vi.fn(),
      onNeo4jLog: vi.fn(),
      onNeo4jError: vi.fn(),
      onNeo4jExit: vi.fn(),
      runTestQuery: vi.fn(),
      invoke: vi.fn(),
      launchNeo4j: vi.fn(),
      checkNeo4jConnection: vi.fn(),
      openFileDialog: vi.fn(),
      importExcel: vi.fn(),
      saveImageToExcel: vi.fn(),
    };
  });

  it("should do invalid data graph", async () => {
    await generateSchemaTree(false);
  });

  it("should do valid data graph", async () => {
    vi.mocked(window.electronAPI.fetchSchemaData).mockImplementation(() =>
      Promise.resolve(exampleTree),
    );
    await generateSchemaTree(false);
  });

  it("should handle error", async () => {
    vi.mocked(window.electronAPI.fetchSchemaData).mockImplementation(() =>
      Promise.resolve({
        nodes: [
          {
            id: "1",
            label: "1",
          },
        ],
        edges: [
          {
            id: "1",
            source: "1",
            target: "2",
          },
        ],
      } as unknown as SchemaTreeData),
    );
    await generateSchemaTree(false);
  });

  it("should do invalid schema graph", async () => {
    await generateSchemaTree(true);
  });

  it("should do valid schema graph", async () => {
    vi.mocked(window.electronAPI.fetchSummaryCounts).mockImplementation(() =>
      Promise.resolve({
        totalDc: 1,
        totalServer: 2,
        totalApp: 3,
        totalBf: 4,
      }),
    );
    vi.mocked(window.electronAPI.fetchSchemaData).mockImplementation(() =>
      Promise.resolve(exampleTree),
    );
    await generateSchemaTree(true);
  });
});
