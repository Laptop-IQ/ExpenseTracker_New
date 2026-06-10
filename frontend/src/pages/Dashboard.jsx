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
  ArrowUp,
  BarChart2,
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
  Activity,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── helpers ──────────────────────────────────────────────────────────────────
const getAuthHeader = () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

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

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
            pointer-events-auto border animate-[slideInRight_0.25s_ease-out]
            ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-white border-gray-200 text-gray-800"
            }`}
        >
          {t.type === "success" ? (
            <Check size={15} className="text-emerald-500 shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle size={15} className="text-red-500 shrink-0" />
          ) : (
            <Zap size={15} className="text-blue-400 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent, icon, badge, badgeUp }) {
  return (
    <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accent + "18" }}
        >
          {React.cloneElement(icon, { size: 18, style: { color: accent } })}
        </div>
        {badge !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full
            ${badgeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
          >
            {badgeUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(badge)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
function TxRow({ transaction, type }) {
  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  const colors = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;
  const IconComponent = icons[transaction.category] || icons.Other;
  const color = colors[transaction.category] ?? "#94a3b8";
  const isTemp = String(transaction.id).startsWith("temp-");

  return (
    <div
      className={`flex items-center justify-between py-3 px-4 rounded-xl transition-colors
      hover:bg-gray-50/80 ${isTemp ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + "18" }}
        >
          <span style={{ color, fontSize: 16 }}>{IconComponent}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {transaction.description}
          </p>
          <span
            className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: color + "18", color }}
          >
            {transaction.category?.replace(/_/g, " ")}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p
          className={`text-sm font-bold ${type === "income" ? "text-emerald-600" : "text-red-500"}`}
        >
          {type === "income" ? "+" : "-"}
          {fmtINR(Math.abs(transaction.amount))}
        </p>
        <p className="text-[11px] text-gray-400">
          {new Date(transaction.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Pie Tooltip ───────────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-500 text-xs mb-0.5">{payload[0].name}</p>
      <p className="font-bold text-gray-900">{fmtINR(payload[0].value)}</p>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
  } = useOutletContext();

  const [showModal, setShowModal] = useState(false);
  const [gaugeData, setGaugeData] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

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

  // recent lists
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

  // ── Fetch dashboard ────────────────────────────────────────────────────────
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

  // ── Add transaction (instant, non-blocking) ────────────────────────────────
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

    // Instant UI
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
    addToast("Transaction added!", "success");

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
        err?.response?.data?.message || "Failed to save transaction.",
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

  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 20;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#6b7280"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontSize: "11px" }}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform:translateX(24px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Toast toasts={toasts} />

      <div className="min-h-screen bg-gray-50/60 px-4 py-6 md:px-6 lg:px-8 space-y-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-500" />
          <div className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full bg-violet-400"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <span className="text-xs font-medium text-violet-500 uppercase tracking-widest">
                    Overview
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Finance Dashboard
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {timeFrameRange.label}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 text-sm font-semibold text-white
                           bg-gradient-to-r from-violet-500 to-indigo-500
                           px-5 py-2.5 rounded-xl hover:from-violet-600 hover:to-indigo-600
                           active:scale-95 transition-all shadow-md shadow-violet-200 self-start sm:self-auto"
              >
                <Plus size={16} /> Add Transaction
              </button>
            </div>

            {/* Timeframe tabs */}
            <div className="mt-5 flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {["daily", "weekly", "monthly", "yearly"].map((frame) => (
                <button
                  key={frame}
                  onClick={() => setTimeFrame(frame)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Net Balance"
            value={fmtINR(displayIncome - displayExpenses)}
            sub={`Income ${fmtINR(displayIncome)} · Exp ${fmtINR(displayExpenses)}`}
            accent="#6366f1"
            icon={<Wallet />}
          />
          <SummaryCard
            label="Total Income"
            value={fmtINR(displayIncome)}
            sub={timeFrameRange.label}
            accent="#10b981"
            icon={<TrendingUp />}
          />
          <SummaryCard
            label="Total Expenses"
            value={fmtINR(displayExpenses)}
            sub={`vs prev: ${fmtINR(timeFrame === "monthly" && overviewMeta.previousMonthExpense ? overviewMeta.previousMonthExpense : prevData.expenses)}`}
            accent="#f97316"
            icon={<ArrowDown />}
            badge={expenseChange}
            badgeUp={expenseChange < 0}
          />
          <SummaryCard
            label="Savings"
            value={fmtINR(displaySavings)}
            sub={`${savingsPct}% of income`}
            accent="#06b6d4"
            icon={<PiggyBank />}
          />
        </div>

        {/* ── Gauge Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {gaugeData.map((gauge) => (
            <GaugeCard
              key={gauge.name}
              gauge={gauge}
              colorInfo={GAUGE_COLORS[gauge.name]}
              timeFrameLabel={timeFrameRange.label}
            />
          ))}
        </div>

        {/* ── Pie Chart ────────────────────────────────────────────────────── */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-5">
              <PieChartIcon size={16} className="text-violet-400" />
              Expense distribution
              <span className="text-xs text-gray-400 font-normal">
                ({timeFrameRange.label})
              </span>
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
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
                    iconSize={8}
                    iconType="circle"
                    formatter={(v) => (
                      <span className="text-xs text-gray-500">{v}</span>
                    )}
                    wrapperStyle={{ paddingTop: 16 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Recent Transactions Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Income */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-400" />
                Recent Income
                <span className="bg-emerald-50 text-emerald-500 text-xs font-medium px-2 py-0.5 rounded-full">
                  {incomeList.length}
                </span>
              </h3>
              <span className="text-xs text-gray-400">
                {timeFrameRange.label}
              </span>
            </div>
            <div className="divide-y divide-gray-50/80 px-1">
              {displayedIncome.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <IndianRupee size={18} className="text-emerald-300" />
                  </div>
                  <p className="text-sm text-gray-400">No income recorded</p>
                </div>
              ) : (
                displayedIncome.map((tx) => (
                  <TxRow key={tx.id} transaction={tx} type="income" />
                ))
              )}
            </div>
            {incomeList.length > 4 && (
              <button
                onClick={() => setShowAllIncome((p) => !p)}
                className="w-full py-3 text-sm text-emerald-500 font-medium hover:bg-emerald-50/60
                           transition-colors flex items-center justify-center gap-1.5 border-t border-gray-50"
              >
                {showAllIncome ? (
                  <>
                    <ChevronUp size={14} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> View all {incomeList.length}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ArrowDown size={15} className="text-orange-400" />
                Recent Expenses
                <span className="bg-orange-50 text-orange-500 text-xs font-medium px-2 py-0.5 rounded-full">
                  {expenseList.length}
                </span>
              </h3>
              <span className="text-xs text-gray-400">
                {timeFrameRange.label}
              </span>
            </div>
            <div className="divide-y divide-gray-50/80 px-1">
              {displayedExpense.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <ShoppingCart size={18} className="text-orange-300" />
                  </div>
                  <p className="text-sm text-gray-400">No expenses recorded</p>
                </div>
              ) : (
                displayedExpense.map((tx) => (
                  <TxRow key={tx.id} transaction={tx} type="expense" />
                ))
              )}
            </div>
            {expenseList.length > 4 && (
              <button
                onClick={() => setShowAllExpense((p) => !p)}
                className="w-full py-3 text-sm text-orange-500 font-medium hover:bg-orange-50/60
                           transition-colors flex items-center justify-center gap-1.5 border-t border-gray-50"
              >
                {showAllExpense ? (
                  <>
                    <ChevronUp size={14} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> View all {expenseList.length}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Modal ──────────────────────────────────────────────────────── */}
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
