import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { importExcel } from "../db/import.ts";

describe("importExcel", () => {
  beforeEach(() => {
    (global as { window: Window }).window.electronAPI = {
      onNeo4jStatus: vi.fn(),
      onNeo4jLog: vi.fn(),
      onNeo4jError: vi.fn(),
      onNeo4jExit: vi.fn(),
      runTestQuery: vi.fn(),
      invoke: vi.fn(),
      launchNeo4j: vi.fn(),
      checkNeo4jConnection: vi.fn(),
      openFileDialog: vi.fn(() =>
        Promise.resolve({
          filePaths: [],
        }),
      ),
      importExcel: vi.fn(() => Promise.resolve({ success: true, message: "" })),
      fetchSchemaData: vi.fn(),
      saveImageToExcel: vi.fn(),
      fetchSummaryCounts: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Should work if no file selected", async () => {
    expect(vi.mocked(window.electronAPI.openFileDialog)).not.toHaveBeenCalled();
    await importExcel();
    expect(vi.mocked(window.electronAPI.openFileDialog)).toHaveBeenCalled();
  });

  it("should work if file imports", async () => {
    vi.mocked(window.electronAPI.openFileDialog).mockImplementation(() =>
      Promise.resolve({
        filePaths: ["fakefile"],
      }),
    );

    expect(vi.mocked(window.electronAPI.openFileDialog)).not.toHaveBeenCalled();
    await importExcel();
    expect(vi.mocked(window.electronAPI.openFileDialog)).toHaveBeenCalled();
  });

  it("should work if file does not import", async () => {
    vi.mocked(window.electronAPI.openFileDialog).mockImplementation(() =>
      Promise.resolve({
        filePaths: ["fakefile"],
      }),
    );

    vi.mocked(window.electronAPI.importExcel).mockImplementation(() =>
      Promise.resolve({ success: false, message: "not ok!!" }),
    );

    expect(vi.mocked(window.electronAPI.openFileDialog)).not.toHaveBeenCalled();
    await importExcel();
    expect(vi.mocked(window.electronAPI.openFileDialog)).toHaveBeenCalled();
  });
});
//
// it("calls openFileDialog in VisualGraph on button click", async () => {
//   // get a mock version of the method to test if it is called
//   const { container } = render(App);
//
//   expect(container.querySelector(".connecting-to-neo")?.classList).toContain(
//     "neo-loading",
//   );
//
//   vi.mocked(window.electronAPI.onNeo4jStatus).mock.lastCall?.[0]("CONNECTED");
//
//   await nextTick();
//
//   vi.mocked(window.electronAPI.openFileDialog).mockResolvedValueOnce({
//     filePaths: [],
//   });
//
//   await waitForNeo(container);
//
//   const importButton = screen.getByText("Import Excel");
//   await fireEvent.click(importButton);
//
//   expect(window.electronAPI.openFileDialog).toHaveBeenCalled();
// });
