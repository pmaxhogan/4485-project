import neo4j from "neo4j-driver";
import { ConnectionStatus } from "./types.ts";

//neo4j constants
const password = "changethis"; //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT
const getSession = () => driver.session();

export const driver = neo4j.driver(
  "bolt://localhost:7687", //neo4j Bolt URL
  neo4j.auth.basic("neo4j", password),
);

//the golden promise - ZT
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const queries = {
  nodes: `
        MATCH (n)
        WHERE NOT n:Metadata
        RETURN ID(n) AS id, labels(n) AS nodeType, COALESCE(n.name, "Unnamed") AS name
      `,
  relationships: `
        MATCH (a)-[r]->(b)
        RETURN ID(a) AS sourceId, type(r) AS relationshipType, ID(b) AS targetId
      `,
};

const checkConnection = async () => {
  const session = getSession();

  try {
    return await session.run("RETURN 1");
  } finally {
    await session.close();
  }
};

export const checkConnectionStatus = async () => {
  try {
    await checkConnection();
    console.log("Neo4j connection verified");
    return true;
  } catch (error) {
    console.log("Could not connect to neo4j:", error);
    return false;
  }
};

// connect to Neo4j with retries - ZT
export const connectToNeo4j = async (
  updateStatus: (s: { status: ConnectionStatus; statusMsg: string }) => void,
) => {
  const maxRetries = 5;
  const retryDelay = 10000; // 10 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to connect to Neo4j...`);
      await checkConnection();

      updateStatus({
        statusMsg: "Neo4j connection successful.",
        status: "CONNECTED",
      });
      break;
    } catch (error) {
      console.error(`Error connecting to Neo4j on attempt ${attempt}:`, error);

      if (error instanceof Error) {
        updateStatus({
          statusMsg: `Error connecting to Neo4j (Attempt ${attempt}): ${error.message}`,
          status: "PENDING",
        });
      } else {
        updateStatus({
          statusMsg: `Error connecting to Neo4j (Attempt ${attempt}): Unknown error occurred.`,
          status: "PENDING",
        });
      }

      if (attempt === maxRetries) {
        updateStatus({
          statusMsg: "Failed to connect to Neo4j after maximum retries.",
          status: "ERROR",
        });
      } else {
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await wait(retryDelay);
      }
    }
  }

  return;
};

//fetch schema data function - ZT
//##REFACTORED
export const fetchSchemaData = async () => {
  const session = getSession();
  if (!session) throw new Error("Failed to establish Neo4j session.");

  const transaction = session.beginTransaction();

  try {
    console.log("Fetching structured schema data...");

    const nodeColors: { [key: string]: string } = {
      Datacenter: "#f47535",
      Server: "#b86eac",
      Application: "#3dbfdf",
      BusinessFunction: "#46a64e",
      Default: "#ffdf81",
    };

    const edgeColors: { [key: string]: string } = {
      HOSTS: "#f6a565",
      RUNS: "#d89edc",
      Default: "#ffffff",
    };

    //run queries inside the transaction
    const [nodeResult, relationshipResult] = await Promise.all([
      transaction.run(queries.nodes),
      transaction.run(queries.relationships),
    ]);

    //process nodes and edges
    const nodes = nodeResult.records.map((record) => {
      const nodeType: string[] = record.get("nodeType");
      const id = record.get("id").toString();
      const label = record.get("name") || "Unknown";

      return {
        id: id,
        label: label,
        color: nodeColors[nodeType[0] || "Default"],
        type: nodeType[0],
      };
    });

    const edges = relationshipResult.records.map((record) => {
      const sourceId = record.get("sourceId").toString();
      const targetId = record.get("targetId").toString();
      const id = `${record.get("sourceId")}_${record.get("targetId")}_${record.get("relationshipType")}`;
      const edgeType = record.get("relationshipType");

      return {
        from: sourceId,
        to: targetId,
        id: id,
        color: edgeColors[edgeType] || edgeColors["Default"],
      };
    });

    //commit transaction
    await transaction.commit();

    console.log("Schema Data Retrieved:", { nodes, edges });
    return { nodes, edges };
  } catch (error) {
    await transaction.rollback(); //rollback transaction in case of error

    console.error("Error fetching schema data:", error);
    throw error;
  } finally {
    await session.close();
  }
};

//fetch summary count - zt
const fetchSummaryCountsFromNeo4j = async () => {
  const session = getSession();
  try {
    //using a metadata tag to hide the data later
    const result = await session.run(
      `MATCH (s:Metadata {name: "SummaryCounts"})
       RETURN s.totalDc AS totalDc,
              s.totalServer AS totalServer,
              s.totalApp AS totalApp,
              s.totalBf AS totalBf`,
    );

    if (result.records.length > 0) {
      return result.records[0].toObject();
    } else {
      console.log("No summary counts found in Neo4j.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching summary counts:", error);
    return null;
  } finally {
    await session.close();
  }
};

export { getSession, fetchSummaryCountsFromNeo4j };
