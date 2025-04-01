import neo4j, { Record } from "neo4j-driver";
import { indentInline } from "./util.ts";

const password = "changethis"; //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT

export const driver = neo4j.driver(
  "bolt://localhost:7687", //neo4j Bolt URL
  neo4j.auth.basic("neo4j", password),
);

export const session = driver.session();

//the golden promise - ZT
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

//a litte test - ZT
export const runTestQuery = async (): Promise<Record[]> => {
  const session = driver.session();
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
  await wait(2000); //flat wait (helps with flow)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = driver.session();

    try {
      console.log(`Attempt ${attempt} to connect to Neo4j...`);
      await session.run("RETURN 1"); // Test query
      console.log("Neo4j connection successful.");
      updateStatus("Neo4j connection successful.");
      session.close();
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

      session.close();

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
  const session = driver.session();
  try {
    console.log("in neo4j.ts -> Fetching schema data...");

    const nodeQuery = `
      MATCH (n)
      RETURN labels(n) AS nodeType, count(n) AS nodeCount
    `;

    const relationshipQuery = `
      MATCH (a)-[r]->(b)
      RETURN labels(a) AS sourceType, type(r) AS relationshipType, labels(b) AS targetType
    `;

    //info queries
    const nodeResult = await session.run(nodeQuery);
    const relationshipResult = await session.run(relationshipQuery);

    const nodeColors: { [key: string]: string } = {
      Location: "#f47535",
      Server: "#b86eac",
      Application: "#3dbfdf",
      "Business Function": "#46a64e",
      Default: "#ffdf81",
    };

    const nodeLabels = {
      Location: "Location",
      Server: "Server",
      Application: "App",
      BusinessFunction: "BF",
      Datacenter: "DC",
    } as const;

    const edgeColors: { [key: string]: string } = {
      HOSTS: "#f6a565",
      RUNS: "#d89edc",
      Default: "#ffffff",
    };

    //process node results
    const nodes: SchemaNode[] = nodeResult.records.map((record) => {
      const nodeType: string[] = record.get("nodeType");
      type label = keyof typeof nodeLabels;

      return {
        id: Array.isArray(nodeType) ? nodeType.join(", ") : nodeType,
        label:
          nodeType.length === 1 ?
            nodeLabels[nodeType[0] as label] || nodeType
          : nodeType.join(", "),
        count: record.get("nodeCount").low, //convert Neo4j integer to JS number
        color: nodeColors[nodeType[0] || "Default"],
      };
    });

    //process relationship results
    const edges: SchemaEdge[] = relationshipResult.records.map((record) => {
      const sourceType = record.get("sourceType");
      const targetType = record.get("targetType");
      const edgeType = record.get("relationshipType");
      return {
        from: Array.isArray(sourceType) ? sourceType.join(", ") : sourceType,
        to: Array.isArray(targetType) ? targetType.join(", ") : targetType,
        id: edgeType,
        color: edgeColors[edgeType] || edgeColors["Default"],
      };
    });

    console.log("in neo4j.ts -> Schema Data Retrieved");
    return { nodes, edges }; //typeScript infers this as SchemaTreeData
  } catch (error) {
    console.error("Error fetching schema data:", error);
    throw error;
  } finally {
    await session.close();
  }
};
