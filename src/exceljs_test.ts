// need to install the exceljs package, or we can use sheetjs but it has less features
import ExcelJS from "exceljs";
//import * as fs from "fs";

async function createExcelFile() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("new sheet");

    worksheet.columns = [
        { header: "id", key: "id", width: 10},
        { header: "asset", key: "asset", width: 20},
        { header: "number", key: "number", width: 10},
    ];

    worksheet.addRow({ id: 1, asset: "function", number: 5});
    worksheet.addRow({ id: 2, asset: "servers", number: 1200});

    const imageId = workbook.addImage({
        filename: "src/assets/fun.png",
        extension: "png",
    });

    worksheet.addImage(imageId, 
        'D1:G5' // top left and bottom right corner of image 
    );

    await workbook.xlsx.writeFile("output.xlsx");
}

async function readExcelFile() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile("src/assets/test.xlsx");

    const worksheet = workbook.getWorksheet(1);

    if (worksheet) {
        const cellValue = worksheet.getCell("B2").value;
        console.log("b2: ", cellValue)
    }

    //const newSheet = workbook.addWorksheet("NewSheet"); // add new sheet
    await workbook.xlsx.writeFile("src/assets/test.xlsx");
}

createExcelFile();
readExcelFile();