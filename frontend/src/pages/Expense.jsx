/* eslint-disable no-unused-vars */
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  IndianRupee,
  Download,
  Eye,
  EyeOff,
  Calendar,
  TrendingDown,
  TrendingUp,
  Filter,
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
import { exportToExcel } from "../utils/exportUtils";
import TimeFrameSelector from "../components/TimeFrame";
import TransactionItem from "../components/TransactionItem";
const AddTransactionModal = React.lazy(() => import("../components/Add"));
import { getTimeFrameRange, generateChartPoints } from "../components/Helpers";
import { CATEGORY_ICONS } from "../assets/color";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── helpers ──────────────────────────────────────────────────────────────────
function toIsoWithClientTime(dateValue) {
  if (!dateValue) return new Date().toISOString();
  if (typeof dateValue === "string" && dateValue.length === 10) {
    const now = new Date();
    const hhmmss = now.toTimeString().slice(0, 8);
    return new Date(`${dateValue}T${hhmmss}`).toISOString();
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

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
            pointer-events-auto backdrop-blur-sm border
            animate-[slideInRight_0.25s_ease-out]
            ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-white border-gray-200 text-gray-800"
            }
          `}
        >
          {t.type === "success" ? (
            <Check size={15} className="text-emerald-500 shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle size={15} className="text-red-500 shrink-0" />
          ) : (
            <Zap size={15} className="text-orange-400 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "#f97316", trend, trendUp }) {
  return (
    <div
      className="relative bg-white rounded-2xl p-5 overflow-hidden border border-gray-100 shadow-sm
                    hover:shadow-md transition-shadow duration-200"
    >
      {/* accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent }}
      />
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">{sub}</p>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              trendUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight size={11} />
            ) : (
              <ArrowDownRight size={11} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-orange-500">
        {fmtINR(Math.round(payload[0].value))}
      </p>
    </div>
  );
}

// ─── Category Pill ─────────────────────────────────────────────────────────────
function CategoryPill({ cat }) {
  const color = CATEGORY_COLOR[cat] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: color + "18", color }}
    >
      {cat.replace(/_/g, " ")}
    </span>
  );
}

// ─── Delete Modal (bottom sheet) ───────────────────────────────────────────────
function DeleteModal({ transaction, loading, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.25s_ease-out]">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <Trash2 size={24} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-center text-lg font-semibold text-gray-900">
          Delete this expense?
        </h2>
        <p className="text-center text-sm text-gray-400 mt-1">
          This action cannot be undone
        </p>
        {transaction && (
          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  {transaction.description}
                </p>
                <CategoryPill cat={transaction.category} />
              </div>
              <p className="font-bold text-gray-900">
                {fmtINR(transaction.amount)}
              </p>
            </div>
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium
                       hover:bg-gray-200 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium
                       hover:bg-red-600 active:scale-95 transition shadow-md
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Dropdown ───────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "all", label: "All Transactions" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "Food", label: "Food" },
  { value: "Transport", label: "Transport" },
  { value: "Shopping", label: "Shopping" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Utilities", label: "Utilities" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Housing", label: "Housing" },
  { value: "Investment", label: "Investment" },
  { value: "Fuel", label: "Fuel" },
  { value: "Annual_Expense", label: "Annual Expense" },
  { value: "Kids_Needs", label: "Kids Needs" },
  { value: "Service", label: "Vehicle Expenses" },
  { value: "Personal_Care_Expenses", label: "Personal Care" },
  { value: "Dairy", label: "Dairy" },
  { value: "Junk_Food", label: "Junk Food" },
  { value: "Grocery", label: "Grocery" },
];

function FilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const label =
    FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Filter";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200
                   px-4 py-2.5 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-colors"
      >
        <SlidersHorizontal size={15} />
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl
                        overflow-hidden z-20 animate-[fadeIn_0.12s_ease-out]"
        >
          <div className="max-h-64 overflow-y-auto py-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${
                    value === opt.value
                      ? "bg-orange-50 text-orange-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {opt.value !== "all" &&
                  opt.value !== "month" &&
                  opt.value !== "year" && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
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

// ─── Spending Breakdown Bar ────────────────────────────────────────────────────
function SpendingBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => ({
        cat,
        amt,
        pct: total ? (amt / total) * 100 : 0,
      }));
  }, [transactions]);

  if (!breakdown.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Flame size={16} className="text-orange-400" />
        Top spending categories
      </h3>
      <div className="space-y-3">
        {breakdown.map(({ cat, amt, pct }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {cat.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {fmtINR(amt)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
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

// ─── Main Component ────────────────────────────────────────────────────────────
const ExpensePage = () => {
  const {
    transactions: outletTransactions = [],
    timeFrame = "monthly",
    setTimeFrame = () => {},
    refreshTransactions,
  } = useOutletContext();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

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
  const [overview, setOverview] = useState({
    totalExpense: 0,
    averageExpense: 0,
    numberOfTransactions: 0,
    recentTransactions: [],
    range: "monthly",
  });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchOverview = useCallback(
    async (range = timeFrame ?? "monthly") => {
      try {
        const res = await axios.get(`${API_BASE}/expense/overview`, {
          headers: getAuthHeaders(),
          params: { range },
        });
        const payload = res.data?.data ?? {};
        setOverview({
          totalExpense: payload.totalExpense ?? 0,
          averageExpense: payload.averageExpense ?? 0,
          numberOfTransactions: payload.numberOfTransactions ?? 0,
          recentTransactions: payload.recentTransactions ?? [],
          range: payload.range ?? range,
        });
      } catch (err) {
        console.error("Failed to fetch overview:", err);
      }
    },
    [timeFrame, getAuthHeaders],
  );

  useEffect(() => {
    fetchOverview(timeFrame);
  }, [fetchOverview, timeFrame]);

  const timeFrameRange = useMemo(
    () => getTimeFrameRange(timeFrame, selectedMonth),
    [timeFrame, selectedMonth],
  );
  const chartPoints = useMemo(
    () => generateChartPoints(timeFrame, timeFrameRange),
    [timeFrame, timeFrameRange],
  );

  const isDateInRange = useCallback((date, start, end) => {
    const d = new Date(date);
    const s = new Date(start);
    const e = new Date(end);
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

    if (filter === "month") {
      list = list.filter(
        (t) =>
          new Date(t.date).getFullYear() === now.getFullYear() &&
          new Date(t.date).getMonth() === now.getMonth(),
      );
    } else if (filter === "year") {
      list = list.filter(
        (t) => new Date(t.date).getFullYear() === now.getFullYear(),
      );
    } else if (filter !== "all") {
      list = list.filter(
        (t) => t.category.toLowerCase() === filter.toLowerCase(),
      );
    }

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
        (sum, t) => sum + Math.round(Number(t.amount || 0)),
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
        (max, t) => Math.max(max, Number(t.amount || 0)),
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

  // ── Add expense (instant, non-blocking) ───────────────────────────────────
  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    const payload = {
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      date: toIsoWithClientTime(newTransaction.date),
    };

    const tempId = `temp-${Date.now()}`;
    const tempTx = { id: tempId, ...payload, type: "expense" };

    // Instant UI
    setOverview((prev) => ({
      ...prev,
      recentTransactions: [tempTx, ...prev.recentTransactions],
    }));
    setShowModal(false);
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "Food",
    });
    addToast("Expense added!", "success");

    // Background API
    try {
      await axios.post(`${API_BASE}/expense/add`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      refreshTransactions();
      fetchOverview(timeFrame);
    } catch (err) {
      setOverview((prev) => ({
        ...prev,
        recentTransactions: prev.recentTransactions.filter(
          (t) => t.id !== tempId,
        ),
      }));
      const msg = err?.response?.data?.message;
      addToast(msg || "Failed to save expense.", "error");
    }
  }, [
    newTransaction,
    getAuthHeaders,
    refreshTransactions,
    fetchOverview,
    timeFrame,
    addToast,
  ]);

  // ── Edit expense ───────────────────────────────────────────────────────────
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
      fetchOverview(timeFrame);
    } catch (err) {
      addToast(err?.response?.data?.message || "Update failed.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    editingId,
    editForm,
    getAuthHeaders,
    refreshTransactions,
    fetchOverview,
    timeFrame,
    addToast,
  ]);

  // ── Delete expense ─────────────────────────────────────────────────────────
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
      fetchOverview(timeFrame);
    } catch (err) {
      addToast(err?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
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
        const match = disposition.match(/filename="?(.+)"?/);
        if (match?.[1]) filename = match[1];
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Export ready!", "success");
    } catch {
      try {
        const exportData = filteredTransactions.map((t) => ({
          Date: new Date(t.date).toLocaleDateString("en-IN"),
          Description: t.description,
          Category: t.category,
          Amount: t.amount,
          Type: "Expense",
        }));
        exportToExcel(
          exportData,
          `expenses_${new Date().toISOString().slice(0, 10)}`,
        );
        addToast("Exported!", "success");
      } catch {
        addToast("Export failed.", "error");
      }
    }
  };

  return (
    <>
      {/* Global keyframe animations */}
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
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <Toast toasts={toasts} />

      <div className="min-h-screen bg-gray-50/60 px-4 py-6 md:px-6 lg:px-8 space-y-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* orange gradient top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />

          <div className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full bg-orange-400"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <span className="text-xs font-medium text-orange-500 uppercase tracking-widest">
                    Expenses
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Expense Tracker
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {timeFrameRange.label}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200
                             px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-white
                             bg-gradient-to-r from-orange-500 to-amber-500
                             px-5 py-2.5 rounded-xl
                             hover:from-orange-600 hover:to-amber-600
                             active:scale-95 transition-all shadow-md shadow-orange-200"
                >
                  <Plus size={16} />
                  Add Expense
                </button>
              </div>
            </div>

            <div className="mt-5">
              <TimeFrameSelector
                timeFrame={timeFrame}
                setTimeFrame={(frame) => {
                  setTimeFrame(frame);
                  setSelectedMonth(null);
                }}
                options={["daily", "weekly", "monthly", "yearly"]}
                color="orange"
              />
            </div>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Expenses"
            value={fmtINR(totalExpense)}
            sub={timeFrameRange.label}
            accent="#f97316"
          />
          <StatCard
            label="Avg per Transaction"
            value={fmtINR(averageExpense)}
            sub={`${filteredTransactions.length} transactions`}
            accent="#f59e0b"
          />
          <StatCard
            label="Highest Single"
            value={fmtINR(highestExpense)}
            sub="biggest spend"
            accent="#ef4444"
          />
          <StatCard
            label="Total Count"
            value={filteredTransactions.length}
            sub={filter === "all" ? "all records" : "filtered"}
            accent="#8b5cf6"
          />
        </div>

        {/* ── Chart + Breakdown ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart2 size={16} className="text-orange-400" />
                {timeFrame === "daily"
                  ? "Hourly"
                  : timeFrame === "yearly"
                    ? "Monthly"
                    : "Daily"}{" "}
                Trends
              </h3>
              <span className="text-xs text-gray-400">
                {timeFrameRange.label}
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#f97316"
                        stopOpacity={0.25}
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
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    width={52}
                    tickFormatter={fmtINR}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f97316"
                    fill="url(#eg)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: "#f97316", strokeWidth: 0 }}
                  />
                  {chartData.map(
                    (point, i) =>
                      point.isCurrent && (
                        <ReferenceLine
                          key={i}
                          x={point.label}
                          stroke="#f97316"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          strokeOpacity={0.6}
                        />
                      ),
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown */}
          <SpendingBreakdown transactions={filteredTransactions} />
        </div>

        {/* ── Transactions List ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* List header */}
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <IndianRupee size={15} className="text-orange-400" />
              Transactions
              <span className="bg-orange-50 text-orange-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            </h3>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                             w-36 focus:w-48 transition-all focus:outline-none
                             focus:border-orange-300 focus:bg-white placeholder-gray-400"
                />
              </div>
              <FilterDropdown value={filter} onChange={setFilter} />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {filteredTransactions
              .slice(0, showAll ? filteredTransactions.length : 8)
              .map((transaction) => (
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
                  type="expense"
                  categoryIcons={CATEGORY_ICONS}
                  setEditingId={setEditingId}
                  containerClass="px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                  amountClass="font-semibold text-red-500"
                  iconClass="text-orange-400"
                />
              ))}

            {/* Show all toggle */}
            {!showAll && filteredTransactions.length > 8 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-4 text-sm text-orange-500 font-medium
                           hover:bg-orange-50/60 transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={15} />
                View all {filteredTransactions.length} transactions
              </button>
            )}
            {showAll && filteredTransactions.length > 8 && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full py-4 text-sm text-gray-400 font-medium
                           hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <EyeOff size={15} />
                Show less
              </button>
            )}

            {/* Empty state */}
            {filteredTransactions.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <IndianRupee size={24} className="text-orange-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">
                  No expenses found
                </p>
                <p className="text-gray-400 text-xs text-center max-w-xs">
                  {filter === "all" && !search
                    ? "You haven't recorded any expenses yet."
                    : `No results for current filter${search ? ` and "${search}"` : ""}.`}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-1 flex items-center gap-2 text-sm font-semibold text-white
                             bg-gradient-to-r from-orange-500 to-amber-500
                             px-5 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-orange-200"
                >
                  <Plus size={15} />
                  Add your first expense
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Modal ──────────────────────────────────────────────────────── */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
          </div>
        }
      >
        <AddTransactionModal
          showModal={showModal}
          setShowModal={setShowModal}
          newTransaction={newTransaction}
          setNewTransaction={setNewTransaction}
          handleAddTransaction={handleAddTransaction}
          loading={loading}
          type="expense"
          title="Add New Expense"
          buttonText="Add Expense"
          categories={[
            "Investment",
            "Food",
            "Transport",
            "Shopping",
            "Entertainment",
            "Utilities",
            "Healthcare",
            "Housing",
            "Annual_Expense",
            "Kids_Needs",
            "Service",
            "Fuel",
            "Personal_Care_Expenses",
            "Dairy",
            "Junk_Food",
            "Grocery",
            "Other",
          ]}
          color="orange"
        />
      </Suspense>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
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
