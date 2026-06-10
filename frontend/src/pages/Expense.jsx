/* ============================================================
   ExpensePage.jsx  —  Production-ready Expense Tracker
   All sub-components inlined. Drop-in replacement for your
   existing ExpensePage. Wire API_BASE + useOutletContext as
   before; everything else is self-contained.
   ============================================================ */

/* eslint-disable no-unused-vars */
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  IndianRupee,
  Download,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Trash2,
  X,
  ChevronDown,
  Flame,
  Zap,
  AlertCircle,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  SlidersHorizontal,
  Edit2,
  Save,
  Utensils,
  Home,
  Car,
  ShoppingCart,
  Gift,
  HeartPulse,
  PiggyBank,
  Briefcase,
  Fuel,
  Scissors,
  Baby,
  Shield,
  Milk,
  Wrench,
  Wallet,
  Coins,
  ShoppingBasket,
  Cookie,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const CATEGORY_COLOR = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Shopping: "#a855f7",
  Entertainment: "#ec4899",
  Utilities: "#14b8a6",
  Healthcare: "#ef4444",
  Housing: "#8b5cf6",
  Investment: "#10b981",
  Fuel: "#f59e0b",
  Annual_Expense: "#6366f1",
  Kids_Needs: "#06b6d4",
  Service: "#84cc16",
  Personal_Care_Expenses: "#f43f5e",
  Dairy: "#fb923c",
  Junk_Food: "#e11d48",
  Grocery: "#22c55e",
  Other: "#94a3b8",
};

const CATEGORY_ICONS = {
  Food: <Utensils className="w-4 h-4" />,
  Grocery: <ShoppingBasket className="w-4 h-4" />,
  Dairy: <Milk className="w-4 h-4" />,
  Junk_Food: <Cookie className="w-4 h-4" />,
  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Fuel: <Fuel className="w-4 h-4" />,
  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <HeartPulse className="w-4 h-4" />,
  Service: <Wrench className="w-4 h-4" />,
  Personal_Care_Expenses: <Scissors className="w-4 h-4" />,
  Kids_Needs: <Baby className="w-4 h-4" />,
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,
  Other: <IndianRupee className="w-4 h-4" />,
};

const EXPENSE_CATEGORIES = [
  "Food",
  "Grocery",
  "Dairy",
  "Junk_Food",
  "Transport",
  "Fuel",
  "Housing",
  "Utilities",
  "Healthcare",
  "Service",
  "Shopping",
  "Entertainment",
  "Investment",
  "Personal_Care_Expenses",
  "Kids_Needs",
  "Annual_Expense",
  "Other",
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Transactions" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  ...EXPENSE_CATEGORIES.map((c) => ({
    value: c,
    label: c.replace(/_/g, " "),
  })),
];

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly"];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function toIsoWithClientTime(dateValue) {
  if (!dateValue) return new Date().toISOString();
  if (typeof dateValue === "string" && dateValue.length === 10) {
    const now = new Date();
    return new Date(
      `${dateValue}T${now.toTimeString().slice(0, 8)}`,
    ).toISOString();
  }
  try {
    return new Date(dateValue).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function fmtINR(n) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function getTimeFrameRange(timeFrame) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (timeFrame === "daily")
    return { start, end: new Date(now), label: "Today" };
  if (timeFrame === "weekly") {
    const s = new Date(start);
    s.setDate(start.getDate() - start.getDay());
    s.setHours(0, 0, 0, 0);
    return { start: s, end: new Date(now), label: "This Week" };
  }
  if (timeFrame === "monthly") {
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(now),
      label: "This Month",
    };
  }
  if (timeFrame === "yearly") {
    return {
      start: new Date(start.getFullYear(), 0, 1),
      end: new Date(now),
      label: "This Year",
    };
  }
  return {
    start: new Date(start.getFullYear(), start.getMonth(), 1),
    end: new Date(now),
    label: "This Month",
  };
}

function generateChartPoints(timeFrame) {
  const now = new Date();
  const points = [];
  if (timeFrame === "daily") {
    for (let i = 0; i < 24; i++) {
      const h = new Date(now);
      h.setHours(i, 0, 0, 0);
      points.push({
        date: h,
        label: h.toLocaleTimeString([], { hour: "2-digit" }),
        hour: i,
        isCurrent: i === now.getHours(),
      });
    }
  } else if (timeFrame === "weekly") {
    const s = new Date(now);
    s.setDate(now.getDate() - now.getDay());
    s.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      points.push({
        date: d,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        isCurrent:
          d.getDate() === now.getDate() && d.getMonth() === now.getMonth(),
      });
    }
  } else if (timeFrame === "monthly") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      points.push({
        date: d,
        label: d.toLocaleDateString("en-US", { day: "numeric" }),
        isCurrent: i === now.getDate(),
      });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), i, 1);
      points.push({
        date: m,
        label: m.toLocaleDateString("en-US", { month: "short" }),
        isCurrent: i === now.getMonth(),
      });
    }
  }
  return points;
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "slideInRight .25s ease-out" }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
            pointer-events-auto border backdrop-blur-sm
            ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-white border-gray-200 text-gray-800"
            }`}
        >
          {t.type === "success" ? (
            <Check size={14} className="text-emerald-500 shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle size={14} className="text-red-500 shrink-0" />
          ) : (
            <Zap size={14} className="text-orange-400 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "#f97316", icon: Icon }) {
  return (
    <div
      className="relative bg-white rounded-2xl p-4 lg:p-5 overflow-hidden border border-gray-100
                    shadow-sm hover:shadow-md transition-shadow duration-200 group"
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-tight">
          {label}
        </p>
        {Icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-60"
            style={{ background: accent + "18", color: accent }}
          >
            <Icon size={14} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOM CHART TOOLTIP
// ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-xl text-sm">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-orange-500">
        {fmtINR(Math.round(payload[0].value))}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY PILL
// ─────────────────────────────────────────────────────────────
function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + "18", color }}
    >
      {cat.replace(/_/g, " ")}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// TIMEFRAME SELECTOR
// ─────────────────────────────────────────────────────────────
function TimeFrameSelector({ timeFrame, setTimeFrame }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {TIME_FRAMES.map((f) => (
        <button
          key={f}
          onClick={() => setTimeFrame(f)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150
            ${
              timeFrame === f
                ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTER DROPDOWN
// ─────────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const label =
    FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Filter";

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200
                   px-3 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-colors"
      >
        <SlidersHorizontal size={13} />
        <span className="max-w-[80px] truncate">{label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl
                        overflow-hidden z-30 animate-[fadeIn_.12s_ease-out]"
        >
          <div className="max-h-64 overflow-y-auto py-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2
                  ${
                    value === opt.value
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {!["all", "month", "year"].includes(opt.value) && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: CATEGORY_COLOR[opt.value] ?? "#94a3b8",
                    }}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SPENDING BREAKDOWN
// ─────────────────────────────────────────────────────────────
function SpendingBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};
    for (const t of transactions)
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, amt]) => ({
        cat,
        amt,
        pct: total ? (amt / total) * 100 : 0,
      }));
  }, [transactions]);

  if (!breakdown.length)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center gap-2 min-h-[160px]">
        <Flame size={22} className="text-gray-200" />
        <p className="text-xs text-gray-400">No category data yet</p>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Flame size={15} className="text-orange-400" />
        Top categories
      </h3>
      <div className="space-y-3.5">
        {breakdown.map(({ cat, amt, pct }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: CATEGORY_COLOR[cat] ?? "#94a3b8" }}
                />
                {cat.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-bold text-gray-700">
                {fmtINR(amt)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: CATEGORY_COLOR[cat] ?? "#94a3b8",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSACTION ITEM
// ─────────────────────────────────────────────────────────────
function TransactionItem({
  transaction,
  isEditing,
  editForm,
  setEditForm,
  onSave,
  onCancel,
  onDelete,
  setEditingId,
}) {
  const [errors, setErrors] = useState({ description: "", amount: "" });
  const color = CATEGORY_COLOR[transaction.category] ?? "#94a3b8";
  const icon = CATEGORY_ICONS[transaction.category] ?? (
    <IndianRupee className="w-4 h-4" />
  );

  const validate = () => {
    const e = { description: "", amount: "" };
    if (!String(editForm.description ?? "").trim()) e.description = "Required";
    const a = String(editForm.amount ?? "").trim();
    if (!a) e.amount = "Required";
    else if (Number(a) <= 0) e.amount = "Must be > 0";
    setErrors(e);
    return !e.description && !e.amount;
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors
      ${isEditing ? "bg-orange-50/50" : "hover:bg-gray-50/70"}`}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + "18", color }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <div>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, description: e.target.value }))
                }
                className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white outline-none transition-colors
                  ${errors.description ? "border-red-300" : "border-gray-200 focus:border-orange-400"}`}
                placeholder="Description"
              />
              {errors.description && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  {errors.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white outline-none transition-colors
                    ${errors.amount ? "border-red-300" : "border-gray-200 focus:border-orange-400"}`}
                  placeholder="Amount"
                  min="1"
                />
                {errors.amount && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {errors.amount}
                  </p>
                )}
              </div>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, category: e.target.value }))
                }
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-orange-400 text-gray-700"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 truncate">
              {transaction.description}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400">
                {new Date(transaction.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-gray-300">·</span>
              <CategoryPill cat={transaction.category} />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                if (validate()) {
                  setErrors({ description: "", amount: "" });
                  onSave();
                }
              }}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-orange-500
                         px-3 py-1.5 rounded-lg hover:bg-orange-600 active:scale-95 transition-all"
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={() => {
                setErrors({ description: "", amount: "" });
                onCancel();
              }}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100
                         px-3 py-1.5 rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
            >
              <X size={12} /> Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-bold text-red-500 mr-1">
              −₹
              {Number(transaction.amount).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <button
              onClick={() => {
                setEditForm({
                  description: transaction.description ?? "",
                  amount: transaction.amount ?? "",
                  category: transaction.category ?? "Food",
                  date: transaction.date ?? "",
                });
                setEditingId(transaction.id);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                         hover:bg-orange-50 hover:text-orange-500 transition-colors"
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                         hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DELETE MODAL
// ─────────────────────────────────────────────────────────────
function DeleteModal({ transaction, loading, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl
                      animate-[slideUp_.25s_ease-out] sm:mx-4"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <Trash2 size={22} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-center text-base font-bold text-gray-900">
          Delete this expense?
        </h2>
        <p className="text-center text-xs text-gray-400 mt-1 mb-4">
          This action cannot be undone
        </p>
        {transaction && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {transaction.description}
                </p>
                <CategoryPill cat={transaction.category} />
              </div>
              <p className="font-bold text-red-500 shrink-0">
                {fmtINR(transaction.amount)}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold
                       hover:bg-gray-200 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold
                       hover:bg-red-600 active:scale-95 transition shadow-md shadow-red-100
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD / EDIT TRANSACTION MODAL
// ─────────────────────────────────────────────────────────────
function AddTransactionModal({
  showModal,
  setShowModal,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  loading,
}) {
  const [errors, setErrors] = useState({ description: "", amount: "" });

  const validate = () => {
    const e = { description: "", amount: "" };
    if (!newTransaction.description?.trim())
      e.description = "Description is required";
    const a = parseFloat(newTransaction.amount);
    if (!newTransaction.amount) e.amount = "Amount is required";
    else if (isNaN(a) || a <= 0) e.amount = "Enter a valid amount";
    setErrors(e);
    return !e.description && !e.amount;
  };

  const handleSubmit = () => {
    if (validate()) {
      setErrors({ description: "", amount: "" });
      handleAddTransaction();
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowModal(false)}
      />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
                      animate-[slideUp_.25s_ease-out] sm:mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-3 border-b border-gray-50">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Add new expense
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center
                         hover:bg-gray-200 transition-colors"
            >
              <X size={15} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) =>
                setNewTransaction((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              placeholder="e.g. Lunch at café"
              className={`w-full px-3.5 py-3 text-sm rounded-xl border outline-none transition-colors
                ${errors.description ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-orange-400 focus:bg-white"}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Amount (₹)
              </label>
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
                min="1"
                className={`w-full px-3.5 py-3 text-sm rounded-xl border outline-none transition-colors
                  ${errors.amount ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-orange-400 focus:bg-white"}`}
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) =>
                  setNewTransaction((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 outline-none
                           focus:border-orange-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const color = CATEGORY_COLOR[cat] ?? "#94a3b8";
                const icon = CATEGORY_ICONS[cat] ?? (
                  <IndianRupee className="w-3.5 h-3.5" />
                );
                const active = newTransaction.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() =>
                      setNewTransaction((p) => ({ ...p, category: cat }))
                    }
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[10px]
                      font-semibold transition-all active:scale-95
                      ${
                        active
                          ? "border-transparent text-white"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    style={
                      active ? { background: color, borderColor: color } : {}
                    }
                  >
                    <span style={active ? {} : { color }}>{icon}</span>
                    {cat.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold
                       hover:bg-gray-200 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold
                       bg-gradient-to-r from-orange-500 to-amber-500
                       hover:from-orange-600 hover:to-amber-600
                       active:scale-95 transition-all shadow-md shadow-orange-200
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            {loading ? "Saving…" : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPENSE PAGE
// ─────────────────────────────────────────────────────────────
const ExpensePage = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions = () => {},
  } = useOutletContext();

  /* ── Local state ── */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] = useState({
    description: "",
    amount: "",
    category: "Food",
    date: new Date().toISOString().split("T")[0],
  });
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense",
    category: "Food",
  });

  /* ── Helpers ── */
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /* ── Derived data ── */
  const timeFrameRange = useMemo(
    () => getTimeFrameRange(timeFrame),
    [timeFrame],
  );
  const chartPoints = useMemo(
    () => generateChartPoints(timeFrame),
    [timeFrame],
  );

  const isDateInRange = useCallback((date, start, end) => {
    const d = new Date(date),
      s = new Date(start),
      e = new Date(end);
    d.setHours(0, 0, 0, 0);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  }, []);

  const expenseTransactions = useMemo(
    () =>
      (outletTransactions || [])
        .filter((t) => t.type === "expense")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [outletTransactions],
  );

  const timeFrameTransactions = useMemo(
    () =>
      expenseTransactions.filter((t) =>
        isDateInRange(t.date, timeFrameRange.start, timeFrameRange.end),
      ),
    [expenseTransactions, timeFrameRange, isDateInRange],
  );

  const filteredTransactions = useMemo(() => {
    let list = timeFrameTransactions;
    const now = new Date();
    if (filter === "month")
      list = list.filter(
        (t) =>
          new Date(t.date).getFullYear() === now.getFullYear() &&
          new Date(t.date).getMonth() === now.getMonth(),
      );
    else if (filter === "year")
      list = list.filter(
        (t) => new Date(t.date).getFullYear() === now.getFullYear(),
      );
    else if (filter !== "all")
      list = list.filter(
        (t) => t.category.toLowerCase() === filter.toLowerCase(),
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [timeFrameTransactions, filter, search]);

  /* ── Stats ── */
  const totalExpense = useMemo(
    () =>
      filteredTransactions.reduce(
        (s, t) => s + Math.round(Number(t.amount || 0)),
        0,
      ),
    [filteredTransactions],
  );
  const averageExpense = useMemo(
    () =>
      filteredTransactions.length
        ? Math.round(totalExpense / filteredTransactions.length)
        : 0,
    [filteredTransactions, totalExpense],
  );
  const highestExpense = useMemo(
    () =>
      filteredTransactions.reduce(
        (m, t) => Math.max(m, Number(t.amount || 0)),
        0,
      ),
    [filteredTransactions],
  );

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    if (!filteredTransactions.length) return [];
    const map = new Map();
    for (const t of filteredTransactions) {
      const d = new Date(t.date);
      const key =
        timeFrame === "daily"
          ? d.getHours()
          : timeFrame === "yearly"
            ? d.getMonth()
            : `${d.getDate()}-${d.getMonth()}`;
      map.set(key, (map.get(key) || 0) + Number(t.amount));
    }
    return chartPoints.map((point) => {
      const key =
        timeFrame === "daily"
          ? point.hour
          : timeFrame === "yearly"
            ? point.date.getMonth()
            : `${point.date.getDate()}-${point.date.getMonth()}`;
      return { ...point, expense: map.get(key) || 0 };
    });
  }, [filteredTransactions, chartPoints, timeFrame]);

  /* ── CRUD handlers ── */
  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;
    const payload = {
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      date: toIsoWithClientTime(newTransaction.date),
    };
    const tempId = `temp-${Date.now()}`;
    setShowModal(false);
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "Food",
    });
    addToast("Expense added!", "success");
    try {
      await axios.post(`${API_BASE}/expense/add`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      refreshTransactions();
    } catch (err) {
      const msg = err?.response?.data?.message;
      addToast(msg || "Failed to save expense.", "error");
    }
  }, [newTransaction, getAuthHeaders, refreshTransactions, addToast]);

  const handleEditTransaction = useCallback(async () => {
    if (!editingId || !editForm.description || !editForm.amount) return;
    const payload = {
      description: editForm.description.trim(),
      amount: parseFloat(editForm.amount),
      category: editForm.category,
      date: toIsoWithClientTime(editForm.date),
    };
    try {
      setLoading(true);
      await axios.put(`${API_BASE}/expense/update/${editingId}`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      setEditingId(null);
      addToast("Expense updated!", "success");
      refreshTransactions();
    } catch (err) {
      addToast(err?.response?.data?.message || "Update failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [editingId, editForm, getAuthHeaders, refreshTransactions, addToast]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/expense/delete/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });
      setDeleteTarget(null);
      addToast("Expense deleted.", "success");
      refreshTransactions();
    } catch (err) {
      addToast(err?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expense/downloadexcel`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const disposition = res.headers["content-disposition"];
      let filename = "expense_details.xlsx";
      if (disposition) {
        const m = disposition.match(/filename="?(.+)"?/);
        if (m?.[1]) filename = m[1];
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Export ready!", "success");
    } catch {
      addToast("Export failed.", "error");
    }
  };

  /* ── Chart trend label ── */
  const chartLabel =
    timeFrame === "daily"
      ? "Hourly"
      : timeFrame === "yearly"
        ? "Monthly"
        : "Daily";

  /* ── Visible transactions ── */
  const visibleTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(0, 10);

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <Toast toasts={toasts} />

      <div className="min-h-screen bg-gray-50/70 px-3 py-5 sm:px-5 md:px-6 lg:px-8 space-y-4">
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Title block */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full bg-orange-400"
                    style={{ animation: "pulseDot 2s ease-in-out infinite" }}
                  />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                    Expenses
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  Expense Tracker
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {timeFrameRange.label}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50
                             border border-gray-200 px-3 py-2.5 rounded-xl
                             hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <Download size={13} />
                  <span className="hidden xs:inline">Export</span>
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-white
                             bg-gradient-to-r from-orange-500 to-amber-500
                             px-4 py-2.5 rounded-xl
                             hover:from-orange-600 hover:to-amber-600
                             active:scale-95 transition-all shadow-md shadow-orange-200"
                >
                  <Plus size={14} />
                  Add Expense
                </button>
              </div>
            </div>

            {/* Timeframe tabs */}
            <div className="mt-4 overflow-x-auto">
              <TimeFrameSelector
                timeFrame={timeFrame}
                setTimeFrame={(f) => {
                  setTimeFrame(f);
                  setShowAll(false);
                }}
              />
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Expenses"
            value={fmtINR(totalExpense)}
            sub={timeFrameRange.label}
            accent="#f97316"
            icon={TrendingDown}
          />
          <StatCard
            label="Avg / Transaction"
            value={fmtINR(averageExpense)}
            sub={`${filteredTransactions.length} transactions`}
            accent="#f59e0b"
            icon={BarChart2}
          />
          <StatCard
            label="Highest Single"
            value={fmtINR(highestExpense)}
            sub="biggest spend"
            accent="#ef4444"
            icon={ArrowUpRight}
          />
          <StatCard
            label="Total Count"
            value={filteredTransactions.length}
            sub={filter === "all" ? "all records" : "filtered"}
            accent="#8b5cf6"
            icon={IndianRupee}
          />
        </div>

        {/* ── CHART + BREAKDOWN ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <BarChart2 size={15} className="text-orange-400" />
                {chartLabel} trends
              </h3>
              <span className="text-xs text-gray-400">
                {timeFrameRange.label}
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#f97316"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    width={50}
                    tickFormatter={fmtINR}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f97316"
                    fill="url(#expGrad)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: "#f97316", strokeWidth: 0 }}
                  />
                  {chartData.map((pt, i) =>
                    pt.isCurrent ? (
                      <ReferenceLine
                        key={i}
                        x={pt.label}
                        stroke="#f97316"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        strokeOpacity={0.5}
                      />
                    ) : null,
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Breakdown */}
          <SpendingBreakdown transactions={filteredTransactions} />
        </div>

        {/* ── TRANSACTIONS LIST ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* List header */}
          <div
            className="px-4 sm:px-5 py-3.5 border-b border-gray-50
                          flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <IndianRupee size={14} className="text-orange-400" />
              Transactions
              <span className="bg-orange-50 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl
                             w-32 sm:w-36 focus:w-44 sm:focus:w-48 transition-all
                             outline-none focus:border-orange-300 focus:bg-white placeholder-gray-400"
                />
              </div>
              <FilterDropdown
                value={filter}
                onChange={(v) => {
                  setFilter(v);
                  setShowAll(false);
                }}
              />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50/80">
            {visibleTransactions.length > 0 ? (
              visibleTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isEditing={editingId === transaction.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSave={handleEditTransaction}
                  onCancel={() => setEditingId(null)}
                  onDelete={(id) => {
                    const tx = filteredTransactions.find((t) => t.id === id);
                    setDeleteTarget(tx ?? { id });
                  }}
                  setEditingId={setEditingId}
                />
              ))
            ) : (
              /* Empty State */
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <IndianRupee size={22} className="text-orange-300" />
                </div>
                <p className="text-gray-600 font-bold text-sm">
                  No expenses found
                </p>
                <p className="text-gray-400 text-xs text-center max-w-xs px-4">
                  {filter === "all" && !search
                    ? "You haven't recorded any expenses yet. Add your first one."
                    : `No results for the current filter${search ? ` and "${search}"` : ""}.`}
                </p>
                {filter === "all" && !search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white
                               bg-gradient-to-r from-orange-500 to-amber-500
                               px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-orange-200"
                  >
                    <Plus size={13} />
                    Add your first expense
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Show all / Show less */}
          {!showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-4 text-xs font-bold text-orange-500
                         hover:bg-orange-50/60 transition-colors flex items-center justify-center gap-2
                         border-t border-gray-50"
            >
              <Eye size={13} />
              View all {filteredTransactions.length} transactions
            </button>
          )}
          {showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-4 text-xs font-bold text-gray-400
                         hover:bg-gray-50 transition-colors flex items-center justify-center gap-2
                         border-t border-gray-50"
            >
              <EyeOff size={13} />
              Show less
            </button>
          )}
        </div>
      </div>

      {/* ── ADD MODAL ─────────────────────────────────────────────── */}
      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={loading}
      />

      {/* ── DELETE CONFIRM ────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          transaction={deleteTarget}
          loading={loading}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default ExpensePage;
