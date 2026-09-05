/* eslint-disable no-unused-vars */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";

import {
  getTimeFrameRange,
  getPreviousTimeFrameRange,
  calculateData,
} from "../components/Helpers";

import AddTransactionModal from "../components/Add";
import YearSelector from "../components/common/YearSelector";
import Toast from "../components/common/Toast.common";

import { INCOME_CATEGORY_ICONS, EXPENSE_CATEGORY_ICONS } from "../assets/color";


import {
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import {
  Activity,
  ArrowUpRight,
  BarChart2,
  Download,
  Plus,
  PieChart as PieChartIcon,
  RefreshCw,
  Target,
  X,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

/* ============================================================================
   CONSTANTS
============================================================================ */

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly"];

const TIME_FRAME_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const INCOME_CAT_COLORS = {
  Salary: "#7c3aed",
  Extra_Income: "#8b5cf6",
  Freelance: "#a78bfa",
  Side_Hustles: "#c4b5fd",
  Other: "#94a3b8",
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
  "#818cf8",
  "#6366f1",
];

const MONTHS = [
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

/* ============================================================================
   API / GENERAL HELPERS
============================================================================ */

const getAuthHeader = () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const createDefaultTransaction = () => ({
  date: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  type: "expense",
  category: "Food",
});

function toIsoWithClientTime(dateValue) {
  if (!dateValue) {
    return new Date().toISOString();
  }

  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const now = new Date();

    const localDate = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      0,
    );

    return localDate.toISOString();
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function isValidDate(value) {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function fmtINR(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);

  if (abs >= 10000000) {
    return `₹${(abs / 10000000).toFixed(1)}Cr`;
  }

  if (abs >= 100000) {
    return `₹${(abs / 100000).toFixed(1)}L`;
  }

  if (abs >= 1000) {
    return `₹${(abs / 1000).toFixed(1)}K`;
  }

  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

function formatFullINR(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function normalizeTransaction(item, fallbackType = "expense") {
  const rawType = String(item?.type || fallbackType).toLowerCase();

  const type =
    rawType === "income" || rawType === "expense" ? rawType : fallbackType;

  return {
    id:
      item?._id ||
      item?.id ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,

    date: isValidDate(item?.date)
      ? new Date(item.date).toISOString()
      : new Date().toISOString(),

    description:
      item?.description ||
      item?.note ||
      item?.title ||
      (type === "income" ? "Income" : "Expense"),

    amount: Math.abs(Number(item?.amount) || 0),

    type,

    category: item?.category || (type === "income" ? "Salary" : "Other"),
  };
}

function normalizeTransactions(items, fallbackType) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) =>
    normalizeTransaction(item, fallbackType || item?.type || "expense"),
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

<Toast toasts={Toast} variant="dark" />;

/* ============================================================================
   DASHBOARD HEADER - UPDATED WITH YEAR SELECTOR
============================================================================ */

function DashboardHeader({
  timeFrame,
  onTimeFrameChange,
  activeRangeLabel,
  handleExport,
  onAddTransaction,
  exporting,
  selectedYear = 2024,
  onYearChange = () => {},
  currentYear = 2024,
}) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#1a2035] bg-[#0E1320] p-5 shadow-[0_8px_40px_rgba(0,0,0,.35)] sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full blur-3xl"
        style={{
          background: "rgba(124,58,237,.12)",
        }}
      />

      <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-cyan-400/[.035] blur-3xl" />

      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed] shadow-[0_0_12px_rgba(124,58,237,.75)]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#a78bfa]">
                Personal Finance
              </span>
            </div>

            <h1 className="text-3xl font-extrabold leading-[1.05] tracking-[-.045em] text-[#f0f4ff] sm:text-4xl lg:text-[42px]">
              Dashboard
            </h1>

            <p className="mt-2.5 text-sm font-medium text-[#64748b] sm:text-[15px]">
              Smart spending insights for{" "}
              <span className="font-bold text-[#c9d1e8]">
                {activeRangeLabel}
              </span>
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1a2035] bg-[#0a0f1e] px-4 text-xs font-semibold text-[#6b7280] shadow-[0_4px_16px_rgba(0,0,0,.25)] transition-all duration-200 hover:border-[#7c3aed50] hover:bg-[#10162a] hover:text-[#c4b5fd] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/60"
            >
              {exporting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download
                  size={14}
                  className="transition-transform duration-200 group-hover:-translate-y-0.5"
                />
              )}

              <span>{exporting ? "Exporting…" : "Export"}</span>
            </button>

            <button
              type="button"
              onClick={onAddTransaction}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] px-5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,.25)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_10px_30px_rgba(124,58,237,.35)] active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]/70"
            >
              <Plus size={14} strokeWidth={2} />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#1a2035] to-transparent" />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto pb-0.5 xl:w-auto">
            <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-[#1a2035] bg-[#0a0f1e] p-1">
              {TIME_FRAMES.map((frame) => {
                const active = timeFrame === frame;

                return (
                  <button
                    key={frame}
                    type="button"
                    onClick={() => onTimeFrameChange(frame)}
                    aria-pressed={active}
                    className={`relative rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/60 sm:px-4 sm:text-xs ${
                      active
                        ? "bg-gradient-to-br from-[#7c3aed] to-[#9333ea] text-white shadow-[0_0_16px_rgba(124,58,237,.30)]"
                        : "text-[#4b5563] hover:bg-[#111827] hover:text-[#9ca3af]"
                    }`}
                  >
                    {TIME_FRAME_LABELS[frame]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* YEAR SELECTOR - ADDED HERE */}
          <div className="flex w-full items-center justify-end gap-2 xl:w-auto">
            <YearSelector
              selectedYear={selectedYear}
              onYearChange={onYearChange}
              currentYear={currentYear}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   TRANSACTIONS MODAL
============================================================================ */

function TransactionsModal({
  open,
  onClose,
  title,
  accent,
  transactions,
  type,
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;

  const colorMap = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-md sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transactions-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#0e1320] shadow-[0_30px_100px_rgba(0,0,0,.7)]"
        style={{
          border: `1px solid ${accent}30`,
          borderTop: `3px solid ${accent}`,
          animation: "modalSlide .28s cubic-bezier(.34,1.2,.64,1) both",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="transactions-modal-title"
              className="text-base font-bold text-slate-100"
            >
              {title}
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-600">
              {safeTransactions.length} transaction
              {safeTransactions.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0a0f1e] text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="hidden grid-cols-5 gap-3 border-b border-slate-900 bg-[#0a0f1e] px-5 py-3 sm:grid">
          {["Date", "Amount", "Description", "", "Category"].map((label) => (
            <span
              key={label}
              className="text-[9px] font-bold uppercase tracking-[.15em] text-slate-700"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {safeTransactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-600">
                No transactions yet
              </p>
            </div>
          ) : (
            safeTransactions.map((tx) => {
              const IconComponent =
                icons?.[tx.category] || icons?.Other || (() => null);

              const color = colorMap?.[tx.category] || "#94a3b8";

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-1 gap-3 border-b border-slate-900 px-5 py-4 transition-colors hover:bg-violet-500/[.035] sm:grid-cols-5 sm:items-center sm:gap-2"
                >
                  <div>
                    <p className="text-[11px] font-medium text-slate-600">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-sm font-extrabold tabular-nums"
                      style={{
                        color: type === "income" ? "#1AFFD5" : "#FF3D71",
                      }}
                    >
                      {type === "income" ? "+" : "−"}
                      {fmtINR(Math.abs(tx.amount))}
                    </p>
                  </div>

                  <div className="min-w-0 sm:col-span-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: `${color}15`,
                          border: `1px solid ${color}25`,
                        }}
                      >
                        <span style={{ color, fontSize: 13 }}>
                          {IconComponent}
                        </span>
                      </div>

                      <p className="truncate text-sm font-semibold text-slate-300">
                        {tx.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        background: `${color}15`,
                        color,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      {String(tx.category || "Other").replace(/_/g, " ")}
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

/* ============================================================================
   TRANSACTION ROW
============================================================================ */

function TxRow({ transaction, type }) {
  const icons =
    type === "income" ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;

  const colorMap = type === "income" ? INCOME_CAT_COLORS : EXPENSE_CAT_COLORS;

  const IconComponent =
    icons?.[transaction.category] || icons?.Other || (() => null);

  const color = colorMap?.[transaction.category] || "#94a3b8";

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-slate-900 px-5 py-4 transition-colors duration-150 hover:bg-violet-500/[.035] sm:grid-cols-5 sm:items-center sm:gap-2">
      <div>
        <p className="text-[10px] font-medium text-slate-600">
          {isValidDate(transaction.date)
            ? new Date(transaction.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })
            : "—"}
        </p>
      </div>

      <div>
        <p
          className="text-sm font-extrabold tabular-nums"
          style={{
            color: type === "income" ? "#1AFFD5" : "#FF3D71",
          }}
        >
          {type === "income" ? "+" : "−"}
          {fmtINR(Math.abs(transaction.amount))}
        </p>
      </div>

      <div className="min-w-0 sm:col-span-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}25`,
            }}
          >
            <span style={{ color, fontSize: 13 }}>{IconComponent}</span>
          </div>

          <p className="truncate text-sm font-semibold text-slate-300">
            {transaction.description}
          </p>
        </div>
      </div>

      <div>
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{
            background: `${color}15`,
            color,
            border: `1px solid ${color}25`,
          }}
        >
          {String(transaction.category || "Other").replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   TOOLTIPS
============================================================================ */

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#0d1526]/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {String(payload[0].name || "").replace(/_/g, " ")}
      </p>

      <p className="text-sm font-extrabold tabular-nums text-violet-300">
        {formatFullINR(payload[0].value)}
      </p>
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#0d1526]/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
      <p className="mb-1 text-[10px] font-medium text-slate-500">{label}</p>

      {payload.map((item, index) => (
        <p
          key={`${item.dataKey}-${index}`}
          className="text-sm font-extrabold tabular-nums"
          style={{
            color: item.color,
          }}
        >
          {formatFullINR(item.value)}
        </p>
      ))}
    </div>
  );
}

/* ============================================================================
   SAVINGS BAR
============================================================================ */

function SavingsBar({ pct }) {
  const safePct = Math.max(0, Math.min(Number(pct) || 0, 100));

  const color =
    safePct >= 20 ? "#1AFFD5" : safePct >= 5 ? "#f59e0b" : "#FF3D71";

  const label = safePct >= 20 ? "Healthy" : safePct >= 5 ? "Fair" : "Low";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-slate-600">
          Savings rate
        </span>

        <span
          className="text-[11px] font-extrabold"
          style={{
            color,
          }}
        >
          {safePct}% · {label}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${safePct}%`,
            background: `linear-gradient(90deg,${color}80,${color})`,
            boxShadow: `0 0 10px ${color}50`,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   SAVING GOAL
============================================================================ */

function SavingGoalCard({ name, current, target, color }) {
  const safeTarget = Math.max(Number(target) || 0, 0);
  const safeCurrent = Math.max(Number(current) || 0, 0);

  const pct =
    safeTarget > 0
      ? Math.min(Math.round((safeCurrent / safeTarget) * 100), 100)
      : 0;

  const safeColor =
    typeof color === "string" && color.trim() ? color : "#7c3aed";

  return (
    <div className="border-b border-slate-900 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold text-slate-400">
          {name || "Unnamed goal"}
        </span>

        <span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-200">
          {fmtINR(safeTarget)}
        </span>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg,${safeColor}80,${safeColor})`,
            boxShadow: `0 0 8px ${safeColor}40`,
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
          style={{
            background: `${safeColor}15`,
            color: safeColor,
            border: `1px solid ${safeColor}20`,
          }}
        >
          {pct}%
        </span>

        <span className="text-[10px] text-slate-600">
          {fmtINR(safeCurrent)} saved
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   BUDGET BREAKDOWN
============================================================================ */

function BudgetBreakdown({ sortedPieData, pieTotal, displayExpenses }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const listRef = useRef(null);
  const rowRefs = useRef([]);

  const handlePieEnter = useCallback((_, index) => {
    setActiveIndex(index);

    const element = rowRefs.current[index];

    if (element && listRef.current) {
      element.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, []);

  const emptyData = useMemo(
    () => [
      {
        name: "Empty",
        value: 1,
      },
    ],
    [],
  );

  const chartData = sortedPieData.length > 0 ? sortedPieData : emptyData;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0e1320] p-5 shadow-[0_4px_32px_rgba(0,0,0,.4)] sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <PieChartIcon size={15} color="#a78bfa" />
            Budget breakdown
          </h3>

          <p className="mt-1 text-[10px] text-slate-600">
            Where your money is going
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-[#0a0f1e]">
          <PieChartIcon size={13} color="#475569" />
        </div>
      </div>

      <div className="flex min-h-[230px] flex-col md:flex-row">
        <div className="flex min-h-[230px] w-full items-center justify-center md:w-1/2">
          <div className="relative h-[210px] w-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={sortedPieData.length > 0 ? 3 : 0}
                  dataKey="value"
                  onMouseEnter={handlePieEnter}
                  onMouseLeave={() => setActiveIndex(null)}
                  isAnimationActive
                >
                  {chartData.map((_, index) => {
                    const isActive = activeIndex === index;

                    const color =
                      sortedPieData.length > 0
                        ? VIOLET_SHADES[index % VIOLET_SHADES.length]
                        : "#1a2035";

                    return (
                      <Cell
                        key={`pie-${index}`}
                        fill={color}
                        stroke={isActive ? "#ffffff" : "#0E1320"}
                        strokeWidth={isActive ? 2 : 1.5}
                        opacity={activeIndex === null || isActive ? 1 : 0.3}
                        style={{
                          cursor: "pointer",
                          transition: "opacity .15s",
                        }}
                      />
                    );
                  })}
                </Pie>

                <Tooltip content={<PieTooltip />} cursor={false} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {activeIndex !== null && sortedPieData[activeIndex] ? (
                <>
                  <p
                    className="max-w-[85px] truncate text-[9px] font-extrabold uppercase tracking-[.12em]"
                    style={{
                      color: VIOLET_SHADES[activeIndex % VIOLET_SHADES.length],
                    }}
                  >
                    {String(sortedPieData[activeIndex].name || "").replace(
                      /_/g,
                      " ",
                    )}
                  </p>

                  <p className="mt-0.5 text-base font-extrabold tracking-tight text-slate-100">
                    {fmtINR(sortedPieData[activeIndex].value)}
                  </p>

                  <p className="text-[10px] font-medium text-slate-500">
                    {pieTotal > 0
                      ? Math.round(
                          (sortedPieData[activeIndex].value / pieTotal) * 100,
                        )
                      : 0}
                    %
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-[.15em] text-slate-600">
                    Total
                  </p>

                  <p className="text-base font-extrabold text-slate-100">
                    {fmtINR(displayExpenses)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hidden w-px bg-slate-800 md:block" />

        <div
          ref={listRef}
          className="max-h-[230px] w-full overflow-y-auto pl-0 md:w-1/2 md:pl-5"
        >
          {sortedPieData.length > 0 ? (
            sortedPieData.map((item, index) => {
              const pct =
                pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;

              const color = VIOLET_SHADES[index % VIOLET_SHADES.length];

              const isActive = activeIndex === index;

              return (
                <div
                  key={`${item.name}-${index}`}
                  ref={(element) => {
                    rowRefs.current[index] = element;
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border-b border-slate-900 px-2 py-3 transition-colors last:border-b-0"
                  style={{
                    background: isActive ? `${color}12` : "transparent",
                  }}
                >
                  <span
                    className="shrink-0 rounded-full transition-all"
                    style={{
                      width: isActive ? 10 : 8,
                      height: isActive ? 10 : 8,
                      background: color,
                      boxShadow: isActive ? `0 0 7px ${color}` : "none",
                    }}
                  />

                  <span
                    className="min-w-0 flex-1 truncate text-[11px] transition-colors"
                    style={{
                      color: isActive ? "#e2e8f0" : "#6b7280",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {String(item.name || "Other").replace(/_/g, " ")}
                  </span>

                  <span
                    className="shrink-0 text-[11px] font-extrabold tabular-nums"
                    style={{
                      color: isActive ? color : "#9ca3af",
                    }}
                  >
                    {pct}% · {fmtINR(item.value)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center py-10">
              <p className="text-sm text-slate-700">No expense data</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   DASHBOARD
============================================================================ */

const Dashboard = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
  } = useOutletContext() || {};

  const navigate = useNavigate();

  /* --------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------- */

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const [overviewMeta, setOverviewMeta] = useState({
    monthlyIncome: null,
    monthlyExpense: null,
    previousMonthExpense: null,
    savings: null,
    expenseDistribution: [],
    recentTransactions: [],
  });

  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpense, setShowAllExpense] = useState(false);

  const [toasts, setToasts] = useState([]);

  const [savingGoals, setSavingGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [newTransaction, setNewTransaction] = useState(
    createDefaultTransaction,
  );

  const toastTimersRef = useRef(new Map());

  /* --------------------------------------------------------------------------
     CLEANUP TOAST TIMERS
  -------------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));

      toastTimersRef.current.clear();
    };
  }, []);

  /* --------------------------------------------------------------------------
     TOAST
  -------------------------------------------------------------------------- */

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();

    setToasts((previous) => [
      ...previous,
      {
        id,
        message,
        type,
      },
    ]);

    const timer = window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));

      toastTimersRef.current.delete(id);
    }, 3500);

    toastTimersRef.current.set(id, timer);
  }, []);

  /* --------------------------------------------------------------------------
     YEAR CHANGE HANDLER - ADDED
  -------------------------------------------------------------------------- */

  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
    // Add any additional logic when year changes if needed
  }, []);

  /* --------------------------------------------------------------------------
     DATE RANGE
  -------------------------------------------------------------------------- */

  const isDateInRange = useCallback((date, start, end) => {
    if (!isValidDate(date) || !isValidDate(start) || !isValidDate(end)) {
      return false;
    }

    const transactionDate = new Date(date).getTime();

    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    return (
      transactionDate >= startDate.getTime() &&
      transactionDate <= endDate.getTime()
    );
  }, []);

  const previousYearRange = useMemo(() => {
    const previousYear = getCurrentYear() - 1;

    return {
      start: `${previousYear}-01-01`,
      end: `${previousYear}-12-31`,
      label: `Jan–Dec ${previousYear}`,
    };
  }, []);

  const activeRange = useMemo(() => {
    if (timeFrame === "previous_year") {
      return previousYearRange;
    }

    return getTimeFrameRange(timeFrame);
  }, [timeFrame, previousYearRange]);

  const timeFrameRange = activeRange;

  const prevTimeFrameRange = useMemo(
    () =>
      getPreviousTimeFrameRange(
        timeFrame === "previous_year" ? "yearly" : timeFrame,
      ),
    [timeFrame],
  );

  /* --------------------------------------------------------------------------
     NORMALIZED TRANSACTIONS
  -------------------------------------------------------------------------- */

  const normalizedTransactions = useMemo(
    () => normalizeTransactions(outletTransactions),
    [outletTransactions],
  );

  /* --------------------------------------------------------------------------
     FILTERED DATA
  -------------------------------------------------------------------------- */

  const filteredTransactions = useMemo(
    () =>
      normalizedTransactions.filter((transaction) =>
        isDateInRange(
          transaction.date,
          timeFrameRange.start,
          timeFrameRange.end,
        ),
      ),
    [normalizedTransactions, timeFrameRange, isDateInRange],
  );

  const prevFilteredTransactions = useMemo(
    () =>
      normalizedTransactions.filter((transaction) =>
        isDateInRange(
          transaction.date,
          prevTimeFrameRange.start,
          prevTimeFrameRange.end,
        ),
      ),
    [normalizedTransactions, prevTimeFrameRange, isDateInRange],
  );

  /* --------------------------------------------------------------------------
     FINANCIAL DATA
  -------------------------------------------------------------------------- */

  const currentData = useMemo(() => {
    const data = calculateData(filteredTransactions) || {};

    return {
      ...data,
      income: Number(data.income) || 0,
      expenses: Number(data.expenses) || 0,
      savings: (Number(data.income) || 0) - (Number(data.expenses) || 0),
    };
  }, [filteredTransactions]);

  const prevData = useMemo(() => {
    const data = calculateData(prevFilteredTransactions) || {};

    return {
      ...data,
      income: Number(data.income) || 0,
      expenses: Number(data.expenses) || 0,
      savings: (Number(data.income) || 0) - (Number(data.expenses) || 0),
    };
  }, [prevFilteredTransactions]);

  const displayIncome = useMemo(() => {
    if (timeFrame === "monthly" && overviewMeta.monthlyIncome != null) {
      return Number(overviewMeta.monthlyIncome) || 0;
    }

    return currentData.income;
  }, [timeFrame, overviewMeta.monthlyIncome, currentData.income]);

  const displayExpenses = useMemo(() => {
    if (timeFrame === "monthly" && overviewMeta.monthlyExpense != null) {
      return Number(overviewMeta.monthlyExpense) || 0;
    }

    return currentData.expenses;
  }, [timeFrame, overviewMeta.monthlyExpense, currentData.expenses]);

  const displaySavings = displayIncome - displayExpenses;

  const prevExpenseVal = useMemo(() => {
    if (timeFrame === "monthly" && overviewMeta.previousMonthExpense != null) {
      return Number(overviewMeta.previousMonthExpense) || 0;
    }

    return prevData.expenses;
  }, [timeFrame, overviewMeta.previousMonthExpense, prevData.expenses]);

  const savingsPct =
    displayIncome > 0 ? Math.round((displaySavings / displayIncome) * 100) : 0;

  const expenseChange = useMemo(() => {
    const previous = Number(prevExpenseVal) || 0;

    if (previous <= 0) {
      return null;
    }

    return Math.round(((displayExpenses - previous) / previous) * 100);
  }, [displayExpenses, prevExpenseVal]);

  /* --------------------------------------------------------------------------
     BAR CHART
  -------------------------------------------------------------------------- */

  const barChartData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);

      const monthIndex = date.getMonth();

      const year = date.getFullYear();

      const monthTransactions = normalizedTransactions.filter((transaction) => {
        if (!isValidDate(transaction.date)) {
          return false;
        }

        const transactionDate = new Date(transaction.date);

        return (
          transactionDate.getMonth() === monthIndex &&
          transactionDate.getFullYear() === year
        );
      });

      return {
        name: MONTHS[monthIndex],

        income: monthTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),

        expense: monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      };
    });
  }, [normalizedTransactions]);

  /* --------------------------------------------------------------------------
     PIE DATA
  -------------------------------------------------------------------------- */

  const pieData = useMemo(() => {
    if (
      timeFrame === "monthly" &&
      Array.isArray(overviewMeta.expenseDistribution) &&
      overviewMeta.expenseDistribution.length
    ) {
      return overviewMeta.expenseDistribution
        .map((item) => ({
          name: item?.category || "Other",

          value: Math.round(Number(item?.amount) || 0),
        }))
        .filter((item) => item.value > 0);
    }

    const categories = {};

    filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const category = transaction.category || "Other";

        categories[category] =
          (categories[category] || 0) + (Number(transaction.amount) || 0);
      });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value: Math.round(Number(value) || 0),
      }))
      .filter((item) => item.value > 0);
  }, [filteredTransactions, overviewMeta.expenseDistribution, timeFrame]);

  /* --------------------------------------------------------------------------
     TRANSACTIONS
  -------------------------------------------------------------------------- */

  const serverRecent = useMemo(
    () => normalizeTransactions(overviewMeta.recentTransactions),
    [overviewMeta.recentTransactions],
  );

  const incomeTransactions = useMemo(
    () =>
      filteredTransactions
        .filter((transaction) => transaction.type === "income")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredTransactions],
  );

  const expenseTransactions = useMemo(
    () =>
      filteredTransactions
        .filter((transaction) => transaction.type === "expense")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredTransactions],
  );

  const serverIncome = useMemo(
    () => serverRecent.filter((transaction) => transaction.type === "income"),
    [serverRecent],
  );

  const serverExpense = useMemo(
    () => serverRecent.filter((transaction) => transaction.type === "expense"),
    [serverRecent],
  );

  const incomeList =
    timeFrame === "monthly" && serverIncome.length > 0
      ? serverIncome
      : incomeTransactions;

  const expenseList =
    timeFrame === "monthly" && serverExpense.length > 0
      ? serverExpense
      : expenseTransactions;

  const displayedIncome = showAllIncome ? incomeList : incomeList.slice(0, 5);

  const displayedExpense = showAllExpense
    ? expenseList
    : expenseList.slice(0, 5);

  const recentTransactions = useMemo(
    () =>
      [...displayedIncome, ...displayedExpense]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6),
    [displayedIncome, displayedExpense],
  );

  /* --------------------------------------------------------------------------
     DASHBOARD API
  -------------------------------------------------------------------------- */

  const fetchDashboardOverview = useCallback(async (signal) => {
    if (!API_BASE) {
      console.error("VITE_API_BASE is not configured.");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/dashboard`, {
        headers: getAuthHeader(),
        signal,
      });

      if (response?.data?.success) {
        const data = response.data.data || {};

        setOverviewMeta({
          monthlyIncome:
            data.monthlyIncome != null ? Number(data.monthlyIncome) || 0 : null,

          monthlyExpense:
            data.monthlyExpense != null
              ? Number(data.monthlyExpense) || 0
              : null,

          previousMonthExpense:
            data.previousMonthExpense != null
              ? Number(data.previousMonthExpense) || 0
              : null,

          savings: data.savings != null ? Number(data.savings) || 0 : null,

          expenseDistribution: Array.isArray(data.expenseDistribution)
            ? data.expenseDistribution
            : [],

          recentTransactions: normalizeTransactions(data.recentTransactions),
        });
      }
    } catch (error) {
      if (error?.code === "ERR_CANCELED") {
        return;
      }

      console.error(
        "Dashboard fetch failed:",
        error?.response || error?.message || error,
      );
    }
  }, []);

  useEffect(() => {
    if (timeFrame !== "monthly") {
      return undefined;
    }

    const controller = new AbortController();

    fetchDashboardOverview(controller.signal);

    return () => controller.abort();
  }, [timeFrame, fetchDashboardOverview]);

  /* --------------------------------------------------------------------------
     GOALS API
  -------------------------------------------------------------------------- */

  const fetchSavingGoals = useCallback(async (signal) => {
    if (!API_BASE) {
      setGoalsLoading(false);
      return;
    }

    setGoalsLoading(true);

    try {
      const response = await axios.get(`${API_BASE}/goals`, {
        headers: getAuthHeader(),
        params: {
          status: "active",
        },
        signal,
      });

      if (response?.data?.success) {
        const goals = Array.isArray(response.data.goals)
          ? response.data.goals
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];

        setSavingGoals(goals);
      }
    } catch (error) {
      if (error?.code === "ERR_CANCELED") {
        return;
      }

      console.error(
        "Goals fetch failed:",
        error?.response || error?.message || error,
      );
    } finally {
      if (!signal?.aborted) {
        setGoalsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchSavingGoals(controller.signal);

    return () => controller.abort();
  }, [fetchSavingGoals]);

  /* --------------------------------------------------------------------------
     TIMEFRAME
  -------------------------------------------------------------------------- */

  const handleSetTimeFrame = useCallback(
    (nextTimeFrame) => {
      if (!TIME_FRAMES.includes(nextTimeFrame)) {
        return;
      }

      if (nextTimeFrame === timeFrame) {
        return;
      }

      setTimeFrame(nextTimeFrame);

      setShowAllIncome(false);
      setShowAllExpense(false);
    },
    [setTimeFrame, timeFrame],
  );

  /* --------------------------------------------------------------------------
     ADD TRANSACTION
  -------------------------------------------------------------------------- */

  const handleAddTransaction = useCallback(async () => {
    const description = newTransaction.description?.trim();

    const amount = Number(newTransaction.amount);

    if (!description) {
      addToast("Please enter a description.", "error");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Please enter a valid amount.", "error");
      return;
    }

    if (!API_BASE) {
      addToast("API configuration is missing.", "error");
      return;
    }

    const type = newTransaction.type === "income" ? "income" : "expense";

    const category =
      newTransaction.category || (type === "income" ? "Salary" : "Food");

    setIsSaving(true);

    const payload = {
      date: toIsoWithClientTime(newTransaction.date),
      description,
      amount,
      category,
    };

    const url =
      type === "income" ? `${API_BASE}/income/add` : `${API_BASE}/expense/add`;

    try {
      await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });

      setShowModal(false);
      setNewTransaction(createDefaultTransaction());

      addToast("Transaction saved successfully.", "success");

      await Promise.resolve(refreshTransactions?.());

      if (timeFrame === "monthly") {
        await fetchDashboardOverview();
      }

      await fetchSavingGoals();
    } catch (error) {
      console.error(
        "Transaction save failed:",
        error?.response || error?.message || error,
      );

      addToast(
        getErrorMessage(error, "Could not save transaction. Try again."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    newTransaction,
    refreshTransactions,
    fetchDashboardOverview,
    fetchSavingGoals,
    timeFrame,
    addToast,
  ]);

  /* --------------------------------------------------------------------------
     EXPORT
  -------------------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exporting) return;

    if (!API_BASE) {
      addToast("API configuration is missing.", "error");
      return;
    }

    setExporting(true);

    try {
      const response = await axios.get(`${API_BASE}/expense/downloadexcel`, {
        headers: getAuthHeader(),
        responseType: "blob",
      });

      const contentType =
        response.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const blob = new Blob([response.data], {
        type: contentType,
      });

      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = "expense_details.xlsx";
      link.style.display = "none";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      addToast("Export ready!", "success");
    } catch (error) {
      console.error(
        "Export failed:",
        error?.response || error?.message || error,
      );

      addToast(
        getErrorMessage(error, "Export failed. Please try again."),
        "error",
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, addToast]);

  /* --------------------------------------------------------------------------
     DERIVED PIE DATA
  -------------------------------------------------------------------------- */

  const sortedPieData = useMemo(
    () =>
      [...pieData]
        .map((item, originalIndex) => ({
          ...item,
          originalIndex,
        }))
        .sort((a, b) => b.value - a.value),
    [pieData],
  );

  const pieTotal = useMemo(
    () =>
      sortedPieData.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [sortedPieData],
  );

  const activeRangeLabel = timeFrameRange?.label || "Current period";

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        :root {
          color-scheme: dark;
        }

        * {
          font-family: 'Inter', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        @keyframes toastSlide {
          from {
            transform: translateX(18px) scale(.96);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes modalSlide {
          from {
            transform: translateY(-18px) scale(.97);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeUp {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .dashboard-fade {
          animation: fadeUp .45s ease both;
        }

        .dashboard-fade-delay {
          animation: fadeUp .45s .08s ease both;
        }

        .dashboard-fade-delay-2 {
          animation: fadeUp .45s .16s ease both;
        }

        .recharts-cartesian-grid-horizontal line {
          stroke: #1a2035;
        }

        .recharts-cartesian-grid-vertical line {
          display: none;
        }

        .recharts-tooltip-cursor {
          fill: rgba(124,58,237,.05);
        }

        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        ::-webkit-scrollbar-track {
          background: #080b12;
        }

        ::-webkit-scrollbar-thumb {
          background: #1e2d4a;
          border-radius: 999px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #7c3aed;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(.5) sepia(1) saturate(.5);
          cursor: pointer;
        }

        button,
        select,
        input {
          -webkit-tap-highlight-color: transparent;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <Toast toasts={toasts} />

      {/* MODALS */}

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

      {/* PAGE */}

      <main className="min-h-screen bg-[#080b12] px-3 py-3 text-slate-200 sm:px-5 sm:py-5 lg:px-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* HEADER - UPDATED WITH YEAR SELECTOR */}

          <div className="dashboard-fade">
            <DashboardHeader
              timeFrame={timeFrame}
              onTimeFrameChange={handleSetTimeFrame}
              activeRangeLabel={activeRangeLabel}
              handleExport={handleExport}
              onAddTransaction={() => setShowModal(true)}
              exporting={exporting}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              currentYear={getCurrentYear()}
            />
          </div>

          {/* MONEY FLOW */}

          <section className="dashboard-fade-delay rounded-3xl border border-slate-800 bg-[#0e1320] p-5 shadow-[0_4px_32px_rgba(0,0,0,.4)] sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <BarChart2 size={15} color="#a78bfa" />
                  Money Flow
                </h3>

                <p className="mt-1 text-[10px] text-slate-600">
                  Income vs expenses over time
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-sm bg-violet-600" />
                  Income
                </span>

                <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-sm bg-slate-700" />
                  Expense
                </span>

                <span className="rounded-lg border border-slate-800 bg-[#0a0f1e] px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                  {activeRangeLabel}
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  barGap={5}
                  margin={{
                    top: 4,
                    right: 4,
                    left: 0,
                    bottom: 0,
                  }}
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
                    tick={{
                      fill: "#475569",
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 10,
                    }}
                    width={48}
                    tickFormatter={fmtINR}
                  />

                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{
                      fill: "rgba(124,58,237,.05)",
                    }}
                  />

                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#7c3aed"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />

                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#26354f"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* BUDGET BREAKDOWN */}

          <div className="dashboard-fade-delay-2">
            <BudgetBreakdown
              sortedPieData={sortedPieData}
              pieTotal={pieTotal}
              displayExpenses={displayExpenses}
            />
          </div>

          {/* RECENT TRANSACTIONS */}

          <section className="dashboard-fade-delay-2 overflow-hidden rounded-3xl border border-slate-800 bg-[#0e1320] shadow-[0_4px_32px_rgba(0,0,0,.4)]">
            <div className="flex flex-col gap-3 border-b border-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Recent Transactions
                </h3>

                <p className="mt-1 text-[10px] text-slate-600">
                  Your latest income and expenses
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Account filter"
                  className="rounded-xl border border-slate-800 bg-[#0a0f1e] px-3 py-2 text-xs font-medium text-slate-500 outline-none transition-colors focus:border-violet-500/50 focus:text-slate-300"
                  defaultValue="all"
                >
                  <option value="all">All accounts</option>
                </select>

                <button
                  type="button"
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold text-violet-400 transition-colors hover:bg-violet-500/10 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                  onClick={() => setShowExpenseModal(true)}
                >
                  See all
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>

            <div className="hidden grid-cols-5 gap-2 border-b border-slate-900 bg-[#0a0f1e] px-5 py-2.5 sm:grid">
              {["Date", "Amount", "Description", "", "Category"].map(
                (label) => (
                  <span
                    key={label}
                    className="text-[9px] font-extrabold uppercase tracking-[.15em] text-slate-700"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>

            <div>
              {recentTransactions.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No transactions yet
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="mt-3 text-xs font-bold text-violet-400 hover:text-violet-300 focus:outline-none"
                  >
                    Add your first transaction
                  </button>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <TxRow
                    key={transaction.id}
                    transaction={transaction}
                    type={transaction.type}
                  />
                ))
              )}
            </div>
          </section>

          {/* FINANCIAL HEALTH + GOALS */}

          <div className="dashboard-fade-delay-2 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* FINANCIAL HEALTH */}

            <section className="rounded-3xl border border-slate-800 bg-[#0e1320] p-5 shadow-[0_4px_32px_rgba(0,0,0,.4)] sm:p-6">
              <div className="mb-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Activity size={15} color="#a78bfa" />
                  Financial Health
                </h3>

                <p className="mt-1 text-[10px] text-slate-600">
                  A quick snapshot of your finances
                </p>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5">
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
                    className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-[#0a0f1e] px-3 py-3"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: color,
                      }}
                    />

                    <span className="flex-1 text-xs font-medium text-slate-500">
                      {label}
                    </span>

                    <span className="text-xs font-extrabold tabular-nums text-slate-300">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <SavingsBar pct={savingsPct} />

              {expenseChange !== null && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800/70 bg-[#0a0f1e] px-3 py-2.5">
                  <span className="text-[10px] font-semibold text-slate-600">
                    Expense vs previous period
                  </span>

                  <span
                    className={`text-[10px] font-extrabold ${
                      expenseChange <= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {expenseChange > 0 ? "+" : ""}
                    {expenseChange}%
                  </span>
                </div>
              )}
            </section>

            {/* SAVING GOALS */}

            <section className="rounded-3xl border border-slate-800 bg-[#0e1320] p-5 shadow-[0_4px_32px_rgba(0,0,0,.4)] sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Target size={15} color="#a78bfa" />
                    Saving Goals
                  </h3>

                  <p className="mt-1 text-[10px] text-slate-600">
                    Stay on track with your goals
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/goals")}
                  aria-label="Open saving goals"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-[#0a0f1e] text-slate-600 transition-colors hover:border-violet-500/40 hover:text-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div>
                {goalsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-700">
                    <RefreshCw size={14} className="animate-spin" />
                    Loading goals…
                  </div>
                ) : savingGoals.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No goals yet
                    </p>

                    <button
                      type="button"
                      onClick={() => navigate("/goals")}
                      className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-300 transition-colors hover:bg-violet-500/15"
                    >
                      Create a goal
                    </button>
                  </div>
                ) : (
                  savingGoals
                    .slice(0, 4)
                    .map((goal) => (
                      <SavingGoalCard
                        key={goal._id || goal.id || goal.name}
                        name={goal.name}
                        current={goal.saved ?? goal.current ?? 0}
                        target={goal.target ?? 0}
                        color={goal.color || "#7c3aed"}
                      />
                    ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ADD TRANSACTION MODAL */}

      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={isSaving}
      />
    </>
  );
};

export default Dashboard;
