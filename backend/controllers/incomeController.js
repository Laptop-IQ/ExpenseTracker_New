import incomeModel from "../models/incomeModel.js";
import ExcelJS from "exceljs";
import getDateRange from "../utils/dateFilter.js";

// ===== ADD INCOME =====
export async function addIncome(req, res) {
  const userId = req.user._id;
  const { description, amount, category, date } = req.body;

  if (!description || !amount || !category || !date) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    await incomeModel.create({
      userId,
      description,
      amount,
      category,
      date: new Date(date),
    });

    res.json({ success: true, message: "Income added successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== GET ALL INCOME =====
export async function getAllIncome(req, res) {
  const userId = req.user._id;

  try {
    const incomes = await incomeModel
      .find({ userId })
      .sort({ date: -1 })
      .lean();

    res.json(incomes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== UPDATE INCOME =====
export async function updateIncome(req, res) {
  const { id } = req.params;
  const userId = req.user._id;
  const { description, amount } = req.body;

  try {
    const updatedIncome = await incomeModel.findOneAndUpdate(
      { _id: id, userId },
      { description, amount },
      { new: true, lean: true },
    );

    if (!updatedIncome) {
      return res
        .status(404)
        .json({ success: false, message: "Income not found" });
    }

    res.json({
      success: true,
      message: "Income updated successfully.",
      data: updatedIncome,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== DELETE INCOME =====
export async function deleteIncome(req, res) {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const deletedIncome = await incomeModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deletedIncome) {
      return res
        .status(404)
        .json({ success: false, message: "Income not found" });
    }

    res.json({ success: true, message: "Income deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== INCOME OVERVIEW =====
export async function getIncomeOverview(req, res) {
  try {
    const userId = req.user._id;
    const { range = "monthly" } = req.query;
    const { start, end } = getDateRange(range);

    const incomes = await incomeModel
      .find({
        userId,
        date: { $gte: start, $lte: end },
      })
      .sort({ date: -1 })
      .lean();

    const totalIncome = incomes.reduce((acc, cur) => acc + cur.amount, 0);
    const averageIncome = incomes.length ? totalIncome / incomes.length : 0;

    const recentTransactions = incomes.slice(0, 9);

    res.json({
      success: true,
      data: {
        totalIncome,
        averageIncome,
        numberOfTransactions: incomes.length,
        recentTransactions,
        range,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== DOWNLOAD INCOME AS EXCEL (ExcelJS) =====
export async function downloadIncomeExcel(req, res) {
  const userId = req.user._id;

  try {
    const incomes = await incomeModel
      .find({ userId })
      .sort({ date: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Incomes");

    // Define columns
    worksheet.columns = [
      { header: "Description", key: "description", width: 25 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Date", key: "date", width: 20 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };

    // Add rows
    incomes.forEach((inc) => {
      worksheet.addRow({
        description: inc.description,
        amount: inc.amount,
        category: inc.category,
        date: new Date(inc.date).toLocaleDateString(),
      });
    });

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Set response headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Income_details.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // Stream file (better for production)
    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}
