import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
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
  ReferenceLine,
} from "recharts";
import axios from "axios";
import {  learnCategory } from "../utils/smartCategoryAI";
import AddTransactionModal from "../components/Add";

const API_BASE = import.meta.env.VITE_API_BASE;


const CATEGORY_COLOR = {
  Salary: "#00e5a0",
  Extra_Income: "#5b8dff",
  Freelance: "#b97cff",
  Side_Hustles: "#ffb347",
  Investment: "#22d3ee",
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
  "#00e5a0",
  "#00c882",
  "#00a86b",
  "#00e5a0cc",
  "#00c88280",
  "#00a86b60",
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Transactions" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "Salary", label: "Salary" },
  { value: "Extra_Income", label: "Extra Income" },
  { value: "Freelance", label: "Freelance" },
  { value: "Side_Hustles", label: "Side Hustles" },
  { value: "Investment", label: "Investment" },
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
  if (timeFrame === "monthly")
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(now),
      label: "This Month",
    };
  if (timeFrame === "yearly")
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
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
            pointer-events-auto border backdrop-blur-md
            ${
              t.type === "success"
                ? "bg-[#0d1f1a] border-[#00e5a030] text-[#00e5a0]"
                : t.type === "error"
                  ? "bg-[#1f0d0d] border-[#ff4d4d30] text-[#ff6b6b]"
                  : "bg-[#13161e] border-[#252836] text-[#eef0f6]"
            }`}
        >
          {t.type === "success" ? (
            <Check size={14} className="shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle size={14} className="shrink-0" />
          ) : (
            <Zap size={14} className="shrink-0" />
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
function StatCard({ label, value, sub, accent = "#00e5a0", icon: Icon }) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden border transition-all duration-200 group"
      style={{ background: "#13161e", borderColor: "#252836" }}
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${accent}08 0%, transparent 70%)`,
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: "#5e6378" }}
        >
          {label}
        </p>
        {Icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: accent + "14", color: accent }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>

      <p
        className="text-2xl font-bold tracking-tight"
        style={{ color: "#eef0f6" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: "#5e6378" }}>
        {sub}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOM CHART TOOLTIP
// ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-2xl text-sm border"
      style={{ background: "#1a1e29", borderColor: "#252836" }}
    >
      <p className="text-xs mb-0.5" style={{ color: "#5e6378" }}>
        {label}
      </p>
      <p className="font-bold" style={{ color: "#00e5a0" }}>
        {fmtINR(Math.round(payload[0].value))}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY PILL
// ─────────────────────────────────────────────────────────────
function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] ?? "#5e6378";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
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
    <div
      className="flex gap-1 p-1 rounded-xl w-fit"
      style={{ background: "#0d0f14", border: "1px solid #252836" }}
    >
      {TIME_FRAMES.map((f) => (
        <button
          key={f}
          onClick={() => setTimeFrame(f)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150"
          style={
            timeFrame === f
              ? { background: "#00e5a0", color: "#0d0f14" }
              : { color: "#5e6378" }
          }
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
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition-all"
        style={{
          background: "#1a1e29",
          border: "1px solid #252836",
          color: "#5e6378",
        }}
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
          className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-30"
          style={{
            background: "#1a1e29",
            border: "1px solid #252836",
            animation: "fadeIn .12s ease-out",
          }}
        >
          <div className="max-h-64 overflow-y-auto py-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2"
                style={
                  value === opt.value
                    ? { background: "#00e5a012", color: "#00e5a0" }
                    : { color: "#5e6378" }
                }
              >
                {CATEGORY_COLOR[opt.value] && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CATEGORY_COLOR[opt.value] }}
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
// INCOME BREAKDOWN
// ─────────────────────────────────────────────────────────────
function IncomeBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};
    for (const t of transactions)
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({
        cat,
        amt,
        pct: total ? (amt / total) * 100 : 0,
      }));
  }, [transactions]);

  if (!breakdown.length)
    return (
      <div
        className="rounded-2xl border p-5 flex flex-col items-center justify-center gap-3 min-h-[160px]"
        style={{ background: "#13161e", borderColor: "#252836" }}
      >
        <Sparkles size={22} style={{ color: "#252836" }} />
        <p className="text-xs" style={{ color: "#5e6378" }}>
          No income sources yet
        </p>
      </div>
    );

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#13161e", borderColor: "#252836" }}
    >
      <h3
        className="text-sm font-bold mb-5 flex items-center gap-2"
        style={{ color: "#eef0f6" }}
      >
        <Sparkles size={15} style={{ color: "#00e5a0" }} />
        Income sources
      </h3>
      <div className="space-y-4">
        {breakdown.map(({ cat, amt, pct }) => {
          const color = CATEGORY_COLOR[cat] ?? "#5e6378";
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="flex items-center gap-2 text-xs font-medium"
                  style={{ color: "#eef0f6" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  {cat.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-bold" style={{ color }}>
                  {fmtINR(amt)}
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "#1a1e29" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                  }}
                />
              </div>
            </div>
          );
        })}
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
  const color = CATEGORY_COLOR[transaction.category] ?? "#5e6378";
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
      className="flex items-center gap-3 px-4 py-4 transition-all duration-150"
      style={{ background: isEditing ? "#1a1e29" : "transparent" }}
      onMouseEnter={(e) => {
        if (!isEditing) e.currentTarget.style.background = "#1a1e2960";
      }}
      onMouseLeave={(e) => {
        if (!isEditing) e.currentTarget.style.background = "transparent";
      }}
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
          <div className="space-y-2">
            <div>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                style={{
                  background: "#0d0f14",
                  border: `1px solid ${errors.description ? "#ff4d4d" : "#252836"}`,
                  color: "#eef0f6",
                }}
                placeholder="Description"
              />
              {errors.description && (
                <p className="text-[10px] mt-0.5" style={{ color: "#ff6b6b" }}>
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
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                  style={{
                    background: "#0d0f14",
                    border: `1px solid ${errors.amount ? "#ff4d4d" : "#252836"}`,
                    color: "#eef0f6",
                  }}
                  placeholder="Amount"
                  min="1"
                />
                {errors.amount && (
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "#ff6b6b" }}
                  >
                    {errors.amount}
                  </p>
                )}
              </div>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, category: e.target.value }))
                }
                className="text-xs px-2 py-2 rounded-lg outline-none"
                style={{
                  background: "#0d0f14",
                  border: "1px solid #252836",
                  color: "#eef0f6",
                }}
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: "#0d0f14" }}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-sm font-semibold truncate"
              style={{ color: "#eef0f6" }}
            >
              {transaction.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]" style={{ color: "#5e6378" }}>
                {new Date(transaction.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span style={{ color: "#252836" }}>·</span>
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
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: "#00e5a0", color: "#0d0f14" }}
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={() => {
                setErrors({ description: "", amount: "" });
                onCancel();
              }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{
                background: "#1a1e29",
                color: "#5e6378",
                border: "1px solid #252836",
              }}
            >
              <X size={12} /> Cancel
            </button>
          </>
        ) : (
          <>
            <span
              className="text-sm font-bold mr-1"
              style={{ color: "#00e5a0" }}
            >
              +₹
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
                  category: transaction.category ?? "Salary",
                  date: transaction.date ?? "",
                });
                setEditingId(transaction.id);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: "#363a4e" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00e5a012";
                e.currentTarget.style.color = "#00e5a0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#363a4e";
              }}
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: "#363a4e" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ff4d4d12";
                e.currentTarget.style.color = "#ff6b6b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#363a4e";
              }}
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
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "#0d0f14cc" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl sm:mx-4"
        style={{
          background: "#13161e",
          border: "1px solid #252836",
          animation: "slideUp .25s ease-out",
        }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden"
          style={{ background: "#252836" }}
        />
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#ff4d4d12" }}
          >
            <Trash2 size={22} style={{ color: "#ff6b6b" }} />
          </div>
        </div>
        <h2
          className="text-center text-base font-bold"
          style={{ color: "#eef0f6" }}
        >
          Delete this income?
        </h2>
        <p
          className="text-center text-xs mt-1 mb-4"
          style={{ color: "#5e6378" }}
        >
          This action cannot be undone
        </p>
        {transaction && (
          <div
            className="rounded-xl px-4 py-3 mb-5"
            style={{ background: "#1a1e29", border: "1px solid #252836" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="font-semibold text-sm truncate"
                  style={{ color: "#eef0f6" }}
                >
                  {transaction.description}
                </p>
                <CategoryPill cat={transaction.category} />
              </div>
              <p className="font-bold shrink-0" style={{ color: "#00e5a0" }}>
                {fmtINR(transaction.amount)}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "#1a1e29",
              color: "#5e6378",
              border: "1px solid #252836",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "#ff4d4d20",
              color: "#ff6b6b",
              border: "1px solid #ff4d4d30",
            }}
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN INCOME PAGE
// ─────────────────────────────────────────────────────────────
const Income = () => {
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

  const incomeTransactions = useMemo(
    () =>
      (outletTransactions || [])
        .filter((t) => t.type === "income")
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [outletTransactions],
  );

  const timeFrameTransactions = useMemo(
    () =>
      incomeTransactions.filter((t) =>
        isDateInRange(t.date, timeFrameRange.start, timeFrameRange.end),
      ),
    [incomeTransactions, timeFrameRange, isDateInRange],
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

  const totalIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (s, t) => s + Math.round(Number(t.amount || 0)),
        0,
      ),
    [filteredTransactions],
  );
  const averageIncome = useMemo(
    () =>
      filteredTransactions.length
        ? Math.round(totalIncome / filteredTransactions.length)
        : 0,
    [filteredTransactions, totalIncome],
  );
  const highestIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (m, t) => Math.max(m, Number(t.amount || 0)),
        0,
      ),
    [filteredTransactions],
  );

  const chartData = useMemo(() => {
    const data = chartPoints.map((p) => ({ ...p, income: 0 }));
    filteredTransactions.forEach((t) => {
      const d = new Date(t.date);
      const point = data.find((p) =>
        timeFrame === "daily"
          ? p.hour === d.getHours()
          : timeFrame === "yearly"
            ? p.date.getMonth() === d.getMonth()
            : p.date.getDate() === d.getDate() &&
              p.date.getMonth() === d.getMonth(),
      );
      if (point) point.income += Math.round(Number(t.amount));
    });
    return data;
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
      type: "income",
      category: "Salary",
    });
    addToast("Income added!", "success");
    try {
      await axios.post(`${API_BASE}/income/add`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      learnCategory(payload.description, payload.category);
      refreshTransactions();
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Failed to save income.",
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
      await axios.put(`${API_BASE}/income/update/${editingId}`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      setEditingId(null);
      learnCategory(payload.description, payload.category);
      addToast("Income updated!", "success");
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
      await axios.delete(`${API_BASE}/income/delete/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });
      setDeleteTarget(null);
      addToast("Income deleted.", "success");
      refreshTransactions();
    } catch (err) {
      addToast(err?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/income/downloadexcel`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const disposition = res.headers["content-disposition"];
      let filename = "income_details.xlsx";
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
  }, [getAuthHeaders, addToast]);

  const chartLabel =
    timeFrame === "daily"
      ? "Hourly"
      : timeFrame === "yearly"
        ? "Monthly"
        : "Daily";
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
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <Toast toasts={toasts} />

      <div
        className="min-h-screen px-3 py-5 sm:px-5 md:px-6 lg:px-8 space-y-4"
        style={{ background: "#0d0f14" }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#13161e", borderColor: "#252836" }}
        >
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "#00e5a0",
                      animation: "pulseDot 2s ease-in-out infinite",
                    }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "#00e5a0" }}
                  >
                    Income
                  </span>
                </div>
                <h1
                  className="text-lg sm:text-xl font-bold tracking-tight"
                  style={{ color: "#eef0f6" }}
                >
                  Income Tracker
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "#5e6378" }}>
                  {timeFrameRange.label}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "#1a1e29",
                    border: "1px solid #252836",
                    color: "#5e6378",
                  }}
                >
                  <Download size={13} />
                  <span className="hidden xs:inline">Export</span>
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "#00e5a0",
                    color: "#0d0f14",
                    boxShadow: "0 0 20px #00e5a030",
                  }}
                >
                  <Plus size={14} />
                  Add Income
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

        {/* ── STAT CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Income"
            value={fmtINR(totalIncome)}
            sub={timeFrameRange.label}
            accent="#00e5a0"
            icon={TrendingUp}
          />
          <StatCard
            label="Avg / Transaction"
            value={fmtINR(averageIncome)}
            sub={`${filteredTransactions.length} transactions`}
            accent="#5b8dff"
            icon={BarChart2}
          />
          <StatCard
            label="Highest Single"
            value={fmtINR(highestIncome)}
            sub="biggest income"
            accent="#b97cff"
            icon={ArrowUpRight}
          />
          <StatCard
            label="Total Count"
            value={filteredTransactions.length}
            sub={filter === "all" ? "all records" : "filtered"}
            accent="#ffb347"
            icon={IndianRupee}
          />
        </div>

        {/* ── CHART + BREAKDOWN ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <div
            className="lg:col-span-2 rounded-2xl border p-5"
            style={{ background: "#13161e", borderColor: "#252836" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: "#eef0f6" }}
              >
                <BarChart2 size={15} style={{ color: "#00e5a0" }} />
                {chartLabel} trends
              </h3>
              <span className="text-xs" style={{ color: "#5e6378" }}>
                {timeFrameRange.label}
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1a1e29"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#363a4e", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#363a4e", fontSize: 10 }}
                    width={50}
                    tickFormatter={fmtINR}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#00e5a008", radius: 6 }}
                  />
                  <Bar dataKey="income" radius={[6, 6, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                  {chartData.map((pt, i) =>
                    pt.isCurrent ? (
                      <ReferenceLine
                        key={i}
                        x={pt.label}
                        stroke="#00e5a0"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        strokeOpacity={0.4}
                      />
                    ) : null,
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <IncomeBreakdown transactions={filteredTransactions} />
        </div>

        {/* ── TRANSACTIONS LIST ───────────────────────────────────── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#13161e", borderColor: "#252836" }}
        >
          {/* List header */}
          <div
            className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ borderBottom: "1px solid #1a1e29" }}
          >
            <h3
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: "#eef0f6" }}
            >
              <IndianRupee size={14} style={{ color: "#00e5a0" }} />
              Transactions
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#00e5a014", color: "#00e5a0" }}
              >
                {filteredTransactions.length}
              </span>
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#363a4e" }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-2.5 text-xs rounded-xl w-32 sm:w-36 focus:w-44 sm:focus:w-48 transition-all outline-none"
                  style={{
                    background: "#1a1e29",
                    border: "1px solid #252836",
                    color: "#eef0f6",
                  }}
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
          <div style={{ borderTop: "1px solid #1a1e29" }}>
            {visibleTransactions.length > 0 ? (
              <div>
                {visibleTransactions.map((transaction, i) => (
                  <div
                    key={transaction.id}
                    style={i > 0 ? { borderTop: "1px solid #1a1e29" } : {}}
                  >
                    <TransactionItem
                      transaction={transaction}
                      isEditing={editingId === transaction.id}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      onSave={handleEditTransaction}
                      onCancel={() => setEditingId(null)}
                      onDelete={(id) => {
                        const tx = filteredTransactions.find(
                          (t) => t.id === id,
                        );
                        setDeleteTarget(tx ?? { id });
                      }}
                      setEditingId={setEditingId}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-16 flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "#1a1e29" }}
                >
                  <IndianRupee size={22} style={{ color: "#363a4e" }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#eef0f6" }}>
                  No income found
                </p>
                <p
                  className="text-xs text-center max-w-xs px-4"
                  style={{ color: "#5e6378" }}
                >
                  {filter === "all" && !search
                    ? "You haven't recorded any income yet. Add your first one."
                    : `No results for the current filter${search ? ` and "${search}"` : ""}.`}
                </p>
                {filter === "all" && !search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-1 flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
                    style={{
                      background: "#00e5a0",
                      color: "#0d0f14",
                      boxShadow: "0 0 16px #00e5a030",
                    }}
                  >
                    <Plus size={13} />
                    Add your first income
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Show all / Show less */}
          {!showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-4 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ color: "#5e6378", borderTop: "1px solid #1a1e29" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1a1e29";
                e.currentTarget.style.color = "#00e5a0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#5e6378";
              }}
            >
              <Eye size={13} />
              View all {filteredTransactions.length} transactions
            </button>
          )}
          {showAll && filteredTransactions.length > 10 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-4 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ color: "#5e6378", borderTop: "1px solid #1a1e29" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1a1e29";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
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
        lockType="income"
      />

      {/* ── DELETE CONFIRM ─────────────────────────────────────────── */}
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
