import categoryModel from "../models/categoryModel.js";
import expenseModel from "../models/expenseModel.js";
import incomeModel from "../models/incomeModel.js";

const DEFAULT_KEYS = {
  income: ["Salary", "Extra_Income", "Freelance", "Side_Hustles", "Investment"],
  expense: [
    "Food", "Grocery", "Dairy", "Junk_Food", "Transport", "Fuel", "Housing",
    "Utilities", "Healthcare", "Service", "Shopping", "Entertainment",
    "Investment", "Personal_Care_Expenses", "Kids_Needs", "Annual_Expense",
    "Other",
  ],
};
// Where transactions go when their category is deleted.
const FALLBACK_KEY = { income: "Extra_Income", expense: "Other" };

const txModel = (type) => (type === "income" ? incomeModel : expenseModel);
const isHex = (c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c || "");
const isType = (t) => t === "income" || t === "expense";

const cleanLabel = (v) => String(v || "").replace(/\s+/g, " ").trim();
const toKey = (label) =>
  label
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "_");

const sendError = (res, err, where) => {
  console.error(`${where}:`, err);
  if (err?.code === 11000)
    return res
      .status(409)
      .json({ success: false, message: "That category already exists." });
  return res.status(500).json({ success: false, message: "Server Error" });
};

// A key clashes if a default or another record of this user already uses it.
const keyTaken = async (userId, type, key, ignoreId = null) => {
  const lower = key.toLowerCase();
  if (DEFAULT_KEYS[type].some((k) => k.toLowerCase() === lower)) return true;
  const existing = await categoryModel
    .find({ userId, type, builtin: false })
    .select("key")
    .lean();
  return existing.some(
    (c) => c.key.toLowerCase() === lower && String(c._id) !== String(ignoreId),
  );
};

// ===== GET all (+ how many transactions use each category) =====
export async function getCategories(req, res) {
  const userId = req.user._id;
  try {
    const [categories, expenseUse, incomeUse] = await Promise.all([
      categoryModel.find({ userId }).sort({ createdAt: 1 }).lean(),
      expenseModel.aggregate([
        { $match: { userId } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      incomeModel.aggregate([
        { $match: { userId } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const usage = { expense: {}, income: {} };
    expenseUse.forEach((u) => (usage.expense[u._id] = u.count));
    incomeUse.forEach((u) => (usage.income[u._id] = u.count));

    res.json({ success: true, categories, usage });
  } catch (error) {
    sendError(res, error, "getCategories");
  }
}

// ===== CREATE custom category =====
export async function addCategory(req, res) {
  const userId = req.user._id;
  const { type, icon, color } = req.body;
  const label = cleanLabel(req.body.label);

  if (!isType(type))
    return res.status(400).json({ success: false, message: "Invalid type" });
  if (!label || label.length > 30)
    return res.status(400).json({
      success: false,
      message: "Name is required (max 30 characters)",
    });
  if (color && !isHex(color))
    return res.status(400).json({ success: false, message: "Invalid colour" });

  const key = toKey(label);
  if (!key)
    return res
      .status(400)
      .json({ success: false, message: "Use letters or numbers in the name" });

  try {
    if (await keyTaken(userId, type, key))
      return res
        .status(409)
        .json({ success: false, message: "That category already exists." });

    const category = await categoryModel.create({
      userId,
      type,
      key,
      label,
      icon: icon || "Tag",
      color: color || "#6366f1",
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    sendError(res, error, "addCategory");
  }
}

// ===== UPDATE custom category (rename moves existing transactions) =====
export async function updateCategory(req, res) {
  const userId = req.user._id;
  const { id } = req.params;
  const { icon, color } = req.body;
  const label = cleanLabel(req.body.label);

  if (!label || label.length > 30)
    return res.status(400).json({
      success: false,
      message: "Name is required (max 30 characters)",
    });
  if (color && !isHex(color))
    return res.status(400).json({ success: false, message: "Invalid colour" });

  try {
    const category = await categoryModel.findOne({ _id: id, userId });
    if (!category || category.builtin)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    const newKey = toKey(label);
    if (!newKey)
      return res.status(400).json({
        success: false,
        message: "Use letters or numbers in the name",
      });

    const oldKey = category.key;
    if (newKey !== oldKey && (await keyTaken(userId, category.type, newKey, id)))
      return res
        .status(409)
        .json({ success: false, message: "That category already exists." });

    category.key = newKey;
    category.label = label;
    if (icon) category.icon = icon;
    if (color) category.color = color;
    await category.save();

    let moved = 0;
    if (newKey !== oldKey) {
      const r = await txModel(category.type).updateMany(
        { userId, category: oldKey },
        { $set: { category: newKey } },
      );
      moved = r.modifiedCount || 0;
    }

    res.json({ success: true, category, moved });
  } catch (error) {
    sendError(res, error, "updateCategory");
  }
}

// ===== Customise / hide / show a BUILT-IN category =====
export async function saveBuiltinOverride(req, res) {
  const userId = req.user._id;
  const { type, key, icon, color, hidden, label } = req.body;

  if (!isType(type) || !DEFAULT_KEYS[type].includes(key))
    return res
      .status(400)
      .json({ success: false, message: "Unknown built-in category" });
  if (color && !isHex(color))
    return res.status(400).json({ success: false, message: "Invalid colour" });

  try {
    const set = { label: cleanLabel(label) || key.replace(/_/g, " ") };
    if (icon) set.icon = icon;
    if (color) set.color = color;
    if (typeof hidden === "boolean") set.hidden = hidden;

    const category = await categoryModel.findOneAndUpdate(
      { userId, type, key },
      { $set: { ...set, builtin: true } },
      { new: true, upsert: true, lean: true },
    );
    res.json({ success: true, category });
  } catch (error) {
    sendError(res, error, "saveBuiltinOverride");
  }
}

// ===== DELETE: custom -> removed (transactions moved), built-in override -> reset =====
export async function deleteCategory(req, res) {
  const userId = req.user._id;
  const { id } = req.params;

  try {
    const category = await categoryModel.findOne({ _id: id, userId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    let moved = 0;
    if (!category.builtin) {
      const fallback = FALLBACK_KEY[category.type];
      const r = await txModel(category.type).updateMany(
        { userId, category: category.key },
        { $set: { category: fallback } },
      );
      moved = r.modifiedCount || 0;
    }
    await category.deleteOne();

    res.json({
      success: true,
      moved,
      movedTo: FALLBACK_KEY[category.type],
    });
  } catch (error) {
    sendError(res, error, "deleteCategory");
  }
}
