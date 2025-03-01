import * as ExcelJS from "exceljs";
import { session } from "./neo4j.ts";

//all in generics for a 3 row book

//import data from Excel file - built to currently test "AirlineServerAppV7AllProd.xlsx"

//imports the excel file - ZT
const importExcel = async (filePath: string) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1); //first sheet
  const data: {
    location: ExcelJS.CellValue;
    server: ExcelJS.CellValue;
    application: ExcelJS.CellValue;
  }[] = [];

  let totalServers = 0;
  let totalLocations = 0;

  if (!worksheet) {
    throw new Error("Worksheet is undefined.");
  }
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; //skips header

    //check if it's the last row since tom puts stuff there
    if (rowNumber === worksheet.rowCount) {
      totalServers = Number(row.getCell(2).value) || 0; //assuming total servers in second column
      totalLocations = Number(row.getCell(1).value) || 0; //assuming total locations in first
    } else {
      //otherwise in a regular data row
      data.push({
        location: row.getCell(1).value, //Location
        server: row.getCell(2).value, //Server
        application: row.getCell(4).value, //IT Application
      });
    }
  });

  console.log("Parsed Excel Data:", data);
  console.log(
    `Total Servers: ${totalServers}, Total Locations: ${totalLocations}`,
  );

  // Insert parsed data into Neo4j
  await insertIntoNeo4j(data);

  // Return counts if needed
  return { totalServers, totalLocations };
};

//Function to insert parsed data into Neo4j - ZT
const insertIntoNeo4j = async (
  data: {
    location: ExcelJS.CellValue;
    server: ExcelJS.CellValue;
    application: ExcelJS.CellValue;
  }[],
) => {
  for (const row of data) {
    const query = `
        MERGE (l:Location {name: $location})
        MERGE (s:Server {name: $server})
        MERGE (a:Application {name: $application})
        MERGE (l)-[:HOSTS]->(s)
        MERGE (s)-[:RUNS]->(a)
      `;

    try {
      await session.run(query, {
        location: row.location,
        server: row.server,
        application: row.application,
      });
      console.log(
        `Mapped: ${row.location} -> ${row.server} -> ${row.application}`,
      );
    } catch (error) {
      console.error("Error inserting into Neo4j:", error);
    }
  }
};

export { importExcel };
