import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { importExcel } from "../excelJSimport";
import * as neo4jModule from "../neo4j";
import { __testOnly } from "../excelJSimport";

// Mocks
vi.mock("../neo4j");

const mockRun = vi.fn();
const mockClose = vi.fn();

const { insertIntoNeo4j, storeSummaryCounts, cleanupDatabase } = __testOnly;

(neo4jModule.getSession as Mock).mockReturnValue({
  run: mockRun,
  close: mockClose,
});

//shared  mock helper
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

const mockGetWorksheet = vi.fn();

//ExcelJS mock
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
    mockGetWorksheet.mockReset(); //reset between tests
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

  describe("insertIntoNeo4j", () => {
    it("should insert provided records into Neo4j", async () => {
      const dcToServer = [{ datacenter: "DC1", server: "Server1" }];
      const serverToApp = [{ server: "Server1", application: "App1" }];
      const appToBf = [{ application: "App1", businessFunction: "BF1" }];

      await insertIntoNeo4j(dcToServer, serverToApp, appToBf);

      expect(mockRun).toHaveBeenCalledTimes(3);
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (dc:Datacenter"),
        { rows: dcToServer },
      );
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (s:Server"),
        { rows: serverToApp },
      );
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (app:Application"),
        { rows: appToBf },
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it("should skip queries with empty data", async () => {
      await insertIntoNeo4j([], [], []);
      expect(mockRun).not.toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("storeSummaryCounts", () => {
    it("should store summary counts into Neo4j", async () => {
      const mockSummaryData = [
        { type: "totalDc", count: { toNumber: () => 5 } },
        { type: "totalServer", count: { toNumber: () => 10 } },
        { type: "totalApp", count: { toNumber: () => 15 } },
        { type: "totalBf", count: { toNumber: () => 20 } },
      ];

      mockRun.mockResolvedValueOnce({
        records: mockSummaryData.map((entry) => ({
          get: (key: "type" | "count") =>
            key === "type" ? entry.type : entry.count,
        })),
      });

      await storeSummaryCounts();

      expect(mockRun).toHaveBeenCalledTimes(2);
      expect(mockRun.mock.calls[1][0]).toMatch(/MERGE \(meta:Metadata/);
      expect(mockRun.mock.calls[1][1]).toEqual({
        totalDc: 5,
        totalServer: 10,
        totalApp: 15,
        totalBf: 20,
      });
      expect(mockClose).toHaveBeenCalled();
    });

    it("should handle missing summary entries gracefully", async () => {
      mockRun.mockResolvedValueOnce({ records: [] });

      await storeSummaryCounts();

      expect(mockRun).toHaveBeenCalledTimes(2);
      expect(mockRun.mock.calls[1][1]).toEqual({
        totalDc: 0,
        totalServer: 0,
        totalApp: 0,
        totalBf: 0,
      });
    });
  });

  describe("cleanupDatabase", () => {
    it("should delete all nodes from Neo4j", async () => {
      await cleanupDatabase();

      expect(mockRun).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");
      expect(mockClose).toHaveBeenCalled();
    });

    it("should log error if deletion fails", async () => {
      const error = new Error("Failed to delete");
      mockRun.mockRejectedValueOnce(error);

      await cleanupDatabase();

      expect(mockRun).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
