import expenseModel from "../models/expenseModel.js";
import ExcelJS from "exceljs";
import getDateRange from "../utils/dateFilter.js";

// ===== ADD Expense =====
export async function addExpense(req, res) {
  const userId = req.user._id;
  const { description, amount, category, date } = req.body;

  if (!description || !amount || !category || !date) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    await expenseModel.create({
      userId,
      description,
      amount,
      category,
      date: new Date(date),
    });

    res.json({ success: true, message: "Expense added successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== GET ALL Expense =====
export async function getAllExpense(req, res) {
  const userId = req.user._id;

  try {
    const expenses = await expenseModel
      .find({ userId })
      .sort({ date: -1 })
      .lean();

    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== UPDATE Expense =====
export async function updateExpense(req, res) {
  const { id } = req.params;
  const userId = req.user._id;
  const { description, amount } = req.body;

  try {
    const updatedExpense = await expenseModel.findOneAndUpdate(
      { _id: id, userId },
      { description, amount },
      { new: true, lean: true },
    );

    if (!updatedExpense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    res.json({
      success: true,
      message: "Expense updated successfully.",
      data: updatedExpense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== DELETE Expense =====
export async function deleteExpense(req, res) {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const deletedExpense = await expenseModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deletedExpense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    res.json({ success: true, message: "Expense deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== Expense Overview =====
export async function getExpenseOverview(req, res) {
  try {
    const userId = req.user._id;
    const { range = "monthly" } = req.query;
    const { start, end } = getDateRange(range);

    const expenses = await expenseModel
      .find({ userId, date: { $gte: start, $lte: end } })
      .sort({ date: -1 })
      .lean();

    const totalExpense = expenses.reduce((acc, cur) => acc + cur.amount, 0);
    const averageExpense = expenses.length ? totalExpense / expenses.length : 0;

    const recentTransactions = expenses.slice(0, 9);

    res.json({
      success: true,
      data: {
        totalExpense,
        averageExpense,
        numberOfTransactions: expenses.length,
        recentTransactions,
        range,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ===== DOWNLOAD Expense as Excel (ExcelJS) =====
export async function downloadExpenseExcel(req, res) {
  const userId = req.user._id;

  try {
    const expenses = await expenseModel
      .find({ userId })
      .sort({ date: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Expenses");

    // Define columns
    worksheet.columns = [
      { header: "Description", key: "description", width: 25 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Date", key: "date", width: 20 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true };

    // Add rows
    expenses.forEach((exp) => {
      worksheet.addRow({
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        date: new Date(exp.date).toLocaleDateString(),
      });
    });

    // Freeze header
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Optional: filter
    worksheet.autoFilter = "A1:D1";

    // Response headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Expense_details.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // Stream file
    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}
