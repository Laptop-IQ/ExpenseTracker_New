import React, { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Utensils,
  Home,
  Car,
  ShoppingCart,
  Gift,
  Zap,
  ArrowUp,
  PiggyBank,
  Banknote,
  Briefcase,
  TrendingUp,
  Fuel,
  Scissors,
  Baby,
  Shield,
  Milk,
  Wrench,
  Wallet,
  Coins,
  ShoppingBasket,
  Cookie,
  HeartPulse,
  IndianRupee,
  ArrowDown,
  Clock,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  PieChart,
  ArrowUpRight,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

/* ─────────────────────────────────────────────────────────────────────────────
   Global styles — dark premium theme
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  body {
    background: #0A0A0F;
    color: #F0F0FF;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes glow-breathe {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.65; }
  }

  @keyframes spin-slow {
    to { transform: rotate(360deg); }
  }

  /* ── Premium dark card ───────────────────────────────────────────────────── */
  .dk-card {
    position: relative;
    background: #111118;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    animation: fade-up 0.38s cubic-bezier(0.22,1,0.36,1) both;
    transition: border-color 0.25s ease, transform 0.22s ease;
    overflow: hidden;
  }

  .dk-card:hover {
    border-color: rgba(124,92,252,0.30);
    transform: translateY(-2px);
  }

  /* Ambient glow layer behind card content */
  .dk-card .glow-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity 0.35s ease;
    animation: glow-breathe 4s ease-in-out infinite;
  }
  .dk-card:hover .glow-layer { opacity: 1; }

  .dk-card .card-content { position: relative; z-index: 1; }

  /* Staggered entrance delays */
  .dk-card:nth-child(1) { animation-delay: 0.05s; }
  .dk-card:nth-child(2) { animation-delay: 0.10s; }
  .dk-card:nth-child(3) { animation-delay: 0.15s; }
  .dk-card:nth-child(4) { animation-delay: 0.20s; }

  /* ── Stat card accent glow ───────────────────────────────────────────────── */
  .glow-indigo { background: radial-gradient(ellipse at 50% 110%, rgba(124,92,252,0.28) 0%, transparent 70%); }
  .glow-green  { background: radial-gradient(ellipse at 50% 110%, rgba(46,204,143,0.22) 0%, transparent 70%); }
  .glow-red    { background: radial-gradient(ellipse at 50% 110%, rgba(255,94,94,0.22) 0%, transparent 70%); }
  .glow-blue   { background: radial-gradient(ellipse at 50% 110%, rgba(96,165,250,0.22) 0%, transparent 70%); }

  /* ── Progress bar ────────────────────────────────────────────────────────── */
  .progress-track {
    height: 4px;
    background: rgba(255,255,255,0.07);
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #7C5CFC, #A78BFA);
    transition: width 0.7s cubic-bezier(0.22,1,0.36,1);
  }

  /* ── Pill toggle ─────────────────────────────────────────────────────────── */
  .pill-toggle {
    display: flex;
    background: #1C1C28;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
  }
  .pill-toggle button {
    padding: 5px 12px;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    border: none;
    transition: background 0.18s ease, color 0.18s ease;
    color: rgba(240,240,255,0.45);
    background: transparent;
  }
  .pill-toggle button.active {
    background: #7C5CFC;
    color: #fff;
    box-shadow: 0 2px 12px rgba(124,92,252,0.4);
  }

  /* ── Modal overlay ───────────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    animation: fade-up 0.22s ease both;
  }
  .modal-box {
    background: #14141E;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%; max-width: 440px;
    padding: 28px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.7);
  }

  /* ── Form inputs (modal) ─────────────────────────────────────────────────── */
  .dk-input {
    width: 100%;
    background: #1C1C28;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #F0F0FF;
    outline: none;
    transition: border-color 0.2s ease;
    font-family: inherit;
  }
  .dk-input:focus { border-color: rgba(124,92,252,0.6); }
  .dk-input::placeholder { color: rgba(240,240,255,0.3); }
  .dk-select { appearance: none; cursor: pointer; }

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 1100;
    background: #1C1C28;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 18px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 500;
    animation: fade-up 0.25s ease both;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  /* ── Scrollbar ───────────────────────────────────────────────────────────── */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(124,92,252,0.3); border-radius: 99px; }

  /* ── Section divider ─────────────────────────────────────────────────────── */
  .dk-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }

  /* ── Tabular nums for money ──────────────────────────────────────────────── */
  .mono { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("__dk-layout-styles__")
) {
  const tag = document.createElement("style");
  tag.id = "__dk-layout-styles__";
  tag.textContent = GLOBAL_STYLES;
  document.head.appendChild(tag);
}

/* ─────────────────────────────────────────────────────────────────────────── */

export const CATEGORY_ICONS = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,
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
  Savings: <PiggyBank className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,
};

const INCOME_CATEGORIES = [
  "Salary",
  "Extra_Income",
  "Freelance",
  "Investment",
  "Side_Hustles",
];
const EXPENSE_CATEGORIES = [
  "Food",
  "Grocery",
  "Dairy",
  "Junk_Food",
  "Housing",
  "Transport",
  "Fuel",
  "Utilities",
  "Healthcare",
  "Service",
  "Personal_Care_Expenses",
  "Kids_Needs",
  "Shopping",
  "Entertainment",
  "Savings",
  "Annual_Expense",
];

/* ─────────────────────────────────────────────────────────────────────────── 
   Custom hook — all transaction logic lives here
───────────────────────────────────────────────────────────────────────────── */
function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const safeArray = (res) => {
    const body = res?.data;
    if (!body) return [];
    if (Array.isArray(body)) return body;
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.incomes)) return body.incomes;
    if (Array.isArray(body.expenses)) return body.expenses;
    return [];
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getHeaders();
      const [incomeRes, expenseRes] = await Promise.all([
        axios.get(`${API_BASE}/income/get`, { headers }),
        axios.get(`${API_BASE}/expense/get`, { headers }),
      ]);
      const incomes = safeArray(incomeRes).map((i) => ({
        ...i,
        type: "income",
      }));
      const expenses = safeArray(expenseRes).map((e) => ({
        ...e,
        type: "expense",
      }));
      const all = [...incomes, ...expenses]
        .map((t) => ({
          id: t._id || t.id || Math.random().toString(36).slice(2),
          description: t.description || t.title || t.note || "",
          amount: t.amount != null ? Number(t.amount) : Number(t.value) || 0,
          date: t.date || t.createdAt || new Date().toISOString(),
          category: t.category || "Other",
          type: t.type,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(all);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(
        "Failed to fetch transactions",
        err?.response || err.message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(
    async (transaction) => {
      const headers = getHeaders();
      const endpoint =
        transaction.type === "income" ? "income/add" : "expense/add";
      await axios.post(`${API_BASE}/${endpoint}`, transaction, { headers });
      await fetchTransactions();
    },
    [fetchTransactions],
  );

  const editTransaction = useCallback(
    async (id, transaction) => {
      const headers = getHeaders();
      const endpoint =
        transaction.type === "income" ? "income/update" : "expense/update";
      await axios.put(`${API_BASE}/${endpoint}/${id}`, transaction, {
        headers,
      });
      await fetchTransactions();
    },
    [fetchTransactions],
  );

  const deleteTransaction = useCallback(
    async (id, type) => {
      const headers = getHeaders();
      const endpoint = type === "income" ? "income/delete" : "expense/delete";
      await axios.delete(`${API_BASE}/${endpoint}/${id}`, { headers });
      await fetchTransactions();
    },
    [fetchTransactions],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    lastUpdated,
    fetchTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Filter helper
───────────────────────────────────────────────────────────────────────────── */
function filterTransactions(transactions, frame) {
  const now = new Date();
  const today = new Date(now).setHours(0, 0, 0, 0);
  switch (frame) {
    case "daily":
      return transactions.filter((t) => new Date(t.date) >= today);
    case "weekly": {
      const sow = new Date(today);
      sow.setDate(sow.getDate() - sow.getDay());
      return transactions.filter((t) => new Date(t.date) >= sow);
    }
    case "monthly":
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    case "yearly":
      return transactions.filter(
        (t) => new Date(t.date).getFullYear() === now.getFullYear(),
      );
    default:
      return transactions;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Stats calculator
───────────────────────────────────────────────────────────────────────────── */
function calcStats(transactions) {
  const now = new Date();
  const s0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const e0 = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const s1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const e1 = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMo = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= s0 && d < e0;
  });
  const lastMo = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= s1 && d < e1;
  });

  const sum = (arr, type) =>
    arr
      .filter((t) => t.type === type)
      .reduce((s, t) => s + Number(t.amount), 0);

  const thisIncome = sum(thisMo, "income");
  const lastIncome = sum(lastMo, "income");
  const thisExpenses = sum(thisMo, "expense");
  const lastExpenses = sum(lastMo, "expense");

  const pctChange = (cur, prev) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const allIncome = sum(transactions, "income");
  const allExpenses = sum(transactions, "expense");
  const savingsRate =
    thisIncome > 0
      ? Math.round(((thisIncome - thisExpenses) / thisIncome) * 100)
      : 0;

  return {
    thisIncome,
    thisExpenses,
    thisSavings: thisIncome - thisExpenses,
    allIncome,
    allExpenses,
    allSavings: allIncome - allExpenses,
    incomeChange: pctChange(thisIncome, lastIncome),
    expenseChange: pctChange(thisExpenses, lastExpenses),
    savingsRate,
    total: transactions.length,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Sparkline bar chart — pure SVG, no dependencies
───────────────────────────────────────────────────────────────────────────── */
function SparkChart({ transactions }) {
  const bars = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const next = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      const slice = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= m && d < next;
      });
      const income = slice
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);
      const expense = slice
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);
      const label = m.toLocaleString("en-IN", { month: "short" });
      return { label, income, expense, month: m };
    });
  }, [transactions]);

  const maxVal = Math.max(...bars.flatMap((b) => [b.income, b.expense]), 1);
  const H = 80,
    W = 280,
    BAR_W = 14,
    GAP = 4;
  const slotW = W / bars.length;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H + 20}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C5CFC" />
          <stop offset="100%" stopColor="#5B3FD4" />
        </linearGradient>
        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5E5E" />
          <stop offset="100%" stopColor="#CC3A3A" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => {
        const cx = slotW * i + slotW / 2;
        const incH = (b.income / maxVal) * H;
        const expH = (b.expense / maxVal) * H;
        const isLast = i === bars.length - 1;
        return (
          <g key={i}>
            {/* Income bar */}
            <rect
              x={cx - BAR_W - GAP / 2}
              y={H - incH}
              width={BAR_W}
              height={incH || 2}
              rx={3}
              fill={isLast ? "url(#incomeGrad)" : "rgba(124,92,252,0.35)"}
            />
            {/* Expense bar */}
            <rect
              x={cx + GAP / 2}
              y={H - expH}
              width={BAR_W}
              height={expH || 2}
              rx={3}
              fill={isLast ? "url(#expenseGrad)" : "rgba(255,94,94,0.35)"}
            />
            {/* Label */}
            <text
              x={cx}
              y={H + 14}
              textAnchor="middle"
              fontSize="9"
              fill={isLast ? "rgba(240,240,255,0.8)" : "rgba(240,240,255,0.35)"}
              fontFamily="Inter,sans-serif"
              fontWeight={isLast ? "600" : "400"}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Add Transaction Modal
───────────────────────────────────────────────────────────────────────────── */
function AddTransactionModal({ onClose, onAdd }) {
  const [type, setType] = useState("expense");
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handle = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.description.trim() || !form.amount || !form.category) {
      setErr("Please fill in all fields.");
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    try {
      setSaving(true);
      setErr("");
      await onAdd({ ...form, amount: Number(form.amount), type });
      onClose(true);
    } catch {
      setErr("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div className="modal-box">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#F0F0FF",
              margin: 0,
            }}
          >
            Add Transaction
          </h2>
          <button
            onClick={() => onClose(false)}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "rgba(240,240,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setForm((f) => ({ ...f, category: "" }));
              }}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background:
                  type === t
                    ? t === "income"
                      ? "rgba(46,204,143,0.18)"
                      : "rgba(255,94,94,0.18)"
                    : "rgba(255,255,255,0.05)",
                color:
                  type === t
                    ? t === "income"
                      ? "#2ECC8F"
                      : "#FF5E5E"
                    : "rgba(240,240,255,0.35)",
                boxShadow:
                  type === t
                    ? `0 0 0 1px ${t === "income" ? "rgba(46,204,143,0.35)" : "rgba(255,94,94,0.35)"}`
                    : "none",
              }}
            >
              {t === "income" ? "↑ Income" : "↓ Expense"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="dk-input"
            placeholder="Description"
            value={form.description}
            onChange={handle("description")}
          />
          <input
            className="dk-input mono"
            placeholder="Amount (₹)"
            type="number"
            min="0"
            value={form.amount}
            onChange={handle("amount")}
          />
          <select
            className="dk-input dk-select"
            value={form.category}
            onChange={handle("category")}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            className="dk-input"
            type="date"
            value={form.date}
            onChange={handle("date")}
          />
        </div>

        {err && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#FF5E5E" }}>{err}</p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg,#7C5CFC,#5B3FD4)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(124,92,252,0.4)",
            opacity: saving ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "Saving..." : "Save Transaction"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Toast notification
───────────────────────────────────────────────────────────────────────────── */
function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast">
      {type === "success" ? (
        <CheckCircle size={16} style={{ color: "#2ECC8F", flexShrink: 0 }} />
      ) : (
        <AlertCircle size={16} style={{ color: "#FF5E5E", flexShrink: 0 }} />
      )}
      <span style={{ color: "rgba(240,240,255,0.85)" }}>{message}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Stat Card
───────────────────────────────────────────────────────────────────────────── */
const ACCENT = {
  indigo: {
    glow: "glow-indigo",
    icon: "rgba(124,92,252,0.15)",
    iconColor: "#A78BFA",
    badge: "rgba(124,92,252,0.18)",
    badgeText: "#C4B5FD",
  },
  green: {
    glow: "glow-green",
    icon: "rgba(46,204,143,0.15)",
    iconColor: "#2ECC8F",
    badge: "rgba(46,204,143,0.15)",
    badgeText: "#6EE7B7",
  },
  red: {
    glow: "glow-red",
    icon: "rgba(255,94,94,0.15)",
    iconColor: "#FF7F7F",
    badge: "rgba(255,94,94,0.15)",
    badgeText: "#FCA5A5",
  },
  blue: {
    glow: "glow-blue",
    icon: "rgba(96,165,250,0.15)",
    iconColor: "#93C5FD",
    badge: "rgba(96,165,250,0.15)",
    badgeText: "#BFDBFE",
  },
};

function StatCard({ title, value, footer, badge, icon, accent, delay = 0 }) {
  const a = ACCENT[accent] || ACCENT.indigo;
  return (
    <div className="dk-card" style={{ animationDelay: `${delay}s` }}>
      <div className={`glow-layer ${a.glow}`} />
      <div className="card-content" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: a.icon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(icon, { size: 17, color: a.iconColor })}
          </div>
          {badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 6,
                background: a.badge,
                color: a.badgeText,
                letterSpacing: "0.04em",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(240,240,255,0.35)",
            margin: "0 0 4px",
          }}
        >
          {title}
        </p>
        <p
          className="mono"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#F0F0FF",
            margin: "0 0 6px",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {footer && (
          <p
            style={{ fontSize: 11, color: "rgba(240,240,255,0.35)", margin: 0 }}
          >
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Panel Card
───────────────────────────────────────────────────────────────────────────── */
function PanelCard({ children, style = {}, delay = 0 }) {
  return (
    <div className="dk-card" style={{ animationDelay: `${delay}s`, ...style }}>
      <div className="card-content">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Panel Header utility
───────────────────────────────────────────────────────────────────────────── */
function PanelHeader({ icon, title, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {React.cloneElement(icon, { size: 15, color: "#7C5CFC" })}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(240,240,255,0.85)",
          }}
        >
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── 
   Main Layout
───────────────────────────────────────────────────────────────────────────── */
const Layout = ({ onLogout, user }) => {
  const navigate = useNavigate();
  const {
    transactions,
    loading,
    lastUpdated,
    fetchTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
  } = useTransactions();

  const [timeFrame, setTimeFrame] = useState("monthly");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, timeFrame),
    [transactions, timeFrame],
  );
  const stats = useMemo(() => calcStats(transactions), [transactions]);

  const timeFrameLabels = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
    yearly: "This Year",
  };

  const topCategories = useMemo(
    () =>
      Object.entries(
        transactions
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
          }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    [transactions],
  );

  const displayedTx = showAllTx ? transactions : transactions.slice(0, 5);

  const handleAddClose = async (saved) => {
    setShowModal(false);
    if (saved) setToast({ message: "Transaction added!", type: "success" });
  };

  const handleAdd = async (t) => {
    await addTransaction(t);
  };

  const outletContext = {
    transactions: filteredTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
    timeFrame,
    setTimeFrame,
    lastUpdated,
  };

  const mainPadding = sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[250px]";

  const fmt = (n) =>
    `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const sign = (n) => (n >= 0 ? "+" : "") + n + "%";

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Sidebar
        user={user}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {showModal && (
        <AddTransactionModal onClose={handleAddClose} onAdd={handleAdd} />
      )}
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}

      <main className={`pt-16 ${mainPadding} transition-all duration-300`}>
        <div
          style={{
            padding: "28px 24px 48px",
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
         

          {/* ── Stat cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              title="Net Balance"
              value={fmt(stats.allSavings)}
              badge={sign(stats.incomeChange)}
              footer="all time"
              icon={<IndianRupee />}
              accent="indigo"
              delay={0.05}
            />
            <StatCard
              title="Income"
              value={fmt(stats.thisIncome)}
              badge={sign(stats.incomeChange)}
              footer={timeFrameLabels[timeFrame]}
              icon={<ArrowUp />}
              accent="green"
              delay={0.1}
            />
            <StatCard
              title="Expenses"
              value={fmt(stats.thisExpenses)}
              badge={sign(stats.expenseChange)}
              footer={timeFrameLabels[timeFrame]}
              icon={<ArrowDown />}
              accent="red"
              delay={0.15}
            />
            <StatCard
              title="Saved"
              value={fmt(stats.thisSavings)}
              badge={`${stats.savingsRate}% rate`}
              footer={timeFrameLabels[timeFrame]}
              icon={<PiggyBank />}
              accent="blue"
              delay={0.2}
            />
          </div>

          {/* ── Main grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Left col */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Money Flow / Outlet */}
              <PanelCard delay={0.25}>
                <PanelHeader
                  icon={<TrendingUp />}
                  title="Money Flow"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "rgba(240,240,255,0.4)",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#7C5CFC",
                            display: "inline-block",
                          }}
                        />
                        Income
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "rgba(240,240,255,0.4)",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#FF5E5E",
                            display: "inline-block",
                          }}
                        />
                        Expense
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 7,
                          background: "rgba(255,255,255,0.05)",
                          color: "rgba(240,240,255,0.4)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        {timeFrameLabels[timeFrame]}
                      </span>
                    </div>
                  }
                />
                <div style={{ padding: 20 }}>
                  <Outlet context={outletContext} />
                </div>
              </PanelCard>

            </div>

            {/* Right col */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Budget / top categories */}
              <PanelCard delay={0.28}>
                <PanelHeader
                  icon={<PieChart />}
                  title="Top Spending"
                  right={
                    <button
                      onClick={() => navigate("/transactions")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 11,
                        color: "rgba(124,92,252,0.8)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      See all <ArrowUpRight size={12} />
                    </button>
                  }
                />
                <div style={{ padding: "14px 18px" }}>
                  {topCategories.length === 0 ? (
                    <div
                      style={{
                        padding: "28px 0",
                        textAlign: "center",
                        fontSize: 13,
                        color: "rgba(240,240,255,0.3)",
                      }}
                    >
                      No spending data yet
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {topCategories.map(([cat, amount]) => {
                        const total = topCategories.reduce(
                          (s, [, a]) => s + a,
                          0,
                        );
                        const pct =
                          total > 0 ? Math.round((amount / total) * 100) : 0;
                        return (
                          <div key={cat}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  fontSize: 12,
                                  color: "rgba(240,240,255,0.7)",
                                  fontWeight: 500,
                                }}
                              >
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 7,
                                    background: "rgba(124,92,252,0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#A78BFA",
                                    flexShrink: 0,
                                  }}
                                >
                                  {CATEGORY_ICONS[cat] || (
                                    <IndianRupee size={12} />
                                  )}
                                </span>
                                {cat?.replace(/_/g, " ")}
                              </span>
                              <span
                                className="mono"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "rgba(240,240,255,0.65)",
                                }}
                              >
                                {fmt(amount)}
                              </span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(46,204,143,0.08)",
                        border: "1px solid rgba(46,204,143,0.15)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "rgba(46,204,143,0.6)",
                          margin: "0 0 3px",
                        }}
                      >
                        Income
                      </p>
                      <p
                        className="mono"
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#2ECC8F",
                          margin: 0,
                        }}
                      >
                        {fmt(stats.allIncome)}
                      </p>
                    </div>
                    <div
                      style={{
                        background: "rgba(255,94,94,0.08)",
                        border: "1px solid rgba(255,94,94,0.15)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "rgba(255,94,94,0.6)",
                          margin: "0 0 3px",
                        }}
                      >
                        Expense
                      </p>
                      <p
                        className="mono"
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#FF5E5E",
                          margin: 0,
                        }}
                      >
                        {fmt(stats.allExpenses)}
                      </p>
                    </div>
                  </div>
                </div>
              </PanelCard>

              {/* Recent Transactions */}
              <PanelCard delay={0.33}>
                <PanelHeader
                  icon={<Clock />}
                  title="Recent Transactions"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(240,240,255,0.35)",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <RefreshCw
                          size={12}
                          className={loading ? "animate-spin" : ""}
                        />
                      </button>
                      <button
                        onClick={() => navigate("/transactions")}
                        style={{
                          fontSize: 11,
                          color: "rgba(124,92,252,0.8)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        See all <ArrowUpRight size={12} />
                      </button>
                    </div>
                  }
                />

                {/* Column labels */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.2fr 1fr",
                    padding: "8px 18px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {["Date", "Amount", "Name", "Category"].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "rgba(240,240,255,0.25)",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div>
                  {displayedTx.length === 0 ? (
                    <div style={{ padding: "32px 0", textAlign: "center" }}>
                      <Clock
                        size={28}
                        style={{
                          color: "rgba(240,240,255,0.1)",
                          marginBottom: 8,
                        }}
                      />
                      <p
                        style={{
                          fontSize: 13,
                          color: "rgba(240,240,255,0.3)",
                          margin: 0,
                        }}
                      >
                        No transactions yet
                      </p>
                      <button
                        onClick={() => setShowModal(true)}
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: "#7C5CFC",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        + Add one
                      </button>
                    </div>
                  ) : (
                    displayedTx.map(
                      ({ id, type, category, description, date, amount }) => (
                        <div
                          key={id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1.2fr 1fr",
                            alignItems: "center",
                            padding: "11px 18px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(124,92,252,0.05)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(240,240,255,0.35)",
                            }}
                          >
                            {new Date(date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: type === "income" ? "#2ECC8F" : "#FF5E5E",
                            }}
                          >
                            {type === "income" ? "+" : "−"}
                            {fmt(amount).slice(1)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: "rgba(240,240,255,0.7)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {description || "—"}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: "rgba(124,92,252,0.12)",
                              color: "#A78BFA",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 80,
                            }}
                          >
                            {category?.replace(/_/g, " ")}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>

                {transactions.length > 5 && (
                  <button
                    onClick={() => setShowAllTx((p) => !p)}
                    style={{
                      width: "100%",
                      padding: "11px 0",
                      background: "none",
                      border: "none",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      color: "rgba(124,92,252,0.7)",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(124,92,252,0.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    {showAllTx ? (
                      <>
                        <ChevronUp size={14} /> Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} /> View all (
                        {transactions.length})
                      </>
                    )}
                  </button>
                )}
              </PanelCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
