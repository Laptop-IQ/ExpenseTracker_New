/* eslint-disable no-unused-vars */
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  getTimeFrameRange,
  getPreviousTimeFrameRange,
  calculateData,
} from "../components/Helpers";
import axios from "axios";
import AddTransactionModal from "../components/Add";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  BarChart2,
  RefreshCw,
  Download,
  Target,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

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
  Salary: "#7c3aed",
  Extra_Income: "#8b5cf6",
  Freelance: "#a78bfa",
  Side_Hustles: "#c4b5fd",
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

const VIOLET_SHADES = [
  "#7c3aed",
  "#9333ea",
  "#a855f7",
  "#c084fc",
  "#d8b4fe",
  "#1AFFD5",
  "#818cf8",
];

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly", "previous_year"];

/* ── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            animation: "toastSlide 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
            background:
              t.type === "success"
                ? "linear-gradient(135deg,#0a2a1f,#0d3327)"
                : t.type === "error"
                  ? "linear-gradient(135deg,#2a0a0a,#330d0d)"
                  : "linear-gradient(135deg,#12071f,#1a0d2e)",
            border:
              t.type === "success"
                ? "1px solid #065f3c"
                : t.type === "error"
                  ? "1px solid #7f1d1d"
                  : "1px solid #3b1e6e",
          }}
          className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl text-sm font-medium pointer-events-auto shadow-2xl backdrop-blur-md"
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{
              background:
                t.type === "success"
                  ? "#10b98120"
                  : t.type === "error"
                    ? "#ef444420"
                    : "#7c3aed20",
            }}
          >
            {t.type === "success" ? (
              <Check size={11} color="#10b981" />
            ) : t.type === "error" ? (
              <AlertCircle size={11} color="#ef4444" />
            ) : (
              <Zap size={11} color="#a855f7" />
            )}
          </span>
          <span
            style={{
              color:
                t.type === "success"
                  ? "#34d399"
                  : t.type === "error"
                    ? "#f87171"
                    : "#c4b5fd",
            }}
          >
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Metric Card ─────────────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  sub,
  accent,
  icon,
  badge,
  badgeUp,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "#0E1320",
        border: "1px solid #1a2035",
        borderLeft: `3px solid ${accent}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (onClick)
          e.currentTarget.style.boxShadow = `0 4px 32px ${accent}20, 0 4px 24px rgba(0,0,0,0.4)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
          }}
        >
          {React.cloneElement(icon, { size: 16, color: accent })}
        </div>
        {badge !== undefined && badge !== null && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              background: badgeUp ? "#10b98115" : "#ef444415",
              border: badgeUp ? "1px solid #10b98130" : "1px solid #ef444430",
              color: badgeUp ? "#10b981" : "#ef4444",
            }}
          >
            {badgeUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {Math.abs(badge)}%
          </span>
        )}
      </div>

      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
        style={{ color: "#4a5568" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold tracking-tight leading-none"
        style={{
          color: "#f0f4ff",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-2 truncate" style={{ color: "#374151" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Transactions Pop-out Modal ─────────────────────────────────────────── */
function TransactionsModal({
  open,
  onClose,
  title,
  accent,
  transactions,
  type,
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  const colorMap = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-12 px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "#0E1320",
          border: `1px solid ${accent}30`,
          borderTop: `3px solid ${accent}`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${accent}15`,
          maxHeight: "calc(100vh - 96px)",
          display: "flex",
          flexDirection: "column",
          animation: "modalSlide 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid #0f1729" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#e2e8f0" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "#0a0f1e", border: "1px solid #1a2035" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = `${accent}50`)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#1a2035")
            }
          >
            <X size={14} color="#6b7280" />
          </button>
        </div>

        <div
          className="grid grid-cols-5 gap-2 px-5 py-2.5 shrink-0"
          style={{ background: "#0a0f1e", borderBottom: "1px solid #0f1729" }}
        >
          {["Date", "Amount", "Description", "", "Category"].map((h) => (
            <span
              key={h}
              className="text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{ color: "#1e3a5f" }}
            >
              {h}
            </span>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {transactions.length === 0 ? (
            <div
              className="py-16 text-center text-sm"
              style={{ color: "#1e2d4a" }}
            >
              No transactions yet
            </div>
          ) : (
            transactions.map((tx) => {
              const IconComponent = icons[tx.category] || icons?.Other;
              const color = colorMap[tx.category] ?? "#94a3b8";
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-5 items-center px-5 py-3.5 gap-2 transition-colors duration-150"
                  style={{ borderBottom: "1px solid #0f1729" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(124,58,237,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div className="col-span-1">
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: "#374151" }}
                    >
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p
                      className="text-sm font-bold tabular-nums"
                      style={{
                        color: type === "income" ? "#1AFFD5" : "#FF3D71",
                      }}
                    >
                      {type === "income" ? "+" : "−"}
                      {fmtINR(Math.abs(tx.amount))}
                    </p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: `${color}15`,
                          border: `1px solid ${color}25`,
                        }}
                      >
                        <span style={{ color, fontSize: 12 }}>
                          {IconComponent}
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "#c9d1e8" }}
                      >
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${color}15`,
                        color,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      {tx.category?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Transaction Row ─────────────────────────────────────────────────────── */
function TxRow({ transaction, type }) {
  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  const colorMap = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;
  const IconComponent = icons[transaction.category] || icons.Other;
  const color = colorMap[transaction.category] ?? "#94a3b8";

  return (
    <div
      className="grid grid-cols-5 items-center px-5 py-3.5 gap-2 transition-colors duration-150 group"
      style={{ borderBottom: "1px solid #0f1729" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(124,58,237,0.05)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="col-span-1">
        <p className="text-[10px] font-medium" style={{ color: "#374151" }}>
          {new Date(transaction.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>
      <div className="col-span-1">
        <p
          className="text-sm font-bold tabular-nums"
          style={{
            color: type === "income" ? "#1AFFD5" : "#FF3D71",
            fontFeatureSettings: '"tnum"',
          }}
        >
          {type === "income" ? "+" : "−"}
          {fmtINR(Math.abs(transaction.amount))}
        </p>
      </div>
      <div className="col-span-2 min-w-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            <span style={{ color, fontSize: 12 }}>{IconComponent}</span>
          </div>
          <p
            className="text-sm font-medium truncate"
            style={{ color: "#c9d1e8" }}
          >
            {transaction.description}
          </p>
        </div>
      </div>
      <div className="col-span-1">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${color}15`,
            color,
            border: `1px solid ${color}25`,
          }}
        >
          {transaction.category?.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}

/* ── Pie Tooltip ─────────────────────────────────────────────────────────── */
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm"
      style={{ background: "#0d1526", border: "1px solid #1e2d4a" }}
    >
      <p className="text-[10px] mb-0.5" style={{ color: "#4a5568" }}>
        {payload[0].name}
      </p>
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: "#c4b5fd" }}
      >
        {fmtINR(payload[0].value)}
      </p>
    </div>
  );
}

/* ── Bar Tooltip ─────────────────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm"
      style={{ background: "#0d1526", border: "1px solid #1e2d4a" }}
    >
      <p className="text-[10px] mb-1" style={{ color: "#4a5568" }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="text-sm font-bold tabular-nums"
          style={{ color: p.color }}
        >
          {fmtINR(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Savings Bar ─────────────────────────────────────────────────────────── */
function SavingsBar({ pct }) {
  const color = pct >= 20 ? "#1AFFD5" : pct >= 5 ? "#f59e0b" : "#FF3D71";
  const label = pct >= 20 ? "Healthy" : pct >= 5 ? "Fair" : "Low";
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span
          className="text-[11px] font-semibold"
          style={{ color: "#374151" }}
        >
          Savings rate
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {pct}% · {label}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "#0f1729" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 8px ${color}50`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Saving Goal Card ────────────────────────────────────────────────────── */
function SavingGoalCard({ name, current, target, color }) {
  const pct =
    target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return (
    <div className="py-3" style={{ borderBottom: "1px solid #0f1729" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: "#9ca3af" }}>
          {name}
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: "#e2e8f0", fontFeatureSettings: '"tnum"' }}
        >
          {fmtINR(target)}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden mb-1.5"
        style={{ background: "#0f1729" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: `${color}15`,
            color,
            border: `1px solid ${color}20`,
          }}
        >
          {pct}%
        </span>
        <span className="text-[10px]" style={{ color: "#374151" }}>
          {fmtINR(current)} saved
        </span>
      </div>
    </div>
  );
}

/* ── TimeFrame Selector ──────────────────────────────────────────────────── */
const TIME_FRAME_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "This Year",
  previous_year: "Prev Year",
};

function TimeFrameSelector({ timeFrame, setTimeFrame }) {
  return (
    <div
      className="flex gap-0.5 p-1 rounded-xl w-fit"
      style={{ background: "#0a0f1e", border: "1px solid #1a2035" }}
    >
      {TIME_FRAMES.map((f) => {
        const isPrevYear = f === "previous_year";
        const isActive = timeFrame === f;
        return (
          <button
            key={f}
            onClick={() => setTimeFrame(f)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200"
            style={
              isActive
                ? {
                    background: isPrevYear
                      ? "linear-gradient(135deg, #1e3a5f, #1e4a7f)"
                      : "linear-gradient(135deg, #7c3aed, #9333ea)",
                    color: "#fff",
                    boxShadow: isPrevYear
                      ? "0 0 12px #3b82f640"
                      : "0 0 12px #7c3aed40",
                  }
                : { color: "#374151", background: "transparent" }
            }
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "#374151";
            }}
          >
            {TIME_FRAME_LABELS[f]}
          </button>
        );
      })}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
  } = useOutletContext();

  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [loading] = useState(false);
  const [overviewMeta, setOverviewMeta] = useState({});
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Real saving goals (from /goals API)
  const [savingGoals, setSavingGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Pop-out modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

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

  const isDateInRange = useCallback((date, start, end) => {
    const d = new Date(date).getTime();
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  }, []);

  // previous_year range computed inline (Jan 1 – Dec 31 of last year)
  const previousYearRange = useMemo(() => {
    const prevYear = new Date().getFullYear() - 1;
    return {
      start: `${prevYear}-01-01`,
      end: `${prevYear}-12-31`,
      label: `Jan–Dec ${prevYear}`,
    };
  }, []);

  const activeRange = useMemo(
    () =>
      timeFrame === "previous_year"
        ? previousYearRange
        : getTimeFrameRange(timeFrame),
    [timeFrame, previousYearRange],
  );

  const timeFrameRange = activeRange;

  const prevTimeFrameRange = useMemo(
    () =>
      getPreviousTimeFrameRange(
        timeFrame === "previous_year" ? "yearly" : timeFrame,
      ),
    [timeFrame],
  );

  const handleSetTimeFrame = useCallback(
    (tf) => {
      setTimeFrame(tf);
    },
    [setTimeFrame],
  );

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
  const netBalance = displayIncome - displayExpenses;

  const prevExpenseVal =
    timeFrame === "monthly" && overviewMeta.previousMonthExpense
      ? overviewMeta.previousMonthExpense
      : prevData.expenses;

  const activeRangeLabel = timeFrameRange.label;

  const barChartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const mIdx = (now.getMonth() - 6 + i + 12) % 12;
      const year = now.getFullYear() - (now.getMonth() - 6 + i < 0 ? 1 : 0);
      const txs = (outletTransactions || []).filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === mIdx && d.getFullYear() === year;
      });
      return {
        name: months[mIdx],
        income: txs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0),
        expense: txs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [outletTransactions]);

  const pieData = useMemo(() => {
    if (timeFrame === "monthly" && overviewMeta.expenseDistribution?.length)
      return overviewMeta.expenseDistribution.map((d) => ({
        name: d.category,
        value: Math.round(Number(d.amount) || 0),
      }));
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

  const displayedIncome = showAllIncome ? incomeList : incomeList.slice(0, 5);
  const displayedExpense = showAllExpense
    ? expenseList
    : expenseList.slice(0, 5);

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
          previousMonthExpense: Number(data.previousMonthExpense || 0),
          savings:
            data.savings != null
              ? Number(data.savings)
              : Number(data.monthlyIncome || 0) -
                Number(data.monthlyExpense || 0),
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

  // ── Saving goals (real data from /goals) ──────────────────────────────
  const fetchSavingGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/goals`, {
        headers: getAuthHeader(),
        params: { status: "active" },
      });
      if (res?.data?.success) {
        setSavingGoals(res.data.goals || []);
      }
    } catch (err) {
      console.error("Goals fetch failed:", err?.response || err.message);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavingGoals();
  }, [fetchSavingGoals]);

  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;
    const payload = {
      date: toIsoWithClientTime(newTransaction.date),
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
    };
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

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expense/downloadexcel`, {
        headers: getAuthHeader(),
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "expense_details.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Export ready!", "success");
    } catch {
      addToast("Export failed.", "error");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; }

        @keyframes toastSlide {
          from { transform: translateX(20px) scale(0.95); opacity: 0; }
          to   { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes modalSlide {
          from { transform: translateY(-20px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }

        .dash-in   { animation: fadeUp 0.45s ease both; }
        .dash-in-2 { animation: fadeUp 0.45s 0.1s ease both; }
        .dash-in-3 { animation: fadeUp 0.45s 0.2s ease both; }

        .recharts-cartesian-grid-horizontal line { stroke: #1a2035; }
        .recharts-cartesian-grid-vertical   line { display: none; }

        ::-webkit-scrollbar        { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track  { background: #080B12; }
        ::-webkit-scrollbar-thumb  { background: #1e2d4a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #7c3aed; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.4) sepia(1) saturate(0.5);
          cursor: pointer;
        }
      `}</style>

      <Toast toasts={toasts} />

      <TransactionsModal
        open={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        title="Income transactions"
        accent="#1AFFD5"
        transactions={incomeList}
        type="income"
      />
      <TransactionsModal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Expense transactions"
        accent="#a78bfa"
        transactions={expenseList}
        type="expense"
      />

      <div
        className="min-h-screen space-y-4"
        style={{ background: "#080B12", color: "#e2e8f0" }}
      >
        {/* ── Action bar ──────────────────────────────────────────────── */}
        <div className="dash-in flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <TimeFrameSelector
              timeFrame={timeFrame}
              setTimeFrame={handleSetTimeFrame}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-95"
              style={{
                background: "#0E1320",
                border: "1px solid #1a2035",
                color: "#6b7280",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#7c3aed40";
                e.currentTarget.style.color = "#a78bfa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2035";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                color: "#fff",
                boxShadow: "0 0 20px #7c3aed40, 0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <Plus size={13} /> Add transaction
            </button>
          </div>
        </div>

        {/* ── Metric cards ────────────────────────────────────────────── */}
        <div className="dash-in grid grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard
            label="Net Balance"
            value={fmtINR(Math.abs(netBalance))}
            sub={`In ${fmtINR(displayIncome)} · Out ${fmtINR(displayExpenses)}`}
            icon={<Wallet />}
          />
          <MetricCard
            label="Total Income"
            value={fmtINR(displayIncome)}
            sub={activeRangeLabel}
            icon={<TrendingUp />}
            onClick={() => setShowIncomeModal(true)}
          />
          <MetricCard
            label="Total Expenses"
            value={fmtINR(displayExpenses)}
            sub={`Prev: ${fmtINR(prevExpenseVal)}`}
            icon={<CreditCard />}
            badge={expenseChange}
            badgeUp={expenseChange !== null && expenseChange < 0}
            onClick={() => setShowExpenseModal(true)}
          />
          <MetricCard
            label="Savings"
            value={fmtINR(displaySavings)}
            sub={`${savingsPct}% of income`}
            icon={<PiggyBank />}
          />
        </div>

        {/* ── Money flow bar chart ─────────────────────────────────────── */}
        <div
          className="dash-in-2 rounded-2xl p-5"
          style={{
            background: "#0E1320",
            border: "1px solid #1a2035",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "#c9d1e8" }}
            >
              <BarChart2 size={14} color="#7c3aed" /> Money Flow
            </h3>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <span
                className="flex items-center gap-1.5 text-[10px]"
                style={{ color: "#374151" }}
              >
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: "#7c3aed" }}
                />
                Income
              </span>
              <span
                className="flex items-center gap-1.5 text-[10px]"
                style={{ color: "#374151" }}
              >
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: "#1e2d4a" }}
                />
                Expense
              </span>
              <span
                className="text-[10px] px-2 py-1 rounded-lg"
                style={{
                  background: "#0a0f1e",
                  border: "1px solid #1a2035",
                  color: "#374151",
                }}
              >
                {activeRangeLabel}
              </span>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                barGap={4}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1a2035"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#374151", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#374151", fontSize: 10 }}
                  width={45}
                  tickFormatter={fmtINR}
                />
                <Tooltip
                  content={<BarTooltip />}
                  cursor={{ fill: "rgba(124,58,237,0.05)" }}
                />
                <Bar
                  dataKey="income"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="expense"
                  fill="#1e2d4a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Budget pie ───────────────────────────────────────────────── */}
        <div
          className="dash-in-2 rounded-2xl p-5"
          style={{
            background: "#0E1320",
            border: "1px solid #1a2035",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "#c9d1e8" }}
            >
              <PieChartIcon size={14} color="#7c3aed" /> Budget breakdown
            </h3>
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "#0a0f1e", border: "1px solid #1a2035" }}
            >
              <ArrowUpRight size={13} color="#374151" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div
              className="relative shrink-0"
              style={{ width: 200, height: 200 }}
            >
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={
                      pieData.length > 0
                        ? pieData
                        : [{ name: "Empty", value: 1 }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                  >
                    {(pieData.length > 0
                      ? pieData
                      : [{ name: "Empty", value: 1 }]
                    ).map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          pieData.length > 0
                            ? VIOLET_SHADES[i % VIOLET_SHADES.length]
                            : "#1a2035"
                        }
                        stroke="#0E1320"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  {pieData.length > 0 && <Tooltip content={<PieTooltip />} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest"
                  style={{ color: "#374151" }}
                >
                  Total
                </p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: "#e2e8f0" }}
                >
                  {fmtINR(displayExpenses)}
                </p>
              </div>
            </div>

            {pieData.length > 0 ? (
              <div className="flex-1 w-full">
                <div
                  className="grid gap-x-6 gap-y-2"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(160px, 1fr))",
                  }}
                >
                  {pieData.map((item, i) => {
                    const total = pieData.reduce((s, d) => s + d.value, 0);
                    const pct =
                      total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 py-1.5"
                        style={{ borderBottom: "1px solid #0f1729" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: VIOLET_SHADES[i % VIOLET_SHADES.length],
                          }}
                        />
                        <span
                          className="text-[11px] flex-1 truncate"
                          style={{ color: "#374151" }}
                        >
                          {item.name}
                        </span>
                        <span
                          className="text-[11px] font-bold tabular-nums shrink-0"
                          style={{ color: "#9ca3af" }}
                        >
                          {pct}% · {fmtINR(item.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm" style={{ color: "#1e2d4a" }}>
                  No expense data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent transactions ──────────────────────────────────────── */}
        <div
          className="dash-in-3 rounded-2xl overflow-hidden"
          style={{
            background: "#0E1320",
            border: "1px solid #1a2035",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #0f1729" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#c9d1e8" }}>
              Recent Transactions
            </h3>
            <div className="flex items-center gap-2">
              <select
                className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
                style={{
                  background: "#0a0f1e",
                  border: "1px solid #1a2035",
                  color: "#374151",
                }}
              >
                <option>All accounts</option>
              </select>
              <button
                className="text-[11px] font-semibold flex items-center gap-0.5 transition-colors"
                style={{ color: "#7c3aed" }}
                onClick={() => setShowExpenseModal(true)}
              >
                See all <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          <div
            className="grid grid-cols-5 gap-2 px-5 py-2.5"
            style={{ background: "#0a0f1e", borderBottom: "1px solid #0f1729" }}
          >
            {["Date", "Amount", "Description", "Method", "Category"].map(
              (h) => (
                <span
                  key={h}
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: "#1e3a5f" }}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          <div>
            {displayedIncome
              .concat(displayedExpense)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 6).length === 0 ? (
              <div
                className="py-12 text-center text-sm"
                style={{ color: "#1e2d4a" }}
              >
                No transactions yet
              </div>
            ) : (
              displayedIncome
                .concat(displayedExpense)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 6)
                .map((tx) => (
                  <TxRow key={tx.id} transaction={tx} type={tx.type} />
                ))
            )}
          </div>
        </div>

        {/* ── Financial Health + Saving Goals ─────────────────────────── */}
        <div className="dash-in-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "#0E1320",
              border: "1px solid #1a2035",
              boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
            }}
          >
            <h3
              className="text-sm font-semibold flex items-center gap-2 mb-4"
              style={{ color: "#c9d1e8" }}
            >
              <Activity size={14} color="#7c3aed" /> Financial Health
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                {
                  label: "Income",
                  value: fmtINR(displayIncome),
                  color: "#1AFFD5",
                },
                {
                  label: "Spent",
                  value: fmtINR(displayExpenses),
                  color: "#a78bfa",
                },
                {
                  label: "Saved",
                  value: fmtINR(displaySavings),
                  color: "#f59e0b",
                },
                {
                  label: "Prev Exp",
                  value: fmtINR(prevExpenseVal),
                  color: "#7c3aed",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "#0a0f1e", border: "1px solid #1a2035" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-xs flex-1" style={{ color: "#374151" }}>
                    {label}
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: "#9ca3af", fontFeatureSettings: '"tnum"' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <SavingsBar pct={savingsPct} />
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "#0E1320",
              border: "1px solid #1a2035",
              boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "#c9d1e8" }}
              >
                <Target size={14} color="#7c3aed" /> Saving Goals
              </h3>
              <button
                onClick={() => navigate("/goals")}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "#0a0f1e", border: "1px solid #1a2035" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#7c3aed40")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#1a2035")
                }
              >
                <ArrowUpRight size={13} color="#374151" />
              </button>
            </div>
            <div>
              {goalsLoading ? (
                <div
                  className="py-8 text-center text-sm"
                  style={{ color: "#1e2d4a" }}
                >
                  Loading goals…
                </div>
              ) : savingGoals.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm mb-3" style={{ color: "#1e2d4a" }}>
                    No goals yet
                  </p>
                  <button
                    onClick={() => navigate("/goals")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      border: "1px solid rgba(124,58,237,0.3)",
                      color: "#a78bfa",
                    }}
                  >
                    Create a goal
                  </button>
                </div>
              ) : (
                savingGoals
                  .slice(0, 4)
                  .map((g) => (
                    <SavingGoalCard
                      key={g._id || g.id}
                      name={g.name}
                      current={g.saved ?? 0}
                      target={g.target ?? 0}
                      color={g.color || "#7c3aed"}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Transaction Modal ──────────────────────────────────────── */}
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
