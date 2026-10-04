import ReactDOM, { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";

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
  Fuel,
  Scissors,
  Baby,
  Shield,
  Milk,
  Wrench,
  ShoppingBasket,
  Cookie,
  Sparkles,
  CalendarDays,
  WalletCards,
  RotateCcw,
  Loader2,
  Receipt,
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

import CustomRangePicker from "../components/common/CustomRangePicker";

import {
  chartKeyForDate,
  chartKeyForPoint,
  generateChartPoints,
  getTimeFrameRange,
  isDailyGranularity,
} from "../utils/commonHelpers";

import { usePeriod } from "../utils/usePeriod";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const AI_DEBOUNCE_MS = 400;
const MAX_VISIBLE_TRANSACTIONS = 10;

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly", "custom"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* -------------------------------------------------------------------------- */
/*                                  COLORS                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Production-safe date parser.
 *
 * Important:
 * new Date("2026-10-04") is interpreted as UTC in browsers.
 * For an Indian/local date input this can become Oct 3 in some timezones.
 * Therefore YYYY-MM-DD is explicitly parsed as local time.
 */
function normalizeDate(value) {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);

    const localDate = new Date(year, month - 1, day);

    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoWithClientTime(dateValue) {
  if (!dateValue) {
    return new Date().toISOString();
  }

  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);

    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    return localDate.toISOString();
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function fmtINR(value, compact = true) {
  const n = safeNumber(value);

  if (compact) {
    if (n >= 1_00_00_000) {
      return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
    }

    if (n >= 1_00_000) {
      return `₹${(n / 1_00_000).toFixed(1)}L`;
    }

    if (n >= 1_000) {
      return `₹${(n / 1_000).toFixed(1)}K`;
    }
  }

  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtINRFull(value) {
  return `₹${safeNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCategory(category) {
  return String(category || "Other").replace(/_/g, " ");
}

function isDateInRange(dateValue, start, end) {
  const date = normalizeDate(dateValue);

  if (!date) return false;

  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  if (!startDate || !endDate) return false;

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return date >= startDate && date <= endDate;
}

/* -------------------------------------------------------------------------- */
/*                                  TOAST                                     */
/* -------------------------------------------------------------------------- */

function Toast({ toasts }) {
  if (!toasts?.length) return null;

  return (
    <div
      className="
        fixed
        top-3
        left-3
        right-3
        sm:left-auto
        sm:right-5
        sm:w-[360px]
        z-[10000]
        flex
        flex-col
        gap-2
        pointer-events-none
      "
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex
            items-center
            gap-3
            px-4
            py-3
            rounded-2xl
            border
            shadow-2xl
            backdrop-blur-xl
            text-sm
            font-medium
            pointer-events-auto
            animate-[slideInRight_.25s_ease-out]
            ${
              toast.type === "success"
                ? "bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                : toast.type === "error"
                  ? "bg-white/95 dark:bg-slate-900/95 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }
          `}
        >
          <div
            className={`
              w-8
              h-8
              rounded-xl
              flex
              items-center
              justify-center
              shrink-0
              ${
                toast.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-500/10"
                  : toast.type === "error"
                    ? "bg-red-50 dark:bg-red-500/10"
                    : "bg-orange-50 dark:bg-orange-500/10"
              }
            `}
          >
            {toast.type === "success" ? (
              <Check size={15} className="text-emerald-500" />
            ) : toast.type === "error" ? (
              <AlertCircle size={15} className="text-red-500" />
            ) : (
              <Zap size={15} className="text-orange-500" />
            )}
          </div>

          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                STAT CARD                                   */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  sub,
  accent = "#f97316",
  icon: Icon,
  trend,
  trendLabel,
}) {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/60
        dark:border-slate-700/70
        bg-white/90
        dark:bg-slate-900/90
        backdrop-blur-xl
        p-4
        sm:p-5
        shadow-[0_12px_40px_rgba(15,23,42,0.06)]
        dark:shadow-black/20
        hover:-translate-y-1
        hover:shadow-[0_20px_50px_rgba(249,115,22,0.12)]
        transition-all
        duration-300
      "
    >
      <div
        className="
          absolute
          -right-8
          -top-8
          w-24
          h-24
          rounded-full
          blur-2xl
          opacity-30
          pointer-events-none
        "
        style={{ background: accent }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="
              w-10
              h-10
              sm:w-11
              sm:h-11
              rounded-2xl
              flex
              items-center
              justify-center
            "
            style={{
              background: `${accent}15`,
              color: accent,
            }}
          >
            {Icon && <Icon size={19} />}
          </div>

          {/* FIXED: no accidental createPortal here */}
          {trend !== undefined && trend !== null && (
            <div
              className={`
                flex
                items-center
                gap-1
                px-2
                py-1
                rounded-full
                text-[10px]
                font-bold
                ${
                  trend > 0
                    ? "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                    : trend < 0
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }
              `}
            >
              {trend > 0 ? (
                <ArrowUpRight size={11} />
              ) : trend < 0 ? (
                <ArrowDownRight size={11} />
              ) : null}
              {Math.abs(trend).toFixed(0)}%
            </div>
          )}
        </div>

        <p className="mt-4 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
          {value}
        </p>

        {sub && (
          <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {sub}
          </p>
        )}

        {trendLabel && (
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              CHART TOOLTIP                                 */
/* -------------------------------------------------------------------------- */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-100
        dark:border-slate-700
        bg-white/95
        dark:bg-slate-900/95
        backdrop-blur-xl
        px-4
        py-3
        shadow-2xl
      "
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-black text-orange-500">
        {fmtINRFull(payload[0]?.value)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             CATEGORY PILL                                  */
/* -------------------------------------------------------------------------- */

function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] || CATEGORY_COLOR.Other;

  return (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        text-[10px]
        font-bold
        px-2
        py-1
        rounded-full
        whitespace-nowrap
      "
      style={{
        background: `${color}14`,
        color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />

      {formatCategory(cat)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                         TIME FRAME SELECTOR                                */
/* -------------------------------------------------------------------------- */

function TimeFrameSelector({ timeFrame, setTimeFrame }) {
  const [open, setOpen] = useState(false);

  const periodButtonRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({});

  const updateMenuPosition = useCallback(() => {
    const button = periodButtonRef.current;

    if (!button || typeof window === "undefined") {
      return;
    }

    const rect = button.getBoundingClientRect();

    const gap = 8;

    const top = rect.bottom + gap;

    const maxHeight = Math.max(120, window.innerHeight - top - 12);

    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - rect.width - 8),
    );

    setMenuStyle({
      top,
      left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  const mobileFrames = TIME_FRAMES.filter((frame) => frame !== "custom");

  const currentLabel =
    String(timeFrame || "monthly")
      .charAt(0)
      .toUpperCase() + String(timeFrame || "monthly").slice(1);

  /* ---------------------------------------------------------------------- */
  /* Position dropdown                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updateMenuPosition();

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleViewportChange);

    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);

      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updateMenuPosition]);

  /* ---------------------------------------------------------------------- */
  /* Outside click                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest("[data-mobile-timeframe]")
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  /* ---------------------------------------------------------------------- */
  /* Escape                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        periodButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="w-full @3xl:w-auto @3xl:shrink-0">
      {/* Desktop */}
      <div
        role="group"
        aria-label="Time frame"
        className="
          hidden
          w-full
          gap-1
          rounded-2xl
          border
          border-slate-200/60
          bg-slate-100/80
          p-1
          dark:border-slate-700/60
          dark:bg-slate-800/80
          @3xl:inline-flex
          @3xl:w-auto
        "
      >
        {TIME_FRAMES.map((frame) => {
          const active = timeFrame === frame;

          return (
            <button
              key={frame}
              type="button"
              onClick={() => {
                setTimeFrame(frame);
                setOpen(false);
              }}
              aria-pressed={active}
              className={`
               flex
                min-h-10
                flex-1
                items-center
                justify-center
                whitespace-nowrap
                rounded-xl
                px-1
                text-[11px]
                font-bold
                transition-all
                active:scale-[.97]
                sm:px-4
                @3xl:flex-none
                ${
                  active
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                }
              `}
            >
              {frame.charAt(0).toUpperCase() + frame.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="flex w-full gap-2 @3xl:hidden" data-mobile-timeframe>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            ref={periodButtonRef}
            onClick={() => {
              setOpen((previous) => {
                const next = !previous;

                if (next) {
                  requestAnimationFrame(() => {
                    updateMenuPosition();
                  });
                }

                return next;
              });
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="
              flex
              min-h-11
              w-full
              items-center
              justify-between
              rounded-xl
              border
              border-slate-700/70
              bg-slate-900/90
              px-3
              text-[11px]
              font-bold
              text-slate-200
              shadow-sm
              outline-none
              focus:border-orange-500
              focus:ring-2
              focus:ring-orange-500/20
            "
          >
            <span>{currentLabel === "Custom" ? "Monthly" : currentLabel}</span>

            {/* FIXED: open instead of undefined mobilePeriodOpen */}
            <ChevronDown
              aria-hidden="true"
              size={16}
              strokeWidth={2.2}
              className={`
                text-[#8b93a7]
                transition-transform
                duration-200
                ${open ? "rotate-180" : ""}
              `}
            />
          </button>

          {open &&
            createPortal(
              <div
                data-mobile-timeframe
                role="listbox"
                aria-label="Select time frame"
                className="
                  fixed
                  z-[2147483647]
                  min-w-[150px]
                  overflow-y-auto
                  rounded-xl
                  border
                  border-slate-700/80
                  bg-slate-950/[.99]
                  p-1.5
                  shadow-[0_24px_70px_rgba(0,0,0,.7)]
                  backdrop-blur-xl
                  overscroll-contain
                "
                style={menuStyle}
              >
                {mobileFrames.map((frame) => {
                  const active = timeFrame === frame;

                  return (
                    <button
                      key={frame}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setTimeFrame(frame);
                        setOpen(false);
                      }}
                      className={`
                        flex
                        min-h-10
                        w-full
                        items-center
                        rounded-lg
                        px-3
                        text-left
                        text-[11px]
                        font-bold
                        transition-colors
                        ${
                          active
                            ? "bg-orange-500 text-white"
                            : "text-slate-300 hover:bg-slate-800"
                        }
                      `}
                    >
                      {frame.charAt(0).toUpperCase() + frame.slice(1)}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
        </div>

        <button
          type="button"
          onClick={() => {
            setTimeFrame("custom");
            setOpen(false);
          }}
          aria-pressed={timeFrame === "custom"}
          className={`
            min-h-11
            min-w-[88px]
            rounded-xl
            px-4
            text-[11px]
            font-bold
            transition-all
            active:scale-[.97]
            ${
              timeFrame === "custom"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                : "border border-slate-700/70 bg-slate-900/90 text-slate-300 hover:bg-slate-800"
            }
          `}
        >
          Custom
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           FILTER DROPDOWN                                  */
/* -------------------------------------------------------------------------- */

function FilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const ref = useRef(null);

  const options = useMemo(
    () => [
      {
        value: "all",
        label: "All Transactions",
      },

      ...EXPENSE_CATEGORIES.map((category) => ({
        value: category,
        label: formatCategory(category),
      })),
    ],
    [],
  );

  const label =
    options.find((option) => option.value === value)?.label || "Filter";

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="
          flex
          items-center
          gap-2
          px-3
          py-2
          rounded-2xl
          border
          border-slate-200
          dark:border-slate-700
          bg-white
          dark:bg-slate-900
          hover:bg-slate-50
          dark:hover:bg-slate-800
          transition
          shadow-sm
          outline-none
          focus:ring-2
          focus:ring-orange-500/20
        "
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div
          className="
          w-7
          h-7
          rounded-xl
          bg-orange-50
          dark:bg-orange-500/10
          flex
          items-center
          justify-center
        "
        >
          <SlidersHorizontal size={13} className="text-orange-500" />
        </div>

        <div className="hidden sm:flex flex-col items-start min-w-0">
          <span
            className="
            text-[9px]
            uppercase
            tracking-wider
            text-slate-400
            font-bold
          "
          >
            Filter
          </span>

          <span
            className="
            text-xs
            font-bold
            text-slate-700
            dark:text-slate-200
            max-w-[120px]
            truncate
          "
          >
            {label}
          </span>
        </div>

        <ChevronDown
          size={13}
          className={`
            text-slate-400
            transition-transform
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && (
        <div
          className="
            absolute
            right-0
            top-full
            mt-2
            w-60
            max-w-[calc(100vw-24px)]
            rounded-2xl
            border
            border-slate-100
            dark:border-slate-700
            bg-white
            dark:bg-slate-900
            shadow-2xl
            z-50
            overflow-hidden
          "
        >
          <div
            className="
            max-h-72
            overflow-y-auto
            p-1.5
          "
          >
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`
                    w-full
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2.5
                    rounded-xl
                    text-left
                    text-xs
                    transition
                    ${
                      active
                        ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 font-bold"
                        : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    }
                  `}
                >
                  {option.value !== "all" ? (
                    <span
                      className="
                        w-2
                        h-2
                        rounded-full
                        shrink-0
                      "
                      style={{
                        background:
                          CATEGORY_COLOR[option.value] || CATEGORY_COLOR.Other,
                      }}
                    />
                  ) : (
                    <span
                      className="
                      w-2
                      h-2
                      rounded-full
                      bg-slate-300
                      dark:bg-slate-600
                      shrink-0
                    "
                    />
                  )}

                  {option.label}

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

/* -------------------------------------------------------------------------- */
/*                         SPENDING BREAKDOWN                                 */
/* -------------------------------------------------------------------------- */

function SpendingBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};

    for (const transaction of transactions || []) {
      const category = transaction.category || "Other";

      map[category] = (map[category] || 0) + safeNumber(transaction.amount);
    }

    const total = Object.values(map).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total ? (amount / total) * 100 : 0,
      }));
  }, [transactions]);

  if (!breakdown.length) {
    return (
      <div
        className="
        min-h-[260px]
        rounded-3xl
        border
        border-slate-100
        dark:border-slate-700
        bg-white
        dark:bg-slate-900
        p-5
        flex
        flex-col
        items-center
        justify-center
        text-center
      "
      >
        <div
          className="
          w-14
          h-14
          rounded-2xl
          bg-orange-50
          dark:bg-orange-500/10
          flex
          items-center
          justify-center
        "
        >
          <Flame size={23} className="text-orange-300" />
        </div>

        <p
          className="
          mt-3
          text-sm
          font-bold
          text-slate-700
          dark:text-slate-200
        "
        >
          No spending data
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Add transactions to see your category breakdown.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
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
      <div
        className="
        flex
        items-center
        justify-between
        mb-5
      "
      >
        <h3
          className="
          text-sm
          font-black
          text-slate-800
          dark:text-white
          flex
          items-center
          gap-2
        "
        >
          <span
            className="
            w-8
            h-8
            rounded-xl
            bg-orange-50
            dark:bg-orange-500/10
            flex
            items-center
            justify-center
          "
          >
            <Flame size={14} className="text-orange-500" />
          </span>
          Top categories
        </h3>

        <span
          className="
          text-[10px]
          font-bold
          text-slate-400
        "
        >
          TOP 6
        </span>
      </div>

      <div className="space-y-4">
        {breakdown.map(({ category, amount, percentage }) => {
          const color = CATEGORY_COLOR[category] || CATEGORY_COLOR.Other;

          return (
            <div key={category}>
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  mb-2
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    min-w-0
                  "
                >
                  <div
                    className="
                        w-8
                        h-8
                        rounded-xl
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    style={{
                      background: `${color}15`,
                      color,
                    }}
                  >
                    {CATEGORY_ICONS[category] || <IndianRupee size={14} />}
                  </div>

                  <span
                    className="
                      text-xs
                      font-bold
                      text-slate-600
                      dark:text-slate-300
                      truncate
                    "
                  >
                    {formatCategory(category)}
                  </span>
                </div>

                <span
                  className="
                    text-xs
                    font-black
                    text-slate-800
                    dark:text-white
                    shrink-0
                  "
                >
                  {fmtINR(amount)}
                </span>
              </div>

              <div
                className="
                  h-2
                  bg-slate-100
                  dark:bg-slate-800
                  rounded-full
                  overflow-hidden
                "
              >
                <div
                  className="
                      h-full
                      rounded-full
                      transition-all
                      duration-700
                    "
                  style={{
                    width: `${Math.min(100, percentage)}%`,
                    background: color,
                  }}
                />
              </div>

              <div
                className="
                  mt-1
                  flex
                  justify-end
                "
              >
                <span
                  className="
                    text-[9px]
                    font-bold
                    text-slate-400
                  "
                >
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              AI BADGE                                      */
/* -------------------------------------------------------------------------- */

function AiAutoDetectBadge({ detection, onDismiss }) {
  if (!detection) return null;

  const color = CATEGORY_COLOR[detection.category] || CATEGORY_COLOR.Other;

  return (
    <div
      className="
        flex
        items-center
        gap-2
        mt-2
        px-3
        py-2.5
        rounded-xl
        border
      "
      style={{
        background: `${color}0c`,
        borderColor: `${color}25`,
      }}
    >
      <div
        className="
          w-6
          h-6
          rounded-lg
          flex
          items-center
          justify-center
          shrink-0
        "
        style={{
          background: `${color}15`,
        }}
      >
        <Sparkles size={11} style={{ color }} />
      </div>

      <span
        className="
        text-[11px]
        text-slate-500
        dark:text-slate-400
        flex-1
      "
      >
        AI suggested{" "}
        <strong style={{ color }}>{formatCategory(detection.category)}</strong>
        <span className="ml-1 text-slate-400">
          {detection.source?.startsWith("memory")
            ? "from memory"
            : "automatically"}
        </span>
      </span>

      <button
        type="button"
        onClick={onDismiss}
        className="
          w-6
          h-6
          rounded-lg
          flex
          items-center
          justify-center
          text-slate-400
          hover:bg-slate-100
          dark:hover:bg-slate-800
        "
        aria-label="Dismiss AI suggestion"
      >
        <X size={11} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         TRANSACTION ITEM                                  */
/* -------------------------------------------------------------------------- */

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

  const [editDetection, setEditDetection] = useState(null);

  const editDebounceRef = useRef(null);

  const color = CATEGORY_COLOR[transaction.category] || CATEGORY_COLOR.Other;

  const icon = CATEGORY_ICONS[transaction.category] || (
    <IndianRupee size={15} />
  );

  const date = normalizeDate(transaction.date);

  useEffect(() => {
    return () => {
      clearTimeout(editDebounceRef.current);
    };
  }, []);

  const handleEditDescChange = (value) => {
    setEditForm((previous) => ({
      ...previous,
      description: value,
    }));

    clearTimeout(editDebounceRef.current);

    if (value.trim().length < 3) {
      setEditDetection(null);
      return;
    }

    editDebounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(value);

      if (result?.category && result.confidence >= 0.7) {
        setEditForm((previous) => ({
          ...previous,
          category: result.category,
        }));

        setEditDetection(result);
      } else {
        setEditDetection(null);
      }
    }, AI_DEBOUNCE_MS);
  };

  const validate = () => {
    const nextErrors = {
      description: "",
      amount: "",
    };

    if (!String(editForm.description || "").trim()) {
      nextErrors.description = "Description is required";
    }

    const amount = Number(editForm.amount);

    if (!editForm.amount) {
      nextErrors.amount = "Amount is required";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Enter a valid amount";
    }

    setErrors(nextErrors);

    return !nextErrors.description && !nextErrors.amount;
  };

  const handleSave = () => {
    if (!validate()) return;

    learnCategory(editForm.description, editForm.category);

    onSave();
  };

  if (isEditing) {
    return (
      <div
        className="
        p-4
        bg-orange-50/60
        dark:bg-orange-500/5
        border-l-2
        border-orange-500
      "
      >
        <div
          className="
          grid
          grid-cols-1
          lg:grid-cols-[1fr_180px_180px_auto]
          gap-3
        "
        >
          <div>
            <label
              className="
              block
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-slate-400
              mb-1.5
            "
            >
              Description
            </label>

            <input
              type="text"
              value={editForm.description}
              onChange={(event) => handleEditDescChange(event.target.value)}
              className={`
                w-full
                px-3
                py-2.5
                rounded-xl
                border
                bg-white
                dark:bg-slate-950
                text-sm
                text-slate-700
                dark:text-slate-200
                outline-none
                ${
                  errors.description
                    ? "border-red-400"
                    : "border-slate-200 dark:border-slate-700 focus:border-orange-400"
                }
              `}
              placeholder="Description"
            />

            {errors.description && (
              <p
                className="
                mt-1
                text-[10px]
                text-red-500
              "
              >
                {errors.description}
              </p>
            )}

            <AiAutoDetectBadge
              detection={editDetection}
              onDismiss={() => setEditDetection(null)}
            />
          </div>

          <div>
            <label
              className="
              block
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-slate-400
              mb-1.5
            "
            >
              Amount
            </label>

            <input
              type="number"
              value={editForm.amount}
              min="0.01"
              step="0.01"
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  amount: event.target.value,
                }))
              }
              className={`
                w-full
                px-3
                py-2.5
                rounded-xl
                border
                bg-white
                dark:bg-slate-950
                text-sm
                text-slate-700
                dark:text-slate-200
                outline-none
                ${
                  errors.amount
                    ? "border-red-400"
                    : "border-slate-200 dark:border-slate-700 focus:border-orange-400"
                }
              `}
            />

            {errors.amount && (
              <p
                className="
                mt-1
                text-[10px]
                text-red-500
              "
              >
                {errors.amount}
              </p>
            )}
          </div>

          <div>
            <label
              className="
              block
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-slate-400
              mb-1.5
            "
            >
              Category
            </label>

            <select
              value={editForm.category}
              onChange={(event) => {
                const category = event.target.value;

                setEditForm((previous) => ({
                  ...previous,
                  category,
                }));

                setEditDetection(null);

                if (editForm.description?.trim()) {
                  learnCategory(editForm.description, category);
                }
              }}
              className="
                w-full
                px-3
                py-2.5
                rounded-xl
                border
                border-slate-200
                dark:border-slate-700
                bg-white
                dark:bg-slate-950
                text-xs
                text-slate-700
                dark:text-slate-200
                outline-none
              "
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </div>

          <div
            className="
            flex
            items-end
            gap-2
          "
          >
            <button
              type="button"
              onClick={handleSave}
              className="
                flex-1
                lg:flex-none
                flex
                items-center
                justify-center
                gap-1.5
                px-4
                py-2.5
                rounded-xl
                bg-orange-500
                hover:bg-orange-600
                text-white
                text-xs
                font-bold
                transition
                active:scale-95
              "
            >
              <Save size={13} />
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setErrors({
                  description: "",
                  amount: "",
                });

                setEditDetection(null);

                onCancel();
              }}
              className="
                flex-1
                lg:flex-none
                flex
                items-center
                justify-center
                gap-1.5
                px-4
                py-2.5
                rounded-xl
                bg-slate-100
                dark:bg-slate-800
                text-slate-600
                dark:text-slate-300
                text-xs
                font-bold
              "
            >
              <X size={13} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div
        className="
        hidden
        md:grid
        grid-cols-[110px_150px_1fr_150px_100px]
        items-center
        gap-3
        px-5
        py-3.5
        hover:bg-slate-50/70
        dark:hover:bg-slate-800/50
        transition
      "
      >
        <div
          className="
          text-xs
          text-slate-500
          dark:text-slate-400
        "
        >
          {date
            ? date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </div>

        <div
          className="
          font-black
          text-sm
          text-red-500
          dark:text-red-400
        "
        >
          −{fmtINRFull(transaction.amount)}
        </div>

        <div
          className="
          flex
          items-center
          gap-3
          min-w-0
        "
        >
          <div
            className="
              w-9
              h-9
              rounded-xl
              flex
              items-center
              justify-center
              shrink-0
            "
            style={{
              background: `${color}15`,
              color,
            }}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p
              className="
              text-sm
              font-bold
              text-slate-700
              dark:text-slate-200
              truncate
            "
            >
              {transaction.description}
            </p>
          </div>
        </div>

        <CategoryPill cat={transaction.category} />

        <div
          className="
          flex
          items-center
          justify-end
          gap-1
        "
        >
          <button
            type="button"
            onClick={() => {
              setEditForm({
                description: transaction.description || "",
                amount: transaction.amount || "",
                category: transaction.category || "Food",
                date: transaction.date || getLocalDateInputValue(),
              });

              setEditingId(transaction.id);
            }}
            className="
              w-8
              h-8
              rounded-xl
              flex
              items-center
              justify-center
              text-slate-400
              hover:bg-orange-50
              hover:text-orange-500
              dark:hover:bg-orange-500/10
            "
            aria-label="Edit expense"
          >
            <Edit2 size={13} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="
              w-8
              h-8
              rounded-xl
              flex
              items-center
              justify-center
              text-slate-400
              hover:bg-red-50
              hover:text-red-500
              dark:hover:bg-red-500/10
            "
            aria-label="Delete expense"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div
        className="
        md:hidden
        p-4
        active:bg-slate-50
        dark:active:bg-slate-800/50
      "
      >
        <div
          className="
          flex
          items-start
          gap-3
        "
        >
          <div
            className="
              w-11
              h-11
              rounded-2xl
              flex
              items-center
              justify-center
              shrink-0
            "
            style={{
              background: `${color}15`,
              color,
            }}
          >
            {icon}
          </div>

          <div
            className="
            flex-1
            min-w-0
          "
          >
            <div
              className="
              flex
              items-start
              justify-between
              gap-3
            "
            >
              <div className="min-w-0">
                <p
                  className="
                  text-sm
                  font-black
                  text-slate-800
                  dark:text-slate-100
                  truncate
                "
                >
                  {transaction.description}
                </p>

                <p
                  className="
                  mt-1
                  text-[10px]
                  text-slate-400
                "
                >
                  {date
                    ? date.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>

              <p
                className="
                text-sm
                font-black
                text-red-500
                shrink-0
              "
              >
                −{fmtINRFull(transaction.amount)}
              </p>
            </div>

            <div
              className="
              mt-3
              flex
              items-center
              justify-between
              gap-2
            "
            >
              <CategoryPill cat={transaction.category} />

              <div
                className="
                flex
                items-center
                gap-1
              "
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      description: transaction.description || "",
                      amount: transaction.amount || "",
                      category: transaction.category || "Food",
                      date: transaction.date || getLocalDateInputValue(),
                    });

                    setEditingId(transaction.id);
                  }}
                  className="
                    w-8
                    h-8
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    bg-slate-100
                    dark:bg-slate-800
                    text-slate-500
                  "
                  aria-label="Edit expense"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(transaction.id)}
                  className="
                    w-8
                    h-8
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    bg-red-50
                    dark:bg-red-500/10
                    text-red-500
                  "
                  aria-label="Delete expense"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              DELETE MODAL                                  */
/* -------------------------------------------------------------------------- */

function DeleteModal({ transaction, loading, onConfirm, onClose }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return ReactDOM.createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-end
        sm:items-center
        justify-center
        p-0
        sm:p-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-expense-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-slate-950/45
          backdrop-blur-sm
          cursor-default
        "
      />

      <div
        className="
          relative
          w-full
          max-w-md
          rounded-t-[2rem]
          sm:rounded-[2rem]
          bg-white
          dark:bg-slate-900
          border
          border-white/70
          dark:border-slate-700
          shadow-[0_-10px_60px_rgba(0,0,0,0.25)]
          sm:shadow-2xl
          p-5
          sm:p-6
          animate-[slideUp_.25s_ease-out]
        "
      >
        <div
          className="
          w-10
          h-1
          rounded-full
          bg-slate-200
          dark:bg-slate-700
          mx-auto
          mb-5
          sm:hidden
        "
        />

        <div className="flex justify-center">
          <div
            className="
            w-16
            h-16
            rounded-3xl
            bg-red-50
            dark:bg-red-500/10
            flex
            items-center
            justify-center
          "
          >
            <Trash2 size={25} className="text-red-500" />
          </div>
        </div>

        <h2
          id="delete-expense-title"
          className="
            mt-5
            text-center
            text-lg
            font-black
            text-slate-900
            dark:text-white
          "
        >
          Delete this expense?
        </h2>

        <p
          className="
          mt-1
          text-center
          text-xs
          text-slate-400
        "
        >
          This action cannot be undone.
        </p>

        {transaction && (
          <div
            className="
            mt-5
            rounded-2xl
            border
            border-slate-100
            dark:border-slate-700
            bg-slate-50
            dark:bg-slate-950/50
            p-4
          "
          >
            <div
              className="
              flex
              items-center
              justify-between
              gap-3
            "
            >
              <div className="min-w-0">
                <p
                  className="
                  text-sm
                  font-black
                  text-slate-800
                  dark:text-slate-200
                  truncate
                "
                >
                  {transaction.description || "Expense"}
                </p>

                <div className="mt-1">
                  <CategoryPill cat={transaction.category} />
                </div>
              </div>

              <p
                className="
                text-sm
                font-black
                text-red-500
                shrink-0
              "
              >
                {fmtINRFull(transaction.amount)}
              </p>
            </div>
          </div>
        )}

        <div
          className="
          grid
          grid-cols-2
          gap-3
          mt-5
        "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              py-3.5
              rounded-2xl
              bg-slate-100
              dark:bg-slate-800
              text-slate-600
              dark:text-slate-300
              text-sm
              font-bold
              active:scale-95
              transition
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="
              py-3.5
              rounded-2xl
              bg-gradient-to-r
              from-red-500
              to-rose-500
              text-white
              text-sm
              font-bold
              shadow-lg
              shadow-red-500/20
              active:scale-95
              transition
              disabled:opacity-60
              disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <span
                className="
                flex
                items-center
                justify-center
                gap-2
              "
              >
                <Loader2 size={15} className="animate-spin" />
                Deleting
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*                         ADD TRANSACTION MODAL                              */
/* -------------------------------------------------------------------------- */

function AddTransactionModal({
  showModal,
  setShowModal,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  loading,
}) {
  const [errors, setErrors] = useState({
    description: "",
    amount: "",
  });

  const [aiDetection, setAiDetection] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!showModal) {
      clearTimeout(debounceRef.current);
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        if (!loading) {
          setShowModal(false);
        }
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [showModal, setShowModal, loading]);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [showModal]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  const handleDescriptionChange = (value) => {
    setNewTransaction((previous) => ({
      ...previous,
      description: value,
    }));

    clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setAiDetection(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(value);

      if (result?.category && result.confidence >= 0.7) {
        setNewTransaction((previous) => ({
          ...previous,
          category: result.category,
        }));

        setAiDetection(result);
      } else {
        setAiDetection(null);
      }
    }, AI_DEBOUNCE_MS);
  };

  const handleCategorySelect = (category) => {
    setNewTransaction((previous) => ({
      ...previous,
      category,
    }));

    setAiDetection(null);

    if (newTransaction.description?.trim()) {
      learnCategory(newTransaction.description, category);
    }
  };

  const validate = () => {
    const nextErrors = {
      description: "",
      amount: "",
    };

    if (!newTransaction.description?.trim()) {
      nextErrors.description = "Description is required";
    }

    const amount = Number(newTransaction.amount);

    if (!newTransaction.amount) {
      nextErrors.amount = "Amount is required";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Enter a valid amount";
    }

    setErrors(nextErrors);

    return !nextErrors.description && !nextErrors.amount;
  };

  const handleSubmit = () => {
    if (loading) return;

    if (!validate()) return;

    if (newTransaction.description?.trim()) {
      learnCategory(newTransaction.description, newTransaction.category);
    }

    handleAddTransaction();
  };

  if (!showModal) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-end
        sm:items-center
        justify-center
        bg-slate-950/40
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          setShowModal(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Add new expense"
    >
      <div
        className="
          relative
          w-full
          max-w-xl
          max-h-[94vh]
          overflow-y-auto
          rounded-t-[2rem]
          sm:rounded-[2rem]
          bg-white
          dark:bg-slate-900
          border
          border-white/70
          dark:border-slate-700
          shadow-2xl
          animate-[slideUp_.25s_ease-out]
        "
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div
          className="
          sticky
          top-0
          z-20
          px-5
          sm:px-6
          pt-4
          pb-4
          bg-white/95
          dark:bg-slate-900/95
          backdrop-blur-xl
          border-b
          border-slate-100
          dark:border-slate-800
        "
        >
          <div
            className="
            w-10
            h-1
            rounded-full
            bg-slate-200
            dark:bg-slate-700
            mx-auto
            mb-4
            sm:hidden
          "
          />

          <div
            className="
            flex
            items-center
            justify-between
          "
          >
            <div>
              <div
                className="
                flex
                items-center
                gap-2
              "
              >
                <div
                  className="
                  w-9
                  h-9
                  rounded-xl
                  bg-gradient-to-br
                  from-orange-500
                  to-amber-500
                  flex
                  items-center
                  justify-center
                  shadow-lg
                  shadow-orange-500/20
                "
                >
                  <Receipt size={16} className="text-white" />
                </div>

                <div>
                  <p
                    className="
                    text-[9px]
                    uppercase
                    tracking-widest
                    font-black
                    text-orange-500
                  "
                  >
                    New transaction
                  </p>

                  <h2
                    className="
                    text-base
                    font-black
                    text-slate-900
                    dark:text-white
                  "
                  >
                    Add expense
                  </h2>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="
                w-9
                h-9
                rounded-xl
                bg-slate-100
                dark:bg-slate-800
                flex
                items-center
                justify-center
                text-slate-500
                dark:text-slate-300
                disabled:opacity-50
              "
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="
          p-5
          sm:p-6
          space-y-5
        "
        >
          {/* Description */}
          <div>
            <label
              className="
              block
              text-[10px]
              font-black
              uppercase
              tracking-wider
              text-slate-400
              mb-2
            "
            >
              Description
            </label>

            <input
              type="text"
              autoFocus
              value={newTransaction.description}
              onChange={(event) => handleDescriptionChange(event.target.value)}
              placeholder="e.g. Lunch at café"
              className={`
                w-full
                px-4
                py-3.5
                rounded-2xl
                border
                bg-slate-50
                dark:bg-slate-950
                text-sm
                text-slate-700
                dark:text-slate-200
                outline-none
                transition
                placeholder:text-slate-300
                ${
                  errors.description
                    ? "border-red-400 bg-red-50 dark:bg-red-500/5"
                    : "border-slate-200 dark:border-slate-700 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                }
              `}
            />

            {errors.description && (
              <p
                className="
                mt-1.5
                text-[10px]
                text-red-500
              "
              >
                {errors.description}
              </p>
            )}

            <AiAutoDetectBadge
              detection={aiDetection}
              onDismiss={() => setAiDetection(null)}
            />
          </div>

          {/* Amount + Date */}
          <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-3
          "
          >
            <div>
              <label
                className="
                block
                text-[10px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
                mb-2
              "
              >
                Amount
              </label>

              <div className="relative">
                <div
                  className="
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-orange-500
                "
                >
                  <IndianRupee size={15} />
                </div>

                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(event) =>
                    setNewTransaction((previous) => ({
                      ...previous,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className={`
                    w-full
                    pl-9
                    pr-4
                    py-3.5
                    rounded-2xl
                    border
                    bg-slate-50
                    dark:bg-slate-950
                    text-sm
                    font-bold
                    text-slate-700
                    dark:text-slate-200
                    outline-none
                    ${
                      errors.amount
                        ? "border-red-400"
                        : "border-slate-200 dark:border-slate-700 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                    }
                  `}
                />
              </div>

              {errors.amount && (
                <p
                  className="
                  mt-1.5
                  text-[10px]
                  text-red-500
                "
                >
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label
                className="
                block
                text-[10px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
                mb-2
              "
              >
                Date
              </label>

              <input
                type="date"
                value={newTransaction.date}
                onChange={(event) =>
                  setNewTransaction((previous) => ({
                    ...previous,
                    date: event.target.value,
                  }))
                }
                className="
                  w-full
                  px-4
                  py-3.5
                  rounded-2xl
                  border
                  border-slate-200
                  dark:border-slate-700
                  bg-slate-50
                  dark:bg-slate-950
                  text-sm
                  text-slate-700
                  dark:text-slate-200
                  outline-none
                  focus:border-orange-400
                  focus:ring-4
                  focus:ring-orange-500/10
                  [color-scheme:light]
                  dark:[color-scheme:dark]
                "
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div
              className="
              flex
              items-center
              justify-between
              mb-2
            "
            >
              <label
                className="
                text-[10px]
                font-black
                uppercase
                tracking-wider
                text-slate-400
              "
              >
                Category
              </label>

              <span
                className="
                text-[9px]
                font-bold
                text-slate-400
              "
              >
                AI assisted
              </span>
            </div>

            <div
              className="
              grid
              grid-cols-3
              sm:grid-cols-4
              gap-2
            "
            >
              {EXPENSE_CATEGORIES.map((category) => {
                const color = CATEGORY_COLOR[category] || CATEGORY_COLOR.Other;

                const active = newTransaction.category === category;

                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`
                        min-h-[68px]
                        flex
                        flex-col
                        items-center
                        justify-center
                        gap-1.5
                        rounded-2xl
                        border
                        px-2
                        py-2
                        text-[9px]
                        font-bold
                        transition-all
                        active:scale-95
                        ${
                          active
                            ? "text-white border-transparent shadow-lg"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                        }
                      `}
                    style={
                      active
                        ? {
                            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                            borderColor: color,
                            boxShadow: `0 8px 20px ${color}25`,
                          }
                        : undefined
                    }
                  >
                    <span
                      style={{
                        color: active ? "#fff" : color,
                      }}
                    >
                      {CATEGORY_ICONS[category] || <IndianRupee size={14} />}
                    </span>

                    <span
                      className="
                        truncate
                        max-w-full
                      "
                    >
                      {formatCategory(category)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="
          sticky
          bottom-0
          z-20
          px-5
          sm:px-6
          py-4
          bg-white/95
          dark:bg-slate-900/95
          backdrop-blur-xl
          border-t
          border-slate-100
          dark:border-slate-800
          flex
          gap-3
        "
        >
          <button
            type="button"
            onClick={() => setShowModal(false)}
            disabled={loading}
            className="
              flex-1
              py-3.5
              rounded-2xl
              bg-slate-100
              dark:bg-slate-800
              text-slate-600
              dark:text-slate-300
              text-xs
              font-black
              active:scale-95
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="
              flex-[1.6]
              py-3.5
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              via-orange-500
              to-amber-500
              text-white
              text-xs
              font-black
              shadow-xl
              shadow-orange-500/20
              active:scale-[.98]
              disabled:opacity-60
              disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <span
                className="
                flex
                items-center
                justify-center
                gap-2
              "
              >
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </span>
            ) : (
              <span
                className="
                flex
                items-center
                justify-center
                gap-2
              "
              >
                <Plus size={15} />
                Add Expense
              </span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*                           YEAR COMPARISON                                  */
/* -------------------------------------------------------------------------- */

function YearComparisonCard({ selectedYear, currentTotal, previousTotal }) {
  const difference = currentTotal - previousTotal;

  const percentage = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;

  const isHigher = difference > 0;

  return (
    <div
      className="
      rounded-3xl
      border
      border-slate-100
      dark:border-slate-700
      bg-gradient-to-br
      from-slate-900
      via-slate-900
      to-violet-950
      text-white
      p-5
      shadow-2xl
      shadow-violet-900/10
      overflow-hidden
      relative
    "
    >
      <div
        className="
        absolute
        -right-12
        -top-12
        w-36
        h-36
        rounded-full
        bg-violet-500/20
        blur-3xl
      "
      />

      <div
        className="
        absolute
        -left-10
        -bottom-10
        w-28
        h-28
        rounded-full
        bg-orange-500/20
        blur-3xl
      "
      />

      <div className="relative">
        <div
          className="
          flex
          items-center
          justify-between
        "
        >
          <div>
            <p
              className="
              text-[9px]
              uppercase
              tracking-widest
              text-white/50
              font-black
            "
            >
              Year comparison
            </p>

            <h3
              className="
              mt-1
              text-sm
              font-black
            "
            >
              {selectedYear} vs {selectedYear - 1}
            </h3>
          </div>

          <div
            className="
            w-9
            h-9
            rounded-xl
            bg-white/10
            flex
            items-center
            justify-center
          "
          >
            {isHigher ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
        </div>

        <div
          className="
          grid
          grid-cols-2
          gap-3
          mt-5
        "
        >
          <div
            className="
            rounded-2xl
            bg-white/5
            border
            border-white/10
            p-3
          "
          >
            <p
              className="
              text-[9px]
              text-white/40
              font-bold
              uppercase
            "
            >
              {selectedYear}
            </p>

            <p
              className="
              mt-1
              text-lg
              font-black
            "
            >
              {fmtINR(currentTotal)}
            </p>
          </div>

          <div
            className="
            rounded-2xl
            bg-white/5
            border
            border-white/10
            p-3
          "
          >
            <p
              className="
              text-[9px]
              text-white/40
              font-bold
              uppercase
            "
            >
              {selectedYear - 1}
            </p>

            <p
              className="
              mt-1
              text-lg
              font-black
            "
            >
              {fmtINR(previousTotal)}
            </p>
          </div>
        </div>

        <div
          className="
          mt-4
          flex
          items-center
          gap-2
        "
        >
          <span
            className={`
            inline-flex
            items-center
            gap-1
            px-2.5
            py-1
            rounded-full
            text-[10px]
            font-black
            ${
              isHigher
                ? "bg-red-400/15 text-red-300"
                : "bg-emerald-400/15 text-emerald-300"
            }
          `}
          >
            {isHigher ? (
              <ArrowUpRight size={11} />
            ) : (
              <ArrowDownRight size={11} />
            )}
            {Math.abs(percentage).toFixed(1)}%
          </span>

          <span
            className="
            text-[10px]
            text-white/45
          "
          >
            {isHigher ? "higher spending" : "lower spending"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

const ExpensePage = () => {
  const outletContext = useOutletContext() || {};

  const {
    allTransactions,
    transactions: layoutTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions = () => {},
  } = outletContext;

  const outletTransactions = allTransactions ?? layoutTransactions;

  const currentDate = useMemo(() => new Date(), []);

  const currentYear = currentDate.getFullYear();

  const currentMonth = currentDate.getMonth();

  /*
   * Monthly / yearly remain based on current
   * period.
   *
   * Custom uses customRange.
   */
  const { customRange, setCustomRange } = usePeriod(outletContext);

  const selectedYear = currentYear;
  const selectedMonth = currentMonth;

  const yearMonth = null;

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
    date: getLocalDateInputValue(),
  });

  const [newTransaction, setNewTransaction] = useState({
    date: getLocalDateInputValue(),
    description: "",
    amount: "",
    type: "expense",
    category: "Food",
  });

  /* ---------------------------------------------------------------------- */
  /*                               TOAST                                    */
  /* ---------------------------------------------------------------------- */

  const toastTimersRef = useRef(new Set());

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

      toastTimersRef.current.delete(timer);
    }, 3500);

    toastTimersRef.current.add(timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });

      toastTimersRef.current.clear();
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                              AUTH                                      */
  /* ---------------------------------------------------------------------- */

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                           TIME RANGE                                   */
  /* ---------------------------------------------------------------------- */

  const timeFrameRange = useMemo(
    () =>
      getTimeFrameRange(timeFrame, selectedYear, selectedMonth, customRange),
    [timeFrame, selectedYear, selectedMonth, customRange],
  );

  const rangeLabel =
    timeFrame === "yearly" && yearMonth !== null
      ? `${MONTH_NAMES[yearMonth]} ${selectedYear}`
      : timeFrameRange?.label || "Current period";

  const chartPoints = useMemo(
    () =>
      generateChartPoints(timeFrame, selectedYear, selectedMonth, customRange),
    [timeFrame, selectedYear, selectedMonth, customRange],
  );

  /* ---------------------------------------------------------------------- */
  /*                         EXPENSE DATA                                   */
  /* ---------------------------------------------------------------------- */

  const expenseTransactions = useMemo(() => {
    return (outletTransactions || [])
      .filter((transaction) => transaction?.type === "expense")
      .filter((transaction) => normalizeDate(transaction?.date))
      .sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date));
  }, [outletTransactions]);

  const timeFrameTransactions = useMemo(() => {
    if (!timeFrameRange?.start || !timeFrameRange?.end) {
      return [];
    }

    return expenseTransactions.filter((transaction) =>
      isDateInRange(transaction.date, timeFrameRange.start, timeFrameRange.end),
    );
  }, [expenseTransactions, timeFrameRange]);

  /* ---------------------------------------------------------------------- */
  /*                      PREVIOUS YEAR DATA                                */
  /* ---------------------------------------------------------------------- */

  const selectedYearTransactions = useMemo(() => {
    return expenseTransactions.filter((transaction) => {
      const date = normalizeDate(transaction.date);

      return date && date.getFullYear() === selectedYear;
    });
  }, [expenseTransactions, selectedYear]);

  const previousYearTransactions = useMemo(() => {
    return expenseTransactions.filter((transaction) => {
      const date = normalizeDate(transaction.date);

      return date && date.getFullYear() === selectedYear - 1;
    });
  }, [expenseTransactions, selectedYear]);

  const selectedYearTotal = useMemo(
    () =>
      selectedYearTransactions.reduce(
        (sum, transaction) => sum + safeNumber(transaction.amount),
        0,
      ),
    [selectedYearTransactions],
  );

  const previousYearTotal = useMemo(
    () =>
      previousYearTransactions.reduce(
        (sum, transaction) => sum + safeNumber(transaction.amount),
        0,
      ),
    [previousYearTransactions],
  );

  /* ---------------------------------------------------------------------- */
  /*                             FILTERING                                  */
  /* ---------------------------------------------------------------------- */

  const baseFilteredTransactions = useMemo(() => {
    let list = timeFrameTransactions;

    if (filter !== "all") {
      list = list.filter(
        (transaction) =>
          String(transaction.category || "Other").toLowerCase() ===
          filter.toLowerCase(),
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      list = list.filter(
        (transaction) =>
          String(transaction.description || "")
            .toLowerCase()
            .includes(query) ||
          String(transaction.category || "")
            .toLowerCase()
            .includes(query),
      );
    }

    return list;
  }, [timeFrameTransactions, filter, search]);

  const filteredTransactions = useMemo(() => {
    if (timeFrame !== "yearly" || yearMonth === null) {
      return baseFilteredTransactions;
    }

    return baseFilteredTransactions.filter((transaction) => {
      const date = normalizeDate(transaction.date);

      return date && date.getMonth() === yearMonth;
    });
  }, [baseFilteredTransactions, timeFrame, yearMonth]);

  /* ---------------------------------------------------------------------- */
  /*                              STATS                                     */
  /* ---------------------------------------------------------------------- */

  const totalExpense = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, transaction) => sum + safeNumber(transaction.amount),
        0,
      ),
    [filteredTransactions],
  );

  const averageExpense = useMemo(
    () =>
      filteredTransactions.length
        ? totalExpense / filteredTransactions.length
        : 0,
    [filteredTransactions.length, totalExpense],
  );

  const highestExpense = useMemo(
    () =>
      filteredTransactions.reduce(
        (max, transaction) => Math.max(max, safeNumber(transaction.amount)),
        0,
      ),
    [filteredTransactions],
  );

  const previousPeriodTotal = useMemo(() => {
    if (timeFrame === "yearly") {
      return previousYearTotal;
    }

    return 0;
  }, [timeFrame, previousYearTotal]);

  const spendingTrend =
    previousPeriodTotal > 0
      ? ((totalExpense - previousPeriodTotal) / previousPeriodTotal) * 100
      : 0;

  /* ---------------------------------------------------------------------- */
  /*                              CHART                                     */
  /* ---------------------------------------------------------------------- */

  const chartData = useMemo(() => {
    const map = new Map();

    for (const transaction of baseFilteredTransactions) {
      const date = normalizeDate(transaction.date);

      if (!date) continue;

      const key = chartKeyForDate(timeFrame, date, customRange);

      map.set(key, (map.get(key) || 0) + safeNumber(transaction.amount));
    }

    return (chartPoints || []).map((point) => ({
      ...point,
      expense: map.get(chartKeyForPoint(timeFrame, point, customRange)) || 0,
    }));
  }, [baseFilteredTransactions, chartPoints, timeFrame, customRange]);

  /* ---------------------------------------------------------------------- */
  /*                           ADD EXPENSE                                  */
  /* ---------------------------------------------------------------------- */

  const handleAddTransaction = useCallback(async () => {
    if (loading) return;

    if (!API_BASE) {
      addToast("API base URL is not configured.", "error");
      return;
    }

    const description = newTransaction.description?.trim();

    const amount = Number(newTransaction.amount);

    if (!description || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const payload = {
      description,
      amount,
      category: newTransaction.category || "Other",
      date: toIsoWithClientTime(newTransaction.date),
    };

    try {
      setLoading(true);

      await axios.post(`${API_BASE}/expense/add`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      setShowModal(false);

      setNewTransaction({
        date: getLocalDateInputValue(),
        description: "",
        amount: "",
        type: "expense",
        category: "Food",
      });

      addToast("Expense added successfully.", "success");

      await Promise.resolve(refreshTransactions());
    } catch (error) {
      addToast(
        error?.response?.data?.message || "Failed to save expense.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, newTransaction, getAuthHeaders, refreshTransactions, addToast]);

  /* ---------------------------------------------------------------------- */
  /*                           EDIT EXPENSE                                 */
  /* ---------------------------------------------------------------------- */

  const handleEditTransaction = useCallback(async () => {
    if (loading || !editingId) {
      return;
    }

    if (!API_BASE) {
      addToast("API base URL is not configured.", "error");
      return;
    }

    const description = editForm.description?.trim();

    const amount = Number(editForm.amount);

    if (!description || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const payload = {
      description,
      amount,
      category: editForm.category || "Other",
      date: toIsoWithClientTime(editForm.date),
    };

    try {
      setLoading(true);

      await axios.put(`${API_BASE}/expense/update/${editingId}`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      setEditingId(null);

      addToast("Expense updated successfully.", "success");

      await Promise.resolve(refreshTransactions());
    } catch (error) {
      addToast(error?.response?.data?.message || "Update failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    editingId,
    editForm,
    getAuthHeaders,
    refreshTransactions,
    addToast,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                           DELETE EXPENSE                               */
  /* ---------------------------------------------------------------------- */

  const confirmDelete = useCallback(async () => {
    if (loading || !deleteTarget?.id) {
      return;
    }

    if (!API_BASE) {
      addToast("API base URL is not configured.", "error");
      return;
    }

    try {
      setLoading(true);

      await axios.delete(`${API_BASE}/expense/delete/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);

      addToast("Expense deleted successfully.", "success");

      await Promise.resolve(refreshTransactions());
    } catch (error) {
      addToast(error?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [loading, deleteTarget, getAuthHeaders, refreshTransactions, addToast]);

  /* ---------------------------------------------------------------------- */
  /*                              EXPORT                                    */
  /* ---------------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (loading) return;

    if (!API_BASE) {
      addToast("API base URL is not configured.", "error");
      return;
    }

    let objectUrl = null;

    try {
      setLoading(true);

      const response = await axios.get(`${API_BASE}/expense/downloadexcel`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });

      const contentType =
        response.headers["content-type"] || "application/octet-stream";

      const blob = new Blob([response.data], {
        type: contentType,
      });

      const disposition = response.headers["content-disposition"];

      let filename = `expense_details_${selectedYear}.xlsx`;

      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^"]+)"?/i);

        if (match?.[1]) {
          filename = decodeURIComponent(match[1]).replace(/^["']|["']$/g, "");
        }
      }

      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);

      link.click();
      link.remove();

      addToast("Expense export is ready.", "success");
    } catch (error) {
      addToast(
        error?.response?.data?.message || "Export failed. Please try again.",
        "error",
      );
    } finally {
      if (objectUrl) {
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 1000);
      }

      setLoading(false);
    }
  }, [loading, getAuthHeaders, selectedYear, addToast]);

  /* ---------------------------------------------------------------------- */
  /*                           UI HELPERS                                   */
  /* ---------------------------------------------------------------------- */

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilter("all");
    setShowAll(false);
  }, []);

  const handleCustomRangeChange = useCallback(
    (range) => {
      setCustomRange(range);
      setShowAll(false);
      setFilter("all");
    },
    [setCustomRange],
  );

  const visibleTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(0, MAX_VISIBLE_TRANSACTIONS);

  const chartLabel =
    timeFrame === "daily"
      ? "Hourly spending"
      : timeFrame === "weekly"
        ? "Weekly spending"
        : isDailyGranularity(timeFrame, customRange)
          ? "Daily spending"
          : "Monthly spending";

  const hasActiveFilters = filter !== "all" || Boolean(search.trim());

  /* ---------------------------------------------------------------------- */
  /*                              RENDER                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }

          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideInRight {
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

        .dark .recharts-cartesian-grid line {
          stroke: #1e293b !important;
        }

        .dark .recharts-cartesian-axis-tick text {
          fill: #64748b !important;
        }

        .recharts-tooltip-cursor {
          stroke: rgba(249,115,22,.2);
        }
      `}</style>

      <Toast toasts={toasts} />

      <div
        className="
        min-h-screen
        pb-24
        space-y-4
        sm:space-y-5
      "
      >
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}

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
          via-orange-50/50
          to-violet-50/70
          dark:from-slate-900
          dark:via-slate-900
          dark:to-violet-950/30
          p-4
          sm:p-6
          shadow-[0_20px_60px_rgba(249,115,22,0.08)]
        "
        >
          <div
            className="
            absolute
            -right-20
            -top-20
            w-52
            h-52
            rounded-full
            bg-orange-400/10
            blur-3xl
          "
          />

          <div
            className="
            absolute
            -left-20
            -bottom-20
            w-52
            h-52
            rounded-full
            bg-violet-500/10
            blur-3xl
          "
          />

          <div className="relative">
            <div
              className="
              flex
              flex-col
              gap-5
              rounded-2xl
              border
              border-slate-200/70
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
              {/* Top row */}
              <div
                className="
                flex
                flex-col
                gap-5
                lg:flex-row
                lg:items-start
                lg:justify-between
              "
              >
                {/* Title */}
                <div className="min-w-0">
                  <div
                    className="
                    flex
                    items-center
                    gap-2
                  "
                  >
                    <span
                      className="
                      relative
                      flex
                      h-2
                      w-2
                      shrink-0
                    "
                    >
                      <span
                        className="
                        absolute
                        inset-0
                        animate-ping
                        rounded-full
                        bg-orange-400/60
                      "
                      />

                      <span
                        className="
                        relative
                        h-2
                        w-2
                        rounded-full
                        bg-orange-500
                      "
                      />
                    </span>

                    <span
                      className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      text-orange-500
                    "
                    >
                      Personal finance
                    </span>
                  </div>

                  <div
                    className="
                    mt-2
                    flex
                    flex-col
                    gap-1
                  "
                  >
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
                      Expense Tracker
                    </h1>

                    <p
                      className="
                      max-w-xl
                      text-xs
                      leading-5
                      text-slate-500
                      dark:text-slate-400
                      sm:text-sm
                    "
                    >
                      Smart spending insights for{" "}
                      <span
                        className="
                        font-bold
                        text-slate-700
                        dark:text-slate-200
                      "
                      >
                        {rangeLabel}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="
                  flex
                  w-full
                  items-center
                  gap-2
                  lg:w-auto
                  lg:shrink-0
                "
                >
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={loading}
                    aria-label="Export expenses"
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
                      focus:ring-orange-500/20
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
                      from-orange-500
                      to-amber-500
                      px-3.5
                      text-xs
                      font-black
                      text-white
                      shadow-lg
                      shadow-orange-500/20
                      transition-all
                      hover:-translate-y-0.5
                      hover:shadow-xl
                      hover:shadow-orange-500/30
                      active:scale-[.97]
                      focus:outline-none
                      focus:ring-2
                      focus:ring-orange-500/30
                      sm:px-4
                    "
                  >
                    <Plus
                      size={15}
                      strokeWidth={2.5}
                      className="
                        transition-transform
                        duration-200
                        group-hover:rotate-90
                      "
                    />

                    <span>Add Expense</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div
                className="
                h-px
                bg-slate-100
                dark:bg-slate-800/80
              "
              />

              {/* Timeframe */}
              <div className="@container">
                <div
                  className="
                  flex
                  flex-col
                  gap-3
                  @3xl:flex-row
                  @3xl:items-center
                  @3xl:justify-between
                "
                >
                  <TimeFrameSelector
                    timeFrame={timeFrame}
                    setTimeFrame={(value) => {
                      setTimeFrame(value);
                      setShowAll(false);
                      setFilter("all");
                    }}
                  />

                  {timeFrame === "custom" && (
                    <div
                      className="
                      min-w-0
                      @3xl:shrink-0
                    "
                    >
                      <CustomRangePicker
                        customRange={customRange}
                        setCustomRange={handleCustomRangeChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* STAT CARDS                                                        */}
        {/* ================================================================= */}

        <section
          className="
          grid
          grid-cols-2
          lg:grid-cols-4
          gap-3
        "
        >
          <StatCard
            label="Total expenses"
            value={fmtINR(totalExpense)}
            sub={rangeLabel}
            icon={TrendingDown}
            accent="#f97316"
            trend={timeFrame === "yearly" ? spendingTrend : undefined}
            trendLabel={timeFrame === "yearly" ? "vs previous year" : undefined}
          />

          <StatCard
            label="Average"
            value={fmtINR(averageExpense)}
            sub={`${filteredTransactions.length} transactions`}
            icon={BarChart2}
            accent="#8b5cf6"
          />

          <StatCard
            label="Highest"
            value={fmtINR(highestExpense)}
            sub="single transaction"
            icon={ArrowUpRight}
            accent="#ef4444"
          />

          <StatCard
            label="Transactions"
            value={filteredTransactions.length}
            sub={hasActiveFilters ? "filtered results" : "all records"}
            icon={WalletCards}
            accent="#10b981"
          />
        </section>

        {/* ================================================================= */}
        {/* YEAR COMPARISON                                                   */}
        {/* ================================================================= */}

        {timeFrame === "yearly" && (
          <YearComparisonCard
            selectedYear={selectedYear}
            currentTotal={selectedYearTotal}
            previousTotal={previousYearTotal}
          />
        )}

        {/* ================================================================= */}
        {/* CHART + BREAKDOWN                                                 */}
        {/* ================================================================= */}

        <section
          className="
          grid
          grid-cols-1
          xl:grid-cols-3
          gap-4
        "
        >
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
            <div
              className="
              flex
              items-start
              justify-between
              gap-3
              mb-5
            "
            >
              <div>
                <div
                  className="
                  flex
                  items-center
                  gap-2
                "
                >
                  <div
                    className="
                    w-8
                    h-8
                    rounded-xl
                    bg-orange-50
                    dark:bg-orange-500/10
                    flex
                    items-center
                    justify-center
                  "
                  >
                    <BarChart2 size={14} className="text-orange-500" />
                  </div>

                  <h3
                    className="
                    text-sm
                    font-black
                    text-slate-800
                    dark:text-white
                  "
                  >
                    {chartLabel}
                  </h3>
                </div>

                <p
                  className="
                  mt-1
                  ml-10
                  text-[10px]
                  text-slate-400
                "
                >
                  {rangeLabel}
                </p>
              </div>

              <div
                className="
                hidden
                sm:flex
                items-center
                gap-1.5
                px-2.5
                py-1.5
                rounded-xl
                bg-orange-50
                dark:bg-orange-500/10
                text-orange-500
                text-[9px]
                font-black
              "
              >
                <span
                  className="
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-orange-500
                "
                />
                LIVE
              </div>
            </div>

            <div
              className="
              h-56
              sm:h-64
            "
            >
              {chartData.some((item) => item.expense > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
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
                        id="premiumExpenseGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f97316"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="55%"
                          stopColor="#f97316"
                          stopOpacity={0.12}
                        />

                        <stop
                          offset="100%"
                          stopColor="#f97316"
                          stopOpacity={0}
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
                      interval="preserveStartEnd"
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

                    <Tooltip content={<CustomTooltip />} />

                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#f97316"
                      fill="url(#premiumExpenseGradient)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#f97316",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />

                    {chartData.map((point, index) =>
                      point.isCurrent ? (
                        <ReferenceLine
                          key={`${point.label}-${index}`}
                          x={point.label}
                          stroke="#f97316"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          strokeOpacity={0.35}
                        />
                      ) : null,
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="
                  h-full
                  flex
                  flex-col
                  items-center
                  justify-center
                "
                >
                  <div
                    className="
                    w-14
                    h-14
                    rounded-2xl
                    bg-slate-50
                    dark:bg-slate-800
                    flex
                    items-center
                    justify-center
                  "
                  >
                    <BarChart2
                      size={22}
                      className="
                        text-slate-300
                        dark:text-slate-600
                      "
                    />
                  </div>

                  <p
                    className="
                    mt-3
                    text-xs
                    font-bold
                    text-slate-500
                    dark:text-slate-400
                  "
                  >
                    No chart data
                  </p>

                  <p
                    className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                  >
                    Expenses will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <SpendingBreakdown transactions={filteredTransactions} />
        </section>

        {/* ================================================================= */}
        {/* TRANSACTIONS                                                      */}
        {/* ================================================================= */}

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
          {/* Toolbar */}
          <div
            className="
            p-4
            sm:p-5
            border-b
            border-slate-100
            dark:border-slate-800
          "
          >
            <div
              className="
              flex
              flex-col
              lg:flex-row
              lg:items-center
              justify-between
              gap-4
            "
            >
              <div
                className="
                flex
                items-center
                gap-3
              "
              >
                <div
                  className="
                  w-10
                  h-10
                  rounded-2xl
                  bg-orange-50
                  dark:bg-orange-500/10
                  flex
                  items-center
                  justify-center
                "
                >
                  <Receipt size={17} className="text-orange-500" />
                </div>

                <div>
                  <div
                    className="
                    flex
                    items-center
                    gap-2
                  "
                  >
                    <h3
                      className="
                      text-sm
                      font-black
                      text-slate-800
                      dark:text-white
                    "
                    >
                      Transactions
                    </h3>

                    <span
                      className="
                      px-2
                      py-0.5
                      rounded-full
                      bg-orange-50
                      dark:bg-orange-500/10
                      text-orange-500
                      text-[9px]
                      font-black
                    "
                    >
                      {filteredTransactions.length}
                    </span>
                  </div>

                  <p
                    className="
                    mt-0.5
                    text-[10px]
                    text-slate-400
                  "
                  >
                    {rangeLabel}
                  </p>
                </div>
              </div>

              <div
                className="
                flex
                items-center
                gap-2
              "
              >
                <div
                  className="
                  relative
                  flex-1
                  sm:flex-none
                "
                >
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
                    placeholder="Search expenses…"
                    className="
                      w-full
                      sm:w-48
                      pl-9
                      pr-3
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
                      focus:border-orange-400
                      focus:ring-4
                      focus:ring-orange-500/10
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

                <FilterDropdown
                  value={filter}
                  onChange={(value) => {
                    setFilter(value);
                    setShowAll(false);
                  }}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div
                className="
                mt-3
                flex
                items-center
                gap-2
              "
              >
                <span
                  className="
                  text-[10px]
                  text-slate-400
                "
                >
                  Active filters:
                </span>

                {filter !== "all" && (
                  <span
                    className="
                    px-2
                    py-1
                    rounded-lg
                    bg-slate-100
                    dark:bg-slate-800
                    text-[9px]
                    font-bold
                    text-slate-500
                    dark:text-slate-300
                  "
                  >
                    {formatCategory(filter)}
                  </span>
                )}

                {search && (
                  <span
                    className="
                    max-w-[150px]
                    truncate
                    px-2
                    py-1
                    rounded-lg
                    bg-slate-100
                    dark:bg-slate-800
                    text-[9px]
                    font-bold
                    text-slate-500
                    dark:text-slate-300
                  "
                  >
                    “{search}”
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetFilters}
                  className="
                    ml-auto
                    flex
                    items-center
                    gap-1
                    text-[9px]
                    font-black
                    text-orange-500
                  "
                >
                  <RotateCcw size={10} />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Desktop header */}
          <div
            className="
            hidden
            md:grid
            grid-cols-[110px_150px_1fr_150px_100px]
            gap-3
            px-5
            py-2.5
            bg-slate-50/70
            dark:bg-slate-950/40
            border-b
            border-slate-100
            dark:border-slate-800
          "
          >
            {["Date", "Amount", "Description", "Category", "Actions"].map(
              (heading) => (
                <span
                  key={heading}
                  className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.14em]
                  text-slate-400
                "
                >
                  {heading}
                </span>
              ),
            )}
          </div>

          {/* List */}
          <div
            className="
            divide-y
            divide-slate-100
            dark:divide-slate-800
          "
          >
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
                    const target = filteredTransactions.find(
                      (item) => item.id === id,
                    );

                    setDeleteTarget(
                      target || {
                        id,
                      },
                    );
                  }}
                  setEditingId={setEditingId}
                />
              ))
            ) : (
              <div
                className="
                py-16
                px-5
                flex
                flex-col
                items-center
                justify-center
                text-center
              "
              >
                <div
                  className="
                  w-16
                  h-16
                  rounded-3xl
                  bg-gradient-to-br
                  from-orange-50
                  to-violet-50
                  dark:from-orange-500/10
                  dark:to-violet-500/10
                  flex
                  items-center
                  justify-center
                "
                >
                  <Receipt
                    size={24}
                    className="
                      text-orange-300
                      dark:text-orange-400
                    "
                  />
                </div>

                <h4
                  className="
                  mt-4
                  text-sm
                  font-black
                  text-slate-700
                  dark:text-slate-200
                "
                >
                  No expenses found
                </h4>

                <p
                  className="
                  mt-1
                  max-w-xs
                  text-xs
                  text-slate-400
                "
                >
                  {hasActiveFilters
                    ? "Try changing your search or filters."
                    : "You haven't recorded any expenses yet."}
                </p>

                {hasActiveFilters ? (
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
                      from-orange-500
                      to-amber-500
                      text-white
                      text-xs
                      font-black
                      shadow-lg
                      shadow-orange-500/20
                    "
                  >
                    <Plus size={13} />
                    Add first expense
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View all */}
          {filteredTransactions.length > MAX_VISIBLE_TRANSACTIONS && (
            <div
              className="
              border-t
              border-slate-100
              dark:border-slate-800
            "
            >
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
                    text-orange-500
                    hover:bg-orange-50/50
                    dark:hover:bg-orange-500/5
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

        {/* ================================================================= */}
        {/* MOBILE QUICK ADD                                                  */}
        {/* ================================================================= */}

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
            from-orange-500
            to-amber-500
            text-white
            flex
            items-center
            justify-center
            shadow-2xl
            shadow-orange-500/30
            active:scale-90
            transition
          "
          aria-label="Add expense"
        >
          <Plus size={23} />
        </button>
      </div>

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}

      {showModal && (
        <AddTransactionModal
          showModal={showModal}
          setShowModal={setShowModal}
          newTransaction={newTransaction}
          setNewTransaction={setNewTransaction}
          handleAddTransaction={handleAddTransaction}
          loading={loading}
        />
      )}

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
