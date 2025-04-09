import { dialog, ipcMain } from "electron";
import {
  connectToNeo4j,
  fetchSchemaData,
  fetchSummaryCountsFromNeo4j,
} from "./neo4j.ts"; //you guessed it pt 2. electric boogaloo - ZT
import { runTestQuery } from "./neo4jStartup.ts";
import { win } from "./main.ts";
import { indentInline } from "./util.ts";
import { importExcel } from "./excelJSimport.ts";
import { saveImageToExcel } from "./excelJSexport.ts";

let importedExcelFile: string = "graph.xlsx";

ipcMain.handle("check-neo4j-connection", async () => {
  try {
    let finalStatus = "Checking connection...";

    await connectToNeo4j(({ status, statusMsg }) => {
      finalStatus = statusMsg;
      win?.webContents.send("connection-status-update", status);
    });
    return finalStatus;
  } catch (error) {
    console.error(
      "Error checking Neo4j connection:",
      error && indentInline(error.toString()),
    );
    return "Failed to connect to Neo4j.";
  }
});

//test query - ZT
ipcMain.handle("run-test-query", async () => {
  console.log("Received IPC call: run-test-query");
  return runTestQuery();
});

//connect excel - ZT
ipcMain.handle("import-excel", async (_, filePath: string) => {
  try {
    if (!filePath) throw new Error("No file path provided.");

    console.log(`Importing file: ${filePath}`);
    await importExcel(filePath);

    importedExcelFile = filePath; // save excel file path for excelJSexport
    return {
      success: true,
      message: `Excel file '${filePath}' imported successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Import error:", error);
      return {
        success: false,
        message: error.message || "Failed to import Excel file",
      };
    } else {
      console.error("Import error: Unknown error", error);
      return {
        success: false,
        message: "Failed to import Excel file",
      };
    }
  }
});

//file select - ZT
ipcMain.handle("open-file-dialog", async () => {
  try {
    console.log("Opening file dialog...");
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    });

    console.log("File dialog result:", result);

    if (result.canceled) {
      console.log("File selection was canceled.");
      return { filePaths: [] };
    }

    console.log("Selected file:", result.filePaths[0]);
    return { filePaths: result.filePaths };
  } catch (error) {
    console.error("Error opening file dialog:", error);
    throw error;
  }
});

//fetches schemaData - zt
ipcMain.handle("fetchSchemaData", async () => {
  return await fetchSchemaData();
});

//fetches summaryCount - zt
ipcMain.handle("fetchSummaryCounts", async () => {
  try {
    const counts = await fetchSummaryCountsFromNeo4j();
    return counts; // Sending counts back to the renderer process
  } catch (error) {
    console.error("Error fetching summary counts:", error);
    return { totalDc: 0, totalServer: 0, totalApp: 0, totalBf: 0 };
  }
});

// used for Feature: save rendered image of graph in CMDB - WK
ipcMain.handle("save-image-to-excel", async (_, imageDataUrl: string) => {
  try {
    if (!imageDataUrl) throw new Error("No image data provided.");

    await saveImageToExcel(imageDataUrl, importedExcelFile);

    return {
      success: true,
      message: `Saved to '${importedExcelFile}' successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Export error:", error);
      return {
        success: false,
        message: error.message || "Failed to export to Excel file",
      };
    } else {
      console.error("EXport error: Unknown error", error);
      return {
        success: false,
        message: "Failed to export to Excel file",
      };
    }
  }
});
