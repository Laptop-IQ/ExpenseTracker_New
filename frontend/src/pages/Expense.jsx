/* eslint-disable no-unused-vars */
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import ReactDOM from "react-dom";
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
  Fuel,
  Scissors,
  Baby,
  Shield,
  Milk,
  Wrench,
  Coins,
  ShoppingBasket,
  Cookie,
  Sparkles,
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
import { smartDetectCategory, learnCategory } from "../utils/smartCategoryAI";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── Constants ────────────────────────────────────────────────────────────────
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
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, " ") })),
];

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly"];
const AI_DEBOUNCE_MS = 400;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function getTimeFrameRange(tf) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (tf === "daily") return { start, end: new Date(now), label: "Today" };
  if (tf === "weekly") {
    const s = new Date(start);
    s.setDate(start.getDate() - start.getDay());
    s.setHours(0, 0, 0, 0);
    return { start: s, end: new Date(now), label: "This Week" };
  }
  if (tf === "monthly")
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(now),
      label: "This Month",
    };
  if (tf === "yearly")
    return {
      start: new Date(start.getFullYear(), 0, 1),
      end: new Date(now),
      label: "This Year",
    };
  return {
    start: new Date(start.getFullYear(), start.getMonth(), 1),
    end: new Date(now),
    label: "This Month",
  };
}

function generateChartPoints(tf) {
  const now = new Date();
  const points = [];
  if (tf === "daily") {
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
  } else if (tf === "weekly") {
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
  } else if (tf === "monthly") {
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "slideInRight .25s ease-out" }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto border
            ${
              t.type === "success"
                ? "bg-white border-emerald-200 text-emerald-700 dark:bg-gray-800 dark:border-emerald-800/60 dark:text-emerald-400"
                : t.type === "error"
                  ? "bg-white border-red-200 text-red-700 dark:bg-gray-800 dark:border-red-800/60 dark:text-red-400"
                  : "bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            }`}
        >
          {t.type === "success" ? (
            <Check size={14} className="text-emerald-500 shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle size={14} className="text-red-500 shrink-0" />
          ) : (
            <Zap size={14} className="text-violet-500 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "#f97316", icon: Icon }) {
  return (
    <div
      className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-md shadow-orange-100/50 dark:shadow-black/30 hover:shadow-xl hover:shadow-orange-200/60 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300"
      style={{ animation: "glowPulse 4s ease-in-out infinite" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent + "15" }}
        >
          {Icon && <Icon size={18} style={{ color: accent }} />}
        </div>
        <button className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400" />
        </button>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5 text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight leading-none text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-2 truncate text-gray-400 dark:text-gray-500">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-sm">
      <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-orange-500 dark:text-orange-400">
        {fmtINR(Math.round(payload[0].value))}
      </p>
    </div>
  );
}

// ─── Category Pill ────────────────────────────────────────────────────────────
function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + "15", color }}
    >
      {cat.replace(/_/g, " ")}
    </span>
  );
}

// ─── TimeFrame Selector ───────────────────────────────────────────────────────
function TimeFrameSelector({ timeFrame, setTimeFrame }) {
  return (
    <div className="flex gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-1 rounded-xl w-fit">
      {TIME_FRAMES.map((f) => (
        <button
          key={f}
          onClick={() => setTimeFrame(f)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200
            ${
              timeFrame === f
                ? "bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/40"
                : "text-gray-500 hover:text-gray-700 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            }`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────────
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      >
        <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <SlidersHorizontal
            size={13}
            className="text-orange-500 dark:text-orange-400"
          />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
            Filter
          </span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {label}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`ml-auto text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-30">
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
                      ? "bg-orange-50 text-orange-600 font-semibold dark:bg-orange-500/10 dark:text-orange-400"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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

// ─── Spending Breakdown ───────────────────────────────────────────────────────
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-2 min-h-[160px] shadow-lg shadow-orange-100/30 dark:shadow-black/30">
        <Flame size={22} className="text-gray-300 dark:text-gray-600" />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No category data yet
        </p>
      </div>
    );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Flame size={15} className="text-orange-500 dark:text-orange-400" /> Top
        categories
      </h3>
      <div className="space-y-3.5">
        {breakdown.map(({ cat, amt, pct }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 font-medium">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: (CATEGORY_COLOR[cat] ?? "#94a3b8") + "15",
                    color: CATEGORY_COLOR[cat] ?? "#94a3b8",
                  }}
                >
                  {CATEGORY_ICONS[cat] || (
                    <IndianRupee className="w-3.5 h-3.5" />
                  )}
                </span>
                {cat.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                {fmtINR(amt)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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

// ─── AI Badge ─────────────────────────────────────────────────────────────────
function AiAutoDetectBadge({ detection, onDismiss }) {
  if (!detection) return null;
  const color = CATEGORY_COLOR[detection.category] ?? "#94a3b8";
  return (
    <div
      className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl border text-xs"
      style={{ background: color + "10", borderColor: color + "25" }}
    >
      <Sparkles size={11} style={{ color }} className="shrink-0" />
      <span className="text-gray-500 dark:text-gray-400 flex-1">
        Auto-selected{" "}
        <span className="font-semibold" style={{ color }}>
          {detection.category.replace(/_/g, " ")}
        </span>{" "}
        <span className="text-gray-400 dark:text-gray-500">
          ({detection.source?.startsWith("memory") ? "memory" : "AI"})
        </span>
      </span>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────
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
  const [editDetection, setEditDetection] = useState(null);
  const editDebounceRef = useRef(null);
  const color = CATEGORY_COLOR[transaction.category] ?? "#94a3b8";
  const icon = CATEGORY_ICONS[transaction.category] ?? (
    <IndianRupee className="w-4 h-4" />
  );

  const handleEditDescChange = (value) => {
    setEditForm((p) => ({ ...p, description: value }));
    clearTimeout(editDebounceRef.current);
    if (value.trim().length < 3) {
      setEditDetection(null);
      return;
    }
    editDebounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(value);
      if (result?.category && result.confidence >= 0.7) {
        setEditForm((p) => ({ ...p, category: result.category }));
        setEditDetection(result);
      } else setEditDetection(null);
    }, AI_DEBOUNCE_MS);
  };

  const validate = () => {
    const e = { description: "", amount: "" };
    if (!String(editForm.description ?? "").trim()) e.description = "Required";
    const a = String(editForm.amount ?? "").trim();
    if (!a) e.amount = "Required";
    else if (Number(a) <= 0) e.amount = "Must be > 0";
    setErrors(e);
    return !e.description && !e.amount;
  };

  const handleSave = () => {
    if (!validate()) return;
    setErrors({ description: "", amount: "" });
    learnCategory(editForm.description, editForm.category);
    onSave();
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${isEditing ? "bg-orange-50/50 dark:bg-orange-500/10" : "hover:bg-gray-50/80 dark:hover:bg-gray-700/40"}`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + "15", color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <div>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => handleEditDescChange(e.target.value)}
                className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none transition-colors placeholder-gray-300 dark:placeholder-gray-500
                  ${errors.description ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-600 focus:border-orange-400 dark:focus:border-orange-500"}`}
                placeholder="Description"
              />
              {errors.description && (
                <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                  {errors.description}
                </p>
              )}
              <AiAutoDetectBadge
                detection={editDetection}
                onDismiss={() => setEditDetection(null)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none transition-colors placeholder-gray-300 dark:placeholder-gray-500
                    ${errors.amount ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-600 focus:border-orange-400 dark:focus:border-orange-500"}`}
                  placeholder="Amount"
                  min="1"
                />
                {errors.amount && (
                  <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                    {errors.amount}
                  </p>
                )}
              </div>
              <select
                value={editForm.category}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, category: e.target.value }));
                  setEditDetection(null);
                  learnCategory(editForm.description, e.target.value);
                }}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:border-orange-400 dark:focus:border-orange-500 text-gray-600 dark:text-gray-300"
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
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
              {transaction.description}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {new Date(transaction.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-gray-200 dark:text-gray-600">·</span>
              <CategoryPill cat={transaction.category} />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-600 active:scale-95 transition-all"
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={() => {
                setErrors({ description: "", amount: "" });
                setEditDetection(null);
                onCancel();
              }}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
            >
              <X size={12} /> Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-bold text-red-500 dark:text-red-400 mr-1">
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
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 dark:text-gray-500 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 transition-colors"
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
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

// ─── Delete Modal (Portal) ────────────────────────────────────────────────────
function DeleteModal({ transaction, loading, onConfirm, onClose }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(17,24,39,0.3)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 384,
          margin: "0 16px 0",
          borderRadius: "24px 24px 0 0",
          padding: 24,
          background: "var(--dm-bg, #fff)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          animation: "slideUp .25s ease-out",
        }}
        className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 sm:rounded-2xl sm:mb-8"
      >
        {/* drag handle */}
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <Trash2 size={22} className="text-red-500 dark:text-red-400" />
          </div>
        </div>
        <h2 className="text-center text-base font-bold text-gray-900 dark:text-gray-100">
          Delete this expense?
        </h2>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
          This action cannot be undone
        </p>
        {transaction && (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 mb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                  {transaction.description}
                </p>
                <CategoryPill cat={transaction.category} />
              </div>
              <p className="font-bold text-red-500 dark:text-red-400 shrink-0">
                {fmtINR(transaction.amount)}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-95 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Add Modal (Portal) ───────────────────────────────────────────────────────
function AddTransactionModal({
  showModal,
  setShowModal,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  loading,
}) {
  const [errors, setErrors] = useState({ description: "", amount: "" });
  const [aiDetection, setAiDetection] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!showModal) {
      setAiDetection(null);
      setErrors({ description: "", amount: "" });
      clearTimeout(debounceRef.current);
    }
  }, [showModal]);

  const handleDescriptionChange = (value) => {
    setNewTransaction((p) => ({ ...p, description: value }));
    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setAiDetection(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(value);
      if (result?.category && result.confidence >= 0.7) {
        setNewTransaction((p) => ({ ...p, category: result.category }));
        setAiDetection(result);
      } else setAiDetection(null);
    }, AI_DEBOUNCE_MS);
  };

  const handleCategorySelect = (cat) => {
    setNewTransaction((p) => ({ ...p, category: cat }));
    setAiDetection(null);
    if (newTransaction.description?.trim())
      learnCategory(newTransaction.description, cat);
  };

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
    if (!validate()) return;
    setErrors({ description: "", amount: "" });
    if (newTransaction.description?.trim())
      learnCategory(newTransaction.description, newTransaction.category);
    handleAddTransaction();
    setAiDetection(null);
  };

  if (!showModal) return null;

  return ReactDOM.createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        background: "rgba(17,24,39,0.3)",
      }}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-orange-200/30 dark:shadow-black/50 ring-1 ring-orange-100/20 dark:ring-gray-700/40 sm:mb-8 sm:mx-4 max-h-[90vh] overflow-y-auto"
        style={{ animation: "slideUp .25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 pt-4 pb-3 border-b border-gray-50 dark:border-gray-700">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Add new expense
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X size={15} className="text-gray-500 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="e.g. Lunch at café"
              className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none transition-colors placeholder-gray-300 dark:placeholder-gray-500
                ${errors.description ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-500/10" : "border-gray-200 dark:border-gray-600 focus:border-orange-400 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-gray-900"}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {errors.description}
              </p>
            )}
            <AiAutoDetectBadge
              detection={aiDetection}
              onDismiss={() => setAiDetection(null)}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
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
                className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none transition-colors placeholder-gray-300 dark:placeholder-gray-500
                  ${errors.amount ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-500/10" : "border-gray-200 dark:border-gray-600 focus:border-orange-400 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-gray-900"}`}
              />
              {errors.amount && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {errors.amount}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) =>
                  setNewTransaction((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-gray-900 transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Category grid */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
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
                    onClick={() => handleCategorySelect(cat)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[10px] font-semibold transition-all active:scale-95
                      ${
                        active
                          ? "border-transparent text-white"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-800"
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
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-50 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all shadow-sm shadow-orange-200 dark:shadow-orange-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ flex: 2 }}
          >
            <Plus size={15} />
            {loading ? "Saving…" : "Add Expense"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Expense Page ────────────────────────────────────────────────────────
const ExpensePage = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions = () => {},
  } = useOutletContext();

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

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

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

  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;
    const payload = {
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      date: toIsoWithClientTime(newTransaction.date),
    };
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
      addToast(
        err?.response?.data?.message || "Failed to save expense.",
        "error",
      );
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

  const chartLabel =
    timeFrame === "daily"
      ? "Hourly"
      : timeFrame === "yearly"
        ? "Monthly"
        : "Daily";
  const visibleTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(0, 10);

  return (
    <>
      <style>{`
        @keyframes glowPulse { 0%,100% { box-shadow: 0 4px 24px rgba(249,115,22,0.10); } 50% { box-shadow: 0 8px 32px rgba(249,115,22,0.22); } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .dark .recharts-cartesian-grid line { stroke: #334155 !important; }
        .dark .recharts-cartesian-axis-tick text { fill: #64748b !important; }
      `}</style>
      <Toast toasts={toasts} />

      <div className="min-h-screen space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-orange-100/30 dark:shadow-black/30 hover:shadow-xl hover:shadow-orange-200/40 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest">
                    Expenses
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Expense Tracker
                </h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {timeFrameRange.label}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                >
                  <Download size={13} />{" "}
                  <span className="hidden xs:inline">Export</span>
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-orange-200 dark:shadow-orange-900/40"
                >
                  <Plus size={14} /> Add Expense
                </button>
              </div>
            </div>
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

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Expenses"
            value={fmtINR(totalExpense)}
            sub={timeFrameRange.label}
            icon={TrendingDown}
          />
          <StatCard
            label="Avg / Transaction"
            value={fmtINR(averageExpense)}
            sub={`${filteredTransactions.length} transactions`}
            icon={BarChart2}
          />
          <StatCard
            label="Highest Single"
            value={fmtINR(highestExpense)}
            sub="biggest spend"
            icon={ArrowUpRight}
          />
          <StatCard
            label="Total Count"
            value={filteredTransactions.length}
            sub={filter === "all" ? "all records" : "filtered"}
            icon={IndianRupee}
          />
        </div>

        {/* Chart + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-orange-100/30 dark:shadow-black/30 hover:shadow-xl hover:shadow-orange-200/40 dark:hover:shadow-black/40 transition-all duration-300 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <BarChart2
                  size={15}
                  className="text-orange-500 dark:text-orange-400"
                />{" "}
                {chartLabel} trends
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
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
                    <linearGradient
                      id="expGradLight"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#f97316"
                        stopOpacity={0.15}
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
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    width={50}
                    tickFormatter={fmtINR}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f97316"
                    fill="url(#expGradLight)"
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
                        strokeOpacity={0.3}
                      />
                    ) : null,
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <SpendingBreakdown transactions={filteredTransactions} />
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-orange-100/30 dark:shadow-black/30 hover:shadow-xl hover:shadow-orange-200/40 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-50 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <IndianRupee
                size={14}
                className="text-orange-500 dark:text-orange-400"
              />
              Transactions
              <span className="bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 w-32 sm:w-36 focus:w-44 sm:focus:w-48 transition-all outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-gray-900 placeholder-gray-300 dark:placeholder-gray-500"
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

          {/* Column header */}
          <div className="grid grid-cols-4 px-4 py-2 bg-orange-50/40 dark:bg-orange-500/5 border-b border-gray-50 dark:border-gray-700">
            {["Date", "Amount", "Description", "Category"].map((h) => (
              <span
                key={h}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
              >
                {h}
              </span>
            ))}
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700">
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
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <IndianRupee
                    size={22}
                    className="text-orange-300 dark:text-orange-400/70"
                  />
                </div>
                <p className="text-gray-700 dark:text-gray-200 font-bold text-sm">
                  No expenses found
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center max-w-xs px-4">
                  {filter === "all" && !search
                    ? "You haven't recorded any expenses yet."
                    : `No results for the current filter${search ? ` and "${search}"` : ""}.`}
                </p>
                {filter === "all" && !search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
                  >
                    <Plus size={13} /> Add your first expense
                  </button>
                )}
              </div>
            )}
          </div>

          {!showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-4 text-xs font-semibold text-orange-500 dark:text-orange-400 hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-2 border-t border-gray-50 dark:border-gray-700"
            >
              <Eye size={13} /> View all {filteredTransactions.length}{" "}
              transactions
            </button>
          )}
          {showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors flex items-center justify-center gap-2 border-t border-gray-50 dark:border-gray-700"
            >
              <EyeOff size={13} /> Show less
            </button>
          )}
        </div>
      </div>

      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={loading}
      />
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
