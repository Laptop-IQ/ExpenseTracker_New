import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Baby,
  Banknote,
  Briefcase,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
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
} from "lucide-react";

import Sidebar from "./Sidebar";

import "./Layout.css";

const API_BASE = import.meta.env.VITE_API_BASE;

/* ============================================================================
   CATEGORIES
============================================================================ */

export const CATEGORY_ICONS = {
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

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatCategory = (category) =>
  String(category || "Other").replace(/_/g, " ");

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
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
   TRANSACTION HOOK
============================================================================ */

function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchTransactions = useCallback(async () => {
    if (!API_BASE) {
      console.error(
        "VITE_API_BASE is missing. Please configure your environment variable.",
      );
      return;
    }

    try {
      setLoading(true);

      const headers = getAuthHeaders();

      const [incomeResponse, expenseResponse] = await Promise.all([
        axios.get(`${API_BASE}/income/get`, {
          headers,
        }),

        axios.get(`${API_BASE}/expense/get`, {
          headers,
        }),
      ]);

      const incomes = safeArray(incomeResponse).map((item) =>
        normalizeTransaction(item, "income"),
      );

      const expenses = safeArray(expenseResponse).map((item) =>
        normalizeTransaction(item, "expense"),
      );

      const merged = [...incomes, ...expenses].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );

      setTransactions(merged);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(
        "Failed to fetch transactions:",
        error?.response?.data || error?.message || error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(
    async (transaction) => {
      if (!API_BASE) {
        throw new Error("API base URL is not configured.");
      }

      const headers = getAuthHeaders();

      const endpoint =
        transaction.type === "income" ? "income/add" : "expense/add";

      await axios.post(`${API_BASE}/${endpoint}`, transaction, {
        headers,
      });

      await fetchTransactions();
    },
    [fetchTransactions],
  );

  const editTransaction = useCallback(
    async (id, transaction) => {
      if (!API_BASE) {
        throw new Error("API base URL is not configured.");
      }

      const headers = getAuthHeaders();

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
      if (!API_BASE) {
        throw new Error("API base URL is not configured.");
      }

      const headers = getAuthHeaders();

      const endpoint = type === "income" ? "income/delete" : "expense/delete";

      await axios.delete(`${API_BASE}/${endpoint}/${id}`, {
        headers,
      });

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

/* ============================================================================
   FILTER
============================================================================ */

function filterTransactions(transactions, frame) {
  const now = new Date();

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

function calculateStats(transactions) {
  const now = new Date();

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonth = transactions.filter((transaction) => {
    const date = new Date(transaction.date);

    return date >= currentMonthStart && date < nextMonthStart;
  });

  const previousMonth = transactions.filter((transaction) => {
    const date = new Date(transaction.date);

    return date >= previousMonthStart && date < currentMonthStart;
  });

  const sum = (items, type) =>
    items
      .filter((transaction) => transaction.type === type)
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0,
      );

  const thisIncome = sum(currentMonth, "income");
  const thisExpenses = sum(currentMonth, "expense");

  const lastIncome = sum(previousMonth, "income");
  const lastExpenses = sum(previousMonth, "expense");

  const allIncome = sum(transactions, "income");
  const allExpenses = sum(transactions, "expense");

  const percentChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  };

  const thisSavings = thisIncome - thisExpenses;

  const savingsRate =
    thisIncome > 0 ? Math.round((thisSavings / thisIncome) * 100) : 0;

  return {
    thisIncome,
    thisExpenses,
    thisSavings,

    allIncome,
    allExpenses,
    allSavings: allIncome - allExpenses,

    incomeChange: percentChange(thisIncome, lastIncome),

    expenseChange: percentChange(thisExpenses, lastExpenses),

    savingsRate,

    total: transactions.length,
  };
}

/* ============================================================================
   STAT CARD
============================================================================ */

const ACCENTS = {
  purple: {
    iconBg: "rgba(139,92,246,.14)",
    iconColor: "#A78BFA",
    glow: "rgba(139,92,246,.18)",
  },

  green: {
    iconBg: "rgba(34,197,94,.12)",
    iconColor: "#4ADE80",
    glow: "rgba(34,197,94,.16)",
  },

  red: {
    iconBg: "rgba(239,68,68,.12)",
    iconColor: "#FB7185",
    glow: "rgba(239,68,68,.16)",
  },

  blue: {
    iconBg: "rgba(59,130,246,.12)",
    iconColor: "#60A5FA",
    glow: "rgba(59,130,246,.16)",
  },
};

function StatCard({
  title,
  value,
  footer,
  badge,
  icon,
  accent = "purple",
  delay = 0,
}) {
  const theme = ACCENTS[accent];

  return (
    <article
      className="premium-card stat-card"
      style={{
        "--card-glow": theme.glow,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="stat-card-glow" />

      <div className="stat-card-content">
        <div className="stat-card-top">
          <div
            className="stat-icon"
            style={{
              background: theme.iconBg,
              color: theme.iconColor,
            }}
          >
            {React.cloneElement(icon, {
              size: 18,
              strokeWidth: 2.2,
            })}
          </div>

          {badge && (
            <span
              className="stat-badge"
              style={{
                color: theme.iconColor,
                background: theme.iconBg,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <span className="stat-label">{title}</span>

        <strong className="stat-value mono">{value}</strong>

        <span className="stat-footer">{footer}</span>
      </div>
    </article>
  );
}

/* ============================================================================
   PANEL
============================================================================ */

function PanelCard({ children, className = "", delay = 0 }) {
  return (
    <section
      className={`premium-card panel-card ${className}`}
      style={{
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </section>
  );
}

function PanelHeader({ icon, title, subtitle, right }) {
  return (
    <header className="panel-header">
      <div className="panel-title-wrap">
        <div className="panel-icon">
          {React.cloneElement(icon, {
            size: 16,
            strokeWidth: 2,
          })}
        </div>

        <div>
          <h2>{title}</h2>

          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {right}
    </header>
  );
}

/* ============================================================================
   ADD TRANSACTION MODAL
============================================================================ */

function AddTransactionModal({ onClose, onAdd }) {
  const [type, setType] = useState("expense");

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const updateField = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));

    if (error) {
      setError("");
    }
  };

  const submit = async () => {
    const description = form.description.trim();

    const amount = Number(form.amount);

    if (!description || !form.amount || !form.category || !form.date) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onAdd({
        description,
        amount,
        category: form.category,
        date: form.date,
        type,
      });

      onClose(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Unable to save transaction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-transaction-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose(false);
        }
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">MONEY MANAGER</span>

            <h2 id="add-transaction-title">Add Transaction</h2>

            <p>Record your income or expense.</p>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={() => onClose(false)}
            disabled={saving}
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        <div className="transaction-type-switch">
          <button
            type="button"
            className={type === "income" ? "active income" : ""}
            onClick={() => {
              setType("income");

              setForm((previous) => ({
                ...previous,
                category: "",
              }));
            }}
          >
            <ArrowUp size={15} />
            Income
          </button>

          <button
            type="button"
            className={type === "expense" ? "active expense" : ""}
            onClick={() => {
              setType("expense");

              setForm((previous) => ({
                ...previous,
                category: "",
              }));
            }}
          >
            <ArrowDown size={15} />
            Expense
          </button>
        </div>

        <div className="form-grid">
          <label className="form-field full">
            <span>Description</span>

            <input
              className="premium-input"
              placeholder="e.g. Monthly salary"
              value={form.description}
              onChange={updateField("description")}
              autoFocus
            />
          </label>

          <label className="form-field">
            <span>Amount</span>

            <div className="input-prefix-wrap">
              <span>₹</span>

              <input
                className="premium-input input-with-prefix mono"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.amount}
                onChange={updateField("amount")}
              />
            </div>
          </label>

          <label className="form-field">
            <span>Date</span>

            <input
              className="premium-input"
              type="date"
              value={form.date}
              onChange={updateField("date")}
            />
          </label>

          <label className="form-field full">
            <span>Category</span>

            <select
              className="premium-input"
              value={form.category}
              onChange={updateField("category")}
            >
              <option value="">Select a category</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onClose(false)}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw size={15} className="spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                Save Transaction
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
    <div className={`premium-toast ${type}`} role="status">
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
   LOADING ROWS
============================================================================ */

function TransactionSkeleton() {
  return (
    <div className="transaction-skeleton">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/* ============================================================================
   MAIN LAYOUT
============================================================================ */

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

  const stats = useMemo(() => calculateStats(transactions), [transactions]);

  const timeframeLabels = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
    yearly: "This Year",
  };

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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [transactions]);

  const topCategoriesTotal = useMemo(
    () => topCategories.reduce((sum, [, amount]) => sum + amount, 0),
    [topCategories],
  );

  /* --------------------------------------------------------------------------
     RECENT TRANSACTIONS
  -------------------------------------------------------------------------- */

  const displayedTransactions = showAllTx
    ? transactions
    : transactions.slice(0, 5);

  /* --------------------------------------------------------------------------
     HANDLERS
  -------------------------------------------------------------------------- */

  const handleAddClose = (saved) => {
    setShowModal(false);

    if (saved) {
      setToast({
        message: "Transaction added successfully.",
        type: "success",
      });
    }
  };

  const handleAdd = async (transaction) => {
    await addTransaction(transaction);
  };

  const handleRefresh = async () => {
    try {
      await fetchTransactions();

      setToast({
        message: "Transactions refreshed.",
        type: "success",
      });
    } catch {
      setToast({
        message: "Unable to refresh transactions.",
        type: "error",
      });
    }
  };

  /* --------------------------------------------------------------------------
     OUTLET CONTEXT
  -------------------------------------------------------------------------- */

  const outletContext = {
    transactions: filteredTransactions,

    allTransactions: transactions,

    addTransaction,
    editTransaction,
    deleteTransaction,

    refreshTransactions: fetchTransactions,

    timeFrame,
    setTimeFrame,

    lastUpdated,
  };

  /* --------------------------------------------------------------------------
     PERCENTAGE
  -------------------------------------------------------------------------- */

  const percentage = (value) => {
    const number = Number(value || 0);

    return `${number >= 0 ? "+" : ""}${number}%`;
  };

  return (
    <div className="app-shell">
      <div className="ambient-background">
        <span className="ambient-orb orb-one" />
        <span className="ambient-orb orb-two" />
        <span className="ambient-orb orb-three" />
      </div>

      <Sidebar
        user={user}
        onLogout={onLogout}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {showModal && (
        <AddTransactionModal onClose={handleAddClose} onAdd={handleAdd} />
      )}

      {toast && <Toast {...toast} onDone={() => setToast(null)} />}

      <main
        className={`app-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        <div className="dashboard-container">
          {/* ==================================================================
             TOP HEADER
          ================================================================== */}

          <header className="dashboard-header">
            <div>
              <span className="dashboard-eyebrow">PERSONAL FINANCE</span>

              <h1>
                Financial
                <span> Overview</span>
              </h1>

              <p>
                Track your money. Understand your spending. Build better habits.
              </p>
            </div>

            <div className="header-actions">
              <div className="last-updated">
                <span className="status-dot" />
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <button
                className="header-refresh"
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh transactions"
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>

              <button
                className="add-transaction-button"
                type="button"
                onClick={() => setShowModal(true)}
              >
                <span>+</span>
                <strong>Add Transaction</strong>
              </button>
            </div>
          </header>

          {/* ==================================================================
             FILTER BAR
          ================================================================== */}

          <div className="dashboard-toolbar">
            <div>
              <span className="toolbar-label">Overview period</span>
            </div>

            <div className="period-switch">
              {Object.entries(timeframeLabels).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={timeFrame === key ? "active" : ""}
                  onClick={() => setTimeFrame(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ==================================================================
             STATS
          ================================================================== */}

          <section className="stats-grid">
            <StatCard
              title="Net Balance"
              value={formatCurrency(stats.allSavings)}
              badge={percentage(stats.incomeChange)}
              footer="All time"
              icon={<IndianRupee />}
              accent="purple"
              delay={0.05}
            />

            <StatCard
              title="Income"
              value={formatCurrency(stats.thisIncome)}
              badge={percentage(stats.incomeChange)}
              footer={timeframeLabels[timeFrame]}
              icon={<ArrowUp />}
              accent="green"
              delay={0.1}
            />

            <StatCard
              title="Expenses"
              value={formatCurrency(stats.thisExpenses)}
              badge={percentage(stats.expenseChange)}
              footer={timeframeLabels[timeFrame]}
              icon={<ArrowDown />}
              accent="red"
              delay={0.15}
            />

            <StatCard
              title="Saved"
              value={formatCurrency(stats.thisSavings)}
              badge={`${stats.savingsRate}% rate`}
              footer={timeframeLabels[timeFrame]}
              icon={<PiggyBank />}
              accent="blue"
              delay={0.2}
            />
          </section>

          {/* ==================================================================
             MAIN CONTENT
          ================================================================== */}

          <div className="dashboard-grid">
          
            <div className="dashboard-left">
              <PanelCard delay={0.25}>
                <div className="outlet-wrapper mt-5">
                  <Outlet context={outletContext} />
                </div>
              </PanelCard>
            </div>

            {/* ================================================================
               RIGHT
            ================================================================ */}

            <aside className="dashboard-right">
              {/* --------------------------------------------------------------
                 TOP SPENDING
              -------------------------------------------------------------- */}

              <PanelCard delay={0.28}>
                <PanelHeader
                  icon={<PieChart />}
                  title="Top Spending"
                  subtitle="Where your money goes"
                  right={
                    <button
                      type="button"
                      className="panel-link"
                      onClick={() => navigate("/transactions")}
                    >
                      View all
                      <ArrowUpRight size={13} />
                    </button>
                  }
                />

                <div className="spending-content">
                  {topCategories.length === 0 ? (
                    <div className="empty-state compact">
                      <PieChart size={30} />

                      <p>No spending data yet</p>

                      <button type="button" onClick={() => setShowModal(true)}>
                        Add your first expense
                      </button>
                    </div>
                  ) : (
                    <div className="category-list">
                      {topCategories.map(([category, amount], index) => {
                        const percentage =
                          topCategoriesTotal > 0
                            ? Math.round((amount / topCategoriesTotal) * 100)
                            : 0;

                        return (
                          <div className="category-item" key={category}>
                            <div className="category-top">
                              <div className="category-info">
                                <div className="category-icon">
                                  {React.cloneElement(
                                    CATEGORY_ICONS[category] || <IndianRupee />,
                                    {
                                      size: 14,
                                    },
                                  )}
                                </div>

                                <div>
                                  <strong>{formatCategory(category)}</strong>

                                  <span>{percentage}%</span>
                                </div>
                              </div>

                              <strong className="category-amount mono">
                                {formatCurrency(amount)}
                              </strong>
                            </div>

                            <div className="category-progress">
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  animationDelay: `${index * 80}ms`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="financial-mini-grid">
                    <div className="mini-stat income">
                      <span>Total Income</span>

                      <strong className="mono">
                        {formatCurrency(stats.allIncome)}
                      </strong>
                    </div>

                    <div className="mini-stat expense">
                      <span>Total Expense</span>

                      <strong className="mono">
                        {formatCurrency(stats.allExpenses)}
                      </strong>
                    </div>
                  </div>
                </div>
              </PanelCard>

              {/* --------------------------------------------------------------
                 RECENT TRANSACTIONS
              -------------------------------------------------------------- */}

              <PanelCard delay={0.33}>
                <PanelHeader
                  icon={<Clock />}
                  title="Recent Transactions"
                  subtitle={`${transactions.length} total records`}
                  right={
                    <button
                      type="button"
                      className="panel-link"
                      onClick={() => navigate("/transactions")}
                    >
                      See all
                      <ArrowUpRight size={13} />
                    </button>
                  }
                />

                <div className="transactions-wrapper">
                  <div className="transaction-head">
                    <span>Date</span>

                    <span>Amount</span>

                    <span>Name</span>

                    <span>Category</span>
                  </div>

                  <div className="transaction-list">
                    {loading && transactions.length === 0 ? (
                      <>
                        <TransactionSkeleton />
                        <TransactionSkeleton />
                        <TransactionSkeleton />
                      </>
                    ) : displayedTransactions.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <Clock size={22} />
                        </div>

                        <strong>No transactions yet</strong>

                        <p>Start tracking your money today.</p>

                        <button
                          type="button"
                          onClick={() => setShowModal(true)}
                        >
                          + Add transaction
                        </button>
                      </div>
                    ) : (
                      displayedTransactions.map((transaction) => (
                        <div className="transaction-row" key={transaction.id}>
                          <span className="transaction-date">
                            {new Date(transaction.date).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </span>

                          <strong
                            className={`transaction-amount mono ${
                              transaction.type === "income"
                                ? "income-text"
                                : "expense-text"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "−"}
                            {formatCurrency(transaction.amount).slice(1)}
                          </strong>

                          <span className="transaction-name">
                            {transaction.description || "Untitled"}
                          </span>

                          <span className="transaction-category">
                            {formatCategory(transaction.category)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {transactions.length > 5 && (
                    <button
                      type="button"
                      className="view-more-button"
                      onClick={() => setShowAllTx((previous) => !previous)}
                    >
                      {showAllTx ? (
                        <>
                          <ChevronUp size={14} />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          View all ({transactions.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </PanelCard>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
