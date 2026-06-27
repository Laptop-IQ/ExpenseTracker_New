import Goal from "../models/goalModel.js";

const isValidDeadline = (d) => !d || /^\d{4}-(0[1-9]|1[0-2])$/.test(d);
const isValidHex = (c) => !c || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
const uid = (req) => req.user._id || req.user.id;

// GET /api/goals
export const getGoals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { user: uid(req) };
    if (status === "done") filter.isCompleted = true;
    if (status === "active") filter.isCompleted = false;

    const goals = await Goal.find(filter).sort({ createdAt: -1 });

    const totalTarget = goals.reduce((s, g) => s + g.target, 0);
    const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
    const totalMonthly = goals.reduce((s, g) => s + g.monthly, 0);
    const onTrack = goals.filter((g) => {
      if (!g.deadline) return true;
      const [y, m] = g.deadline.split("-").map(Number);
      const now = new Date();
      return (y - now.getFullYear()) * 12 + (m - now.getMonth() - 1) >= 0;
    }).length;

    res.json({
      success: true,
      count: goals.length,
      summary: { totalTarget, totalSaved, totalMonthly, onTrack },
      goals,
    });
  } catch (err) {
    console.error("getGoals:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// GET /api/goals/:id
export const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: uid(req) });
    if (!goal)
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    res.json({ success: true, goal });
  } catch (err) {
    console.error("getGoalById:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// POST /api/goals
export const createGoal = async (req, res) => {
  try {
    const { name, target, saved, monthly, deadline, color, icon } = req.body;

    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Goal name is required" });
    if (!target || isNaN(target) || Number(target) <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Valid target amount is required" });
    if (saved !== undefined && (isNaN(saved) || Number(saved) < 0))
      return res
        .status(400)
        .json({ success: false, message: "Saved amount must be 0 or more" });
    if (monthly !== undefined && (isNaN(monthly) || Number(monthly) < 0))
      return res
        .status(400)
        .json({
          success: false,
          message: "Monthly contribution must be 0 or more",
        });
    if (!isValidDeadline(deadline))
      return res
        .status(400)
        .json({
          success: false,
          message: "Deadline must be in YYYY-MM format",
        });
    if (!isValidHex(color))
      return res
        .status(400)
        .json({ success: false, message: "Invalid color format" });

    const goal = await Goal.create({
      user: uid(req),
      name: name.trim(),
      target: Number(target),
      saved: Number(saved) || 0,
      monthly: Number(monthly) || 0,
      deadline: deadline || null,
      color: color || "#7c3aed",
      icon: icon || "piggy",
    });

    res.status(201).json({ success: true, goal });
  } catch (err) {
    console.error("createGoal:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// PUT /api/goals/:id
export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: uid(req) });
    if (!goal)
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });

    const { name, target, saved, monthly, deadline, color, icon } = req.body;

    if (name !== undefined && !name.trim())
      return res
        .status(400)
        .json({ success: false, message: "Goal name cannot be empty" });
    if (target !== undefined && (isNaN(target) || Number(target) <= 0))
      return res
        .status(400)
        .json({ success: false, message: "Valid target amount required" });
    if (saved !== undefined && (isNaN(saved) || Number(saved) < 0))
      return res
        .status(400)
        .json({ success: false, message: "Saved amount must be 0 or more" });
    if (monthly !== undefined && (isNaN(monthly) || Number(monthly) < 0))
      return res
        .status(400)
        .json({
          success: false,
          message: "Monthly contribution must be 0 or more",
        });
    if (deadline !== undefined && !isValidDeadline(deadline))
      return res
        .status(400)
        .json({
          success: false,
          message: "Deadline must be in YYYY-MM format",
        });
    if (color !== undefined && !isValidHex(color))
      return res
        .status(400)
        .json({ success: false, message: "Invalid color format" });

    if (name !== undefined) goal.name = name.trim();
    if (target !== undefined) goal.target = Number(target);
    if (saved !== undefined) goal.saved = Number(saved);
    if (monthly !== undefined) goal.monthly = Number(monthly);
    if (deadline !== undefined) goal.deadline = deadline || null;
    if (color !== undefined) goal.color = color;
    if (icon !== undefined) goal.icon = icon;

    await goal.save();
    res.json({ success: true, goal });
  } catch (err) {
    console.error("updateGoal:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// PATCH /api/goals/:id/contribute
export const contributeToGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: uid(req) });
    if (!goal)
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    if (goal.isCompleted)
      return res
        .status(400)
        .json({ success: false, message: "Goal is already completed" });

    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid contribution amount required",
        });

    const contribution = Number(amount);
    goal.saved = Math.min(goal.saved + contribution, goal.target);
    await goal.save();

    res.json({
      success: true,
      message: goal.isCompleted ? "🎉 Goal completed!" : "Contribution added",
      contributed: contribution,
      goal,
    });
  } catch (err) {
    console.error("contributeToGoal:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// DELETE /api/goals/:id
export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: uid(req),
    });
    if (!goal)
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    res.json({ success: true, message: "Goal deleted" });
  } catch (err) {
    console.error("deleteGoal:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// GET /api/goals/summary
export const getGoalsSummary = async (req, res) => {
  try {
    const goals = await Goal.find({ user: uid(req) });

    const totalTarget = goals.reduce((s, g) => s + g.target, 0);
    const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
    const totalMonthly = goals.reduce((s, g) => s + g.monthly, 0);
    const completed = goals.filter((g) => g.isCompleted).length;
    const overallPct =
      totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    res.json({
      success: true,
      summary: {
        totalGoals: goals.length,
        completed,
        active: goals.length - completed,
        totalTarget,
        totalSaved,
        totalMonthly,
        overallPct,
      },
    });
  } catch (err) {
    console.error("getGoalsSummary:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
