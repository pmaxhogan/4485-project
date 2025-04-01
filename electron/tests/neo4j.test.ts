import { describe, it, expect, vi, beforeEach } from "vitest";
import * as neo4jDriver from "neo4j-driver";
import { fetchSchemaData } from "../neo4j";

interface MockSession {
  run: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockDriver {
  session: () => MockSession;
}

// Mock neo4j-driver module
vi.mock("neo4j-driver", () => {
  const mockSession = {
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockDriver = {
    session: () => mockSession,
  };

  return {
    default: {
      driver: vi.fn().mockImplementation(() => mockDriver),
      auth: {
        basic: vi
          .fn()
          .mockImplementation((username, password) => ({ username, password })),
      },
    },
  };
});

describe("Neo4j Integration", () => {
  let mockDriver: MockDriver;
  let mockSession: MockSession;

  beforeEach(() => {
    vi.clearAllMocks();

    // get references to the mocked objects
    mockDriver = (
      neo4jDriver as unknown as { default: { driver: () => MockDriver } }
    ).default.driver() as MockDriver;
    mockSession = mockDriver.session();
  });

  it("should return formatted nodes and edges", async () => {
    const mockNodeRecords = [
      {
        get: vi.fn((key) => {
          if (key === "nodeType") return ["Server"];
          if (key === "nodeCount") return { low: 5 };
          return null;
        }),
      },
      {
        get: vi.fn((key) => {
          if (key === "nodeType") return ["Application"];
          if (key === "nodeCount") return { low: 10 };
          return null;
        }),
      },
    ];

    const mockRelationshipRecords = [
      {
        get: vi.fn((key) => {
          if (key === "sourceType") return ["Server"];
          if (key === "targetType") return ["Application"];
          if (key === "relationshipType") return "HOSTS";
          return null;
        }),
      },
    ];

    mockSession.run
      .mockResolvedValueOnce({ records: mockNodeRecords })
      .mockResolvedValueOnce({ records: mockRelationshipRecords });

    const result = await fetchSchemaData();

    expect(mockSession.run).toHaveBeenCalledTimes(2);
    expect(mockSession.close).toHaveBeenCalled();
    expect(result.nodes).toEqual([
      { id: "Server", label: "Server", count: 5, color: "#b86eac" },
      {
        id: "Application",
        label: "Application",
        count: 10,
        color: "#3dbfdf",
      },
    ]);
    expect(result.edges).toEqual([
      { from: "Server", to: "Application", id: "HOSTS", color: "#f6a565" },
    ]);
  });

  it("handles errors when fetching schema data", async () => {
    const mockError = new Error("Schema query failed");
    mockSession.run.mockRejectedValueOnce(mockError);

    await expect(fetchSchemaData()).rejects.toThrow("Schema query failed");

    expect(mockSession.close).toHaveBeenCalled();
  });
});
