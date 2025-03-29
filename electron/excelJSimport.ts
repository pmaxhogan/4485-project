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

let summaryCounts: SummaryCounts | null = null;

//imports excel - zt
const importExcel = async (filePath: string) => {
  console.log("Starting Excel import from:", filePath);

  //creating workbook and assigning sheets
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const informationSheet = workbook.getWorksheet(
    "AirlineNodeCI-BF-AP-DC-SV-v2",
  );
  const appToBfSheet = workbook.getWorksheet("AirlineEdgeRelateBFAPv2");
  const serverToAppSheet = workbook.getWorksheet(
    "AirlineEdgeRelateAirlineSVAP",
  );
  const dcToServerSheet = workbook.getWorksheet("AirlineEdgeRelateAirlineDCSV");

  console.log("Sheets Found:", {
    informationSheet: !!informationSheet,
    appToBfSheet: !!appToBfSheet,
    serverToAppSheet: !!serverToAppSheet,
    dcToServerSheet: !!dcToServerSheet,
  });

  if (
    !informationSheet ||
    !appToBfSheet ||
    !serverToAppSheet ||
    !dcToServerSheet
  ) {
    throw new Error("One or more required sheets are missing.");
  }

  const appToBfData: AppToBfData[] = [];
  const serverToAppData: ServerToAppData[] = [];
  const dcToServerData: DcToServerData[] = [];

  //keep track of node totals
  const uniqueApp = new Set(),
    uniqueBf = new Set(),
    uniqueServers = new Set(),
    uniqueDc = new Set();

  //application to Business Function mapping
  appToBfSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const businessFunction = row.getCell(1).value?.toString().trim() || "";
    const application = row.getCell(2).value?.toString().trim() || "";

    if (businessFunction && application) {
      appToBfData.push({ application, businessFunction });
      uniqueApp.add(application);
      uniqueBf.add(businessFunction);
      console.log(`Mapped App -> BF: ${application} -> ${businessFunction}`);
    }
  });

  //server to Application mapping
  serverToAppSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const server = row.getCell(1).value?.toString().trim() || "";
    const application = row.getCell(3).value?.toString().trim() || "";
    if (server && application) {
      serverToAppData.push({ server, application });
      uniqueServers.add(server);
      console.log(`Mapped Server -> App: ${server} -> ${application}`);
    }
  });

  //datacenter to Server mapping
  dcToServerSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const datacenter = row.getCell(1).value?.toString().trim() || "";
    const server = row.getCell(2).value?.toString().trim() || "";
    if (datacenter && server) {
      dcToServerData.push({ datacenter, server });
      uniqueDc.add(datacenter);
      console.log(`Mapped DC -> Server: ${datacenter} -> ${server}`);
    }
  });

  summaryCounts = {
    totalDc: uniqueDc.size,
    totalServer: uniqueServers.size,
    totalApp: uniqueApp.size,
    totalBf: uniqueBf.size,
  };

  await storeSummaryCounts(summaryCounts);
  console.log("Inserting data into Neo4j...");
  await insertIntoNeo4j(dcToServerData, serverToAppData, appToBfData);
  console.log("Data import completed successfully.");
};

//inserts into neo4j - zt
const insertIntoNeo4j = async (
  dcToServer: DcToServerData[],
  serverToApp: ServerToAppData[],
  appToBf: AppToBfData[],
) => {
  const session = getSession();
  try {
    //Insert Datacenter -> Server relationships
    for (const row of dcToServer) {
      console.log(
        `Inserting DC -> Server into Neo4j: ${row.datacenter} -> ${row.server}`,
      );
      await session.run(
        `MERGE (dc:Datacenter {name: $datacenter})
         MERGE (s:Server {name: $server})
         MERGE (dc)-[:HOSTS]->(s)`,
        row,
      );
    }

    //insert Server -> Application relationships
    for (const row of serverToApp) {
      console.log(
        `Inserting Server -> App into Neo4j: ${row.server} -> ${row.application}`,
      );
      await session.run(
        `MERGE (s:Server {name: $server})
         MERGE (app:Application {name: $application})
         MERGE (s)-[:RUNS]->(app)`,
        row,
      );
    }

    //insert Application -> Business Function relationships
    for (const row of appToBf) {
      console.log(
        `Inserting App -> BF into Neo4j: ${row.application} -> ${row.businessFunction}`,
      );
      await session.run(
        `MERGE (app:Application {name: $application})
         MERGE (bf:BusinessFunction {name: $businessFunction})
         MERGE (app)-[:USES]->(bf)`,
        row,
      );
    }
  } catch (error) {
    console.error("Error inserting data into Neo4j:", error);
  } finally {
    await session.close();
  }
};

const storeSummaryCounts = async (counts: SummaryCounts) => {
  const session = getSession();
  try {
    await session.run(
      `MERGE (meta:Metadata {name: "SummaryCounts"})
       SET meta.totalDc = $totalDc,
           meta.totalServer = $totalServer,
           meta.totalApp = $totalApp,
           meta.totalBf = $totalBf`,
      counts,
    );
    console.log("Summary counts stored in Neo4j.");
  } catch (error) {
    console.error("Error storing summary counts:", error);
  } finally {
    await session.close();
  }
};

export { importExcel };
