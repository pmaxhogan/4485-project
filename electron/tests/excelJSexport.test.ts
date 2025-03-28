import { describe, it, vi, expect, beforeEach } from "vitest";
import fs from "fs";
import ExcelJS from "exceljs";
import sizeOf from "image-size";
import { saveImageToExcel } from "../excelJSexport";

describe("exceljs export functions", () => {
  vi.mock("fs");
  vi.mock("image-size");
  vi.mock("ExcelJS");

  const mockImageDataUrl = "data:image/png;base64,mockBase64String";
  const mockFilePath = "mock.xlsx";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(sizeOf).mockReturnValue({ width: 500, height: 500 });
  });

  it("save image to correct empty column", async () => {
    // create mock implementation that simulates data in first column
    const mockWorksheet = {
      getCell: vi.fn((row: number, column: number) => {
        // simulate data in A1
        if (row === 1 && column === 1) {
          return { value: "Existing Data" };
        }
        // empty cells for subsequent columns
        return { value: null };
      }),
      addImage: vi.fn(),
    };

    const mockWorkbook = {
      getWorksheet: vi.fn().mockReturnValue(mockWorksheet),
      addWorksheet: vi.fn().mockReturnValue(mockWorksheet),
      addImage: vi.fn().mockReturnValue(1),
      xlsx: {
        readFile: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
    };

    // workbook constructor should return our mock
    vi.mocked(ExcelJS.Workbook).mockImplementation(
      () => mockWorkbook as unknown as ExcelJS.Workbook,
    );

    await saveImageToExcel(mockImageDataUrl, mockFilePath);

    expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
    expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith(1);

    expect(mockWorkbook.addImage).toHaveBeenCalledWith({
      base64: "mockBase64String",
      extension: "jpeg",
    });

    // verify image is placed in the second column
    expect(mockWorksheet.addImage).toHaveBeenCalledWith(1, {
      tl: { col: 1, row: 0 },
      ext: { width: 500, height: 500 },
    });

    expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith(mockFilePath);
  });
});
