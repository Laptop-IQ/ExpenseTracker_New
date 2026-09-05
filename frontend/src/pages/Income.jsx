import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { createPortal } from "react-dom";
import {
  Plus,
  Download,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  BarChart2,
  IndianRupee,
  Trash2,
  Check,
  AlertCircle,
  Zap,
  ChevronDown,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Save,
  Edit2,
  Wallet,
  Briefcase,
  Coins,
  Banknote,
  CalendarDays,
  RotateCcw,
  Filter,
  ArrowDownRight,
  CircleDollarSign,
  ReceiptText,
  Layers3,
  WalletCards,
  Loader2,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { learnCategory } from "../utils/smartCategoryAI";
import AddTransactionModal from "../components/Add";
import {
  fmtINR,
  formatFullINR,
  getCurrentYear,
  getTimeFrameRange,
  buildChartPoints,
  isDateInRange,
  formatTransactionDate,
  formatTransactionDateMobile,
  getDateInputValue,
  toIsoWithClientTime,
  formatCategory,
  getYearOptions,
  getAuthHeaders,
  safeNumber,
} from "../utils/commonHelpers";

const API_BASE = import.meta.env.VITE_API_BASE;
const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly"];

/* =========================================================
   THEME CONSTANTS
========================================================= */

const COLORS = {
  bg: "#080b10",
  surface: "#0f131a",
  surface2: "#141923",
  surface3: "#191f2b",
  border: "#222936",
  borderSoft: "#1a202b",
  text: "#f1f5f9",
  textMuted: "#7b8497",
  textDim: "#515b6e",
  green: "#00e5a0",
  blue: "#5b8dff",
  purple: "#b97cff",
  orange: "#ffb347",
  cyan: "#22d3ee",
  red: "#ff6b6b",
};

const CATEGORY_COLOR = {
  Salary: COLORS.green,
  Extra_Income: COLORS.blue,
  Freelance: COLORS.purple,
  Side_Hustles: COLORS.orange,
  Investment: COLORS.cyan,
};

const CATEGORY_ICONS = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
};

const INCOME_CATEGORIES = [
  "Salary",
  "Extra_Income",
  "Freelance",
  "Side_Hustles",
  "Investment",
];

const BAR_COLORS = [
  COLORS.green,
  "#00c882",
  "#00a86b",
  "#22d3ee",
  "#5b8dff",
  "#b97cff",
  "#ffb347",
  "#7c6cff",
];

const CATEGORY_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "Salary", label: "Salary" },
  { value: "Extra_Income", label: "Extra Income" },
  { value: "Freelance", label: "Freelance" },
  { value: "Side_Hustles", label: "Side Hustles" },
  { value: "Investment", label: "Investment" },
];

/* =========================================================
   YEAR SELECTOR COMPONENT
========================================================= */

function YearSelector({ selectedYear, setSelectedYear, currentYear }) {
  const years = useMemo(() => getYearOptions(currentYear, 6), [currentYear]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef(null);
  const isCurrentYear = selectedYear === currentYear;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 220;
    const gap = 8;
    const padding = 12;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    left = Math.max(padding, left);
    setPosition({ top: rect.bottom + gap, left, width: dropdownWidth });
  };

  useEffect(() => {
    if (!open) return;
    const handlePosition = () => updatePosition();
    window.addEventListener("resize", handlePosition);
    window.addEventListener("scroll", handlePosition, true);
    return () => {
      window.removeEventListener("resize", handlePosition);
      window.removeEventListener("scroll", handlePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        const dropdown = document.getElementById("year-selector-dropdown");
        if (dropdown && !dropdown.contains(event.target)) {
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((prev) => !prev);
        }}
        className="group relative inline-flex h-10 items-center gap-2 rounded-full border border-violet-500/30 bg-[#080b18] px-3 shadow-[0_0_0_1px_rgba(124,58,237,.08),0_8px_30px_rgba(0,0,0,.25)] transition-all duration-200 hover:border-violet-500/50 hover:bg-[#0b0f20] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
          <CalendarDays size={14} strokeWidth={2.2} />
        </span>
        <span className="text-xs font-black tracking-tight text-slate-100">
          {selectedYear}
        </span>
        {isCurrentYear && (
          <span className="flex items-center gap-1.5 border-l border-white/10 pl-2 text-[9px] font-bold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Current
          </span>
        )}
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`ml-1 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180 text-violet-400" : ""
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            id="year-selector-dropdown"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="z-[999999] overflow-hidden rounded-xl border border-white/[0.08] bg-[#080b18]/[0.98] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,.55),0_0_0_1px_rgba(139,92,246,.08)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Select year
              </span>
              <CalendarDays size={12} className="text-violet-500/50" />
            </div>

            <div className="space-y-0.5">
              {years.map((year) => {
                const selected = year === selectedYear;
                const current = year === currentYear;

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(year);
                      setOpen(false);
                    }}
                    className={`group/year flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                      selected ? "bg-violet-500/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black ${
                          selected
                            ? "bg-violet-500/15 text-violet-400"
                            : "bg-white/[0.04] text-slate-500"
                        }`}
                      >
                        {String(year).slice(-2)}
                      </span>
                      <div>
                        <div
                          className={`text-xs font-extrabold ${
                            selected ? "text-violet-300" : "text-slate-200"
                          }`}
                        >
                          {year}
                        </div>
                        {current && (
                          <div className="mt-0.5 text-[9px] font-semibold text-emerald-400">
                            Current year
                          </div>
                        )}
                      </div>
                    </div>
                    {selected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_4px_12px_rgba(124,58,237,.35)]">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* =========================================================
   TIME FRAME SELECTOR
========================================================= */

function TimeFrameSelector({ timeFrame, setTimeFrame }) {
  return (
    <div className="flex gap-1 overflow-x-auto max-w-full bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 scrollbar-none">
      {TIME_FRAMES.map((frame) => {
        const active = timeFrame === frame;
        return (
          <button
            key={frame}
            type="button"
            onClick={() => setTimeFrame(frame)}
            className={`shrink-0 px-3 sm:px-4 py-2 text-[11px] font-bold rounded-xl transition-all ${
              active
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-500 hover:text-slate-800 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
            }`}
          >
            {frame.charAt(0).toUpperCase() + frame.slice(1)}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   TOAST
========================================================= */

function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-3 sm:right-5 z-[9999] flex flex-col gap-2 pointer-events-none w-[calc(100%-24px)] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl border backdrop-blur-xl"
          style={{
            background:
              toast.type === "success"
                ? "#0c211b"
                : toast.type === "error"
                  ? "#251313"
                  : "#151a24",
            borderColor:
              toast.type === "success"
                ? "#00e5a033"
                : toast.type === "error"
                  ? "#ff6b6b33"
                  : "#2a3242",
            color:
              toast.type === "success"
                ? COLORS.green
                : toast.type === "error"
                  ? COLORS.red
                  : COLORS.text,
            animation: "incomeSlideIn .25s ease-out",
          }}
        >
          {toast.type === "success" ? (
            <Check size={16} />
          ) : toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Zap size={16} />
          )}
          <span className="text-xs sm:text-sm font-semibold">
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ label, value, sub, accent, icon: Icon, trend }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-5 group"
      style={{
        background: "linear-gradient(145deg, #11161f 0%, #0e1219 100%)",
        borderColor: COLORS.border,
      }}
    >
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: accent }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: COLORS.textDim }}
          >
            {label}
          </p>

          <p
            className="mt-2 text-xl sm:text-2xl font-black tracking-tight truncate"
            style={{ color: COLORS.text }}
          >
            {value}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5">
            {trend !== undefined && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-bold"
                style={{
                  color: trend >= 0 ? COLORS.green : COLORS.red,
                }}
              >
                {trend >= 0 ? (
                  <ArrowUpRight size={11} />
                ) : (
                  <ArrowDownRight size={11} />
                )}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}

            <span
              className="text-[10px] sm:text-xs truncate"
              style={{ color: COLORS.textMuted }}
            >
              {sub}
            </span>
          </div>
        </div>

        <div
          className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center"
          style={{
            color: accent,
            background: `${accent}12`,
            border: `1px solid ${accent}18`,
          }}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CATEGORY PILL
========================================================= */

function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] || COLORS.textMuted;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] sm:text-[10px] font-bold whitespace-nowrap"
      style={{
        color,
        background: `${color}12`,
        border: `1px solid ${color}18`,
      }}
    >
      {cat?.replace(/_/g, " ") || "Other"}
    </span>
  );
}

/* =========================================================
   CATEGORY FILTER
========================================================= */

function CategoryFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current =
    CATEGORY_FILTERS.find((item) => item.value === value) ||
    CATEGORY_FILTERS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 flex items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all active:scale-[.98]"
        style={{
          background: "#141923",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textMuted,
        }}
      >
        <SlidersHorizontal size={13} />
        <span className="max-w-[100px] truncate">{current.label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: "#131821",
            borderColor: COLORS.border,
          }}
        >
          <div className="p-1.5">
            {CATEGORY_FILTERS.map((item) => {
              const active = value === item.value;
              const color = CATEGORY_COLOR[item.value] || COLORS.green;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all"
                  style={
                    active
                      ? {
                          background: `${COLORS.green}10`,
                          color: COLORS.green,
                        }
                      : {
                          color: COLORS.textMuted,
                        }
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: item.value === "all" ? COLORS.textDim : color,
                    }}
                  />
                  {item.label}
                  {active && <Check size={13} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INCOME BREAKDOWN
========================================================= */

function IncomeBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};

    transactions.forEach((transaction) => {
      const category = transaction.category || "Other";
      map[category] = (map[category] || 0) + Number(transaction.amount || 0);
    });

    const total = Object.values(map).reduce((sum, value) => sum + value, 0);

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total ? (amount / total) * 100 : 0,
      }));
  }, [transactions]);

  return (
    <div
      className="rounded-2xl sm:rounded-3xl border p-4 sm:p-5"
      style={{
        background: "linear-gradient(145deg, #11161f 0%, #0e1219 100%)",
        borderColor: COLORS.border,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold" style={{ color: COLORS.text }}>
            Income sources
          </h3>
          <p className="text-[10px] mt-1" style={{ color: COLORS.textDim }}>
            Where your money is coming from
          </p>
        </div>

        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center"
          style={{
            background: `${COLORS.green}10`,
            color: COLORS.green,
          }}
        >
          <Layers3 size={14} />
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div
          className="min-h-[180px] flex flex-col items-center justify-center text-center rounded-2xl"
          style={{ background: "#0b0f15" }}
        >
          <Sparkles size={20} style={{ color: COLORS.textDim }} />
          <p
            className="text-xs font-semibold mt-3"
            style={{ color: COLORS.textMuted }}
          >
            No income sources
          </p>
          <p
            className="text-[10px] mt-1 max-w-[180px]"
            style={{ color: COLORS.textDim }}
          >
            Add income transactions to see your breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.map(({ category, amount, percentage }) => {
            const color = CATEGORY_COLOR[category] || COLORS.textMuted;

            return (
              <div key={category}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: COLORS.text }}
                    >
                      {category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold shrink-0"
                    style={{ color }}
                  >
                    {fmtINR(amount)}
                  </span>
                </div>

                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{
                    background: "#1a202b",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    }}
                  />
                </div>

                <p
                  className="text-[9px] mt-1"
                  style={{ color: COLORS.textDim }}
                >
                  {percentage.toFixed(1)}% of selected income
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-2xl"
      style={{
        background: "#151a23",
        borderColor: COLORS.border,
      }}
    >
      <p className="text-[10px] mb-1" style={{ color: COLORS.textDim }}>
        {label}
      </p>
      <p className="text-sm font-black" style={{ color: COLORS.green }}>
        {formatFullINR(payload[0].value)}
      </p>
    </div>
  );
}

/* =========================================================
   TRANSACTION ITEM
========================================================= */

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
  const [errors, setErrors] = useState({
    description: "",
    amount: "",
  });

  const category = transaction.category || "Extra_Income";
  const color = CATEGORY_COLOR[category] || COLORS.textMuted;
  const icon = CATEGORY_ICONS[category] || <IndianRupee size={16} />;

  const validate = () => {
    const nextErrors = {
      description: "",
      amount: "",
    };

    if (!String(editForm.description || "").trim()) {
      nextErrors.description = "Description is required";
    }

    if (!String(editForm.amount || "").trim()) {
      nextErrors.amount = "Amount is required";
    } else if (
      !Number.isFinite(Number(editForm.amount)) ||
      Number(editForm.amount) <= 0
    ) {
      nextErrors.amount = "Enter a valid amount";
    }

    setErrors(nextErrors);
    return !nextErrors.description && !nextErrors.amount;
  };

  return (
    <div
      className="px-3 sm:px-4 py-3.5 sm:py-4 transition-all"
      style={{
        background: isEditing ? "#151b25" : "transparent",
      }}
    >
      {!isEditing ? (
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl shrink-0 flex items-center justify-center"
            style={{
              background: `${color}12`,
              color,
              border: `1px solid ${color}16`,
            }}
          >
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-xs sm:text-sm font-bold truncate"
                style={{ color: COLORS.text }}
              >
                {transaction.description}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1.5 min-w-0">
              <span
                className="text-[9px] sm:text-[10px] shrink-0"
                style={{ color: COLORS.textDim }}
              >
                <span className="sm:hidden">
                  {formatTransactionDateMobile(transaction.date)}
                </span>
                <span className="hidden sm:inline">
                  {formatTransactionDate(transaction.date)}
                </span>
              </span>

              <span className="text-[8px]" style={{ color: COLORS.border }}>
                •
              </span>

              <CategoryPill cat={category} />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span
              className="text-xs sm:text-sm font-black"
              style={{ color: COLORS.green }}
            >
              +{formatFullINR(transaction.amount)}
            </span>

            <button
              type="button"
              onClick={() => {
                setEditForm({
                  description: transaction.description || "",
                  amount: transaction.amount || "",
                  category,
                  date: getDateInputValue(transaction.date),
                });
                setErrors({ description: "", amount: "" });
                setEditingId(transaction.id);
              }}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              style={{ color: COLORS.textDim }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.green;
                e.currentTarget.style.background = `${COLORS.green}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.textDim;
                e.currentTarget.style.background = "transparent";
              }}
              title="Edit income"
            >
              <Edit2 size={13} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              style={{ color: COLORS.textDim }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.red;
                e.currentTarget.style.background = `${COLORS.red}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.textDim;
                e.currentTarget.style.background = "transparent";
              }}
              title="Delete income"
            >
              <Trash2 size={13} />
            </button>

            <div className="flex sm:hidden gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditForm({
                    description: transaction.description || "",
                    amount: transaction.amount || "",
                    category,
                    date: getDateInputValue(transaction.date),
                  });
                  setErrors({ description: "", amount: "" });
                  setEditingId(transaction.id);
                }}
                className="h-7 w-7 flex items-center justify-center rounded-lg"
                style={{ color: COLORS.textDim, background: "#141923" }}
              >
                <Edit2 size={12} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(transaction.id)}
                className="h-7 w-7 flex items-center justify-center rounded-lg"
                style={{ color: COLORS.red, background: `${COLORS.red}08` }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-3 sm:p-4"
          style={{
            background: "#0b0f15",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="space-y-3">
            <div>
              <label
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: COLORS.textDim }}
              >
                Description
              </label>
              <input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full mt-1.5 h-10 rounded-xl px-3 text-xs outline-none"
                style={{
                  background: "#141923",
                  color: COLORS.text,
                  border: `1px solid ${
                    errors.description ? COLORS.red : COLORS.border
                  }`,
                }}
                placeholder="Income description"
              />
              {errors.description && (
                <p className="text-[9px] mt-1" style={{ color: COLORS.red }}>
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.textDim }}
                >
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full mt-1.5 h-10 rounded-xl px-3 text-xs outline-none"
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${
                      errors.amount ? COLORS.red : COLORS.border
                    }`,
                  }}
                  placeholder="Amount"
                />
                {errors.amount && (
                  <p className="text-[9px] mt-1" style={{ color: COLORS.red }}>
                    {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.textDim }}
                >
                  Category
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full mt-1.5 h-10 rounded-xl px-3 text-xs outline-none"
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {INCOME_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.textDim }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full mt-1.5 h-10 rounded-xl px-3 text-xs outline-none"
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (validate()) {
                    onSave();
                  }
                }}
                className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                style={{
                  background: COLORS.green,
                  color: "#06110d",
                }}
              >
                <Save size={13} />
                Save Changes
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrors({ description: "", amount: "" });
                  onCancel();
                }}
                className="h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                style={{
                  background: "#141923",
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <X size={13} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteModal({ transaction, loading, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "#05070bcc" }}
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6"
        style={{
          background: "linear-gradient(145deg, #131821, #0e1219)",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 -20px 80px rgba(0,0,0,.4)",
          animation: "incomeSlideUp .25s ease-out",
        }}
      >
        <div
          className="sm:hidden w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: COLORS.border }}
        />

        <div className="flex justify-center">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `${COLORS.red}10`,
              color: COLORS.red,
              border: `1px solid ${COLORS.red}18`,
            }}
          >
            <Trash2 size={22} />
          </div>
        </div>

        <h2
          className="text-center text-base font-black mt-4"
          style={{ color: COLORS.text }}
        >
          Delete this income?
        </h2>

        <p
          className="text-center text-xs mt-1"
          style={{ color: COLORS.textMuted }}
        >
          This action cannot be undone.
        </p>

        {transaction && (
          <div
            className="rounded-2xl p-3.5 mt-5"
            style={{
              background: "#0b0f15",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-xs font-bold truncate"
                  style={{ color: COLORS.text }}
                >
                  {transaction.description}
                </p>

                <div className="mt-2">
                  <CategoryPill cat={transaction.category} />
                </div>
              </div>

              <p
                className="text-sm font-black shrink-0"
                style={{ color: COLORS.green }}
              >
                {formatFullINR(transaction.amount)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl text-xs font-bold"
            style={{
              background: "#141923",
              color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-11 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{
              background: `${COLORS.red}12`,
              color: COLORS.red,
              border: `1px solid ${COLORS.red}25`,
            }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Income = () => {
 const {
   transactions: outletTransactions = [],
   refreshTransactions = () => {},
   timeFrame,
   setTimeFrame,
 } = useOutletContext() || {};

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const currentYear = getCurrentYear();

  const [editForm, setEditForm] = useState({
    description: "",
    amount: "",
    category: "Salary",
    date: new Date().toISOString().split("T")[0],
  });

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "income",
    category: "Salary",
  });

  /* -----------------------------------------
     TOAST
  ----------------------------------------- */

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

    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  /* -----------------------------------------
     INCOME TRANSACTIONS
  ----------------------------------------- */

  const incomeTransactions = useMemo(() => {
    return (outletTransactions || [])
      .filter((transaction) => transaction.type === "income")
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [outletTransactions]);

  /* -----------------------------------------
     TIMEFRAME RANGE & TRANSACTIONS
  ----------------------------------------- */

  const timeFrameRange = useMemo(
    () => getTimeFrameRange(timeFrame, selectedYear),
    [timeFrame, selectedYear],
  );

  const timeFrameTransactions = useMemo(() => {
    return incomeTransactions.filter((transaction) =>
      isDateInRange(transaction.date, timeFrameRange.start, timeFrameRange.end),
    );
  }, [incomeTransactions, timeFrameRange]);

  /* -----------------------------------------
     FILTERED TRANSACTIONS
  ----------------------------------------- */

  const filteredTransactions = useMemo(() => {
    let list = [...timeFrameTransactions];

    if (categoryFilter !== "all") {
      list = list.filter(
        (transaction) =>
          String(transaction.category || "Other").toLowerCase() ===
          categoryFilter.toLowerCase(),
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      list = list.filter((transaction) => {
        const description = String(transaction.description || "").toLowerCase();
        const category = String(transaction.category || "").toLowerCase();

        return description.includes(query) || category.includes(query);
      });
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [timeFrameTransactions, categoryFilter, search]);

  /* -----------------------------------------
     KPI
  ----------------------------------------- */

  const totalIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount || 0),
        0,
      ),
    [filteredTransactions],
  );

  const averageIncome = useMemo(
    () =>
      filteredTransactions.length
        ? totalIncome / filteredTransactions.length
        : 0,
    [totalIncome, filteredTransactions.length],
  );

  const highestIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (highest, transaction) =>
          Math.max(highest, Number(transaction.amount || 0)),
        0,
      ),
    [filteredTransactions],
  );

  /* -----------------------------------------
     CHART
  ----------------------------------------- */

  const chartPoints = useMemo(
    () =>
      buildChartPoints(
        timeFrame === "daily" || timeFrame === "weekly" ? "month" : timeFrame,
        timeFrame === "daily" || timeFrame === "weekly"
          ? new Date().toISOString().split("T")[0].slice(0, 7)
          : String(selectedYear),
      ),
    [timeFrame, selectedYear],
  );

  const chartData = useMemo(() => {
    return chartPoints.map((point) => {
      const income = timeFrameTransactions
        .filter((transaction) => {
          const d = new Date(transaction.date);

          if (timeFrame === "daily" || timeFrame === "weekly") {
            return d.getDate() === point.day;
          }

          return d.getMonth() === point.month;
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      return {
        ...point,
        income,
      };
    });
  }, [chartPoints, timeFrameTransactions, timeFrame]);

  const chartLabel =
    timeFrame === "daily" || timeFrame === "weekly"
      ? "Daily income"
      : timeFrame === "monthly"
        ? "Monthly income"
        : "Yearly income";

  /* -----------------------------------------
     VISIBLE TRANSACTIONS
  ----------------------------------------- */

  const visibleTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(0, 10);

  /* -----------------------------------------
     RESET
  ----------------------------------------- */

  const resetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setShowAll(false);
  }, []);

  /* -----------------------------------------
     ADD
  ----------------------------------------- */

  const handleAddTransaction = useCallback(async () => {
    const description = String(newTransaction.description || "").trim();
    const amount = Number(newTransaction.amount);

    if (!description) {
      addToast("Please enter a description.", "error");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Please enter a valid amount.", "error");
      return;
    }

    const payload = {
      description,
      amount,
      category: newTransaction.category || "Salary",
      date: toIsoWithClientTime(newTransaction.date),
    };

    try {
      setLoading(true);

      await axios.post(`${API_BASE}/income/add`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      learnCategory(payload.description, payload.category);

      setShowModal(false);

      setNewTransaction({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "income",
        category: "Salary",
      });

      addToast("Income added successfully.", "success");

      refreshTransactions();
    } catch (error) {
      addToast(
        error?.response?.data?.message || "Failed to save income.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [newTransaction, refreshTransactions, addToast]);

  /* -----------------------------------------
     EDIT
  ----------------------------------------- */

  const handleEditTransaction = useCallback(async () => {
    if (!editingId) return;

    const description = String(editForm.description || "").trim();
    const amount = Number(editForm.amount);

    if (!description) {
      addToast("Description is required.", "error");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Enter a valid amount.", "error");
      return;
    }

    const payload = {
      description,
      amount,
      category: editForm.category || "Salary",
      date: toIsoWithClientTime(editForm.date),
    };

    try {
      setLoading(true);

      await axios.put(`${API_BASE}/income/update/${editingId}`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      learnCategory(payload.description, payload.category);

      setEditingId(null);

      addToast("Income updated successfully.", "success");

      refreshTransactions();
    } catch (error) {
      addToast(error?.response?.data?.message || "Update failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [editingId, editForm, refreshTransactions, addToast]);

  /* -----------------------------------------
     DELETE
  ----------------------------------------- */

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return;

    try {
      setLoading(true);

      await axios.delete(`${API_BASE}/income/delete/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);

      addToast("Income deleted successfully.", "success");

      refreshTransactions();
    } catch (error) {
      addToast(error?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [deleteTarget, refreshTransactions, addToast]);

  /* -----------------------------------------
     EXPORT
  ----------------------------------------- */

  const handleExport = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_BASE}/income/downloadexcel`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });

      const disposition = response.headers["content-disposition"];

      let filename = "income_details.xlsx";

      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/i);

        if (match?.[1]) {
          filename = match[1];
        }
      }

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      addToast("Export ready.", "success");
    } catch (error) {
      addToast("Export failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  /* -----------------------------------------
     UI
  ----------------------------------------- */

  return (
    <>
      <style>{`
    @keyframes incomeSlideUp {
      from {
        transform: translateY(40px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes incomeSlideIn {
      from {
        transform: translateX(24px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }

    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>

      <Toast toasts={toasts} />

      <div className="min-h-screen pb-24 space-y-4 sm:space-y-5">
        {/* HEADER */}
        <section
          className="
    relative
    overflow-hidden
    rounded-[0.25rem]
    sm:rounded-[2rem]
    border
    border-white/70
    dark:border-slate-700
    bg-gradient-to-br
    from-white
    via-emerald-50/50
    to-violet-50/70
    dark:from-slate-900
    dark:via-slate-900
    dark:to-emerald-950/30
    p-4
    sm:p-6
    shadow-[0_20px_60px_rgba(16,185,129,0.08)]
  "
        >
          <div className="absolute -right-20 -top-20 w-52 h-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-52 h-52 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">
            <div
              className="
        flex flex-col gap-5
        rounded-2xl
        border border-slate-200/70
        bg-white/80
        p-4
        shadow-sm
        backdrop-blur-xl
        dark:border-slate-800/80
        dark:bg-slate-950/70
        sm:p-5
        lg:p-6
      "
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className="
                  absolute inset-0
                  animate-ping
                  rounded-full
                  bg-emerald-400/60
                "
                      />

                      <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>

                    <span
                      className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.2em]
                text-emerald-500
              "
                    >
                      Income Intelligence
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    <h1
                      className="
                text-2xl
                font-black
                tracking-[-0.03em]
                text-slate-900
                dark:text-white
                sm:text-3xl
                lg:text-[32px]
              "
                    >
                      Income Tracker
                    </h1>

                    <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                      Smart income insights for{" "}
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {timeFrameRange.label}
                      </span>
                    </p>
                  </div>
                </div>

                <div
                  className="
            flex w-full items-center gap-2
            lg:w-auto
            lg:shrink-0
          "
                >
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={loading}
                    aria-label="Export income"
                    className="
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-bold
              text-slate-600
              shadow-sm
              transition-all
              hover:border-slate-300
              hover:bg-slate-50
              hover:text-slate-900
              active:scale-[.97]
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-300
              dark:hover:border-slate-600
              dark:hover:bg-slate-800
              dark:hover:text-white
              focus:outline-none
              focus:ring-2
              focus:ring-emerald-500/20
              sm:px-3.5
            "
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}

                    <span className="hidden sm:inline">
                      {loading ? "Exporting..." : "Export"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="
              group
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-gradient-to-r
              from-emerald-500
              to-teal-500
              px-3.5
              text-xs
              font-black
              text-white
              shadow-lg
              shadow-emerald-500/20
              transition-all
              hover:-translate-y-0.5
              hover:shadow-xl
              hover:shadow-emerald-500/30
              active:scale-[.97]
              focus:outline-none
              focus:ring-2
              focus:ring-emerald-500/30
              sm:px-4
            "
                  >
                    <Plus
                      size={15}
                      strokeWidth={2.5}
                      className="transition-transform duration-200 group-hover:rotate-90"
                    />

                    <span>Add Income</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

              <div
                className="
          flex flex-col gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
              >
                <div className="min-w-0 overflow-x-auto scrollbar-none">
                  <TimeFrameSelector
                    timeFrame={timeFrame}
                    setTimeFrame={(value) => {
                      setTimeFrame(value);
                      setShowAll(false);
                      setCategoryFilter("all");
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1 sm:flex-none">
                  <YearSelector
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    currentYear={currentYear}
                  />
                </div>
              </div>

              {selectedYear !== currentYear && (
                <div
                  className="
            inline-flex
            w-fit
            shrink-0
            items-center
            gap-2
            rounded-xl
            border
            border-violet-200
            bg-violet-50
            px-3
            py-2
            text-[10px]
            font-black
            text-violet-600
            dark:border-violet-500/20
            dark:bg-violet-500/10
            dark:text-violet-400
          "
                >
                  <RotateCcw size={12} />

                  <span>Viewing {selectedYear}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* STAT CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total income"
            value={fmtINR(totalIncome)}
            sub={timeFrameRange.label}
            icon={TrendingUp}
            accent="#10b981"
          />

          <StatCard
            label="Average"
            value={fmtINR(averageIncome)}
            sub={`${filteredTransactions.length} transactions`}
            icon={BarChart2}
            accent="#8b5cf6"
          />

          <StatCard
            label="Highest"
            value={fmtINR(highestIncome)}
            sub="single transaction"
            icon={ArrowUpRight}
            accent="#3b82f6"
          />

          <StatCard
            label="Transactions"
            value={filteredTransactions.length}
            sub={
              categoryFilter === "all"
                ? "all records"
                : categoryFilter.replace(/_/g, " ")
            }
            icon={CircleDollarSign}
            accent="#f97316"
          />
        </section>

        {/* CHART + BREAKDOWN */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div
            className="
          xl:col-span-2
          rounded-3xl
          border
          border-slate-100
          dark:border-slate-700
          bg-white
          dark:bg-slate-900
          p-4
          sm:p-5
          shadow-[0_12px_40px_rgba(15,23,42,0.05)]
          dark:shadow-black/20
        "
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <BarChart2 size={14} className="text-emerald-500" />
                  </div>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {chartLabel}
                  </h3>
                </div>

                <p className="mt-1 ml-10 text-[10px] text-slate-400">
                  {timeFrameRange.label}
                </p>
              </div>
            </div>

            <div className="h-56 sm:h-64">
              {chartData.some((item) => item.income > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: -15,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="premiumIncomeGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10b981"
                          stopOpacity={0.95}
                        />

                        <stop
                          offset="100%"
                          stopColor="#10b981"
                          stopOpacity={0.55}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 4"
                      stroke="#f1f5f9"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 9,
                      }}
                      interval={
                        timeFrame === "monthly"
                          ? chartData.length > 20
                            ? 4
                            : 2
                          : 0
                      }
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 9,
                      }}
                      width={48}
                      tickFormatter={(value) => fmtINR(value)}
                    />

                    <Tooltip
                      cursor={{
                        fill: "#10b98108",
                      }}
                      content={<CustomTooltip />}
                    />

                    <Bar
                      dataKey="income"
                      fill="url(#premiumIncomeGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={timeFrame === "monthly" ? 18 : 32}
                    >
                      {chartData.map((item, index) => (
                        <Cell
                          key={item.key}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                          fillOpacity={item.income > 0 ? 1 : 0.18}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <BarChart2
                      size={22}
                      className="text-slate-300 dark:text-slate-600"
                    />
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    No chart data
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Income will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <IncomeBreakdown transactions={filteredTransactions} />
        </section>

        {/* TRANSACTIONS */}
        <section
          className="
        rounded-3xl
        border
        border-slate-100
        dark:border-slate-700
        bg-white
        dark:bg-slate-900
        overflow-hidden
        shadow-[0_12px_40px_rgba(15,23,42,0.05)]
        dark:shadow-black/20
      "
        >
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <ReceiptText size={17} className="text-emerald-500" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      Transactions
                    </h3>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 text-[9px] font-black">
                      {filteredTransactions.length}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {timeFrameRange.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search
                    size={13}
                    className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
                  />

                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setShowAll(false);
                    }}
                    placeholder="Search income…"
                    className="
                  w-full
                  sm:w-48
                  pl-9
                  pr-9
                  py-2.5
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-slate-700
                  bg-slate-50
                  dark:bg-slate-950
                  text-xs
                  text-slate-700
                  dark:text-slate-200
                  outline-none
                  focus:border-emerald-400
                  focus:ring-4
                  focus:ring-emerald-500/10
                  placeholder:text-slate-300
                "
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="
                    absolute
                    right-2
                    top-1/2
                    -translate-y-1/2
                    w-6
                    h-6
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    text-slate-400
                  "
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <CategoryFilter
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setShowAll(false);
                  }}
                />

                {(search || categoryFilter !== "all") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="
                  h-10
                  w-10
                  shrink-0
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  text-slate-400
                  hover:text-emerald-500
                  hover:bg-emerald-50
                  dark:hover:bg-emerald-500/10
                  transition
                "
                    aria-label="Reset filters"
                    title="Reset filters"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                    const transactionToDelete = filteredTransactions.find(
                      (item) => item.id === id,
                    );

                    setDeleteTarget(
                      transactionToDelete || {
                        id,
                      },
                    );
                  }}
                  setEditingId={setEditingId}
                />
              ))
            ) : (
              <div className="py-16 px-5 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-500/10 dark:to-violet-500/10 flex items-center justify-center">
                  <ReceiptText
                    size={24}
                    className="text-emerald-300 dark:text-emerald-400"
                  />
                </div>

                <h4 className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">
                  No income found
                </h4>

                <p className="mt-1 max-w-xs text-xs text-slate-400">
                  {search || categoryFilter !== "all"
                    ? "Try changing your search or filters."
                    : `No income recorded for ${timeFrameRange.label}.`}
                </p>

                {search || categoryFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="
                  mt-4
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  bg-slate-100
                  dark:bg-slate-800
                  text-slate-600
                  dark:text-slate-300
                  text-xs
                  font-black
                "
                  >
                    <RotateCcw size={13} />
                    Reset filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="
                  mt-4
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  bg-gradient-to-r
                  from-emerald-500
                  to-teal-500
                  text-white
                  text-xs
                  font-black
                  shadow-lg
                  shadow-emerald-500/20
                "
                  >
                    <Plus size={13} />
                    Add first income
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredTransactions.length > 10 && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              {!showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="
                w-full
                py-4
                flex
                items-center
                justify-center
                gap-2
                text-[10px]
                font-black
                text-emerald-500
                hover:bg-emerald-50/50
                dark:hover:bg-emerald-500/5
                transition
              "
                >
                  <Eye size={13} />
                  View all {filteredTransactions.length} transactions
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="
                w-full
                py-4
                flex
                items-center
                justify-center
                gap-2
                text-[10px]
                font-black
                text-slate-400
                hover:bg-slate-50
                dark:hover:bg-slate-800
                transition
              "
                >
                  <EyeOff size={13} />
                  Show less
                </button>
              )}
            </div>
          )}
        </section>

        {/* MOBILE QUICK ADD */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="
        md:hidden
        fixed
        bottom-5
        right-5
        z-40
        w-14
        h-14
        rounded-2xl
        bg-gradient-to-br
        from-emerald-500
        to-teal-500
        text-white
        flex
        items-center
        justify-center
        shadow-2xl
        shadow-emerald-500/30
        active:scale-90
        transition
      "
          aria-label="Add income"
        >
          <Plus size={23} />
        </button>
      </div>

      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={loading}
        lockType="income"
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

export default Income;
