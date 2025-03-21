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
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
export const fetchSchemaData = async () => {
  const session = getSession();
  try {
    console.log("Fetching structured schema data...");

    const nodeQuery = `
      MATCH (n)
      RETURN ID(n) AS id, labels(n) AS nodeType, n.name AS name
    `;

    const relationshipQuery = `
      MATCH (a)-[r]->(b)
      RETURN ID(a) AS sourceId, type(r) AS relationshipType, ID(b) AS targetId
    `;

    const nodeResult = await session.run(nodeQuery);
    const relationshipResult = await session.run(relationshipQuery);

    //map nodes
    const nodes = nodeResult.records.map((record) => {
      return {
        id: record.get("id").toString(),
        label: record.get("name") || "Unknown",
      };
    });

    //map edges
    const edges = relationshipResult.records.map((record) => {
      const sourceId = record.get("sourceId").toString();
      const targetId = record.get("targetId").toString();
      const relationshipType = record.get("relationshipType");

      //creates a unique edge ID using sourceId, targetId, and relationshipType
      const edgeId = `${sourceId}_${targetId}_${relationshipType}`;

      return {
        from: sourceId,
        to: targetId,
        id: edgeId,
      };
    });

    console.log("Schema Data Retrieved:", { nodes, edges });
    return { nodes, edges };
  } catch (error) {
    console.error("Error fetching schema data:", error);
    throw error;
  } finally {
    await session.close();
  }
};

export { getSession };
