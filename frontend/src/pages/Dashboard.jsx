import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
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
import CustomRangePicker from "../components/common/CustomRangePicker";
import {
  normalizeCustomRange,
  fromMonthIndex,
} from "../utils/commonHelpers";
import { usePeriod } from "../utils/usePeriod";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Download,
  PiggyBank,
  Plus,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import "../styles/dashboard.css";

/* ============================================================================
   HELPERS
============================================================================ */

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

/* ============================================================================
   CONSTANTS
============================================================================ */

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


/* ============================================================================
   LOOK-AND-FEEL CONSTANTS
============================================================================ */

const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly", "custom"];

const TIME_FRAME_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

const COLOR = {
  income: "#0f9f6e",
  expense: "#e04158",
  primary: "#2563eb",
};

// Categories are told apart by colour; order follows spend, so the biggest
// slice always gets the strongest hue.
const CATEGORY_PALETTE = [
  "#2563eb",
  "#7a5af8",
  "#12b5a8",
  "#f2a20c",
  "#e04158",
  "#38a8f2",
  "#7ac143",
  "#94a3b8",
  "#ec4899",
  "#0891b2",
  "#b45309",
  "#6366f1",
  "#84cc16",
  "#64748b",
];

const formatCategory = (name) => String(name || "Other").replace(/_/g, " ");

/* ============================================================================
   PERIOD BAR
============================================================================ */

function PeriodBar({
  timeFrame,
  onTimeFrameChange,
  activeRangeLabel,
  handleExport,
  exporting,
  customRange,
  onCustomRangeChange = () => {},
}) {
  return (
    <section className="period-bar" aria-label="Choose a period">
      <div className="period-row">
        <div className="seg" role="group" aria-label="Time frame">
          {TIME_FRAMES.map((frame) => (
            <button
              key={frame}
              type="button"
              className={timeFrame === frame ? "on" : ""}
              aria-pressed={timeFrame === frame}
              onClick={() => onTimeFrameChange(frame)}
            >
              {TIME_FRAME_LABELS[frame]}
            </button>
          ))}
        </div>

        <span className="period-label">{activeRangeLabel}</span>

        <button type="button" className="btn period-export" onClick={handleExport} disabled={exporting}>
          {exporting ? <RefreshCw size={15} className="spin" aria-hidden /> : <Download size={15} aria-hidden />}
          {exporting ? "Preparing file" : "Export to Excel"}
        </button>
      </div>

      {timeFrame === "custom" && (
        <div className="period-custom">
          <CustomRangePicker customRange={customRange} setCustomRange={onCustomRangeChange} />
        </div>
      )}
    </section>
  );
}

/* ============================================================================
   KPI CARDS
============================================================================ */

function Sparkline({ values = [], color = COLOR.primary }) {
  const gradientId = useId();
  const data = values.length > 1 ? values : [0, 0];
  const width = 108;
  const height = 40;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;

  const points = data.map((value, index) => [
    pad + (index / (data.length - 1)) * (width - pad * 2),
    height - pad - ((value - min) / span) * (height - pad * 2),
  ]);

  const line = points
    .map(([x, y], index) => {
      if (index === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      const [px, py] = points[index - 1];
      const mid = ((px + x) / 2).toFixed(1);
      return `C${mid},${py.toFixed(1)} ${mid},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeltaChip({ value, goodWhenUp = true }) {
  if (value === null || value === undefined) return null;
  if (value === 0) return <span className="chip">No change</span>;

  const up = value > 0;
  const good = up === goodWhenUp;

  return (
    <span className={`chip ${good ? "chip-up" : "chip-down"}`}>
      {up ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ label, value, delta, goodWhenUp, hint, color, series, icon: Icon, onClick }) {
  return (
    <button type="button" className="kpi" onClick={onClick} aria-label={`${label}: ${value}. Open monthly breakdown`}>
      <span className="kpi-top">
        <span className="kpi-label">
          <span className="kpi-icon" style={{ color, background: `${color}14` }}>
            <Icon size={16} aria-hidden />
          </span>
          {label}
        </span>
        <DeltaChip value={delta} goodWhenUp={goodWhenUp} />
      </span>

      <span className="kpi-main">
        <strong className="kpi-value mono">{value}</strong>
        <Sparkline values={series} color={color} />
      </span>

      <span className="kpi-hint">{hint}</span>
    </button>
  );
}

function RateCard({ pct }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const healthy = pct >= 20;

  return (
    <div className="kpi kpi-static" role="group" aria-label={`Savings rate ${pct} percent`}>
      <span className="kpi-top">
        <span className="kpi-label">
          <span className="kpi-icon" style={{ color: "#7a5af8", background: "#7a5af814" }}>
            <PiggyBank size={16} aria-hidden />
          </span>
          Savings rate
        </span>
        <span className={`chip ${healthy ? "chip-up" : "chip-blue"}`}>{healthy ? "On track" : "Room to grow"}</span>
      </span>

      <span className="kpi-main">
        <strong className="kpi-value mono">{pct}%</strong>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#eef2f9" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={healthy ? COLOR.income : "#7a5af8"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
      </span>

      <span className="kpi-hint">{healthy ? "of your income is saved" : "Aim to save 20% or more of income"}</span>
    </div>
  );
}

/* ============================================================================
   MONEY FLOW CHART
============================================================================ */

function FlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <p className="tip-title">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="tip-row">
          <i style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b className="mono">{formatFullINR(entry.value)}</b>
        </p>
      ))}
    </div>
  );
}

function FlowChart({ data, rangeLabel }) {
  const incomeId = useId();
  const expenseId = useId();
  const hasData = data.some((item) => item.income > 0 || item.expense > 0);

  return (
    <section className="card dash-flow">
      <header className="card-head">
        <div>
          <h2 className="card-title">Money flow</h2>
          <p className="card-sub">Income and expenses by month</p>
        </div>
        <div className="legend">
          <span><i style={{ background: COLOR.income }} />Income</span>
          <span><i style={{ background: COLOR.expense }} />Expenses</span>
          <span className="chip">{rangeLabel}</span>
        </div>
      </header>

      <div className="flow-body">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={incomeId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.income} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={COLOR.income} stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id={expenseId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.expense} stopOpacity="0.07" />
                  <stop offset="100%" stopColor={COLOR.expense} stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} width={52} tickFormatter={fmtINR} />
              <Tooltip content={<FlowTooltip />} cursor={{ stroke: "#b9c6dc", strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="income" name="Income" stroke={COLOR.income} strokeWidth={2.5} fill={`url(#${incomeId})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
              <Area type="monotone" dataKey="expense" name="Expenses" stroke={COLOR.expense} strokeWidth={2.5} fill={`url(#${expenseId})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">
            <p className="empty-title">No activity yet</p>
            <p className="empty-text">Add an income or expense and your monthly flow will show up here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
   SPENDING BREAKDOWN
============================================================================ */

function SpendingBreakdown({ data, total, onOpenCategory, onAdd }) {
  const [active, setActive] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const chartData = data.length ? data : [{ name: "Empty", value: 1 }];
  const rows = showAll ? data : data.slice(0, 6);
  const rest = showAll ? 0 : data.slice(6).reduce((sum, item) => sum + item.value, 0);
  const focus = active !== null && data[active] ? data[active] : null;
  const focusPct = focus && total ? Math.round((focus.value / total) * 100) : 0;

  return (
    <section className="card dash-spend">
      <header className="card-head">
        <div>
          <h2 className="card-title">Where your money went</h2>
          <p className="card-sub">Expenses by category. Select one for details.</p>
        </div>
      </header>

      {data.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No expenses in this period</p>
          <p className="empty-text">Log an expense to see which categories take the most.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Plus size={16} aria-hidden /> Add an expense
          </button>
        </div>
      ) : (
        <div className="spend-body">
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="none"
                  onMouseEnter={(_, index) => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onClick={(_, index) => data[index] && onOpenCategory(data[index].name)}
                >
                  {chartData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                      opacity={active === null || active === index ? 1 : 0.3}
                      style={{ transition: "opacity .15s" }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-live="polite">
              <span className={focus ? "is-focus" : ""} style={focus ? { color: CATEGORY_PALETTE[active % CATEGORY_PALETTE.length] } : undefined}>
                {focus ? formatCategory(focus.name) : "Spent"}
              </span>
              <strong className="mono">{fmtINR(focus ? focus.value : total)}</strong>
              {focus && <em>{focusPct}% of spending</em>}
            </div>
          </div>

          <ul className="cat-list">
            {rows.map((item, index) => (
              <li key={item.name}>
                <button
                  type="button"
                  className={active === index ? "on" : ""}
                  onClick={() => onOpenCategory(item.name)}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  aria-label={`${formatCategory(item.name)}, ${formatFullINR(item.value)}. Open details`}
                >
                  <i style={{ background: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }} />
                  <span className="cat-name">{formatCategory(item.name)}</span>
                  <span className="cat-pct">{total ? Math.round((item.value / total) * 100) : 0}%</span>
                  <b className="mono">{fmtINR(item.value)}</b>
                </button>
              </li>
            ))}
            {rest > 0 && (
              <li className="cat-rest">
                <i style={{ background: "#cbd5e1" }} />
                <span className="cat-name">Other categories</span>
                <span className="cat-pct">{total ? Math.round((rest / total) * 100) : 0}%</span>
                <b className="mono">{fmtINR(rest)}</b>
              </li>
            )}
          </ul>

          {data.length > 6 && (
            <button type="button" className="btn cat-more-btn" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show top 6 only" : `View all ${data.length} categories`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
   RECENT ACTIVITY
============================================================================ */

function ActivityRow({ transaction }) {
  const isIncome = transaction.type === "income";
  const icons = isIncome ? INCOME_CATEGORY_ICONS : EXPENSE_CATEGORY_ICONS;
  const icon = icons?.[transaction.category] ?? icons?.Other ?? null;
  const date = isValidDate(transaction.date)
    ? new Date(transaction.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "";

  return (
    <li className="act-row">
      <span className={`act-icon ${isIncome ? "in" : "out"}`}>{icon}</span>
      <span className="act-text">
        <b>{transaction.description || formatCategory(transaction.category)}</b>
        <small>
          {formatCategory(transaction.category)}
          {date ? `, ${date}` : ""}
        </small>
      </span>
      <strong className={`mono act-amount ${isIncome ? "in" : "out"}`}>
        {isIncome ? "+" : "−"}
        {formatFullINR(Math.abs(transaction.amount))}
      </strong>
    </li>
  );
}

function RecentActivity({ items, onAdd, navigate }) {
  return (
    <section className="card dash-activity">
      <header className="card-head">
        <div>
          <h2 className="card-title">Recent activity</h2>
          <p className="card-sub">Your latest income and expenses</p>
        </div>
        <div className="head-links">
          <button type="button" onClick={() => navigate("/income")}>Income <ChevronRight size={14} aria-hidden /></button>
          <button type="button" onClick={() => navigate("/expense")}>Expenses <ChevronRight size={14} aria-hidden /></button>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Nothing here yet</p>
          <p className="empty-text">Transactions you add will appear here, newest first.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Plus size={16} aria-hidden /> Add a transaction
          </button>
        </div>
      ) : (
        <ul className="act-list">
          {items.map((transaction) => (
            <ActivityRow key={transaction.id || `${transaction.date}-${transaction.amount}-${transaction.description}`} transaction={transaction} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================================
   SAVING GOALS
============================================================================ */

function GoalRow({ goal }) {
  const target = Number(goal.target) || 0;
  const saved = Number(goal.saved ?? goal.current) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const color = goal.color || COLOR.primary;

  return (
    <li className="goal-row">
      <div className="goal-top">
        <b>{goal.name}</b>
        <span className="mono">{pct}%</span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.name} progress`}>
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="goal-meta mono">
        {formatFullINR(saved)} <span>of {formatFullINR(target)}</span>
      </p>
    </li>
  );
}

function GoalsCard({ goals, loading, navigate }) {
  return (
    <section className="card dash-goals">
      <header className="card-head">
        <div>
          <h2 className="card-title">Saving goals</h2>
          <p className="card-sub">Progress towards what you are saving for</p>
        </div>
        <button type="button" className="btn btn-icon" onClick={() => navigate("/goals")} aria-label="Open saving goals">
          <ArrowUpRight size={16} aria-hidden />
        </button>
      </header>

      {loading ? (
        <div className="empty"><p className="empty-text"><RefreshCw size={14} className="spin" aria-hidden /> Loading goals</p></div>
      ) : goals.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No goals yet</p>
          <p className="empty-text">Set a target and a date, and track it from here.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/goals")}>
            <Target size={16} aria-hidden /> Create a goal
          </button>
        </div>
      ) : (
        <ul className="goal-list">
          {goals.slice(0, 4).map((goal) => (
            <GoalRow key={goal._id || goal.id || goal.name} goal={goal} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================================
   MONTHLY BREAKDOWN MODAL (opened from a KPI card)
============================================================================ */

function MonthlyDetailModal({ metric, year, setYear, onClose, transactions }) {
  const metricType = metric === "Income" ? "income" : metric === "Expenses" ? "expense" : "balance";
  const valid = transactions.filter((t) => t?.date && !Number.isNaN(new Date(t.date).getTime()));
  const years = [...new Set([new Date().getFullYear(), ...valid.map((t) => new Date(t.date).getFullYear())])].sort((a, b) => b - a);
  const detailYear = years.includes(Number(year)) ? Number(year) : new Date().getFullYear();

  const rows = Array.from({ length: 12 }, (_, month) => {
    const items = valid.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === detailYear && d.getMonth() === month;
    });
    const income = items.filter((t) => t.type === "income").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expenses = items.filter((t) => t.type === "expense").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const amount = metricType === "income" ? income : metricType === "expense" ? expenses : income - expenses;
    return { month: MONTHS[month], income, expenses, amount, count: items.length };
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const barColor = metricType === "income" ? COLOR.income : metricType === "expense" ? COLOR.expense : COLOR.primary;

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={`${metric} by month`} className="modal-card detail-modal">
        <header className="modal-header">
          <div>
            <h2>{metric} by month</h2>
            <p>Monthly totals for {detailYear}</p>
          </div>
          <div className="detail-tools">
            <label>
              <span className="sr-only">Year</span>
              <select value={detailYear} onChange={(event) => setYear(Number(event.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button>
          </div>
        </header>

        <div className="detail-stats">
          <div><span>Year total</span><b className="mono" style={{ color: barColor }}>{formatFullINR(total)}</b></div>
          <div><span>Monthly average</span><b className="mono">{formatFullINR(total / 12)}</b></div>
          <div><span>Months with activity</span><b className="mono">{rows.filter((r) => r.count > 0).length} of 12</b></div>
        </div>

        <div className="detail-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={52} tickFormatter={fmtINR} />
              <Tooltip cursor={{ fill: "rgba(37,99,235,.06)" }} content={<FlowTooltip />} />
              <Bar dataKey="amount" name={metric} fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>{metric}</th>
                <th>Entries</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <td>{row.month} {detailYear}</td>
                  <td className="mono in">{formatFullINR(row.income)}</td>
                  <td className="mono out">{formatFullINR(row.expenses)}</td>
                  <td className="mono strong">{formatFullINR(row.amount)}</td>
                  <td className="mono">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="detail-note">Saved is income minus expenses for each month.</p>
      </section>
    </div>,
    document.body,
  );
}

const Dashboard = () => {
  const outletContext = useOutletContext() || {};

  const {
    // The layout pre-filters `transactions` for its own cards; the dashboard
    // needs everything (any period + the 7-month chart).
    allTransactions,
    transactions: layoutTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
    lastUpdated,
  } = outletContext;

  const outletTransactions = allTransactions ?? layoutTransactions;

  const navigate = useNavigate();

  /* --------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------- */

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const currentYear = getCurrentYear();
  const currentMonth = new Date().getMonth();

  // Dashboard period: Monthly/Yearly are always relative to the current date;
  // Custom is the only manually selectable range.
  const { customRange, setCustomRange } = usePeriod(outletContext);

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


  const [monthlyDetailMetric, setMonthlyDetailMetric] = useState("");
  const [monthlyDetailYear, setMonthlyDetailYear] = useState(new Date().getFullYear());

  const [newTransaction, setNewTransaction] = useState(
    createDefaultTransaction,
  );

  const toastTimersRef = useRef(new Map());

  /* --------------------------------------------------------------------------
     CLEANUP TOAST TIMERS
  -------------------------------------------------------------------------- */

  useEffect(() => {
    const timers = toastTimersRef.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));

      timers.clear();
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

  const handleCustomRangeChange = useCallback(
    (range) => {
      setCustomRange(range);
      setShowAllIncome(false);
      setShowAllExpense(false);
    },
    [setCustomRange],
  );

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

    // Monthly = current month, Yearly = current year. Only Custom is manual.
    if (timeFrame === "monthly" || timeFrame === "yearly") {
      return getTimeFrameRange(timeFrame, currentYear, currentMonth, customRange);
    }

    if (timeFrame === "custom") {
      return getTimeFrameRange("custom", currentYear, currentMonth, customRange);
    }

    return getTimeFrameRange(timeFrame);
  }, [timeFrame, previousYearRange, currentYear, currentMonth, customRange]);

  const timeFrameRange = activeRange;

  const prevTimeFrameRange = useMemo(() => {
    const bounds =
      timeFrame === "monthly" || timeFrame === "yearly" || timeFrame === "custom"
        ? (() => {
            if (timeFrame === "custom") {
              const range = normalizeCustomRange(customRange);
              const start = fromMonthIndex(range.start);
              const end = fromMonthIndex(range.end);
              const count = range.end - range.start + 1;

              return {
                currentStart: new Date(start.year, start.month, 1),
                nextStart: new Date(end.year, end.month + 1, 1),
                previousStart: new Date(start.year, start.month - count, 1),
                previousLabel: "Previous Period",
              };
            }

            if (timeFrame === "monthly") {
              return {
                currentStart: new Date(currentYear, currentMonth, 1),
                nextStart: new Date(currentYear, currentMonth + 1, 1),
                previousStart: new Date(currentYear, currentMonth - 1, 1),
                previousLabel: "Previous Month",
              };
            }

            return {
              currentStart: new Date(currentYear, 0, 1),
              nextStart: new Date(currentYear + 1, 0, 1),
              previousStart: new Date(currentYear - 1, 0, 1),
              previousLabel: "Last Year",
            };
          })()
        : null;

    // equally sized period right before the selected one
    if (bounds) {
      return {
        start: bounds.previousStart,
        end: new Date(bounds.currentStart.getTime() - 1),
        label: bounds.previousLabel,
      };
    }

    return getPreviousTimeFrameRange(
      timeFrame === "previous_year" ? "yearly" : timeFrame,
    );
  }, [timeFrame, currentYear, currentMonth, customRange]);

  // Server overview (/dashboard) only describes the real current month.
  const useServerOverview = timeFrame === "monthly";

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
    if (useServerOverview && overviewMeta.monthlyIncome != null) {
      return Number(overviewMeta.monthlyIncome) || 0;
    }

    return currentData.income;
  }, [useServerOverview, overviewMeta.monthlyIncome, currentData.income]);

  const displayExpenses = useMemo(() => {
    if (useServerOverview && overviewMeta.monthlyExpense != null) {
      return Number(overviewMeta.monthlyExpense) || 0;
    }

    return currentData.expenses;
  }, [useServerOverview, overviewMeta.monthlyExpense, currentData.expenses]);

  const displaySavings = displayIncome - displayExpenses;

  const prevExpenseVal = useMemo(() => {
    if (useServerOverview && overviewMeta.previousMonthExpense != null) {
      return Number(overviewMeta.previousMonthExpense) || 0;
    }

    return prevData.expenses;
  }, [useServerOverview, overviewMeta.previousMonthExpense, prevData.expenses]);

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
    // 7 months ending at the month being viewed
    const customEnd = fromMonthIndex(normalizeCustomRange(customRange).end);

    const anchor =
      timeFrame === "custom"
        ? new Date(customEnd.year, customEnd.month, 1)
        : new Date(currentYear, currentMonth, 1);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - 6 + index,
        1,
      );

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
  }, [
    normalizedTransactions,
    timeFrame,
    customRange,
    currentYear,
    currentMonth,
  ]);

  /* --------------------------------------------------------------------------
     PIE DATA
  -------------------------------------------------------------------------- */

  const pieData = useMemo(() => {
    if (
      useServerOverview &&
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
  }, [filteredTransactions, overviewMeta.expenseDistribution, useServerOverview]);

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
    useServerOverview && serverIncome.length > 0
      ? serverIncome
      : incomeTransactions;

  const expenseList =
    useServerOverview && serverExpense.length > 0
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
    if (!useServerOverview) {
      return undefined;
    }

    const controller = new AbortController();

    fetchDashboardOverview(controller.signal);

    return () => controller.abort();
  }, [useServerOverview, fetchDashboardOverview, lastUpdated]);

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

      if (useServerOverview) {
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
    useServerOverview,
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

  const flowSeries = (key) => barChartData.map((item) => Number(item[key]) || 0);

  const incomeChange =
    prevData.income > 0
      ? Math.round(((displayIncome - prevData.income) / prevData.income) * 100)
      : null;

  const compareHint = (delta) =>
    delta === null ? "No earlier period to compare" : "vs previous period";

  return (
    <div className="dash">
      <Toast toasts={toasts} variant="light" />

      <PeriodBar
        timeFrame={timeFrame}
        onTimeFrameChange={handleSetTimeFrame}
        activeRangeLabel={activeRangeLabel}
        handleExport={handleExport}
        exporting={exporting}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      <section className="kpi-grid" aria-label="Summary">
        <KpiCard
          label="Income"
          value={formatFullINR(displayIncome)}
          delta={incomeChange}
          goodWhenUp
          hint={compareHint(incomeChange)}
          color={COLOR.income}
          series={flowSeries("income")}
          icon={TrendingUp}
          onClick={() => {
            setMonthlyDetailYear(new Date().getFullYear());
            setMonthlyDetailMetric("Income");
          }}
        />
        <KpiCard
          label="Expenses"
          value={formatFullINR(displayExpenses)}
          delta={expenseChange}
          goodWhenUp={false}
          hint={compareHint(expenseChange)}
          color={COLOR.expense}
          series={flowSeries("expense")}
          icon={TrendingDown}
          onClick={() => {
            setMonthlyDetailYear(new Date().getFullYear());
            setMonthlyDetailMetric("Expenses");
          }}
        />
        <KpiCard
          label="Saved"
          value={formatFullINR(displaySavings)}
          delta={null}
          hint={displaySavings >= 0 ? "Income minus expenses" : "You spent more than you earned"}
          color={COLOR.primary}
          series={barChartData.map((item) => (Number(item.income) || 0) - (Number(item.expense) || 0))}
          icon={PiggyBank}
          onClick={() => {
            setMonthlyDetailYear(new Date().getFullYear());
            setMonthlyDetailMetric("Saved");
          }}
        />
        <RateCard pct={savingsPct} />
      </section>

      <div className="dash-row">
        <FlowChart data={barChartData} rangeLabel={activeRangeLabel} />
        <SpendingBreakdown
          data={sortedPieData}
          total={pieTotal}
          onOpenCategory={(name) => navigate(`/expense/category/${encodeURIComponent(name)}`)}
          onAdd={() => setShowModal(true)}
        />
      </div>

      <div className="dash-row dash-row-b">
        <RecentActivity items={recentTransactions} onAdd={() => setShowModal(true)} navigate={navigate} />
        <GoalsCard goals={savingGoals} loading={goalsLoading} navigate={navigate} />
      </div>

      {monthlyDetailMetric && (
        <MonthlyDetailModal
          metric={monthlyDetailMetric}
          year={monthlyDetailYear}
          setYear={setMonthlyDetailYear}
          onClose={() => setMonthlyDetailMetric("")}
          transactions={normalizedTransactions}
        />
      )}

      <AddTransactionModal
        showModal={showModal}
        setShowModal={setShowModal}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        handleAddTransaction={handleAddTransaction}
        loading={isSaving}
      />
    </div>
  );
};

export default Dashboard;
