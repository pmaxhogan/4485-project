import * as ExcelJS from "exceljs";
import { getSession } from "./neo4j.ts";

interface AppToBfData {
  businessFunction: string;
  application: string;
}

interface ServerToAppData {
  server: string;
  application: string;
}

interface DcToServerData {
  datacenter: string;
  server: string;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(
    new Map(arr.map((item) => [JSON.stringify(item), item])).values(),
  );
}

//imports excel - zt
//##REFACTORED
const importExcel = async (filePath: string) => {
  await cleanupDatabase();

  console.log("Starting Excel import from:", filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  //valid sheet names
  type SheetType = "appToBf" | "serverToApp" | "dcToServer";

  const sheets: { name: string; type: SheetType; cols: [number, number] }[] = [
    { name: "AirlineEdgeRelateBFAPv2", type: "appToBf", cols: [1, 2] },
    { name: "AirlineEdgeRelateAirlineSVAP", type: "serverToApp", cols: [1, 3] },
    { name: "AirlineEdgeRelateAirlineDCSV", type: "dcToServer", cols: [1, 2] },
  ];

  //typed record to allow indexing with SheetType
  const data: Record<
    SheetType,
    AppToBfData[] | ServerToAppData[] | DcToServerData[]
  > = {
    appToBf: [],
    serverToApp: [],
    dcToServer: [],
  };

  for (const sheetInfo of sheets) {
    const sheet = workbook.getWorksheet(sheetInfo.name);
    if (!sheet) {
      throw new Error(`Required sheet "${sheetInfo.name}" is missing.`);
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; //skip header

      const field1 =
        row.getCell(sheetInfo.cols[0]).value?.toString().trim() || "";
      const field2 =
        row.getCell(sheetInfo.cols[1]).value?.toString().trim() || "";

      //type guarding
      if (field1 && field2) {
        if (sheetInfo.type === "appToBf") {
          (data.appToBf as AppToBfData[]).push({
            application: field2,
            businessFunction: field1,
          });
        } else if (sheetInfo.type === "serverToApp") {
          (data.serverToApp as ServerToAppData[]).push({
            server: field1,
            application: field2,
          });
        } else {
          (data.dcToServer as DcToServerData[]).push({
            datacenter: field1,
            server: field2,
          });
        }

        console.log(`Mapped ${sheetInfo.type}: ${field1} -> ${field2}`);
      }
    });
  }

  console.log("Inserting data into Neo4j...");

  await insertIntoNeo4j(
    dedupe(data.dcToServer as DcToServerData[]),
    dedupe(data.serverToApp as ServerToAppData[]),
    dedupe(data.appToBf as AppToBfData[]),
  );

  console.log("Storing node count into Neo4j...");
  await storeSummaryCounts();
  console.log("Data import completed successfully.");
};

//inserts into neo4j - zt
//##REFACTORED
const insertIntoNeo4j = async (
  dcToServer: DcToServerData[],
  serverToApp: ServerToAppData[],
  appToBf: AppToBfData[],
) => {
  const session = getSession();
  type Query<T> = {
    data: T[];
    query: string;
  };

  const queries: Array<
    Query<DcToServerData> | Query<ServerToAppData> | Query<AppToBfData>
  > = [
    {
      data: dcToServer,
      query: `
      UNWIND $rows AS row
      MERGE (dc:Datacenter {name: row.datacenter})
      MERGE (s:Server {name: row.server})
      MERGE (dc)-[:HOSTS]->(s)`,
    },
    {
      data: serverToApp,
      query: `
      UNWIND $rows AS row
      MERGE (s:Server {name: row.server})
      MERGE (app:Application {name: row.application})
      MERGE (s)-[:RUNS]->(app)`,
    },
    {
      data: appToBf,
      query: `
      UNWIND $rows AS row
      MERGE (app:Application {name: row.application})
      MERGE (bf:BusinessFunction {name: row.businessFunction})
      MERGE (app)-[:USES]->(bf)`,
    },
  ];

  try {
    for (const queryObj of queries) {
      const { data, query } = queryObj;

      if (data.length === 0) {
        console.log(
          `No data for ${queryObj.query.split("\n")[0]} - Skipping...`,
        );
        continue;
      }

      console.log(`Inserting ${data.length} records into Neo4j...`);
      await session.run(query, { rows: data });
    }

    console.log("Data successfully inserted into Neo4j.");
  } catch (error) {
    console.error("Error inserting data into Neo4j:", error);
  } finally {
    await session.close();
  }
};

//counts and stores total node counts as metadata
const storeSummaryCounts = async () => {
  const session = getSession();
  const nodeTypes = ["Datacenter", "Server", "Application", "BusinessFunction"];
  const typeMappings: Record<string, string> = {
    Datacenter: "totalDc",
    Server: "totalServer",
    Application: "totalApp",
    BusinessFunction: "totalBf",
  };

  try {
    //dynamic query
    const query = nodeTypes
      .map(
        (type) =>
          `MATCH (n:${type}) RETURN "${typeMappings[type]}" AS type, count(n) AS count`,
      )
      .join(" UNION ALL ");

    const result = await session.run(query);

    //results into a key-value object
    const summaryCounts = nodeTypes.reduce(
      (acc, type) => {
        acc[typeMappings[type]] = 0; //to prevent undefined values
        return acc;
      },
      {} as Record<string, number>,
    );

    result.records.forEach((record) => {
      summaryCounts[record.get("type")] = record.get("count");
    });

    //dynamic cypher query
    const setClause = Object.keys(summaryCounts)
      .map((key) => `meta.${key} = $${key}`)
      .join(",\n    ");

    await session.run(
      `MERGE (meta:Metadata {name: "SummaryCounts"})
       SET ${setClause}`,
      summaryCounts,
    );

    console.log("Summary counts stored in Neo4j:", summaryCounts);
  } catch (error) {
    console.error("Error storing summary counts:", error);
  } finally {
    await session.close();
  }
};

//cleans up the db on run
const cleanupDatabase = async () => {
  const session = getSession();
  try {
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Database cleaned up successfully.");
  } catch (error) {
    console.error("Error cleaning up the database:", error);
  } finally {
    await session.close();
  }
};

export { importExcel };

// Export internals only during testing
// At the bottom of excelJSimport.ts
export const __testOnly = {
  insertIntoNeo4j,
  storeSummaryCounts,
  cleanupDatabase,
};
