import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App.vue";
import { screen, render, fireEvent } from "@testing-library/vue";

describe("App Component", () => {
  beforeEach(() => {
    // cast global directly to an object that contains window
    (global as { window: Window }).window.electronAPI = {
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
    };
  });

  it("calls captureGraphImage in VisualGraph on button click", async () => {
    const captureGraphImageMock = vi.fn();

    // get a mock version of the method to test if it is called
    render(App, {
      global: {
        stubs: {
          SchemaTree: {
            methods: {
              captureGraphImage: captureGraphImageMock,
            },
            // add template to avoid missing template warning
            template: "<div />",
          },
        },
      },
    });

    const saveImageButton = screen.getByRole("button", {
      name: /Save Graph Image to CMDB/i,
    });
    await fireEvent.click(saveImageButton);

    expect(captureGraphImageMock).toHaveBeenCalled();
  });
});
