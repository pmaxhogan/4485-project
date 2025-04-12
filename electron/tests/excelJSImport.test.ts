import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { importExcel } from "../excelJSimport";
import * as neo4jModule from "../neo4j";

// Mocks
vi.mock("../neo4j");

const mockRun = vi.fn();
const mockClose = vi.fn();

(neo4jModule.getSession as Mock).mockReturnValue({
  run: mockRun,
  close: mockClose,
});

// Prepare shared sheet mock helper
interface MockRow {
  getCell: (i: number) => { value: string | undefined };
}

const createMockSheet = (rows: string[][]) => ({
  eachRow: (callback: (row: MockRow, rowNumber: number) => void) => {
    rows.forEach((row, idx) => {
      callback(
        {
          getCell: (i: number) => ({ value: row[i - 1] }),
        },
        idx + 1,
      );
    });
  },
});

// Create mock outside the module mock so we can access it
const mockGetWorksheet = vi.fn();

// Full ExcelJS mock
vi.mock("exceljs", () => {
  class MockWorkbook {
    xlsx = {
      readFile: vi.fn().mockResolvedValue(undefined),
    };
    getWorksheet = mockGetWorksheet;
  }

  return {
    Workbook: MockWorkbook,
    __esModule: true,
  };
});

describe("importExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorksheet.mockReset(); // Reset mock between tests
  });

  describe("with all sheets present", () => {
    beforeEach(() => {
      mockGetWorksheet.mockImplementation((name: string) => {
        switch (name) {
          case "AirlineEdgeRelateBFAPv2":
            return createMockSheet([["BusinessFunc1", "App1"]]);
          case "AirlineEdgeRelateAirlineSVAP":
            return createMockSheet([["Server1", "", "App1"]]);
          case "AirlineEdgeRelateAirlineDCSV":
            return createMockSheet([["DC1", "Server1"]]);
          default:
            return undefined;
        }
      });
    });

    it("should import successfully when all sheets exist", async () => {
      await importExcel("any_path.xlsx");
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe("missing one worksheet", () => {
    beforeEach(() => {
      mockGetWorksheet.mockImplementation((name: string) => {
        if (name === "AirlineEdgeRelateBFAPv2") return undefined;
        return createMockSheet([["Placeholder", "Data"]]);
      });
    });

    it("should throw an error when a worksheet is missing", async () => {
      await expect(importExcel("any_path.xlsx")).rejects.toThrow(
        'Required sheet "AirlineEdgeRelateBFAPv2" is missing.',
      );
    });
  });

  describe("with blank lines in worksheet", () => {
    beforeEach(() => {
      mockGetWorksheet.mockImplementation((name: string) => {
        switch (name) {
          case "AirlineEdgeRelateBFAPv2":
            return createMockSheet([
              ["BusinessFunc", "Application"], // Header row
              ["BusinessFunc1", "App1"], // Valid row
              [undefined as unknown as string, undefined as unknown as string], // Blank row
              ["BusinessFunc2", "App2"], // Valid row
              ["", ""], // Empty strings
              ["BusinessFunc3", undefined as unknown as string], // Undefined value
              ["ValidFunc", "ValidApp"], // Another valid row
            ]);
          case "AirlineEdgeRelateAirlineSVAP":
            return createMockSheet([["Server", "", "App"]]);
          case "AirlineEdgeRelateAirlineDCSV":
            return createMockSheet([["DC", "Server"]]);
          default:
            return undefined;
        }
      });
    });

    it("should skip blank lines when processing worksheets", async () => {
      await importExcel("any_path.xlsx");

      // Get all business function-application relationship calls
      const bfAppCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes("n"),
      );

      // Should have 3 valid relationships (skipping header, blank, empty, undefined)
      expect(bfAppCalls.length).toBe(3);

      // Extract and verify the data
      const bfAppData = bfAppCalls.flatMap((call) => call[1]?.rows || []);
      expect(bfAppData).toEqual([
        { businessFunction: "BusinessFunc1", application: "App1" },
        { businessFunction: "BusinessFunc2", application: "App2" },
        { businessFunction: "ValidFunc", application: "ValidApp" },
      ]);
    });
  });
});
