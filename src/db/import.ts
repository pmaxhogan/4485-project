//imports -ZT
export const importExcel = async () => {
  console.log("Attempting to open file dialog...");
  const result = await window.electronAPI.openFileDialog();
  console.log("File dialog response:", result);

  if (result.filePaths.length > 0) {
    console.log(`Selected file: ${result.filePaths[0]}`);
    const response = await window.electronAPI.importExcel(result.filePaths[0]);
    console.log("Import response:", response);

    if (response.success) {
      console.log("Excel file imported successfully");
    } else {
      console.error("Error:", response.message);
    }
  } else {
    console.warn("No file selected.");
  }
};
