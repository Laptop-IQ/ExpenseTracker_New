import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (data, fileName = "transactions") => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      alert("No data to export!");
      return;
    }

    // Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");

    // Extract headers dynamically
    const headers = Object.keys(data[0]);

    // Add header row
    worksheet.addRow(headers);

    // Style header (optional but production-friendly)
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => item[header]);
      worksheet.addRow(row);
    });

    // Auto-width columns
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 2, 15),
    }));

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Save file
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Error exporting data. Please try again.");
  }
};
