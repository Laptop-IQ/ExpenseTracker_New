import Income from "../models/incomeModel.js";
import Expense from "../models/expenseModel.js";

export async function getDashboardOverview(req, res) {
  const userId = req.user._id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // =========================
    // 1. TOTAL INCOME (MONTH)
    // =========================
    const incomeAgg = await Income.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // =========================
    // 2. TOTAL EXPENSE (MONTH)
    // =========================
    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const monthlyIncome = incomeAgg[0]?.total || 0;
    const monthlyExpense = expenseAgg[0]?.total || 0;

    const savings = monthlyIncome - monthlyExpense;

    const savingsRate =
      monthlyIncome === 0 ? 0 : Math.round((savings / monthlyIncome) * 100);

    // =========================
    // 3. RECENT INCOME
    // =========================
    const recentIncome = await Income.find({
      userId,
      date: { $gte: startOfMonth, $lte: now },
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // =========================
    // 4. RECENT EXPENSE
    // =========================
    const recentExpense = await Expense.find({
      userId,
      date: { $gte: startOfMonth, $lte: now },
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // =========================
    // 5. MERGE TRANSACTIONS
    // =========================
    const recentTransactions = [
      ...recentIncome.map((i) => ({
        ...i,
        type: "income",
      })),
      ...recentExpense.map((e) => ({
        ...e,
        type: "expense",
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // =========================
    // 6. EXPENSE BY CATEGORY
    // =========================
    const categoryAgg = await Expense.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const expenseDistribution = categoryAgg.map(({ _id, total }) => ({
      category: _id || "Other",
      amount: total,
      percent:
        monthlyExpense === 0 ? 0 : Math.round((total / monthlyExpense) * 100),
    }));

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      data: {
        monthlyIncome,
        monthlyExpense,
        savings,
        savingsRate,
        recentTransactions,
        expenseDistribution,
      },
    });
  } catch (err) {
    console.error("GetDashboardOverview Error:", err);

    return res.status(500).json({
      success: false,
      message: "Dashboard Fetch failed",
    });
  }
}
