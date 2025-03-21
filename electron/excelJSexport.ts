import ExcelJS from "exceljs";
import fs from "fs";
import sizeOf from "image-size"; // to get dimensions of image

export async function saveImageToExcel(
  imageDataUrl: string,
  filePath: string,
): Promise<void> {
  try {
    const fileExists = fs.existsSync(filePath);

    let workbook: ExcelJS.Workbook;

    if (fileExists) {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath); // read existing workbook
    } else {
      workbook = new ExcelJS.Workbook(); // create a new workbook
    }

    let worksheet = workbook.getWorksheet(1); // first sheet

    if (!worksheet) {
      worksheet = workbook.addWorksheet("Sheet 1");
    }

    const imageBase64 = imageDataUrl.split(",")[1]; // this gets the base64 string excluding the 'data:image/png;base64,'
    const imageBuffer = Buffer.from(imageBase64, "base64"); // get buffer of image to extract dimensions
    const dimensions = sizeOf(imageBuffer);
    const imgWidth = 500;
    const imgHeight = (imgWidth * dimensions.height) / dimensions.width;

    // add the image to the workbook
    const imageId = workbook.addImage({
      base64: imageBase64,
      extension: "jpeg", // adjust the extension if the image format is different
    });

    // find first empty column to place image in
    let emptyColumnIndex = 0;
    while (worksheet.getCell(1, emptyColumnIndex + 1).value) {
      emptyColumnIndex++;
    }

    // add the image to the worksheet at a specific position and size
    worksheet.addImage(imageId, {
      tl: { col: emptyColumnIndex, row: 0 },
      ext: { width: imgWidth, height: imgHeight },
    });

    // write the workbook to the file system
    await workbook.xlsx.writeFile(filePath);

    console.log(`Image saved successfully to ${filePath}`);
  } catch (error) {
    console.error("Error saving image to Excel:", error);
    throw new Error("Failed to save image to Excel");
  }
}
