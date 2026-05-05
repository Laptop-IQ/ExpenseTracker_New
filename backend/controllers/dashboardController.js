import Income from "../models/incomeModel.js";
import Expense from "../models/expenseModel.js";

export async function getDashboardOverview(req, res) {
  const userId = req.user._id;

  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  try {
    // ================= CURRENT MONTH =================

    const [incomeAgg, expenseAgg] = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfMonth, $lte: now },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfMonth, $lte: now },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const monthlyIncome = incomeAgg[0]?.total || 0;
    const monthlyExpense = expenseAgg[0]?.total || 0;

    const savings = monthlyIncome - monthlyExpense;

    const savingsRate =
      monthlyIncome === 0 ? 0 : Math.round((savings / monthlyIncome) * 100);

    // ================= PREVIOUS MONTH =================

    const [prevIncomeAgg, prevExpenseAgg] = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const previousMonthIncome = prevIncomeAgg[0]?.total || 0;
    const previousMonthExpense = prevExpenseAgg[0]?.total || 0;
    const previousMonthSavings = previousMonthIncome - previousMonthExpense;

    // ================= RECENT =================

    const [recentIncome, recentExpense] = await Promise.all([
      Income.find({
        userId,
        date: { $gte: startOfMonth, $lte: now },
      })
        .sort({ date: -1 })
        .limit(10)
        .lean(),

      Expense.find({
        userId,
        date: { $gte: startOfMonth, $lte: now },
      })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ]);

    const recentTransactions = [
      ...recentIncome.map((i) => ({ ...i, type: "income" })),
      ...recentExpense.map((e) => ({ ...e, type: "expense" })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // ================= CATEGORY =================

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

    // ================= RESPONSE =================

    return res.status(200).json({
      success: true,
      data: {
        monthlyIncome,
        monthlyExpense,
        savings,
        savingsRate,

        previousMonthIncome,
        previousMonthExpense,
        previousMonthSavings,

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
