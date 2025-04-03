import { describe, it, expect, vi, beforeEach } from "vitest";
import * as neo4jDriver from "neo4j-driver";
import { fetchSchemaData, queries } from "../neo4j";

interface MockTransaction {
  run: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
}

interface MockSession {
  run: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  beginTransaction: () => MockTransaction;
}

interface MockDriver {
  session: () => MockSession;
}

// Mock neo4j-driver module
vi.mock("neo4j-driver", () => {
  const mockTransaction = {
    run: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };

  const mockSession = {
    run: vi.fn(),
    beginTransaction: () => mockTransaction,
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
  let mockTransaction: MockTransaction;

  beforeEach(() => {
    vi.clearAllMocks();

    // get references to the mocked objects
    mockDriver = (
      neo4jDriver as unknown as { default: { driver: () => MockDriver } }
    ).default.driver() as MockDriver;
    mockSession = mockDriver.session();
    mockTransaction = mockSession.beginTransaction();
  });

  it("should return formatted nodes and edges", async () => {
    const mockNodeRecords = [
      {
        get: vi.fn((key) => {
          if (key === "nodeType") return ["Server"];
          if (key === "nodeCount") return { low: 5 };
          if (key === "id") return "Server";
          if (key === "name") return "Server";
          return null;
        }),
      },
      {
        get: vi.fn((key) => {
          if (key === "nodeType") return ["Application"];
          if (key === "nodeCount") return { low: 10 };
          if (key === "id") return "Application";
          if (key === "name") return "Application";
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
          if (key === "sourceId") return "Server";
          if (key === "targetId") return "Application";
          return null;
        }),
      },
    ];

    mockTransaction.run.mockImplementation((query) => {
      return Promise.resolve({
        records:
          queries.nodes === query ? mockNodeRecords : mockRelationshipRecords,
      });
    });

    const result = await fetchSchemaData();

    expect(mockTransaction.run).toHaveBeenCalledTimes(2);
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(result.nodes).toEqual([
      { id: "Server", label: "Server", color: "#b86eac" },
      {
        id: "Application",
        label: "Application",
        color: "#3dbfdf",
      },
    ]);
    expect(result.edges).toEqual([
      {
        from: "Server",
        to: "Application",
        id: "Server_Application_HOSTS",
        color: "#f6a565",
      },
    ]);
  });

  it("handles errors when fetching schema data", async () => {
    const mockError = new Error("Schema query failed");
    expect(mockTransaction.run).toHaveBeenCalledTimes(0);
    mockTransaction.run.mockRejectedValueOnce(mockError);

    await expect(fetchSchemaData()).rejects.toThrow("Schema query failed");

    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalled();
  });
});
