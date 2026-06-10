/* eslint-disable no-unused-vars */
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
import {
  getTimeFrameRange,
  getPreviousTimeFrameRange,
  calculateData,
} from "../components/Helpers";
import axios from "axios";
import AddTransactionModal from "../components/Add";
import GaugeCard from "../components/GaugeCard";
import {
  GAUGE_COLORS,
  COLORS,
  INCOME_CATEGORY_ICONS,
  EXPENSE_CATEGORY_ICONS,
} from "../assets/color";
import {
  Legend,
  Pie,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
} from "recharts";
import {
  ArrowDown,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  PiggyBank,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  PieChart as PieChartIcon,
  Check,
  AlertCircle,
  Zap,
  Sparkles,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── Auth helper ──────────────────────────────────────────────────────────────
const getAuthHeader = () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Date helper ──────────────────────────────────────────────────────────────
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

// ─── Currency formatter ───────────────────────────────────────────────────────
function fmtINR(n) {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

// ─── Category colour maps ─────────────────────────────────────────────────────
const INCOME_CAT_COLORS = {
  Salary: "#10b981",
  Extra_Income: "#3b82f6",
  Freelance: "#8b5cf6",
  Side_Hustles: "#f59e0b",
};
const EXPENSE_CAT_COLORS = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Shopping: "#a855f7",
  Entertainment: "#ec4899",
  Utilities: "#14b8a6",
  Healthcare: "#ef4444",
  Housing: "#8b5cf6",
  Investment: "#10b981",
  Fuel: "#f59e0b",
  Grocery: "#22c55e",
  Other: "#94a3b8",
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl text-sm font-medium
            pointer-events-auto border backdrop-blur-sm
            animate-[slideInRight_0.3s_cubic-bezier(0.34,1.56,0.64,1)]
            ${
              t.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : t.type === "error"
                  ? "bg-red-50/95 border-red-200 text-red-800"
                  : "bg-white/95 border-gray-200 text-gray-800"
            }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
            ${
              t.type === "success"
                ? "bg-emerald-100"
                : t.type === "error"
                  ? "bg-red-100"
                  : "bg-blue-100"
            }`}
          >
            {t.type === "success" ? (
              <Check size={12} className="text-emerald-600" />
            ) : t.type === "error" ? (
              <AlertCircle size={12} className="text-red-600" />
            ) : (
              <Zap size={12} className="text-blue-500" />
            )}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent, icon, badge, badgeUp }) {
  const isNeg = badge !== undefined && badge < 0;
  return (
    <div
      className="group relative bg-white rounded-2xl p-4 sm:p-5 overflow-hidden
                 border border-gray-100/80 transition-all duration-200
                 hover:border-gray-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-100"
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 inset-y-0 w-[3px] rounded-r-full"
        style={{ background: accent }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
            style={{ background: accent + "15" }}
          >
            {React.cloneElement(icon, { size: 16, style: { color: accent } })}
          </div>
          {badge !== undefined && badge !== null && (
            <span
              className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full
              ${badgeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
            >
              {badgeUp ? (
                <ArrowUpRight size={10} />
              ) : (
                <ArrowDownRight size={10} />
              )}
              {Math.abs(badge)}%
            </span>
          )}
        </div>

        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-gray-400 mt-1.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ transaction, type }) {
  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  const colorMap = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;
  const IconComponent = icons[transaction.category] || icons.Other;
  const color = colorMap[transaction.category] ?? "#94a3b8";
  const isTemp = String(transaction.id).startsWith("temp-");

  return (
    <div
      className={`flex items-center gap-3 py-3 px-3 sm:px-4 rounded-xl
        transition-colors hover:bg-gray-50 ${isTemp ? "opacity-50" : ""}`}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + "15" }}
      >
        <span style={{ color, fontSize: 15 }}>{IconComponent}</span>
      </div>

      {/* Description + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">
          {transaction.description}
        </p>
        <span
          className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
          style={{ background: color + "15", color }}
        >
          {transaction.category?.replace(/_/g, " ")}
        </span>
      </div>

      {/* Amount + date */}
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-bold tabular-nums leading-tight
          ${type === "income" ? "text-emerald-600" : "text-rose-500"}`}
        >
          {type === "income" ? "+" : "−"}
          {fmtINR(Math.abs(transaction.amount))}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {new Date(transaction.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Pie Tooltip ──────────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-[11px] text-gray-400 mb-0.5">{payload[0].name}</p>
      <p className="text-sm font-bold text-gray-900 tabular-nums">
        {fmtINR(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, countColor, badge, right }) {
  return (
    <div className="px-4 sm:px-5 py-3.5 border-b border-gray-50 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-sm font-semibold text-gray-700 truncate">
          {title}
        </span>
        {count !== undefined && (
          <span
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${countColor}`}
          >
            {count}
          </span>
        )}
      </div>
      {right && (
        <span className="text-[11px] text-gray-400 shrink-0">{right}</span>
      )}
    </div>
  );
}

// ─── Show More Button ─────────────────────────────────────────────────────────
function ShowMoreBtn({ expanded, count, onToggle, color }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full py-3 text-[13px] font-semibold transition-colors
        flex items-center justify-center gap-1.5 border-t border-gray-50
        ${color}`}
    >
      {expanded ? (
        <>
          <ChevronUp size={13} /> Show less
        </>
      ) : (
        <>
          <ChevronDown size={13} /> View all {count}
        </>
      )}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, message }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
  } = useOutletContext();

  const [showModal, setShowModal] = useState(false);
  const [gaugeData, setGaugeData] = useState([]);
  const [loading] = useState(false);
  const [overviewMeta, setOverviewMeta] = useState({});
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense",
    category: "Food",
  });

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Date ranges ───────────────────────────────────────────────────────────
  const timeFrameRange = useMemo(
    () => getTimeFrameRange(timeFrame),
    [timeFrame],
  );
  const prevTimeFrameRange = useMemo(
    () => getPreviousTimeFrameRange(timeFrame),
    [timeFrame],
  );

  const isDateInRange = useCallback((date, start, end) => {
    const d = new Date(date).getTime();
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  }, []);

  // ── Filtered transactions ─────────────────────────────────────────────────
  const filteredTransactions = useMemo(
    () =>
      (outletTransactions || []).filter((t) =>
        isDateInRange(t.date, timeFrameRange.start, timeFrameRange.end),
      ),
    [outletTransactions, timeFrameRange, isDateInRange],
  );

  const prevFilteredTransactions = useMemo(
    () =>
      (outletTransactions || []).filter((t) =>
        isDateInRange(t.date, prevTimeFrameRange.start, prevTimeFrameRange.end),
      ),
    [outletTransactions, prevTimeFrameRange, isDateInRange],
  );

  // ── Aggregates ────────────────────────────────────────────────────────────
  const currentData = useMemo(() => {
    const d = calculateData(filteredTransactions);
    d.savings = d.income - d.expenses;
    return d;
  }, [filteredTransactions]);

  const prevData = useMemo(() => {
    const d = calculateData(prevFilteredTransactions);
    d.savings = d.income - d.expenses;
    return d;
  }, [prevFilteredTransactions]);

  // ── Gauge data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const income =
      timeFrame === "monthly" && overviewMeta.monthlyIncome != null
        ? overviewMeta.monthlyIncome
        : currentData.income;
    const expenses =
      timeFrame === "monthly" && overviewMeta.monthlyExpense != null
        ? overviewMeta.monthlyExpense
        : currentData.expenses;
    const savings = income - expenses;
    setGaugeData([
      { name: "Income", value: income, max: Math.max(income, 5000) },
      { name: "Spent", value: expenses, max: Math.max(expenses, 3000) },
      {
        name: "Savings",
        value: savings,
        max: Math.max(Math.abs(savings), 2000),
      },
    ]);
  }, [currentData, overviewMeta, timeFrame]);

  // ── Display values ────────────────────────────────────────────────────────
  const displayIncome =
    timeFrame === "monthly" && overviewMeta.monthlyIncome != null
      ? overviewMeta.monthlyIncome
      : currentData.income;
  const displayExpenses =
    timeFrame === "monthly" && overviewMeta.monthlyExpense != null
      ? overviewMeta.monthlyExpense
      : currentData.expenses;
  const displaySavings = displayIncome - displayExpenses;

  const expenseChange = useMemo(() => {
    const prev =
      timeFrame === "monthly" && overviewMeta.previousMonthExpense
        ? overviewMeta.previousMonthExpense
        : prevData.expenses;
    if (!prev) return null;
    return Math.round(((displayExpenses - prev) / prev) * 100);
  }, [overviewMeta, prevData, displayExpenses, timeFrame]);

  const savingsPct =
    displayIncome > 0 ? Math.round((displaySavings / displayIncome) * 100) : 0;

  // ── Pie data ──────────────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    if (timeFrame === "monthly" && overviewMeta.expenseDistribution?.length) {
      return overviewMeta.expenseDistribution.map((d) => ({
        name: d.category,
        value: Math.round(Number(d.amount) || 0),
      }));
    }
    const cats = {};
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    return Object.entries(cats).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [filteredTransactions, overviewMeta, timeFrame]);

  // ── Transaction lists ─────────────────────────────────────────────────────
  const serverRecent = overviewMeta.recentTransactions || [];

  const incomeTransactions = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "income")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredTransactions],
  );
  const expenseTransactions = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "expense")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredTransactions],
  );

  const incomeList =
    timeFrame === "monthly" &&
    serverRecent.filter((t) => t.type === "income").length > 0
      ? serverRecent
          .filter((t) => t.type === "income")
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      : incomeTransactions;

  const expenseList =
    timeFrame === "monthly" &&
    serverRecent.filter((t) => t.type === "expense").length > 0
      ? serverRecent
          .filter((t) => t.type === "expense")
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      : expenseTransactions;

  const displayedIncome = showAllIncome ? incomeList : incomeList.slice(0, 4);
  const displayedExpense = showAllExpense
    ? expenseList
    : expenseList.slice(0, 4);

  // ── Fetch dashboard overview ──────────────────────────────────────────────
  const fetchDashboardOverview = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, {
        headers: getAuthHeader(),
      });
      if (res?.data?.success) {
        const data = res.data.data;
        const recent = (data.recentTransactions || []).map((item) => {
          const type = item.type || (item.category ? "expense" : "income");
          return {
            id: item._id || item.id || Date.now() + Math.random(),
            date: item.date
              ? new Date(item.date).toISOString()
              : new Date().toISOString(),
            description: item.description || item.note || item.title || type,
            amount: Number(item.amount) || 0,
            type,
            category: item.category || (type === "income" ? "Salary" : "Other"),
          };
        });
        setOverviewMeta({
          monthlyIncome: Number(data.monthlyIncome || 0),
          monthlyExpense: Number(data.monthlyExpense || 0),
          previousMonthIncome: Number(data.previousMonthIncome || 0),
          previousMonthExpense: Number(data.previousMonthExpense || 0),
          previousMonthSavings: Number(data.previousMonthSavings || 0),
          savings:
            data.savings != null
              ? Number(data.savings)
              : Number(data.monthlyIncome || 0) -
                Number(data.monthlyExpense || 0),
          savingsRate: data.savingsRate ?? null,
          spendByCategory: data.spendByCategory || {},
          expenseDistribution: data.expenseDistribution || [],
          recentTransactions: recent,
        });
      }
    } catch (err) {
      console.error("Dashboard fetch failed:", err?.response || err.message);
    }
  }, []);

  useEffect(() => {
    if (timeFrame === "monthly") fetchDashboardOverview();
  }, [timeFrame, fetchDashboardOverview]);

  // ── Add transaction ───────────────────────────────────────────────────────
  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    const payload = {
      date: toIsoWithClientTime(newTransaction.date),
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
    };
    const tempId = `temp-${Date.now()}`;
    const tempTx = { id: tempId, ...payload, type: newTransaction.type };

    setOverviewMeta((prev) => ({
      ...prev,
      recentTransactions: [tempTx, ...(prev.recentTransactions || [])],
    }));
    setShowModal(false);
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "Food",
    });
    addToast("Transaction saved", "success");

    const url =
      newTransaction.type === "income"
        ? `${API_BASE}/income/add`
        : `${API_BASE}/expense/add`;
    try {
      await axios.post(url, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      refreshTransactions();
      if (timeFrame === "monthly") fetchDashboardOverview();
    } catch (err) {
      setOverviewMeta((prev) => ({
        ...prev,
        recentTransactions: (prev.recentTransactions || []).filter(
          (t) => t.id !== tempId,
        ),
      }));
      addToast(
        err?.response?.data?.message || "Could not save — try again.",
        "error",
      );
    }
  }, [
    newTransaction,
    refreshTransactions,
    fetchDashboardOverview,
    timeFrame,
    addToast,
  ]);

  // ── Pie label renderer ────────────────────────────────────────────────────
  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 22;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#9ca3af"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="11"
        fontWeight="500"
      >
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  // ── Savings health indicator ──────────────────────────────────────────────
  const healthLabel =
    savingsPct >= 20
      ? {
          text: "Healthy",
          cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
        }
      : savingsPct >= 5
        ? { text: "Fair", cls: "bg-amber-50 text-amber-600 border-amber-100" }
        : { text: "Low", cls: "bg-rose-50 text-rose-500 border-rose-100" };

  return (
    <>
      {/* ── Global keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes pulseDot {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        .dash-section { animation: fadeUp 0.35s ease both; }
      `}</style>

      <Toast toasts={toasts} />

      <div className="min-h-screen bg-[#f8f8fb] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 space-y-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="dash-section bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Rainbow bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-indigo-500" />

          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Title block */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-violet-500"
                    style={{ animation: "pulseDot 2s ease-in-out infinite" }}
                  />
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-[0.12em]">
                    Overview
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={18} className="text-gray-400" />
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    Finance Dashboard
                  </h1>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-[26px]">
                  {timeFrameRange.label}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 text-sm font-semibold text-white
                           bg-gradient-to-br from-violet-500 to-indigo-600
                           px-4 py-2.5 rounded-xl transition-all duration-150
                           hover:from-violet-600 hover:to-indigo-700
                           active:scale-95 shadow-sm shadow-violet-200
                           self-start sm:self-auto sm:mt-1"
              >
                <Plus size={15} strokeWidth={2.5} />
                Add transaction
              </button>
            </div>

            {/* Timeframe tabs */}
            <div className="mt-4 flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
              {["daily", "weekly", "monthly", "yearly"].map((frame) => (
                <button
                  key={frame}
                  onClick={() => setTimeFrame(frame)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold
                    transition-all duration-150 capitalize
                    ${
                      timeFrame === frame
                        ? "bg-white text-violet-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {frame.charAt(0).toUpperCase() + frame.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary Cards ────────────────────────────────────────────────── */}
        <div className="dash-section grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
          <SummaryCard
            label="Net balance"
            value={fmtINR(displayIncome - displayExpenses)}
            sub={`In ${fmtINR(displayIncome)} · Out ${fmtINR(displayExpenses)}`}
            accent="#6366f1"
            icon={<Wallet />}
          />
          <SummaryCard
            label="Total income"
            value={fmtINR(displayIncome)}
            sub={timeFrameRange.label}
            accent="#10b981"
            icon={<TrendingUp />}
          />
          <SummaryCard
            label="Total expenses"
            value={fmtINR(displayExpenses)}
            sub={`Prev: ${fmtINR(
              timeFrame === "monthly" && overviewMeta.previousMonthExpense
                ? overviewMeta.previousMonthExpense
                : prevData.expenses,
            )}`}
            accent="#f97316"
            icon={<ArrowDown />}
            badge={expenseChange}
            badgeUp={expenseChange !== null && expenseChange < 0}
          />
          <SummaryCard
            label="Savings"
            value={fmtINR(displaySavings)}
            sub={`${savingsPct}% of income · ${healthLabel.text}`}
            accent="#06b6d4"
            icon={<PiggyBank />}
          />
        </div>

        {/* ── Gauge Row ─────────────────────────────────────────────────────── */}
        <div className="dash-section grid grid-cols-3 gap-2.5 sm:gap-3">
          {gaugeData.map((gauge, i) => (
            <GaugeCard
              key={gauge.name}
              gauge={gauge}
              colorInfo={GAUGE_COLORS[gauge.name]}
              timeFrameLabel={timeFrameRange.label}
              highlightNegative
              trend={
                i === 0
                  ? prevData.income
                    ? Math.round(
                        ((gauge.value - prevData.income) / prevData.income) *
                          100,
                      )
                    : null
                  : i === 1
                    ? prevData.expenses
                      ? Math.round(
                          ((gauge.value - prevData.expenses) /
                            prevData.expenses) *
                            100,
                        )
                      : null
                    : prevData.savings
                      ? Math.round(
                          ((gauge.value - prevData.savings) /
                            Math.abs(prevData.savings)) *
                            100,
                        )
                      : null
              }
            />
          ))}
        </div>

        {/* ── Pie Chart ─────────────────────────────────────────────────────── */}
        {pieData.length > 0 && (
          <div className="dash-section bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <PieChartIcon size={15} className="text-violet-400" />
                Expense breakdown
              </h3>
              <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                {timeFrameRange.label}
              </span>
            </div>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="48%"
                    innerRadius="52%"
                    outerRadius="76%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={7}
                    iconType="circle"
                    formatter={(v) => (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {v}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: 14 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Recent Transactions ───────────────────────────────────────────── */}
        <div className="dash-section grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Income */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <SectionHeader
              icon={<TrendingUp size={14} className="text-emerald-400" />}
              title="Recent income"
              count={incomeList.length}
              countColor="bg-emerald-50 text-emerald-500"
              right={timeFrameRange.label}
            />
            <div className="px-1 py-1">
              {displayedIncome.length === 0 ? (
                <EmptyState
                  icon={<IndianRupee size={16} className="text-gray-300" />}
                  message="No income recorded"
                />
              ) : (
                displayedIncome.map((tx) => (
                  <TxRow key={tx.id} transaction={tx} type="income" />
                ))
              )}
            </div>
            {incomeList.length > 4 && (
              <ShowMoreBtn
                expanded={showAllIncome}
                count={incomeList.length}
                onToggle={() => setShowAllIncome((p) => !p)}
                color="text-emerald-500 hover:bg-emerald-50/60"
              />
            )}
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <SectionHeader
              icon={<ArrowDown size={14} className="text-orange-400" />}
              title="Recent expenses"
              count={expenseList.length}
              countColor="bg-orange-50 text-orange-500"
              right={timeFrameRange.label}
            />
            <div className="px-1 py-1">
              {displayedExpense.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart size={16} className="text-gray-300" />}
                  message="No expenses recorded"
                />
              ) : (
                displayedExpense.map((tx) => (
                  <TxRow key={tx.id} transaction={tx} type="expense" />
                ))
              )}
            </div>
            {expenseList.length > 4 && (
              <ShowMoreBtn
                expanded={showAllExpense}
                count={expenseList.length}
                onToggle={() => setShowAllExpense((p) => !p)}
                color="text-orange-500 hover:bg-orange-50/60"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Add Transaction Modal ─────────────────────────────────────────── */}
      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={loading}
      />
    </>
  );
};

export default Dashboard;
