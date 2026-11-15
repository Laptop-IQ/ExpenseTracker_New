import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Plus,
  Baby,
  Banknote,
  Briefcase,
  Car,
  CheckCircle,
  Coins,
  Cookie,
  Fuel,
  Gift,
  HeartPulse,
  Home,
  IndianRupee,
  Milk,
  PieChart,
  PiggyBank,
  RefreshCw,
  Scissors,
  ShoppingBasket,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  X,
  Zap,
  CalendarDays,
  ReceiptText,
  TrendingDown,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import Sidebar from "./Sidebar";
import CoinLoader, { CoinLoaderBlock } from "./common/CoinLoader";
import { useCreatePeriod } from "../utils/usePeriod";
import {
  getLocalDateInputValue,
  getPeriodBounds,
  resolvePeriodRange,
  toIsoWithClientTime,
} from "../utils/commonHelpers";
import { isValidDate } from "../utils/commonUtils";
import AddTransactionModal from "../components/Add";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

/* ============================================================================
   CATEGORIES
============================================================================ */

const CATEGORY_ICONS = {
  Salary: <Wallet />,
  Extra_Income: <Banknote />,
  Freelance: <Briefcase />,
  Investment: <TrendingUp />,
  Side_Hustles: <Coins />,

  Food: <Utensils />,
  Grocery: <ShoppingBasket />,
  Dairy: <Milk />,
  Junk_Food: <Cookie />,
  Housing: <Home />,
  Transport: <Car />,
  Fuel: <Fuel />,
  Utilities: <Zap />,
  Healthcare: <HeartPulse />,
  Service: <Wrench />,
  Personal_Care_Expenses: <Scissors />,
  Kids_Needs: <Baby />,
  Shopping: <ShoppingCart />,
  Entertainment: <Gift />,
  Savings: <PiggyBank />,
  Annual_Expense: <PieChart />,
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

/* ============================================================================
   HELPERS
============================================================================ */

const getDefaultTransaction = (type = "income") => ({
  type,
  description: "",
  amount: "",
  date: getLocalDateInputValue(),
  category: type === "income" ? "Salary" : "Food",
});

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatCategory = (category) =>
  String(category || "Other").replace(/_/g, " ");

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const safeArray = (response) => {
  const body = response?.data;

  if (!body) return [];

  if (Array.isArray(body)) return body;

  if (Array.isArray(body.data)) return body.data;

  if (Array.isArray(body.incomes)) return body.incomes;

  if (Array.isArray(body.expenses)) return body.expenses;

  return [];
};

/* ============================================================================
   TRANSACTION NORMALIZER
============================================================================ */

const normalizeTransaction = (transaction, type) => ({
  id:
    transaction?._id ||
    transaction?.id ||
    `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,

  description:
    transaction?.description || transaction?.title || transaction?.note || "",

  amount:
    transaction?.amount != null
      ? Number(transaction.amount)
      : Number(transaction?.value) || 0,

  date: transaction?.date || transaction?.createdAt || new Date().toISOString(),

  category: transaction?.category || "Other",

  type,
});

/* ============================================================================
   LOCAL CACHE + OFFLINE QUEUE
   - Last known server data is cached per user, so the app paints instantly.
   - New transactions are shown immediately (optimistic) and posted in the
     background. If the server is still waking up / offline, they stay queued
     (saved in localStorage) and are merged with server data once connected.
============================================================================ */

const getUserKey = () => {
  try {
    const raw =
      localStorage.getItem("user") || sessionStorage.getItem("user") || "null";
    const u = JSON.parse(raw);
    return u?._id || u?.id || u?.email || "anon";
  } catch {
    return "anon";
  }
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked - cache is best effort */
  }
};

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

/* ============================================================================
   TRANSACTION HOOK
============================================================================ */

function useTransactions() {
  const cacheKey = useMemo(() => `fintrack:tx:v1:${getUserKey()}`, []);
  const pendingKey = useMemo(() => `fintrack:pending:v1:${getUserKey()}`, []);

  // Paint from cache immediately - no blocking loader on repeat visits.
  const [initialCache] = useState(() => readJSON(cacheKey, null));

  const [serverTx, setServerTx] = useState(() => initialCache?.items || []);
  const [pending, setPending] = useState(() => readJSON(pendingKey, []));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(() => !!initialCache);
  const [lastUpdated, setLastUpdated] = useState(
    () => (initialCache?.ts ? new Date(initialCache.ts) : new Date()),
  );
  const [syncError, setSyncError] = useState(null);

  const pendingRef = useRef(pending);
  const flushRef = useRef(null);
  const pullSeq = useRef(0);

  const updatePending = useCallback(
    (updater) => {
      const next = updater(pendingRef.current);
      pendingRef.current = next;
      writeJSON(pendingKey, next);
      setPending(next);
    },
    [pendingKey],
  );

  // server data + not-yet-synced items, newest first
  const transactions = useMemo(
    () => [...pending.map((p) => p.tx), ...serverTx].sort(byDateDesc),
    [pending, serverTx],
  );

  /* ---- background pull (server -> local) ---- */
  const pull = useCallback(async () => {
    if (!API_BASE) {
      setLoaded(true);
      return [];
    }

    const seq = ++pullSeq.current;

    try {
      setLoading(true);

      const headers = getAuthHeaders();

      const [incomeResponse, expenseResponse] = await Promise.all([
        axios.get(`${API_BASE}/income/get`, { headers, timeout: 60000 }),
        axios.get(`${API_BASE}/expense/get`, { headers, timeout: 60000 }),
      ]);

      const incomes = safeArray(incomeResponse).map((item) =>
        normalizeTransaction(item, "income"),
      );
      const expenses = safeArray(expenseResponse).map((item) =>
        normalizeTransaction(item, "expense"),
      );

      const merged = [...incomes, ...expenses].sort(byDateDesc);

      // a newer pull already started - let that one win
      if (seq === pullSeq.current) {
        const now = new Date();
        setServerTx(merged);
        setLastUpdated(now);
        writeJSON(cacheKey, { ts: now.getTime(), items: merged });
      }

      return merged;
    } catch (error) {
      console.error(
        "Failed to fetch transactions:",
        error?.response?.data || error?.message || error,
      );
      throw error;
    } finally {
      if (seq === pullSeq.current) setLoading(false);
      setLoaded(true);
    }
  }, [cacheKey]);

  /* ---- background push (local queue -> server) ---- */
  const flushPending = useCallback(() => {
    if (flushRef.current) return flushRef.current;
    if (!API_BASE) return Promise.resolve(0);

    const run = async () => {
      let synced = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = pendingRef.current[0];
        if (!next) break;

        try {
          await axios.post(
            `${API_BASE}/${next.type === "income" ? "income/add" : "expense/add"}`,
            next.payload,
            { headers: getAuthHeaders(), timeout: 60000 },
          );

          updatePending((list) => list.filter((p) => p.tempId !== next.tempId));
          synced += 1;
        } catch (error) {
          const status = error?.response?.status;

          // No response (offline / server waking up), 5xx, 401, 408, 429:
          // keep the item queued and retry later.
          if (!status || status >= 500 || [401, 408, 429].includes(status)) {
            break;
          }

          // Server rejected the data itself (validation) - retrying is
          // pointless, so drop it and tell the user.
          updatePending((list) => list.filter((p) => p.tempId !== next.tempId));
          setSyncError({
            id: Date.now(),
            message:
              error?.response?.data?.message ||
              `Could not save "${next.payload.description}".`,
          });
        }
      }

      return synced;
    };

    flushRef.current = run().finally(() => {
      flushRef.current = null;
    });

    return flushRef.current;
  }, [updatePending]);

  /* ---- public: refresh = push queue first, then pull ---- */
  const fetchTransactions = useCallback(async () => {
    await flushPending();
    return pull();
  }, [flushPending, pull]);

  /* ---- public: instant add (optimistic) ---- */
  const queueTransaction = useCallback(
    (transaction) => {
      if (!transaction?.type) {
        throw new Error("Transaction type is required.");
      }

      const amount = Number(transaction.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const payload = { ...transaction, amount };

      const tx = {
        ...normalizeTransaction({ ...payload, id: tempId }, transaction.type),
        pending: true,
      };

      updatePending((list) => [
        ...list,
        { tempId, type: transaction.type, payload, tx },
      ]);

      // push + pull in the background; callers may await `synced` if needed
      const synced = flushPending()
        .then(() => (pendingRef.current.length === 0 ? pull() : null))
        .catch(() => null);

      return { tempId, synced };
    },
    [flushPending, pull, updatePending],
  );

  const addTransaction = useCallback(
    async (transaction) => {
      queueTransaction(transaction);
    },
    [queueTransaction],
  );

  const editTransaction = useCallback(
    async (id, transaction) => {
      if (!API_BASE) {
        throw new Error("API base URL is not configured.");
      }

      if (!id) {
        throw new Error("Transaction ID is required.");
      }

      const endpoint =
        transaction.type === "income" ? "income/update" : "expense/update";

      await axios.put(
        `${API_BASE}/${endpoint}/${id}`,
        { ...transaction, amount: Number(transaction.amount) },
        { headers: getAuthHeaders() },
      );

      await pull();
    },
    [pull],
  );

  const deleteTransaction = useCallback(
    async (id, type) => {
      if (!API_BASE) {
        throw new Error("API base URL is not configured.");
      }

      if (!id) {
        throw new Error("Transaction ID is required.");
      }

      // still only queued locally - just discard it
      if (String(id).startsWith("tmp-")) {
        updatePending((list) => list.filter((p) => p.tempId !== id));
        return;
      }

      const endpoint = type === "income" ? "income/delete" : "expense/delete";

      await axios.delete(`${API_BASE}/${endpoint}/${id}`, {
        headers: getAuthHeaders(),
      });

      await pull();
    },
    [pull, updatePending],
  );

  /* ---- initial sync + retry triggers ---- */
  useEffect(() => {
    fetchTransactions().catch(() => {});
  }, [fetchTransactions]);

  useEffect(() => {
    const retry = () => {
      fetchTransactions().catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") retry();
    };

    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchTransactions]);

  // keep retrying while something is waiting to be synced
  const hasPending = pending.length > 0;

  useEffect(() => {
    if (!hasPending) return undefined;

    const id = window.setInterval(() => {
      fetchTransactions().catch(() => {});
    }, 12000);

    return () => window.clearInterval(id);
  }, [hasPending, fetchTransactions]);

  return {
    transactions,
    loading,
    loaded,
    lastUpdated,
    pendingCount: pending.length,
    syncError,
    fetchTransactions,
    queueTransaction,
    addTransaction,
    editTransaction,
    deleteTransaction,
  };
}

/* ============================================================================
   FILTER
============================================================================ */

function filterTransactions(transactions, frame, period) {
  const now = new Date();

  // monthly / yearly / custom follow the selected period (year, month, range)
  if (frame === "monthly" || frame === "yearly" || frame === "custom") {
    const { start, end } = resolvePeriodRange({ timeFrame: frame, ...period });

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);

      return date >= start && date <= end;
    });
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  switch (frame) {
    case "daily":
      return transactions.filter(
        (transaction) => new Date(transaction.date) >= startOfToday,
      );

    case "weekly": {
      const startOfWeek = new Date(startOfToday);

      const day = startOfWeek.getDay();

      startOfWeek.setDate(startOfWeek.getDate() - day);

      return transactions.filter(
        (transaction) => new Date(transaction.date) >= startOfWeek,
      );
    }

    case "monthly":
      return transactions.filter((transaction) => {
        const date = new Date(transaction.date);

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      });

    case "yearly":
      return transactions.filter(
        (transaction) =>
          new Date(transaction.date).getFullYear() === now.getFullYear(),
      );

    default:
      return transactions;
  }
}

/* ============================================================================
   STATS
============================================================================ */

function calculateStats(transactions, timeFrame, period) {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  let currentPeriodStart;
  let previousPeriodStart;
  let nextPeriodStart;

  // monthly / yearly / custom: bounds come from the selected period
  const bounds = getPeriodBounds({ timeFrame, ...period });

  switch (bounds ? "period" : timeFrame) {
    case "period": {
      currentPeriodStart = bounds.currentStart;
      nextPeriodStart = bounds.nextStart;
      previousPeriodStart = bounds.previousStart;

      break;
    }

    case "daily": {
      currentPeriodStart = startOfToday;

      nextPeriodStart = new Date(startOfToday);
      nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);

      previousPeriodStart = new Date(startOfToday);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);

      break;
    }

    case "weekly": {
      currentPeriodStart = new Date(startOfToday);

      const day = currentPeriodStart.getDay();

      currentPeriodStart.setDate(currentPeriodStart.getDate() - day);

      nextPeriodStart = new Date(currentPeriodStart);
      nextPeriodStart.setDate(nextPeriodStart.getDate() + 7);

      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);

      break;
    }

    default: {
      // fallback: current month
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      nextPeriodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      break;
    }
  }

  const currentPeriod = transactions.filter((transaction) => {
    const date = new Date(transaction.date);

    return date >= currentPeriodStart && date < nextPeriodStart;
  });

  const previousPeriod = transactions.filter((transaction) => {
    const date = new Date(transaction.date);

    return date >= previousPeriodStart && date < currentPeriodStart;
  });

  const sum = (items, type) =>
    items
      .filter((transaction) => transaction.type === type)
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0,
      );

  // Current selected period
  const thisIncome = sum(currentPeriod, "income");
  const thisExpenses = sum(currentPeriod, "expense");
  const thisSavings = thisIncome - thisExpenses;

  // Previous selected period
  const lastIncome = sum(previousPeriod, "income");
  const lastExpenses = sum(previousPeriod, "expense");

  // All time
  const allIncome = sum(transactions, "income");
  const allExpenses = sum(transactions, "expense");
  const allSavings = allIncome - allExpenses;

  const percentChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  };

  const savingsRate =
    thisIncome > 0 ? Math.round((thisSavings / thisIncome) * 100) : 0;

  return {
    thisIncome,
    thisExpenses,
    thisSavings,

    allIncome,
    allExpenses,
    allSavings,

    incomeChange: percentChange(thisIncome, lastIncome),
    expenseChange: percentChange(thisExpenses, lastExpenses),

    savingsRate,

    total: transactions.length,
  };
}


/* ============================================================================
   TOAST
============================================================================ */

function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3200);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`premium-toast ${type}`} role="status" aria-live="polite">
      <div className="toast-icon">
        {type === "success" ? (
          <CheckCircle size={17} />
        ) : (
          <AlertCircle size={17} />
        )}
      </div>

      <span>{message}</span>

      <button type="button" onClick={onDone} aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  );
}

/* ============================================================================
   LOADING ROW
============================================================================ */

/* ============================================================================
   CATEGORY DETAIL (opened from the dashboard's spending list)
============================================================================ */

function CategoryDetail({ category, transactions, year, setYear, onClose }) {
  const categoryTransactions = transactions
    .filter((tx) => tx.type === "expense" && (tx.category || "Other") === category)
    .filter((tx) => isValidDate(tx.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const availableYears = [...new Set(categoryTransactions.map((tx) => String(new Date(tx.date).getFullYear())))].sort((a, b) => Number(b) - Number(a));
  const effectiveYear = availableYears.includes(year) ? year : availableYears[0] || String(new Date().getFullYear());
  const yearTransactions = categoryTransactions.filter((tx) => String(new Date(tx.date).getFullYear()) === effectiveYear);

  const monthlyTotals = Array.from({ length: 12 }, (_, monthIndex) => {
    const items = yearTransactions.filter((tx) => new Date(tx.date).getMonth() === monthIndex);
    return {
      month: new Date(Number(effectiveYear), monthIndex, 1).toLocaleDateString("en-IN", { month: "short" }),
      amount: Math.round(items.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)),
      count: items.length,
    };
  });

  const total = categoryTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const yearTotal = yearTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const largest = categoryTransactions.reduce((best, tx) => (Number(tx.amount) > Number(best?.amount || 0) ? tx : best), null);
  const icon = CATEGORY_ICONS[category] || <IndianRupee />;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spending-detail-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <section className="modal-card" style={{ width: "min(100%, 860px)", padding: 0 }}>
        <header className="card-head" style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span className="dashboard-icon dashboard-icon-purple">{React.cloneElement(icon, { size: 19 })}</span>
            <div style={{ minWidth: 0 }}>
              <h2 id="spending-detail-title" className="card-title">{formatCategory(category)}</h2>
              <p className="card-sub">Monthly trend and transaction history</p>
            </div>
          </div>
          <button type="button" className="icon-button" aria-label="Close spending details" onClick={onClose}><X size={17} /></button>
        </header>

        <div style={{ display: "grid", gap: 16, padding: 20 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {[
              ["All-time spending", formatCurrency(total), `${categoryTransactions.length} transactions`],
              [`In ${effectiveYear}`, formatCurrency(yearTotal), `About ${formatCurrency(yearTotal / 12)} a month`],
              ["Largest expense", formatCurrency(largest?.amount || 0), largest?.description || "No transactions yet"],
            ].map(([label, value, note]) => (
              <div key={label} style={{ padding: 16, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 14 }}>
                <span style={{ color: "var(--muted)", fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                <p className="mono" style={{ margin: "6px 0 2px", fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" }}>{value}</p>
                <p style={{ margin: 0, overflow: "hidden", color: "var(--muted)", fontSize: 12, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>Spending by month</h3>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12.5, fontWeight: 600 }}>
                <CalendarDays size={15} aria-hidden />
                Year
                <select value={effectiveYear} onChange={(event) => setYear(event.target.value)} style={{ width: "auto", minHeight: 34, padding: "4px 10px", fontWeight: 650 }}>
                  {(availableYears.length ? availableYears : [String(new Date().getFullYear())]).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)} axisLine={false} tickLine={false} width={42} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,.06)" }} formatter={(value) => [formatCurrency(value), "Spent"]} contentStyle={{ background: "#fff", border: "1px solid #e6ebf3", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,27,51,.12)", fontSize: 13 }} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!monthlyTotals.some((month) => month.amount > 0) && (
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>No expenses recorded for {effectiveYear}.</p>
            )}
          </div>

          <div style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 14 }}>
            <div className="card-head" style={{ minHeight: 56, padding: "12px 16px" }}>
              <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><ReceiptText size={16} aria-hidden /> Transactions</h3>
              <span className="chip">{categoryTransactions.length}</span>
            </div>
            <div className="scroll-thin" style={{ maxHeight: 260, overflowY: "auto" }}>
              {categoryTransactions.length ? (
                categoryTransactions.slice(0, 50).map((tx) => (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, overflow: "hidden", fontSize: 13.5, fontWeight: 600, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description || "Expense"}</p>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>{new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <strong className="mono" style={{ color: "var(--expense)", fontSize: 14 }}>−{formatCurrency(tx.amount)}</strong>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, padding: 28, color: "var(--muted)", textAlign: "center" }}>No expenses in this category yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   MAIN LAYOUT
============================================================================ */

const Layout = ({ onLogout, user }) => {
  const {
    transactions,
    loading,
    loaded,
    lastUpdated,
    pendingCount,
    syncError,
    fetchTransactions,
    queueTransaction,
    addTransaction,
    editTransaction,
    deleteTransaction,
  } = useTransactions();

  /* --------------------------------------------------------------------------
     UI STATE
  -------------------------------------------------------------------------- */

  const [timeFrame, setTimeFrame] = useState("monthly");

  // year / month / custom range - shared with every page through the outlet
  const period = useCreatePeriod();

  // slim by default, opens on hover; "pinned" keeps it open (remembered)
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return localStorage.getItem("sidebarPinned") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebarPinned", sidebarPinned ? "1" : "0");
    } catch {
      /* storage unavailable - preference just is not remembered */
    }
  }, [sidebarPinned]);

  const [showAllTopCategories, setShowAllTopCategories] = useState(false);
  const [selectedSpendingCategory, setSelectedSpendingCategory] = useState(null);
  const [spendingYear, setSpendingYear] = useState(String(new Date().getFullYear()));

  const [showModal, setShowModal] = useState(false);

  const [toast, setToast] = useState(null);

  // a queued transaction rejected by the server - tell the user
  useEffect(() => {
    if (syncError) setToast({ message: syncError.message, type: "error" });
  }, [syncError]);

  /* --------------------------------------------------------------------------
     ADD TRANSACTION STATE
  -------------------------------------------------------------------------- */

  const [newTransaction, setNewTransaction] = useState(
    getDefaultTransaction("income"),
  );

  /* --------------------------------------------------------------------------
     FILTERED TRANSACTIONS
  -------------------------------------------------------------------------- */

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, timeFrame, {
        selectedYear: period.selectedYear,
        selectedMonth: period.selectedMonth,
        yearMonth: period.yearMonth,
        customRange: period.customRange,
      }),
    [
      transactions,
      timeFrame,
      period.selectedYear,
      period.selectedMonth,
      period.yearMonth,
      period.customRange,
    ],
  );

  /* --------------------------------------------------------------------------
     STATS
  -------------------------------------------------------------------------- */

  const stats = useMemo(
    () =>
      calculateStats(transactions, timeFrame, {
        selectedYear: period.selectedYear,
        selectedMonth: period.selectedMonth,
        yearMonth: period.yearMonth,
        customRange: period.customRange,
      }),
    [
      transactions,
      timeFrame,
      period.selectedYear,
      period.selectedMonth,
      period.yearMonth,
      period.customRange,
    ],
);

  const periodLabel = useMemo(() => {
    if (timeFrame === "daily") return "Today";
    if (timeFrame === "weekly") return "This Week";

    if (
      timeFrame === "yearly" &&
      (period.yearMonth === null || period.yearMonth === undefined)
    ) {
      return period.selectedYear === new Date().getFullYear()
        ? "This Year"
        : `Year ${period.selectedYear}`;
    }

    return resolvePeriodRange({
      timeFrame,
      selectedYear: period.selectedYear,
      selectedMonth: period.selectedMonth,
      yearMonth: period.yearMonth,
      customRange: period.customRange,
    }).label;
  }, [
    timeFrame,
    period.selectedYear,
    period.selectedMonth,
    period.yearMonth,
    period.customRange,
  ]);

  /* --------------------------------------------------------------------------
     TOP CATEGORIES
  -------------------------------------------------------------------------- */

  const topCategories = useMemo(() => {
    const categoryMap = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((accumulator, transaction) => {
        const category = transaction.category || "Other";

        accumulator[category] =
          (accumulator[category] || 0) + Number(transaction.amount || 0);

        return accumulator;
      }, {});

    return Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const topCategoriesTotal = useMemo(
    () => topCategories.reduce((sum, [, amount]) => sum + amount, 0),
    [topCategories],
  );

  /* --------------------------------------------------------------------------
     OPEN MODAL
  -------------------------------------------------------------------------- */

  const openAddModal = useCallback((type = "income") => {
    setNewTransaction(getDefaultTransaction(type));

    setShowModal(true);
  }, []);

  /* --------------------------------------------------------------------------
     CLOSE MODAL
  -------------------------------------------------------------------------- */

  const closeAddModal = useCallback(() => {
    setShowModal(false);

    setNewTransaction(getDefaultTransaction("income"));
  }, []);

  /* --------------------------------------------------------------------------
     ADD TRANSACTION
  -------------------------------------------------------------------------- */

  const handleAddTransaction = useCallback(async () => {
    try {
      const amount = Number(newTransaction.amount);

      if (!newTransaction.type) {
        throw new Error("Please select transaction type.");
      }

      if (!newTransaction.description?.trim()) {
        throw new Error("Please enter a description.");
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      if (!newTransaction.date) {
        throw new Error("Please select a date.");
      }

      await addTransaction({
        ...newTransaction,
        description: newTransaction.description.trim(),
        amount,
        // local date + current time, so it lands in the right day/week
        date: toIsoWithClientTime(newTransaction.date),
      });

      closeAddModal();

      setToast({
        message: "Transaction added successfully.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to add transaction:", error);

      setToast({
        message: getErrorMessage(error, "Unable to add transaction."),
        type: "error",
      });
    }
  }, [newTransaction, addTransaction, closeAddModal]);

  /* --------------------------------------------------------------------------
     REFRESH
  -------------------------------------------------------------------------- */

  const handleRefresh = useCallback(async () => {
    try {
      await fetchTransactions();

      setToast({
        message: "Transactions refreshed.",
        type: "success",
      });
    } catch (error) {
      console.error("Refresh failed:", error);

      setToast({
        message: getErrorMessage(error, "Unable to refresh transactions."),
        type: "error",
      });
    }
  }, [fetchTransactions]);

  /* --------------------------------------------------------------------------
     OUTLET CONTEXT
  -------------------------------------------------------------------------- */

  const outletContext = useMemo(
    () => ({
      transactions: filteredTransactions,

      allTransactions: transactions,

      addTransaction,
      queueTransaction,
      editTransaction,
      deleteTransaction,

      refreshTransactions: fetchTransactions,
      pendingCount,

      timeFrame,
      setTimeFrame,
      period,

      lastUpdated,
      openCategoryDetail: setSelectedSpendingCategory,
      openAddModal,
    }),
    [
      filteredTransactions,
      transactions,
      addTransaction,
      queueTransaction,
      editTransaction,
      deleteTransaction,
      fetchTransactions,
      pendingCount,
      timeFrame,
      period,
      lastUpdated,
      openAddModal,
    ],
  );

  /* --------------------------------------------------------------------------
     PERCENTAGE
  -------------------------------------------------------------------------- */

  const percentage = (value) => {
    const number = Number(value || 0);

    return `${number >= 0 ? "+" : ""}${number}%`;
  };

  const { pathname } = useLocation();

  const pageMeta = useMemo(() => {
    const key = pathname.toLowerCase();
    if (key.startsWith("/income/source")) return { title: "Source details", sub: "Month-wise earnings and transactions" };
    if (key.startsWith("/income")) return { title: "Income", sub: "Everything you earned, in one place" };
    if (key.startsWith("/expense/category")) return { title: "Category details", sub: "Month-wise spending and transactions" };
    if (key.startsWith("/expense")) return { title: "Expenses", sub: "See where your money goes" };
    if (key.startsWith("/goals")) return { title: "Goals", sub: "Save towards what matters" };
    if (key.startsWith("/profile")) return { title: "Profile", sub: "Your account and preferences" };
    if (key.startsWith("/contactus")) return { title: "Help and support", sub: "We usually reply within a day" };
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const first = String(user?.name || user?.username || "").trim().split(/\s+/)[0];
    return { title: first ? `${greeting}, ${first}` : "Dashboard", sub: `Here is your money for ${periodLabel.toLowerCase()}` };
  }, [pathname, user, periodLabel]);

  // These pages carry their own add/export controls, so the shared actions are hidden there.
  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, "");
  const accent = normalizedPath.startsWith("/income") ? "income" : normalizedPath.startsWith("/expense") ? "expense" : "default";
  const hideTopbarActions =
    ["/income", "/expense", "/goals", "/profile"].includes(normalizedPath) ||
    normalizedPath.startsWith("/expense/category/") ||
    normalizedPath.startsWith("/income/source/");

  const displayName = String(user?.name || user?.username || user?.email || "Account").trim();
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";

  return (
    <div className="app-shell" data-accent={accent}>
      <Sidebar user={user} onLogout={onLogout} pinned={sidebarPinned} setPinned={setSidebarPinned} />

      {showModal && (
        <AddTransactionModal
          showModal={showModal}
          setShowModal={setShowModal}
          newTransaction={newTransaction}
          setNewTransaction={setNewTransaction}
          handleAddTransaction={handleAddTransaction}
          loading={false}
        />
      )}

      {toast && <Toast {...toast} onDone={() => setToast(null)} />}

      <main className={`app-main ${sidebarPinned ? "" : "sidebar-collapsed"}`}>
        {(user?.isGuest || String(user?.email || "").endsWith("@guest.demo.local")) && (
          <div
            role="status"
            style={{
              background: "#eef2ff",
              color: "#3730a3",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              textAlign: "center",
              borderBottom: "1px solid #c7d2fe",
            }}
          >
            Demo account - change anything you like. All data resets when you log out.
          </div>
        )}
        <header className="topbar">
          <div className="topbar-title">
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.sub}</p>
          </div>

          {!hideTopbarActions && (
          <div className="topbar-actions">
            <span className="updated-at">
              <i aria-hidden />
              {pendingCount > 0
                ? `Syncing ${pendingCount}…`
                : !loaded
                  ? "Connecting…"
                  : <>Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>}
            </span>
            <button type="button" className="btn btn-icon" onClick={handleRefresh} disabled={loading} aria-label="Refresh transactions" title="Refresh">
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
            <button type="button" className="btn btn-primary add-fab" aria-label="Add transaction" onClick={() => openAddModal("expense")}>
              <Plus size={17} aria-hidden />
              <span className="btn-label">Add transaction</span>
            </button>
            <Link to="/profile" className="user-chip" aria-label="Open your profile">
              <span className="avatar" aria-hidden>{initials}</span>
              <span>
                <b>{displayName}</b>
                <small>{user?.email || "View profile"}</small>
              </span>
            </Link>
          </div>
          )}
        </header>

        <div className="page">
          <div className="outlet-wrapper">
            <Suspense fallback={<CoinLoaderBlock label="Loading" minHeight="60vh" />}>
              <Outlet context={outletContext} />
            </Suspense>
          </div>
        </div>
      </main>

      {selectedSpendingCategory && (
        <CategoryDetail
          category={selectedSpendingCategory}
          transactions={transactions}
          year={spendingYear}
          setYear={setSpendingYear}
          onClose={() => setSelectedSpendingCategory(null)}
        />
      )}
    </div>
  );
};

export default Layout;
