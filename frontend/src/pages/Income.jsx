import { createPortal } from "react-dom";
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";

import {
  Plus,
  Download,
  Eye,
  EyeOff,
  TrendingUp,
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
  RotateCcw,
  ArrowDownRight,
  CircleDollarSign,
  ReceiptText,
  Layers3,
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
import CustomRangePicker from "../components/common/CustomRangePicker";
import { usePeriod } from "../utils/usePeriod";

import {
  fmtINR,
  formatFullINR,
  getCurrentYear,
  getTimeFrameRange,
  buildChartPoints,
  chartKeyForDate,
  chartKeyForPoint,
  generateChartPoints,
  isDailyGranularity,
  isDateInRange,
  formatTransactionDate,
  formatTransactionDateMobile,
  getDateInputValue,
  toIsoWithClientTime,
  getAuthHeaders,
} from "../utils/commonHelpers";

const API_BASE = import.meta.env.VITE_API_BASE;

const TIME_FRAMES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

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

/* =========================================================
   THEME
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
   HELPERS
========================================================= */

const safeDateInput = () => {
  const date = new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const getFrameLabel = (frame) => {
  const value = String(frame || "monthly");

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
};

/* =========================================================
   TIME FRAME SELECTOR
========================================================= */

function TimeFrameSelector({
  timeFrame = "monthly",
  setTimeFrame = () => {},
}) {
  const [open, setOpen] = useState(false);

  const periodButtonRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({});

  const mobileFrames = useMemo(
    () => TIME_FRAMES.filter((frame) => frame !== "custom"),
    [],
  );

  const currentLabel = getFrameLabel(timeFrame);

  const updateMenuPosition = useCallback(() => {
    const button = periodButtonRef.current;

    if (!button || typeof window === "undefined") {
      return;
    }

    const rect = button.getBoundingClientRect();

    const gap = 8;

    const viewportPadding = 8;

    const width = Math.max(
      rect.width,
      150,
    );

    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.left,
        window.innerWidth - width - viewportPadding,
      ),
    );

    const top = rect.bottom + gap;

    const maxHeight = Math.max(
      120,
      window.innerHeight - top - 12,
    );

    setMenuStyle({
      top,
      left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  /* -----------------------------------------
     UPDATE POSITION
  ----------------------------------------- */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updateMenuPosition();

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );
    };
  }, [open, updateMenuPosition]);

  /* -----------------------------------------
     OUTSIDE CLICK + ESC
  ----------------------------------------- */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        target?.closest?.(
          "[data-mobile-timeframe]",
        )
      ) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        periodButtonRef.current?.focus();
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  /* -----------------------------------------
     CLOSE WHEN SWITCHING TO CUSTOM
  ----------------------------------------- */

  useEffect(() => {
    if (timeFrame === "custom") {
      setOpen(false);
    }
  }, [timeFrame]);

  return (
    <div className="w-full @3xl:w-auto @3xl:shrink-0">
      {/* =================================================
          DESKTOP
      ================================================= */}

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
          const active =
            timeFrame === frame;

          return (
            <button
              key={frame}
              type="button"
              onClick={() => {
                setOpen(false);
                setTimeFrame(frame);
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
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                }
              `}
            >
              {getFrameLabel(frame)}
            </button>
          );
        })}
      </div>

      {/* =================================================
          MOBILE
      ================================================= */}

      <div
        className="
          flex
          w-full
          gap-2
          @3xl:hidden
        "
        data-mobile-timeframe
      >
        <div
          className="relative min-w-0 flex-1"
          data-mobile-timeframe
        >
          <button
            type="button"
            ref={periodButtonRef}
            onClick={() => {
              setOpen((previous) => {
                const next = !previous;

                if (next) {
                  requestAnimationFrame(
                    updateMenuPosition,
                  );
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
              gap-2
              rounded-xl
              border
              border-slate-700/70
              bg-slate-900/90
              px-3
              text-[11px]
              font-bold
              text-slate-200
              shadow-sm
              transition-all
              active:scale-[.98]
              focus:outline-none
              focus:ring-2
              focus:ring-emerald-500/20
            "
          >
            <span className="truncate">
              {currentLabel === "Custom"
                ? "Monthly"
                : currentLabel}
            </span>

            <ChevronDown
              size={16}
              strokeWidth={2.2}
              aria-hidden="true"
              className={`
                shrink-0
                text-[#8b93a7]
                transition-transform
                duration-200
                ${
                  open
                    ? "rotate-180"
                    : "rotate-0"
                }
              `}
            />
          </button>

          {/* =================================================
              PORTAL DROPDOWN
          ================================================= */}

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
                  scrollbar-none
                "
                style={menuStyle}
              >
                {mobileFrames.map((frame) => {
                  const active =
                    timeFrame === frame;

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
                            ? "bg-emerald-500 text-white"
                            : "text-slate-300 hover:bg-slate-800 active:bg-slate-700"
                        }
                      `}
                    >
                      {getFrameLabel(frame)}

                      {active && (
                        <Check
                          size={13}
                          className="ml-auto"
                        />
                      )}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
        </div>

        {/* =================================================
            CUSTOM
        ================================================= */}

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTimeFrame("custom");
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
            focus:outline-none
            focus:ring-2
            focus:ring-emerald-500/20
            ${
              timeFrame === "custom"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"
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

/* =========================================================
   TOAST
========================================================= */

function Toast({ toasts = [] }) {
  return (
    <div
      className="
        fixed
        top-4
        right-3
        z-[9999]
        flex
        w-[calc(100%-24px)]
        max-w-sm
        pointer-events-none
        flex-col
        gap-2
        sm:right-5
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="
            pointer-events-auto
            flex
            items-center
            gap-3
            rounded-2xl
            border
            px-4
            py-3.5
            shadow-2xl
            backdrop-blur-xl
          "
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
            animation:
              "incomeSlideIn .25s ease-out",
          }}
        >
          {toast.type === "success" ? (
            <Check size={16} />
          ) : toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Zap size={16} />
          )}

          <span className="text-xs font-semibold sm:text-sm">
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

function StatCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  trend,
}) {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        p-4
        sm:rounded-3xl
        sm:p-5
      "
      style={{
        background:
          "linear-gradient(145deg, #11161f 0%, #0e1219 100%)",
        borderColor: COLORS.border,
      }}
    >
      <div
        className="
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          blur-3xl
          opacity-10
          transition-opacity
          group-hover:opacity-20
        "
        style={{
          background: accent,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-[0.16em]
              sm:text-[10px]
            "
            style={{
              color: COLORS.textDim,
            }}
          >
            {label}
          </p>

          <p
            className="
              mt-2
              truncate
              text-xl
              font-black
              tracking-tight
              sm:text-2xl
            "
            style={{
              color: COLORS.text,
            }}
          >
            {value}
          </p>

          <div className="mt-1.5 flex items-center gap-1.5">
            {trend !== undefined && (
              <span
                className="
                  flex
                  items-center
                  gap-0.5
                  text-[10px]
                  font-bold
                "
                style={{
                  color:
                    trend >= 0
                      ? COLORS.green
                      : COLORS.red,
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
              className="
                truncate
                text-[10px]
                sm:text-xs
              "
              style={{
                color: COLORS.textMuted,
              }}
            >
              {sub}
            </span>
          </div>
        </div>

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            sm:h-10
            sm:w-10
            sm:rounded-2xl
          "
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
  const color =
    CATEGORY_COLOR[cat] ||
    COLORS.textMuted;

  return (
    <span
      className="
        inline-flex
        items-center
        gap-1
        whitespace-nowrap
        rounded-full
        px-2
        py-1
        text-[9px]
        font-bold
        sm:text-[10px]
      "
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

function CategoryFilter({
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handler = (event) => {
      if (
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handler,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handler,
      );
    };
  }, [open]);

  const current =
    CATEGORY_FILTERS.find(
      (item) => item.value === value,
    ) || CATEGORY_FILTERS[0];

  return (
    <div
      ref={ref}
      className="relative shrink-0"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        className="
          flex
          h-10
          items-center
          gap-2
          rounded-xl
          px-3
          text-xs
          font-bold
          transition-all
          active:scale-[.98]
          focus:outline-none
          focus:ring-2
          focus:ring-emerald-500/20
        "
        style={{
          background: "#141923",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textMuted,
        }}
      >
        <SlidersHorizontal size={13} />

        <span className="max-w-[100px] truncate">
          {current.label}
        </span>

        <ChevronDown
          size={12}
          className={`
            transition-transform
            duration-200
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && (
        <div
          className="
            absolute
            right-0
            top-[calc(100%+8px)]
            z-50
            w-56
            overflow-hidden
            rounded-2xl
            border
            shadow-2xl
          "
          style={{
            background: "#131821",
            borderColor: COLORS.border,
          }}
        >
          <div className="p-1.5">
            {CATEGORY_FILTERS.map((item) => {
              const active =
                value === item.value;

              const color =
                CATEGORY_COLOR[item.value] ||
                COLORS.green;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="
                    flex
                    min-h-10
                    w-full
                    items-center
                    gap-2.5
                    rounded-xl
                    px-3
                    py-2.5
                    text-left
                    text-xs
                    font-semibold
                    transition-all
                  "
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
                    className="
                      h-2
                      w-2
                      shrink-0
                      rounded-full
                    "
                    style={{
                      background:
                        item.value === "all"
                          ? COLORS.textDim
                          : color,
                    }}
                  />

                  {item.label}

                  {active && (
                    <Check
                      size={13}
                      className="ml-auto"
                    />
                  )}
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

function IncomeBreakdown({
  transactions = [],
}) {
  const breakdown = useMemo(() => {
    const map = {};

    transactions.forEach(
      (transaction) => {
        const category =
          transaction.category ||
          "Other";

        map[category] =
          (map[category] || 0) +
          Number(transaction.amount || 0);
      },
    );

    const total = Object.values(
      map,
    ).reduce(
      (sum, value) => sum + value,
      0,
    );

    return Object.entries(map)
      .sort(
        (a, b) => b[1] - a[1],
      )
      .map(
        ([category, amount]) => ({
          category,
          amount,
          percentage: total
            ? (amount / total) * 100
            : 0,
        }),
      );
  }, [transactions]);

  return (
    <div
      className="
        rounded-2xl
        border
        p-4
        sm:rounded-3xl
        sm:p-5
      "
      style={{
        background:
          "linear-gradient(145deg, #11161f 0%, #0e1219 100%)",
        borderColor: COLORS.border,
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-bold"
            style={{
              color: COLORS.text,
            }}
          >
            Income sources
          </h3>

          <p
            className="mt-1 text-[10px]"
            style={{
              color: COLORS.textDim,
            }}
          >
            Where your money is coming from
          </p>
        </div>

        <div
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-xl
          "
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
          className="
            flex
            min-h-[180px]
            flex-col
            items-center
            justify-center
            rounded-2xl
            text-center
          "
          style={{
            background: "#0b0f15",
          }}
        >
          <Sparkles
            size={20}
            style={{
              color: COLORS.textDim,
            }}
          />

          <p
            className="mt-3 text-xs font-semibold"
            style={{
              color: COLORS.textMuted,
            }}
          >
            No income sources
          </p>

          <p
            className="
              mt-1
              max-w-[180px]
              text-[10px]
            "
            style={{
              color: COLORS.textDim,
            }}
          >
            Add income transactions to
            see your breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.map(
            ({
              category,
              amount,
              percentage,
            }) => {
              const color =
                CATEGORY_COLOR[
                  category
                ] ||
                COLORS.textMuted;

              return (
                <div key={category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="
                          h-2
                          w-2
                          shrink-0
                          rounded-full
                        "
                        style={{
                          background: color,
                        }}
                      />

                      <span
                        className="
                          truncate
                          text-xs
                          font-semibold
                        "
                        style={{
                          color: COLORS.text,
                        }}
                      >
                        {category.replace(
                          /_/g,
                          " ",
                        )}
                      </span>
                    </div>

                    <span
                      className="
                        shrink-0
                        text-xs
                        font-bold
                      "
                      style={{
                        color,
                      }}
                    >
                      {fmtINR(amount)}
                    </span>
                  </div>

                  <div
                    className="
                      h-1.5
                      overflow-hidden
                      rounded-full
                    "
                    style={{
                      background: "#1a202b",
                    }}
                  >
                    <div
                      className="
                        h-full
                        rounded-full
                      "
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            percentage,
                          ),
                        )}%`,
                        background:
                          `linear-gradient(90deg, ${color}, ${color}88)`,
                      }}
                    />
                  </div>

                  <p
                    className="
                      mt-1
                      text-[9px]
                    "
                    style={{
                      color:
                        COLORS.textDim,
                    }}
                  >
                    {percentage.toFixed(1)}%
                    {" "}
                    of selected income
                  </p>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

function CustomTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div
      className="
        rounded-xl
        border
        px-3
        py-2.5
        shadow-2xl
      "
      style={{
        background: "#151a23",
        borderColor: COLORS.border,
      }}
    >
      <p
        className="mb-1 text-[10px]"
        style={{
          color: COLORS.textDim,
        }}
      >
        {label}
      </p>

      <p
        className="text-sm font-black"
        style={{
          color: COLORS.green,
        }}
      >
        {formatFullINR(
          payload[0].value,
        )}
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
  const [errors, setErrors] =
    useState({
      description: "",
      amount: "",
    });

  const category =
    transaction.category ||
    "Extra_Income";

  const color =
    CATEGORY_COLOR[category] ||
    COLORS.textMuted;

  const icon =
    CATEGORY_ICONS[category] ||
    <IndianRupee size={16} />;

  const startEdit = () => {
    setEditForm({
      description:
        transaction.description ||
        "",
      amount:
        transaction.amount ||
        "",
      category,
      date: getDateInputValue(
        transaction.date,
      ),
    });

    setErrors({
      description: "",
      amount: "",
    });

    setEditingId(transaction.id);
  };

  const validate = () => {
    const nextErrors = {
      description: "",
      amount: "",
    };

    if (
      !String(
        editForm.description || "",
      ).trim()
    ) {
      nextErrors.description =
        "Description is required";
    }

    if (
      !String(
        editForm.amount || "",
      ).trim()
    ) {
      nextErrors.amount =
        "Amount is required";
    } else if (
      !Number.isFinite(
        Number(editForm.amount),
      ) ||
      Number(editForm.amount) <= 0
    ) {
      nextErrors.amount =
        "Enter a valid amount";
    }

    setErrors(nextErrors);

    return (
      !nextErrors.description &&
      !nextErrors.amount
    );
  };

  return (
    <div
      className="
        px-3
        py-3.5
        transition-all
        sm:px-4
        sm:py-4
      "
      style={{
        background: isEditing
          ? "#151b25"
          : "transparent",
      }}
    >
      {!isEditing ? (
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              sm:h-11
              sm:w-11
              sm:rounded-2xl
            "
            style={{
              background: `${color}12`,
              color,
              border: `1px solid ${color}16`,
            }}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-xs
                font-bold
                sm:text-sm
              "
              style={{
                color: COLORS.text,
              }}
            >
              {transaction.description ||
                "Untitled income"}
            </p>

            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <span
                className="
                  shrink-0
                  text-[9px]
                  sm:text-[10px]
                "
                style={{
                  color: COLORS.textDim,
                }}
              >
                <span className="sm:hidden">
                  {formatTransactionDateMobile(
                    transaction.date,
                  )}
                </span>

                <span className="hidden sm:inline">
                  {formatTransactionDate(
                    transaction.date,
                  )}
                </span>
              </span>

              <span
                className="text-[8px]"
                style={{
                  color: COLORS.border,
                }}
              >
                •
              </span>

              <CategoryPill
                cat={category}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span
              className="
                text-xs
                font-black
                sm:text-sm
              "
              style={{
                color: COLORS.green,
              }}
            >
              +
              {formatFullINR(
                transaction.amount,
              )}
            </span>

            {/* Desktop actions */}
            <button
              type="button"
              onClick={startEdit}
              className="
                hidden
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                transition-all
                sm:flex
              "
              style={{
                color: COLORS.textDim,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color =
                  COLORS.green;
                event.currentTarget.style.background =
                  `${COLORS.green}10`;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color =
                  COLORS.textDim;
                event.currentTarget.style.background =
                  "transparent";
              }}
              title="Edit income"
              aria-label="Edit income"
            >
              <Edit2 size={13} />
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(transaction.id)
              }
              className="
                hidden
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                transition-all
                sm:flex
              "
              style={{
                color: COLORS.textDim,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color =
                  COLORS.red;
                event.currentTarget.style.background =
                  `${COLORS.red}10`;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color =
                  COLORS.textDim;
                event.currentTarget.style.background =
                  "transparent";
              }}
              title="Delete income"
              aria-label="Delete income"
            >
              <Trash2 size={13} />
            </button>

            {/* Mobile actions */}
            <div className="flex gap-1 sm:hidden">
              <button
                type="button"
                onClick={startEdit}
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                "
                style={{
                  color: COLORS.textDim,
                  background: "#141923",
                }}
                aria-label="Edit income"
              >
                <Edit2 size={12} />
              </button>

              <button
                type="button"
                onClick={() =>
                  onDelete(transaction.id)
                }
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                "
                style={{
                  color: COLORS.red,
                  background: `${COLORS.red}08`,
                }}
                aria-label="Delete income"
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
            {/* Description */}
            <div>
              <label
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wider
                "
                style={{
                  color: COLORS.textDim,
                }}
              >
                Description
              </label>

              <input
                value={
                  editForm.description
                }
                onChange={(event) =>
                  setEditForm(
                    (previous) => ({
                      ...previous,
                      description:
                        event.target.value,
                    }),
                  )
                }
                className="
                  mt-1.5
                  h-10
                  w-full
                  rounded-xl
                  px-3
                  text-xs
                  outline-none
                "
                style={{
                  background: "#141923",
                  color: COLORS.text,
                  border: `1px solid ${
                    errors.description
                      ? COLORS.red
                      : COLORS.border
                  }`,
                }}
                placeholder="Income description"
              />

              {errors.description && (
                <p
                  className="mt-1 text-[9px]"
                  style={{
                    color: COLORS.red,
                  }}
                >
                  {errors.description}
                </p>
              )}
            </div>

            {/* Amount / Category / Date */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-wider
                  "
                  style={{
                    color: COLORS.textDim,
                  }}
                >
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    editForm.amount
                  }
                  onChange={(event) =>
                    setEditForm(
                      (previous) => ({
                        ...previous,
                        amount:
                          event.target.value,
                      }),
                    )
                  }
                  className="
                    mt-1.5
                    h-10
                    w-full
                    rounded-xl
                    px-3
                    text-xs
                    outline-none
                  "
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${
                      errors.amount
                        ? COLORS.red
                        : COLORS.border
                    }`,
                  }}
                  placeholder="Amount"
                />

                {errors.amount && (
                  <p
                    className="mt-1 text-[9px]"
                    style={{
                      color: COLORS.red,
                    }}
                  >
                    {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-wider
                  "
                  style={{
                    color: COLORS.textDim,
                  }}
                >
                  Category
                </label>

                <select
                  value={
                    editForm.category
                  }
                  onChange={(event) =>
                    setEditForm(
                      (previous) => ({
                        ...previous,
                        category:
                          event.target.value,
                      }),
                    )
                  }
                  className="
                    mt-1.5
                    h-10
                    w-full
                    rounded-xl
                    px-3
                    text-xs
                    outline-none
                  "
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {INCOME_CATEGORIES.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item.replace(
                          /_/g,
                          " ",
                        )}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-wider
                  "
                  style={{
                    color: COLORS.textDim,
                  }}
                >
                  Date
                </label>

                <input
                  type="date"
                  value={editForm.date}
                  onChange={(event) =>
                    setEditForm(
                      (previous) => ({
                        ...previous,
                        date:
                          event.target.value,
                      }),
                    )
                  }
                  className="
                    mt-1.5
                    h-10
                    w-full
                    rounded-xl
                    px-3
                    text-xs
                    outline-none
                  "
                  style={{
                    background: "#141923",
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (validate()) {
                    onSave();
                  }
                }}
                className="
                  flex
                  h-10
                  flex-1
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  px-4
                  text-xs
                  font-bold
                  transition
                  active:scale-[.98]
                  sm:flex-none
                "
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
                  setErrors({
                    description: "",
                    amount: "",
                  });

                  onCancel();
                }}
                className="
                  flex
                  h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  px-4
                  text-xs
                  font-bold
                  transition
                  active:scale-[.98]
                "
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

function DeleteModal({
  transaction,
  loading,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-end
        justify-center
        sm:items-center
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-income-title"
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background: "#05070bcc",
        }}
        onClick={onClose}
      />

      <div
        className="
          relative
          w-full
          rounded-t-3xl
          p-5
          sm:max-w-sm
          sm:rounded-3xl
          sm:p-6
        "
        style={{
          background:
            "linear-gradient(145deg, #131821, #0e1219)",
          border: `1px solid ${COLORS.border}`,
          boxShadow:
            "0 -20px 80px rgba(0,0,0,.4)",
          animation:
            "incomeSlideUp .25s ease-out",
        }}
      >
        <div
          className="
            mx-auto
            mb-5
            h-1
            w-10
            rounded-full
            sm:hidden
          "
          style={{
            background: COLORS.border,
          }}
        />

        <div className="flex justify-center">
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
            "
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
          id="delete-income-title"
          className="
            mt-4
            text-center
            text-base
            font-black
          "
          style={{
            color: COLORS.text,
          }}
        >
          Delete this income?
        </h2>

        <p
          className="
            mt-1
            text-center
            text-xs
          "
          style={{
            color: COLORS.textMuted,
          }}
        >
          This action cannot be undone.
        </p>

        {transaction && (
          <div
            className="mt-5 rounded-2xl p-3.5"
            style={{
              background: "#0b0f15",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-xs
                    font-bold
                  "
                  style={{
                    color: COLORS.text,
                  }}
                >
                  {transaction.description}
                </p>

                <div className="mt-2">
                  <CategoryPill
                    cat={
                      transaction.category
                    }
                  />
                </div>
              </div>

              <p
                className="
                  shrink-0
                  text-sm
                  font-black
                "
                style={{
                  color: COLORS.green,
                }}
              >
                {formatFullINR(
                  transaction.amount,
                )}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              h-11
              rounded-xl
              text-xs
              font-bold
              transition
              active:scale-[.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
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
            className="
              flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              text-xs
              font-bold
              transition
              active:scale-[.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            style={{
              background: `${COLORS.red}12`,
              color: COLORS.red,
              border: `1px solid ${COLORS.red}25`,
            }}
          >
            {loading && (
              <Loader2
                size={13}
                className="animate-spin"
              />
            )}

            {loading
              ? "Deleting..."
              : "Delete"}
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
  const outletContext =
    useOutletContext() || {};

  const {
    allTransactions,
    transactions:
      layoutTransactions = [],
    refreshTransactions =
      () => {},
    timeFrame = "monthly",
    setTimeFrame =
      () => {},
  } = outletContext;

  const outletTransactions =
    allTransactions ??
    layoutTransactions;

  const [showModal, setShowModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [toasts, setToasts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [showAll, setShowAll] =
    useState(false);

  const currentYear =
    getCurrentYear();

  const currentMonth =
    new Date().getMonth();

  const {
    customRange,
    setCustomRange,
  } = usePeriod(outletContext);

  const selectedYear =
    currentYear;

  const selectedMonth =
    currentMonth;

  const yearMonth = null;

  const [editForm, setEditForm] =
    useState({
      description: "",
      amount: "",
      category: "Salary",
      date: safeDateInput(),
    });

  const [newTransaction, setNewTransaction] =
    useState({
      date: safeDateInput(),
      description: "",
      amount: "",
      type: "income",
      category: "Salary",
    });

  /* =========================================================
     TOAST
  ========================================================= */

  const toastTimersRef =
    useRef(new Map());

  const addToast = useCallback(
    (message, type = "info") => {
      const id =
        Date.now() +
        Math.random();

      setToasts(
        (previous) => [
          ...previous,
          {
            id,
            message,
            type,
          },
        ],
      );

      const timer =
        window.setTimeout(() => {
          setToasts(
            (previous) =>
              previous.filter(
                (toast) =>
                  toast.id !== id,
              ),
          );

          toastTimersRef.current.delete(
            id,
          );
        }, 3500);

      toastTimersRef.current.set(
        id,
        timer,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(
        (timer) => {
          window.clearTimeout(timer);
        },
      );

      toastTimersRef.current.clear();
    };
  }, []);

  /* =========================================================
     INCOME TRANSACTIONS
  ========================================================= */

  const incomeTransactions =
    useMemo(() => {
      return [...(outletTransactions || [])]
        .filter(
          (transaction) =>
            transaction?.type ===
            "income",
        )
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date),
        );
    }, [outletTransactions]);

  /* =========================================================
     TIMEFRAME
  ========================================================= */

  const timeFrameRange =
    useMemo(
      () =>
        getTimeFrameRange(
          timeFrame,
          selectedYear,
          selectedMonth,
          customRange,
        ),
      [
        timeFrame,
        selectedYear,
        selectedMonth,
        customRange,
      ],
    );

  const rangeLabel =
    timeFrame === "yearly" &&
    yearMonth !== null
      ? `${MONTH_NAMES[yearMonth]} ${selectedYear}`
      : timeFrameRange.label;

  const timeFrameTransactions =
    useMemo(() => {
      return incomeTransactions.filter(
        (transaction) =>
          isDateInRange(
            transaction.date,
            timeFrameRange.start,
            timeFrameRange.end,
          ),
      );
    }, [
      incomeTransactions,
      timeFrameRange,
    ]);

  /* =========================================================
     FILTERS
  ========================================================= */

  const filteredTransactions =
    useMemo(() => {
      let list = [
        ...timeFrameTransactions,
      ];

      if (
        timeFrame === "yearly" &&
        yearMonth !== null
      ) {
        list = list.filter(
          (transaction) =>
            new Date(
              transaction.date,
            ).getMonth() ===
            yearMonth,
        );
      }

      if (
        categoryFilter !== "all"
      ) {
        list = list.filter(
          (transaction) =>
            String(
              transaction.category ||
                "Other",
            ).toLowerCase() ===
            categoryFilter.toLowerCase(),
        );
      }

      const query =
        search.trim().toLowerCase();

      if (query) {
        list = list.filter(
          (transaction) => {
            const description =
              String(
                transaction.description ||
                  "",
              ).toLowerCase();

            const category =
              String(
                transaction.category ||
                  "",
              ).toLowerCase();

            return (
              description.includes(
                query,
              ) ||
              category.includes(
                query,
              )
            );
          },
        );
      }

      return list.sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date),
      );
    }, [
      timeFrameTransactions,
      categoryFilter,
      search,
      timeFrame,
      yearMonth,
    ]);

  /* =========================================================
     KPI
  ========================================================= */

  const totalIncome =
    useMemo(
      () =>
        filteredTransactions.reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount ||
                0,
            ),
          0,
        ),
      [filteredTransactions],
    );

  const averageIncome =
    useMemo(
      () =>
        filteredTransactions.length
          ? totalIncome /
            filteredTransactions.length
          : 0,
      [
        totalIncome,
        filteredTransactions.length,
      ],
    );

  const highestIncome =
    useMemo(
      () =>
        filteredTransactions.reduce(
          (
            highest,
            transaction,
          ) =>
            Math.max(
              highest,
              Number(
                transaction.amount ||
                  0,
              ),
            ),
          0,
        ),
      [filteredTransactions],
    );

  /* =========================================================
     CHART
  ========================================================= */

  const chartPoints =
    useMemo(() => {
      if (timeFrame === "custom") {
        return generateChartPoints(
          timeFrame,
          selectedYear,
          selectedMonth,
          customRange,
        );
      }

      return buildChartPoints(
        timeFrame ===
          "daily" ||
        timeFrame ===
          "weekly" ||
        timeFrame ===
          "monthly"
          ? "month"
          : timeFrame,
        timeFrame ===
          "monthly"
          ? `${selectedYear}-${String(
              selectedMonth + 1,
            ).padStart(2, "0")}`
          : timeFrame ===
                "daily" ||
              timeFrame ===
                "weekly"
            ? new Date()
                .toISOString()
                .split("T")[0]
                .slice(0, 7)
            : String(
                selectedYear,
              ),
      );
    }, [
      timeFrame,
      selectedYear,
      selectedMonth,
      customRange,
    ]);

  const chartData =
    useMemo(() => {
      if (timeFrame === "custom") {
        const totals = new Map();

        for (const transaction of timeFrameTransactions) {
          const key =
            chartKeyForDate(
              timeFrame,
              new Date(
                transaction.date,
              ),
              customRange,
            );

          totals.set(
            key,
            (totals.get(key) || 0) +
              Number(
                transaction.amount ||
                  0,
              ),
          );
        }

        return chartPoints.map(
          (point) => ({
            ...point,
            income:
              totals.get(
                chartKeyForPoint(
                  timeFrame,
                  point,
                  customRange,
                ),
              ) || 0,
          }),
        );
      }

      return chartPoints.map(
        (point) => {
          const income =
            timeFrameTransactions
              .filter(
                (transaction) => {
                  const d =
                    new Date(
                      transaction.date,
                    );

                  if (
                    timeFrame ===
                      "daily" ||
                    timeFrame ===
                      "weekly" ||
                    timeFrame ===
                      "monthly"
                  ) {
                    return (
                      d.getDate() ===
                      point.day
                    );
                  }

                  return (
                    d.getMonth() ===
                    point.month
                  );
                },
              )
              .reduce(
                (
                  sum,
                  transaction,
                ) =>
                  sum +
                  Number(
                    transaction.amount ||
                      0,
                  ),
                0,
              );

          return {
            ...point,
            income,
          };
        },
      );
    }, [
      chartPoints,
      timeFrameTransactions,
      timeFrame,
      customRange,
    ]);

  const dailyBars =
    isDailyGranularity(
      timeFrame,
      customRange,
    );

  const chartLabel =
    timeFrame === "daily" ||
    timeFrame === "weekly" ||
    dailyBars
      ? "Daily income"
      : timeFrame === "custom"
        ? "Monthly income"
        : "Yearly income";

  /* =========================================================
     VISIBLE TRANSACTIONS
  ========================================================= */

  const visibleTransactions =
    showAll
      ? filteredTransactions
      : filteredTransactions.slice(
          0,
          10,
        );

  /* =========================================================
     RESET FILTERS
  ========================================================= */

  const resetFilters =
    useCallback(() => {
      setSearch("");
      setCategoryFilter("all");
      setShowAll(false);
    }, []);

  /* =========================================================
     ADD
  ========================================================= */

  const handleAddTransaction =
    useCallback(async () => {
      if (loading) return;

      if (!API_BASE) {
        addToast(
          "API base URL is not configured.",
          "error",
        );
        return;
      }

      const description =
        String(
          newTransaction.description ||
            "",
        ).trim();

      const amount = Number(
        newTransaction.amount,
      );

      if (!description) {
        addToast(
          "Please enter a description.",
          "error",
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        addToast(
          "Please enter a valid amount.",
          "error",
        );
        return;
      }

      const payload = {
        description,
        amount,
        category:
          newTransaction.category ||
          "Salary",
        date: toIsoWithClientTime(
          newTransaction.date,
        ),
      };

      try {
        setLoading(true);

        await axios.post(
          `${API_BASE}/income/add`,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",
              ...getAuthHeaders(),
            },
          },
        );

        learnCategory(
          payload.description,
          payload.category,
        );

        setShowModal(false);

        setNewTransaction({
          date: safeDateInput(),
          description: "",
          amount: "",
          type: "income",
          category: "Salary",
        });

        addToast(
          "Income added successfully.",
          "success",
        );

        await Promise.resolve(
          refreshTransactions(),
        );
      } catch (error) {
        addToast(
          error?.response?.data
            ?.message ||
            "Failed to save income.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }, [
      loading,
      newTransaction,
      refreshTransactions,
      addToast,
    ]);

  /* =========================================================
     EDIT
  ========================================================= */

  const handleEditTransaction =
    useCallback(async () => {
      if (!editingId || loading) {
        return;
      }

      if (!API_BASE) {
        addToast(
          "API base URL is not configured.",
          "error",
        );
        return;
      }

      const description =
        String(
          editForm.description ||
            "",
        ).trim();

      const amount = Number(
        editForm.amount,
      );

      if (!description) {
        addToast(
          "Description is required.",
          "error",
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        addToast(
          "Enter a valid amount.",
          "error",
        );
        return;
      }

      const payload = {
        description,
        amount,
        category:
          editForm.category ||
          "Salary",
        date: toIsoWithClientTime(
          editForm.date,
        ),
      };

      try {
        setLoading(true);

        await axios.put(
          `${API_BASE}/income/update/${editingId}`,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",
              ...getAuthHeaders(),
            },
          },
        );

        learnCategory(
          payload.description,
          payload.category,
        );

        setEditingId(null);

        addToast(
          "Income updated successfully.",
          "success",
        );

        await Promise.resolve(
          refreshTransactions(),
        );
      } catch (error) {
        addToast(
          error?.response?.data
            ?.message ||
            "Update failed.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }, [
      editingId,
      editForm,
      loading,
      refreshTransactions,
      addToast,
    ]);

  /* =========================================================
     DELETE
  ========================================================= */

  const confirmDelete =
    useCallback(async () => {
      if (
        !deleteTarget?.id ||
        loading
      ) {
        return;
      }

      if (!API_BASE) {
        addToast(
          "API base URL is not configured.",
          "error",
        );
        return;
      }

      try {
        setLoading(true);

        await axios.delete(
          `${API_BASE}/income/delete/${deleteTarget.id}`,
          {
            headers:
              getAuthHeaders(),
          },
        );

        setDeleteTarget(null);

        addToast(
          "Income deleted successfully.",
          "success",
        );

        await Promise.resolve(
          refreshTransactions(),
        );
      } catch (error) {
        addToast(
          error?.response?.data
            ?.message ||
            "Delete failed.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }, [
      deleteTarget,
      loading,
      refreshTransactions,
      addToast,
    ]);

  /* =========================================================
     EXPORT
  ========================================================= */

  const handleExport =
    useCallback(async () => {
      if (loading) return;

      if (!API_BASE) {
        addToast(
          "API base URL is not configured.",
          "error",
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await axios.get(
            `${API_BASE}/income/downloadexcel`,
            {
              headers:
                getAuthHeaders(),
              responseType: "blob",
            },
          );

        const blob = new Blob(
          [response.data],
          {
            type:
              response.headers[
                "content-type"
              ] ||
              "application/octet-stream",
          },
        );

        const disposition =
          response.headers[
            "content-disposition"
          ];

        let filename =
          "income_details.xlsx";

        if (disposition) {
          const utfMatch =
            disposition.match(
              /filename\*=UTF-8''([^;]+)/i,
            );

          const normalMatch =
            disposition.match(
              /filename="?([^"]+)"?/i,
            );

          const rawName =
            utfMatch?.[1] ||
            normalMatch?.[1];

          if (rawName) {
            try {
              filename =
                decodeURIComponent(
                  rawName,
                );
            } catch {
              filename =
                rawName;
            }
          }
        }

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            "a",
          );

        link.href = url;
        link.download =
          filename;

        document.body.appendChild(
          link,
        );

        link.click();
        link.remove();

        window.setTimeout(
          () =>
            URL.revokeObjectURL(
              url,
            ),
          1000,
        );

        addToast(
          "Export ready.",
          "success",
        );
      } catch (error) {
        addToast(
          error?.response?.data
            ?.message ||
            "Export failed.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }, [loading, addToast]);

  /* =========================================================
     CLOSE EDIT ON DELETE
  ========================================================= */

  useEffect(() => {
    if (deleteTarget) {
      setEditingId(null);
    }
  }, [deleteTarget]);

  /* =========================================================
     UI
  ========================================================= */

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

      <div className="min-h-screen space-y-4 pb-24 sm:space-y-5">
        {/* =================================================
            HEADER
        ================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[0.25rem]
            border
            border-white/70
            bg-gradient-to-br
            from-white
            via-emerald-50/50
            to-violet-50/70
            p-4
            shadow-[0_20px_60px_rgba(16,185,129,0.08)]
            dark:border-slate-700
            dark:from-slate-900
            dark:via-slate-900
            dark:to-emerald-950/30
            sm:rounded-[2rem]
            sm:p-6
          "
        >
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

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
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className="
                          absolute
                          inset-0
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
                        {rangeLabel}
                      </span>
                    </p>
                  </div>
                </div>

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
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Download size={14} />
                    )}

                    <span className="hidden sm:inline">
                      {loading
                        ? "Processing..."
                        : "Export"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(true)
                    }
                    disabled={loading}
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
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      focus:outline-none
                      focus:ring-2
                      focus:ring-emerald-500/30
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

                    <span>Add Income</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

              {/* =================================================
                  TIME FRAME + CUSTOM RANGE
              ================================================= */}

              <div className="@container">
                <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
                  <TimeFrameSelector
                    timeFrame={timeFrame}
                    setTimeFrame={(value) => {
                      setTimeFrame(value);
                      setShowAll(false);
                      setCategoryFilter("all");
                    }}
                  />

                  {timeFrame ===
                    "custom" && (
                    <div className="min-w-0 @3xl:shrink-0">
                      <CustomRangePicker
                        customRange={
                          customRange
                        }
                        setCustomRange={(
                          range,
                        ) => {
                          setCustomRange(
                            range,
                          );

                          setShowAll(
                            false,
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total income"
            value={fmtINR(
              totalIncome,
            )}
            sub={rangeLabel}
            icon={TrendingUp}
            accent="#10b981"
          />

          <StatCard
            label="Average"
            value={fmtINR(
              averageIncome,
            )}
            sub={`${filteredTransactions.length} transactions`}
            icon={BarChart2}
            accent="#8b5cf6"
          />

          <StatCard
            label="Highest"
            value={fmtINR(
              highestIncome,
            )}
            sub="single transaction"
            icon={ArrowUpRight}
            accent="#3b82f6"
          />

          <StatCard
            label="Transactions"
            value={
              filteredTransactions.length
            }
            sub={
              categoryFilter ===
              "all"
                ? "all records"
                : categoryFilter.replace(
                    /_/g,
                    " ",
                  )
            }
            icon={CircleDollarSign}
            accent="#f97316"
          />
        </section>

        {/* =================================================
            CHART + BREAKDOWN
        ================================================= */}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div
            className="
              rounded-3xl
              border
              border-slate-100
              bg-white
              p-4
              shadow-[0_12px_40px_rgba(15,23,42,0.05)]
              dark:border-slate-700
              dark:bg-slate-900
              dark:shadow-black/20
              sm:p-5
              xl:col-span-2
            "
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <BarChart2
                      size={14}
                      className="text-emerald-500"
                    />
                  </div>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {chartLabel}
                  </h3>
                </div>

                <p className="ml-10 mt-1 text-[10px] text-slate-400">
                  {rangeLabel}
                </p>
              </div>
            </div>

            <div className="h-56 sm:h-64">
              {chartData.some(
                (item) =>
                  item.income > 0,
              ) ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
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
                        dailyBars
                          ? chartData.length >
                            20
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
                      tickFormatter={(
                        value,
                      ) =>
                        fmtINR(value)
                      }
                    />

                    <Tooltip
                      cursor={{
                        fill: "#10b98108",
                      }}
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Bar
                      dataKey="income"
                      fill="url(#premiumIncomeGradient)"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                      maxBarSize={
                        dailyBars
                          ? 18
                          : 32
                      }
                    >
                      {chartData.map(
                        (
                          item,
                          index,
                        ) => (
                          <Cell
                            key={
                              item.key ||
                              index
                            }
                            fill={
                              BAR_COLORS[
                                index %
                                  BAR_COLORS.length
                              ]
                            }
                            fillOpacity={
                              item.income >
                              0
                                ? 1
                                : 0.18
                            }
                          />
                        ),
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                    <BarChart2
                      size={22}
                      className="text-slate-300 dark:text-slate-600"
                    />
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    No chart data
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Income will appear
                    here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <IncomeBreakdown
            transactions={
              filteredTransactions
            }
          />
        </section>

        {/* =================================================
            TRANSACTIONS
        ================================================= */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            border
            border-slate-100
            bg-white
            shadow-[0_12px_40px_rgba(15,23,42,0.05)]
            dark:border-slate-700
            dark:bg-slate-900
            dark:shadow-black/20
          "
        >
          <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                  <ReceiptText
                    size={17}
                    className="text-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      Transactions
                    </h3>

                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-500 dark:bg-emerald-500/10">
                      {
                        filteredTransactions.length
                      }
                    </span>
                  </div>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {rangeLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:flex-none">
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
                    onChange={(
                      event,
                    ) => {
                      setSearch(
                        event.target
                          .value,
                      );
                      setShowAll(
                        false,
                      );
                    }}
                    placeholder="Search income…"
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      py-2.5
                      pl-9
                      pr-9
                      text-xs
                      text-slate-700
                      outline-none
                      placeholder:text-slate-300
                      focus:border-emerald-400
                      focus:ring-4
                      focus:ring-emerald-500/10
                      dark:border-slate-700
                      dark:bg-slate-950
                      dark:text-slate-200
                      sm:w-48
                    "
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch(
                          "",
                        )
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-6
                        w-6
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                      "
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <CategoryFilter
                  value={
                    categoryFilter
                  }
                  onChange={(
                    value,
                  ) => {
                    setCategoryFilter(
                      value,
                    );
                    setShowAll(
                      false,
                    );
                  }}
                />

                {(search ||
                  categoryFilter !==
                    "all") && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      text-slate-400
                      transition
                      hover:bg-emerald-50
                      hover:text-emerald-500
                      dark:hover:bg-emerald-500/10
                    "
                    aria-label="Reset filters"
                    title="Reset filters"
                  >
                    <RotateCcw
                      size={13}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleTransactions.length >
            0 ? (
              visibleTransactions.map(
                (transaction) => (
                  <TransactionItem
                    key={
                      transaction.id
                    }
                    transaction={
                      transaction
                    }
                    isEditing={
                      editingId ===
                      transaction.id
                    }
                    editForm={
                      editForm
                    }
                    setEditForm={
                      setEditForm
                    }
                    onSave={
                      handleEditTransaction
                    }
                    onCancel={() =>
                      setEditingId(
                        null,
                      )
                    }
                    onDelete={(id) => {
                      const transactionToDelete =
                        filteredTransactions.find(
                          (item) =>
                            item.id ===
                            id,
                        );

                      setDeleteTarget(
                        transactionToDelete ||
                          {
                            id,
                          },
                      );
                    }}
                    setEditingId={
                      setEditingId
                    }
                  />
                ),
              )
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-500/10 dark:to-violet-500/10">
                  <ReceiptText
                    size={24}
                    className="text-emerald-300 dark:text-emerald-400"
                  />
                </div>

                <h4 className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">
                  No income found
                </h4>

                <p className="mt-1 max-w-xs text-xs text-slate-400">
                  {search ||
                  categoryFilter !==
                    "all"
                    ? "Try changing your search or filters."
                    : `No income recorded for ${rangeLabel}.`}
                </p>

                {search ||
                categoryFilter !==
                  "all" ? (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="
                      mt-4
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-slate-100
                      px-4
                      py-2.5
                      text-xs
                      font-black
                      text-slate-600
                      dark:bg-slate-800
                      dark:text-slate-300
                    "
                  >
                    <RotateCcw
                      size={13}
                    />
                    Reset filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(
                        true,
                      )
                    }
                    className="
                      mt-4
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-gradient-to-r
                      from-emerald-500
                      to-teal-500
                      px-4
                      py-2.5
                      text-xs
                      font-black
                      text-white
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

          {filteredTransactions.length >
            10 && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              {!showAll ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll(
                      true,
                    )
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    py-4
                    text-[10px]
                    font-black
                    text-emerald-500
                    transition
                    hover:bg-emerald-50/50
                    dark:hover:bg-emerald-500/5
                  "
                >
                  <Eye size={13} />
                  View all{" "}
                  {
                    filteredTransactions.length
                  }{" "}
                  transactions
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll(
                      false,
                    )
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    py-4
                    text-[10px]
                    font-black
                    text-slate-400
                    transition
                    hover:bg-slate-50
                    dark:hover:bg-slate-800
                  "
                >
                  <EyeOff size={13} />
                  Show less
                </button>
              )}
            </div>
          )}
        </section>

        {/* =================================================
            MOBILE QUICK ADD
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            setShowModal(true)
          }
          className="
            fixed
            bottom-5
            right-5
            z-40
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-br
            from-emerald-500
            to-teal-500
            text-white
            shadow-2xl
            shadow-emerald-500/30
            transition
            active:scale-90
            md:hidden
          "
          aria-label="Add income"
        >
          <Plus size={23} />
        </button>
      </div>

      {/* =================================================
          ADD MODAL
      ================================================= */}

      <AddTransactionModal
        showModal={showModal}
        setShowModal={
          setShowModal
        }
        newTransaction={
          newTransaction
        }
        setNewTransaction={
          setNewTransaction
        }
        handleAddTransaction={
          handleAddTransaction
        }
        loading={loading}
        lockType="income"
      />

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteTarget && (
        <DeleteModal
          transaction={
            deleteTarget
          }
          loading={loading}
          onConfirm={
            confirmDelete
          }
          onClose={() =>
            setDeleteTarget(null)
          }
        />
      )}
    </>
  );
};

export default Income;
