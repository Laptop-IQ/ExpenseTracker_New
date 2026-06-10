/* eslint-disable no-unused-vars */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  Download,
  Eye,
  EyeOff,
  Calendar,
  TrendingUp,
  BarChart2,
  IndianRupee,
  Trash2,
  Check,
  AlertCircle,
  Zap,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  SlidersHorizontal,
  Flame,
  Sparkles,
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
import { exportToExcel } from "../utils/exportUtils";
import AddTransactionModal from "../components/Add";
import TransactionItem from "../components/TransactionItem";
import TimeFrameSelector from "../components/TimeFrame";
import { getTimeFrameRange, generateChartPoints } from "../components/Helpers";
import { CATEGORY_ICONS_Inc } from "../assets/color";

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
  Salary: "#10b981",
  Extra_Income: "#3b82f6",
  Freelance: "#8b5cf6",
  Side_Hustles: "#f59e0b",
};

const BAR_COLORS = [
  "#10b981",
  "#34d399",
  "#059669",
  "#6ee7b7",
  "#a7f3d0",
  "#d1fae5",
];

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
            <Zap size={15} className="text-green-400 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "#10b981" }) {
  return (
    <div className="relative bg-white rounded-2xl p-5 overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent }}
      />
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-emerald-500">
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

// ─── Delete Modal ──────────────────────────────────────────────────────────────
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
          Delete this income?
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
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 active:scale-95 transition shadow-md disabled:opacity-60"
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
  { value: "Salary", label: "Salary" },
  { value: "Extra_Income", label: "Extra Income" },
  { value: "Freelance", label: "Freelance" },
  { value: "Side_Hustles", label: "Side Hustles" },
];

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
        className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200
                   px-4 py-2.5 rounded-xl hover:border-emerald-300 hover:text-emerald-600 transition-colors"
      >
        <SlidersHorizontal size={15} />
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-20 animate-[fadeIn_0.12s_ease-out]">
          <div className="max-h-64 overflow-y-auto py-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${value === opt.value ? "bg-emerald-50 text-emerald-600 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {CATEGORY_COLOR[opt.value] && (
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
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

// ─── Income Breakdown ──────────────────────────────────────────────────────────
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

  if (!breakdown.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-emerald-400" />
        Income sources
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
const Income = () => {
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
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "income",
    category: "Salary",
  });
  const [editForm, setEditForm] = useState({
    description: "",
    amount: "",
    category: "Salary",
    date: new Date().toISOString().split("T")[0],
  });
  const [overview, setOverview] = useState({
    totalIncome: 0,
    averageIncome: 0,
    numberOfTransactions: 0,
    recentTransactions: [],
    range: "monthly",
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
    () => getTimeFrameRange(timeFrame, null),
    [timeFrame],
  );
  const chartPoints = useMemo(
    () => generateChartPoints(timeFrame, timeFrameRange),
    [timeFrame, timeFrameRange],
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

  const totalIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, t) => sum + Math.round(Number(t.amount || 0)),
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
        (max, t) => Math.max(max, Number(t.amount || 0)),
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

  const fetchOverview = useCallback(
    async (range = timeFrame ?? "monthly") => {
      try {
        const res = await axios.get(`${API_BASE}/income/overview`, {
          headers: getAuthHeaders(),
          params: { range },
        });
        if (res.data?.success) {
          const p = res.data.data ?? {};
          setOverview({
            totalIncome: p.totalIncome ?? 0,
            averageIncome: p.averageIncome ?? 0,
            numberOfTransactions: p.numberOfTransactions ?? 0,
            recentTransactions: p.recentTransactions ?? [],
            range: p.range ?? range,
          });
        }
      } catch (err) {
        console.error("Overview fetch failed:", err);
      }
    },
    [timeFrame, getAuthHeaders],
  );

  useEffect(() => {
    fetchOverview(timeFrame);
  }, [fetchOverview, timeFrame]);

  // ── Add income (instant, non-blocking) ────────────────────────────────────
  const handleAddTransaction = useCallback(async () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    const payload = {
      description: newTransaction.description.trim(),
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      date: toIsoWithClientTime(newTransaction.date),
    };
    const tempId = `temp-${Date.now()}`;

    // Instant UI update
    setOverview((prev) => ({
      ...prev,
      totalIncome: prev.totalIncome + payload.amount,
      numberOfTransactions: prev.numberOfTransactions + 1,
      recentTransactions: [
        { id: tempId, ...payload, type: "income" },
        ...prev.recentTransactions,
      ],
    }));
    setShowModal(false);
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "income",
      category: "Salary",
    });
    addToast("Income added!", "success");

    // Background API
    try {
      await axios.post(`${API_BASE}/income/add`, payload, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      refreshTransactions();
      fetchOverview(timeFrame);
    } catch (err) {
      setOverview((prev) => ({
        ...prev,
        totalIncome: prev.totalIncome - payload.amount,
        numberOfTransactions: prev.numberOfTransactions - 1,
        recentTransactions: prev.recentTransactions.filter(
          (t) => t.id !== tempId,
        ),
      }));
      addToast(
        err?.response?.data?.message || "Failed to save income.",
        "error",
      );
    }
  }, [
    newTransaction,
    getAuthHeaders,
    refreshTransactions,
    fetchOverview,
    timeFrame,
    addToast,
  ]);

  // ── Edit income ────────────────────────────────────────────────────────────
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
      addToast("Income updated!", "success");
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

  // ── Delete income ──────────────────────────────────────────────────────────
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
      fetchOverview(timeFrame);
    } catch (err) {
      addToast(err?.response?.data?.message || "Delete failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
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
          Type: "Income",
        }));
        exportToExcel(
          exportData,
          `income_${new Date().toISOString().slice(0, 10)}`,
        );
        addToast("Exported!", "success");
      } catch {
        addToast("Export failed.", "error");
      }
    }
  }, [getAuthHeaders, filteredTransactions, addToast]);

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
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500" />
          <div className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest">
                    Income
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Income Tracker
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
                             bg-gradient-to-r from-emerald-500 to-teal-500
                             px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-600
                             active:scale-95 transition-all shadow-md shadow-emerald-200"
                >
                  <Plus size={16} />
                  Add Income
                </button>
              </div>
            </div>
            <div className="mt-5">
              <TimeFrameSelector
                timeFrame={timeFrame}
                setTimeFrame={setTimeFrame}
                options={["daily", "weekly", "monthly", "yearly"]}
                color="teal"
              />
            </div>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Income"
            value={fmtINR(totalIncome)}
            sub={timeFrameRange.label}
            accent="#10b981"
          />
          <StatCard
            label="Avg per Transaction"
            value={fmtINR(averageIncome)}
            sub={`${filteredTransactions.length} transactions`}
            accent="#3b82f6"
          />
          <StatCard
            label="Highest Single"
            value={fmtINR(highestIncome)}
            sub="biggest income"
            accent="#8b5cf6"
          />
          <StatCard
            label="Total Count"
            value={filteredTransactions.length}
            sub={filter === "all" ? "all records" : "filtered"}
            accent="#f59e0b"
          />
        </div>

        {/* ── Chart + Breakdown ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart2 size={16} className="text-emerald-400" />
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
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
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
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#f0fdf4", radius: 6 }}
                  />
                  <Bar dataKey="income" radius={[6, 6, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                  {chartData.map((point, i) =>
                    point.isCurrent ? (
                      <ReferenceLine
                        key={i}
                        x={point.label}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        strokeOpacity={0.6}
                      />
                    ) : null,
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <IncomeBreakdown transactions={filteredTransactions} />
        </div>

        {/* ── Transactions List ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <IndianRupee size={15} className="text-emerald-400" />
              Transactions
              <span className="bg-emerald-50 text-emerald-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            </h3>
            <div className="flex items-center gap-2">
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
                             focus:border-emerald-300 focus:bg-white placeholder-gray-400"
                />
              </div>
              <FilterDropdown value={filter} onChange={setFilter} />
            </div>
          </div>

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
                  type="income"
                  categoryIcons={CATEGORY_ICONS_Inc}
                  setEditingId={setEditingId}
                  containerClass="px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                  amountClass="font-semibold text-emerald-500"
                  iconClass="text-emerald-400"
                />
              ))}

            {!showAll && filteredTransactions.length > 8 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-4 text-sm text-emerald-500 font-medium
                           hover:bg-emerald-50/60 transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={15} />
                View all {filteredTransactions.length} transactions
              </button>
            )}
            {showAll && filteredTransactions.length > 8 && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full py-4 text-sm text-gray-400 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <EyeOff size={15} />
                Show less
              </button>
            )}

            {filteredTransactions.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <IndianRupee size={24} className="text-emerald-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">
                  No income found
                </p>
                <p className="text-gray-400 text-xs text-center max-w-xs">
                  {filter === "all" && !search
                    ? "You haven't recorded any income yet."
                    : `No results for current filter${search ? ` and "${search}"` : ""}.`}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-1 flex items-center gap-2 text-sm font-semibold text-white
                             bg-gradient-to-r from-emerald-500 to-teal-500
                             px-5 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-200"
                >
                  <Plus size={15} />
                  Add your first income
                </button>
              </div>
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
        type="income"
        title="Add New Income"
        buttonText="Add Income"
        categories={["Salary", "Extra_Income", "Freelance", "Side_Hustles"]}
        color="teal"
      />

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

export default Income;
