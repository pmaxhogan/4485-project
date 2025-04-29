import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import { fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { nextTick } from "vue";
import { checkConnectionStatus } from "../../electron/neo4j";
import { generateSchemaTree } from "../graphs/genSchemaTree.ts";
import NVL from "@neo4j-nvl/base";

vi.mock("../graphs/genSchemaTree.ts", () => ({
  generateSchemaTree: vi.fn(),
}));

async function waitForNeo(container: Element) {
  await waitFor(
    () =>
      expect(
        container.querySelector(".connecting-to-neo")?.classList,
      ).not.toContain("neo-loading"),
    {
      timeout: 10000,
    },
  );
}

vi.spyOn(NVL.prototype, "saveFullGraphToLargeFile").mockImplementation(
  () => {},
);

describe("App Component", () => {
  beforeEach(() => {
    // cast global directly to an object that contains window
    (global as { window: Window }).window.electronAPI = {
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
      fetchSchemaData: vi.fn(),
      saveImageToExcel: vi.fn(),
      fetchSummaryCounts: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls openFileDialog in VisualGraph on button click", async () => {
    // get a mock version of the method to test if it is called
    const { container, unmount } = render(App);

    expect(container.querySelector(".connecting-to-neo")?.classList).toContain(
      "neo-loading",
    );

    vi.mocked(window.electronAPI.onNeo4jStatus).mock.lastCall?.[0]("CONNECTED");

    await nextTick();

    vi.mocked(window.electronAPI.openFileDialog).mockResolvedValueOnce({
      filePaths: [],
    });

    await waitForNeo(container);

    const importButton = screen.getByText("Import Excel");
    await fireEvent.click(importButton);

    expect(window.electronAPI.openFileDialog).toHaveBeenCalled();

    unmount();
  });

  it("calls captureGraphImage in VisualGraph on button click", async () => {
    // get a mock version of the method to test if it is called
    const { container } = render(App, {
      /*global: {
        stubs: {
          VisualGraph: {
            methods: {
              captureGraphImage: captureGraphImageMock,
            },
            // add template to avoid missing template warning
            template: "<div />",
          },
        },
      },*/
    });

    //console.log("methods: " + SchemaTree.methods);

    vi.mocked(window.electronAPI.onNeo4jStatus).mock.lastCall?.[0]("CONNECTED");
    await nextTick();

    await checkConnectionStatus();

    await waitForNeo(container);
    await nextTick();

    vi.mocked(generateSchemaTree).mockResolvedValue({
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
      ],
      edges: [
        {
          from: "summary-0",
          to: "summary-1",
          id: "summary-bf-app",
          color: "#f6a565",
        },
      ],
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /schema graph/i }),
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const saveImageButton = screen.getByRole("button", {
      name: /Save Graph Image to CMDB/i,
    });
    await fireEvent.click(saveImageButton);

    screen.logTestingPlaygroundURL();

    expect(
      vi.mocked(NVL.prototype.saveFullGraphToLargeFile),
    ).toHaveBeenCalled();
  });
});
