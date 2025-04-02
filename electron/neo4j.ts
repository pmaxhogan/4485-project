import neo4j from "neo4j-driver";
import type { Record } from "neo4j-driver";
import { indentInline } from "./util.ts";

const password = "changethis"; //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT

export const driver = neo4j.driver(
  "bolt://localhost:7687", //neo4j Bolt URL
  neo4j.auth.basic("neo4j", password),
);

const getSession = () => driver.session();

//the golden promise - ZT
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

//a litte test - ZT
export const runTestQuery = async (): Promise<Record[]> => {
  const session = getSession();
  try {
    console.log("Running test query against Neo4j...");

    const result = await session.run("MATCH (n) RETURN n LIMIT 5");

    console.log("Test Query Result:", result.records);

    if (result.records.length === 0) {
      console.log("No nodes found in the database.");
    } else {
      result.records.forEach((record) => {
        console.log("Node:", record.get("n"));
      });
    }

    return result.records; // return the records
  } catch (error) {
    console.error(
      "Error running test query:",
      error && indentInline(error.toString()),
    );
    throw error; // propagate the error
  } finally {
    await session.close();
  }
};

// connect to Neo4j with retries - ZT
export const connectToNeo4j = async (
  updateStatus: (status: string) => void,
) => {
  const maxRetries = 5;
  const retryDelay = 10000; // 10 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = getSession();

    try {
      console.log(`Attempt ${attempt} to connect to Neo4j...`);
      await session.run("RETURN 1"); // Test query
      console.log("Neo4j connection successful.");
      updateStatus("Neo4j connection successful.");
      await session.close();
      return;
    } catch (error) {
      console.error(`Error connecting to Neo4j (Attempt ${attempt}):`, error);

      if (error instanceof Error) {
        updateStatus(
          `Error connecting to Neo4j (Attempt ${attempt}): ${error.message}`,
        );
      } else {
        updateStatus(
          `Error connecting to Neo4j (Attempt ${attempt}): Unknown error occurred.`,
        );
      }

      await session.close();

      if (attempt === maxRetries) {
        updateStatus("Failed to connect to Neo4j after maximum retries.");
        return;
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);

      // Wait for the specified delay before retrying
      await wait(retryDelay);
    }
  }
};

//fetch schema data function - ZT
//##REFACTORED
export const fetchSchemaData = async () => {
  const session = getSession();
  if (!session) throw new Error("Failed to establish Neo4j session.");

  const transaction = session.beginTransaction();

  try {
    console.log("Fetching structured schema data...");

    const queries = {
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
    if (error instanceof Error) {
      console.error("Error fetching schema data:", error.message);
    } else {
      console.error("Error fetching schema data:", error);
    }
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
