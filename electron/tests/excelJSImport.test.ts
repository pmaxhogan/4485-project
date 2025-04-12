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

// Shared mock helper
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

// ExcelJS mock
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
    mockGetWorksheet.mockReset();
  });

  it("should import successfully when all sheets exist", async () => {
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

    await importExcel("any_path.xlsx");
    expect(mockRun).toHaveBeenCalled();
  });

  it("should throw an error when a worksheet is missing", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      if (name === "AirlineEdgeRelateBFAPv2") return undefined;
      return createMockSheet([["Placeholder", "Data"]]);
    });

    await expect(importExcel("any_path.xlsx")).rejects.toThrow(
      'Required sheet "AirlineEdgeRelateBFAPv2" is missing.',
    );
  });

  it("should skip blank lines when processing worksheets", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      switch (name) {
        case "AirlineEdgeRelateBFAPv2":
          return createMockSheet([
            ["BusinessFunc", "Application"],
            ["BusinessFunc1", "App1"],
            [undefined as unknown as string, undefined as unknown as string],
            ["BusinessFunc2", "App2"],
            ["", ""],
            ["BusinessFunc3", undefined as unknown as string],
            ["ValidFunc", "ValidApp"],
          ]);
        case "AirlineEdgeRelateAirlineSVAP":
          return createMockSheet([["Server", "", "App"]]);
        case "AirlineEdgeRelateAirlineDCSV":
          return createMockSheet([["DC", "Server"]]);
        default:
          return undefined;
      }
    });

    await importExcel("any_path.xlsx");

    const bfAppCalls = mockRun.mock.calls.filter((call) =>
      call[0].includes("n"),
    );

    expect(bfAppCalls.length).toBe(3);
    expect(bfAppCalls.flatMap((call) => call[1]?.rows || [])).toEqual([
      { businessFunction: "BusinessFunc1", application: "App1" },
      { businessFunction: "BusinessFunc2", application: "App2" },
      { businessFunction: "ValidFunc", application: "ValidApp" },
    ]);
  });

  it("should not duplicate valid entries", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      switch (name) {
        case "AirlineEdgeRelateBFAPv2":
          return createMockSheet([
            ["BusinessFunc", "Application"],
            ["BusinessFunc1", "App1"],
            ["BusinessFunc1", "App1"],
            ["BusinessFunc2", "App2"],
            ["BusinessFunc2", "App2"],
          ]);
        case "AirlineEdgeRelateAirlineSVAP":
          return createMockSheet([["Server1", "", "App1"]]);
        case "AirlineEdgeRelateAirlineDCSV":
          return createMockSheet([["DC1", "Server1"]]);
        default:
          return undefined;
      }
    });

    await importExcel("any_path.xlsx");

    const bfAppData = mockRun.mock.calls
      .filter((call) => call[0].includes("n"))
      .flatMap((call) => call[1]?.rows || []);

    expect(bfAppData).toEqual([
      { businessFunction: "BusinessFunc1", application: "App1" },
      { businessFunction: "BusinessFunc2", application: "App2" },
    ]);
  });

  it("should not call run for blank worksheets", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      switch (name) {
        case "AirlineEdgeRelateBFAPv2":
          return createMockSheet([[], [], []]);
        case "AirlineEdgeRelateAirlineSVAP":
          return createMockSheet([[], [], []]);
        case "AirlineEdgeRelateAirlineDCSV":
          return createMockSheet([[], [], []]);
        default:
          return undefined;
      }
    });

    await importExcel("any_path.xlsx");

    expect(
      mockRun.mock.calls.some((call) =>
        call[0].includes("MERGE (app)-[:USES]->(bf)"),
      ),
    ).toBe(false);
    expect(
      mockRun.mock.calls.some((call) =>
        call[0].includes("MERGE (dc)-[:HOSTS]->(s)"),
      ),
    ).toBe(false);
  });

  it("should process server-to-application relationships", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      switch (name) {
        case "AirlineEdgeRelateBFAPv2":
          return createMockSheet([["BusinessFunc", "Application"]]);
        case "AirlineEdgeRelateAirlineSVAP":
          return createMockSheet([
            ["Server", "", "Application"],
            ["Server1", "", "App1"],
            ["Server2", "", "App2"],
          ]);
        case "AirlineEdgeRelateAirlineDCSV":
          return createMockSheet([["DC", "Server"]]);
        default:
          return undefined;
      }
    });

    await importExcel("any_path.xlsx");

    const serverAppCalls = mockRun.mock.calls.filter((call) =>
      call[0].includes("MERGE (s)-[:RUNS]->(app)"),
    );

    expect(serverAppCalls[0][1].rows).toEqual([
      { server: "Server1", application: "App1" },
      { server: "Server2", application: "App2" },
    ]);
  });

  it("should process datacenter-to-server relationships", async () => {
    mockGetWorksheet.mockImplementation((name: string) => {
      switch (name) {
        case "AirlineEdgeRelateBFAPv2":
          return createMockSheet([["BusinessFunc", "Application"]]);
        case "AirlineEdgeRelateAirlineSVAP":
          return createMockSheet([["Server", "", "Application"]]);
        case "AirlineEdgeRelateAirlineDCSV":
          return createMockSheet([
            ["DC", "Server"],
            ["DC1", "Server1"],
            ["DC2", "Server2"],
          ]);
        default:
          return undefined;
      }
    });

    await importExcel("any_path.xlsx");

    const dcServerCalls = mockRun.mock.calls.filter((call) =>
      call[0].includes("MERGE (dc)-[:HOSTS]->(s)"),
    );

    expect(dcServerCalls[0][1].rows).toEqual([
      { datacenter: "DC1", server: "Server1" },
      { datacenter: "DC2", server: "Server2" },
    ]);
  });
});

describe("insertIntoNeo4j", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should insert provided records into Neo4j", async () => {
    const testData = {
      dcToServer: [{ datacenter: "DC1", server: "Server1" }],
      serverToApp: [{ server: "Server1", application: "App1" }],
      appToBf: [{ application: "App1", businessFunction: "BF1" }],
    };

    await insertIntoNeo4j(
      testData.dcToServer,
      testData.serverToApp,
      testData.appToBf,
    );

    expect(mockRun).toHaveBeenCalledTimes(3);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should skip queries with empty data", async () => {
    await insertIntoNeo4j([], [], []);
    expect(mockRun).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should log errors when Neo4j insertion fails", async () => {
    const error = new Error("Database connection failed");
    mockRun.mockRejectedValueOnce(error);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await insertIntoNeo4j([{ datacenter: "DC1", server: "S1" }], [], []);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error inserting data into Neo4j:",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});

describe("storeSummaryCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store summary counts into Neo4j", async () => {
    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) =>
            key === "type" ? "totalDc" : { toNumber: () => 5 },
        },
        {
          get: (key: string) =>
            key === "type" ? "totalServer" : { toNumber: () => 10 },
        },
        {
          get: (key: string) =>
            key === "type" ? "totalApp" : { toNumber: () => 15 },
        },
        {
          get: (key: string) =>
            key === "type" ? "totalBf" : { toNumber: () => 20 },
        },
      ],
    });

    await storeSummaryCounts();

    expect(mockRun).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle missing summary entries gracefully", async () => {
    mockRun.mockResolvedValueOnce({ records: [] });
    await storeSummaryCounts();
    expect(mockRun).toHaveBeenCalledTimes(2);
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
  });
});
