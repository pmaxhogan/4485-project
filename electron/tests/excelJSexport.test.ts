import { describe, it, vi, expect, beforeEach } from "vitest";
import fs from "fs";
import ExcelJS from "exceljs";
import sizeOf from "image-size";
import { saveImageToExcel } from "../excelJSexport";

describe("exceljs export functions", () => {
  vi.mock("fs");
  vi.mock("image-size");
  vi.mock("exceljs", () => {
    return {
      default: {
        Workbook: vi.fn(),
      },
    };
  });

  const mockImageDataUrl = "data:image/png;base64,mockBase64String";
  const mockFilePath = "mock.xlsx";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(sizeOf).mockReturnValue({ width: 500, height: 500 });
  });

  it("saves image to correct empty column", async () => {
    const mockWorksheet = {
      getCell: vi.fn((row: number, column: number) => {
        if (row === 1 && column === 1) {
          return { value: "Existing Data" };
        }
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
    expect(mockWorksheet.addImage).toHaveBeenCalledWith(1, {
      tl: { col: 1, row: 0 },
      ext: { width: 500, height: 500 },
    });
    expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith(mockFilePath);
  });

  it("should handle existing file and read workbook", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const mockWorksheet = {
      getCell: vi.fn().mockReturnValue({ value: null }),
      addImage: vi.fn(),
    };

    const mockWorkbook = {
      getWorksheet: vi.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        readFile: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
      addImage: vi.fn().mockReturnValue(1),
    };

    vi.mocked(ExcelJS.Workbook).mockImplementation(
      () => mockWorkbook as unknown as ExcelJS.Workbook,
    );

    await saveImageToExcel(mockImageDataUrl, mockFilePath);

    expect(mockWorkbook.xlsx.readFile).toHaveBeenCalledWith(mockFilePath);
    expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith(1);
  });

  it("should create a new worksheet if none exists", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const mockWorksheet = {
      getCell: vi.fn().mockReturnValue({ value: null }),
      addImage: vi.fn(),
    };

    const mockWorkbook = {
      getWorksheet: vi.fn().mockReturnValue(undefined),
      addWorksheet: vi.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
      addImage: vi.fn().mockReturnValue(1),
    };

    vi.mocked(ExcelJS.Workbook).mockImplementation(
      () => mockWorkbook as unknown as ExcelJS.Workbook,
    );

    await saveImageToExcel(mockImageDataUrl, mockFilePath);

    expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith("Sheet 1");
  });

  it("should handle errors when saving image to Excel", async () => {
    const mockError = new Error("Mock error");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    vi.mocked(ExcelJS.Workbook).mockImplementation(() => {
      throw mockError;
    });

    await expect(
      saveImageToExcel(mockImageDataUrl, mockFilePath),
    ).rejects.toThrow(
      "Failed to save image to Excel: Error: Mock error", // Adjusted to match the actual error message
    );
  });

  it("should handle unknown errors gracefully", async () => {
    const mockError = "Unknown error";
    vi.mocked(fs.existsSync).mockReturnValue(false);

    vi.mocked(ExcelJS.Workbook).mockImplementation(() => {
      throw mockError;
    });

    await expect(
      saveImageToExcel(mockImageDataUrl, mockFilePath),
    ).rejects.toThrow("Failed to save image to Excel: Unknown error");
  });
});
