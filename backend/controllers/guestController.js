import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Income from "../models/incomeModel.js";
import Expense from "../models/expenseModel.js";
import Goal from "../models/goalModel.js";

/* ============================================================================
   GUEST / DEMO ACCOUNT

   Every guest gets a private, temporary sandbox account that is filled with
   the same demo data each time. The guest can add / edit / delete anything;
   nothing is shared with other guests or real users. When the guest logs out
   (or the sandbox expires) the whole account and its data are deleted, so the
   next guest always starts from the original demo data.
============================================================================ */

const GUEST_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const GUEST_EMAIL_DOMAIN = "guest.demo.local";

// ---------------------------------------------------------------------------
// Demo data (dates are relative to "now", so the dashboard always looks alive)
// ---------------------------------------------------------------------------

const daysAgo = (monthsBack, day) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, day, 12, 0, 0);
  // never seed a date in the future (current month)
  return d > now ? new Date(now.getTime() - 60 * 60 * 1000) : d;
};

const buildSeed = () => {
  const incomes = [];
  const expenses = [];

  // last 6 months (0 = this month)
  for (let m = 0; m < 6; m += 1) {
    incomes.push(
      { description: "Monthly salary", amount: 62000, category: "Salary", date: daysAgo(m, 1) },
      { description: "Freelance project", amount: 8000 + ((m * 1700) % 6000), category: "Freelance", date: daysAgo(m, 12) },
    );
    if (m % 2 === 0) {
      incomes.push({ description: "Mutual fund returns", amount: 3200 + m * 150, category: "Investment", date: daysAgo(m, 20) });
    }

    expenses.push(
      { description: "House rent", amount: 18000, category: "Housing", date: daysAgo(m, 2) },
      { description: "Electricity & water bill", amount: 1800 + ((m * 230) % 900), category: "Utilities", date: daysAgo(m, 5) },
      { description: "Groceries", amount: 4200 + ((m * 310) % 1500), category: "Grocery", date: daysAgo(m, 7) },
      { description: "Lunch with team", amount: 650 + ((m * 90) % 400), category: "Food", date: daysAgo(m, 9) },
      { description: "Fuel", amount: 2200 + ((m * 140) % 600), category: "Fuel", date: daysAgo(m, 11) },
      { description: "Weekend dinner", amount: 1400 + ((m * 170) % 800), category: "Food", date: daysAgo(m, 14) },
      { description: "Movie & snacks", amount: 900 + ((m * 120) % 500), category: "Entertainment", date: daysAgo(m, 16) },
      { description: "Online shopping", amount: 2500 + ((m * 420) % 2500), category: "Shopping", date: daysAgo(m, 18) },
      { description: "Metro / cab rides", amount: 1100 + ((m * 80) % 400), category: "Transport", date: daysAgo(m, 21) },
      { description: "SIP investment", amount: 5000, category: "Investment", date: daysAgo(m, 25) },
    );
    if (m % 3 === 1) {
      expenses.push({ description: "Doctor visit & medicines", amount: 1600, category: "Healthcare", date: daysAgo(m, 23) });
    }
  }

  const goals = [
    { name: "Emergency Fund", target: 200000, saved: 84000, monthly: 8000, color: "#7c3aed", icon: "piggy" },
    { name: "Goa Trip", target: 45000, saved: 31500, monthly: 4000, color: "#0ea5e9", icon: "piggy" },
    { name: "New Laptop", target: 90000, saved: 22000, monthly: 6000, color: "#10b981", icon: "piggy" },
  ];

  return { incomes, expenses, goals };
};

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

const deleteGuestData = async (userIds) => {
  if (!userIds.length) return;

  await Promise.all([
    Income.deleteMany({ userId: { $in: userIds } }),
    Expense.deleteMany({ userId: { $in: userIds } }),
    Goal.deleteMany({ user: { $in: userIds } }),
  ]);

  await User.deleteMany({ _id: { $in: userIds }, isGuest: true });
};

// Removes guests whose sandbox expired without a clean logout (closed tab...).
export const cleanupExpiredGuests = async () => {
  try {
    const expired = await User.find({
      isGuest: true,
      guestExpiresAt: { $lt: new Date() },
    }).select("_id");

    await deleteGuestData(expired.map((u) => u._id));
  } catch (err) {
    console.error("cleanupExpiredGuests:", err.message);
  }
};

// ---------------------------------------------------------------------------
// POST /api/user/guest  -> create sandbox + log in
// ---------------------------------------------------------------------------

export const startGuest = async (req, res) => {
  let guest;

  try {
    // fire and forget - never slows the response down
    cleanupExpiredGuests();

    const id = crypto.randomBytes(6).toString("hex");

    guest = await User.create({
      name: "Guest",
      email: `guest-${id}@${GUEST_EMAIL_DOMAIN}`,
      // random, unusable password - guests can never sign in through /login
      password: crypto.randomBytes(24).toString("hex"),
      isVerified: true,
      isGuest: true,
      guestExpiresAt: new Date(Date.now() + GUEST_TTL_MS),
    });

    const { incomes, expenses, goals } = buildSeed();

    await Promise.all([
      Income.insertMany(incomes.map((i) => ({ ...i, userId: guest._id }))),
      Expense.insertMany(expenses.map((e) => ({ ...e, userId: guest._id }))),
      // Goal has a pre-save hook (isCompleted), so create() instead of insertMany
      ...goals.map((g) => Goal.create({ ...g, user: guest._id })),
    ]);

    const token = jwt.sign({ id: guest._id }, process.env.JWT_SECRET, {
      expiresIn: Math.floor(GUEST_TTL_MS / 1000),
    });

    res.status(201).json({
      success: true,
      token,
      user: { name: guest.name, email: guest.email, isGuest: true },
    });
  } catch (err) {
    console.error("startGuest Error:", err);

    // do not leave a half-seeded sandbox behind
    if (guest?._id) await deleteGuestData([guest._id]).catch(() => {});

    res.status(500).json({ success: false, message: "Could not start demo. Try again." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/user/guest/end  -> logout: wipe this guest's sandbox
// ---------------------------------------------------------------------------

export const endGuest = async (req, res) => {
  try {
    if (!req.user?.isGuest) {
      return res.status(403).json({ success: false, message: "Not a guest account" });
    }

    await deleteGuestData([req.user._id]);

    res.json({ success: true });
  } catch (err) {
    console.error("endGuest Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// Middleware: actions that touch real external services / credentials
// ---------------------------------------------------------------------------

export const blockGuest = (req, res, next) => {
  if (req.user?.isGuest) {
    return res.status(403).json({
      success: false,
      message: "This action is not available in the demo account.",
    });
  }
  next();
};
