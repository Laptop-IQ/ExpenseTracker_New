import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { X, Plus, Sparkles } from "lucide-react";
import {
  Wallet,
  Banknote,
  Briefcase,
  Coins,
  TrendingUp,
  Utensils,
  ShoppingBasket,
  Milk,
  Cookie,
  Car,
  Fuel,
  Home,
  Zap,
  HeartPulse,
  Wrench,
  ShoppingCart,
  Gift,
  Scissors,
  Baby,
  Shield,
  MoreHorizontal,
} from "lucide-react";
import { smartDetectCategory, learnCategory } from "../utils/smartCategoryAI";

const MANUAL_FLAG = "_manualCategory";

const INCOME_CATS = [
  { key: "Salary", icon: <Wallet size={15} />, color: "#1AFFD5" },
  { key: "Extra_Income", icon: <Banknote size={15} />, color: "#3b82f6" },
  { key: "Freelance", icon: <Briefcase size={15} />, color: "#a78bfa" },
  { key: "Side_Hustles", icon: <Coins size={15} />, color: "#f59e0b" },
  { key: "Investment", icon: <TrendingUp size={15} />, color: "#06b6d4" },
];

const EXPENSE_CATS = [
  { key: "Food", icon: <Utensils size={15} />, color: "#f97316" },
  { key: "Grocery", icon: <ShoppingBasket size={15} />, color: "#22c55e" },
  { key: "Dairy", icon: <Milk size={15} />, color: "#fb923c" },
  { key: "Junk_Food", icon: <Cookie size={15} />, color: "#e11d48" },
  { key: "Transport", icon: <Car size={15} />, color: "#3b82f6" },
  { key: "Fuel", icon: <Fuel size={15} />, color: "#f59e0b" },
  { key: "Housing", icon: <Home size={15} />, color: "#8b5cf6" },
  { key: "Utilities", icon: <Zap size={15} />, color: "#14b8a6" },
  { key: "Healthcare", icon: <HeartPulse size={15} />, color: "#ef4444" },
  { key: "Service", icon: <Wrench size={15} />, color: "#84cc16" },
  { key: "Shopping", icon: <ShoppingCart size={15} />, color: "#a855f7" },
  { key: "Entertainment", icon: <Gift size={15} />, color: "#ec4899" },
  { key: "Investment", icon: <TrendingUp size={15} />, color: "#10b981" },
  {
    key: "Personal_Care_Expenses",
    icon: <Scissors size={15} />,
    color: "#f43f5e",
  },
  { key: "Kids_Needs", icon: <Baby size={15} />, color: "#06b6d4" },
  { key: "Annual_Expense", icon: <Shield size={15} />, color: "#6366f1" },
  { key: "Other", icon: <MoreHorizontal size={15} />, color: "#94a3b8" },
];

function inputStyle(hasError, focused, accent) {
  return {
    background: hasError
      ? "rgba(239,68,68,0.07)"
      : focused
        ? "#0d1526"
        : "#0a0f1e",
    border: `1px solid ${hasError ? "#ef444450" : focused ? accent + "60" : "#1a2035"}`,
    borderRadius: 12,
    color: "#e2e8f0",
    outline: "none",
    transition: "all 0.2s",
    boxShadow: focused && !hasError ? `0 0 0 3px ${accent}12` : "none",
  };
}

const AddTransactionModal = ({
  showModal,
  setShowModal,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  loading = false,
  lockType = null,
}) => {
  const [errors, setErrors] = useState({ description: "", amount: "" });
  const [aiDetection, setAiDetection] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const debounceRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (lockType && showModal) {
      const defaultCat = lockType === "income" ? "Salary" : "Food";
      setNewTransaction((p) => ({
        ...p,
        type: lockType,
        category: p?.category || defaultCat,
        [MANUAL_FLAG]: false,
      }));
    }
  }, [lockType, showModal, setNewTransaction]);

  const effectiveType = lockType ?? newTransaction?.type;
  const isIncome = effectiveType === "income";
  const accent = isIncome ? "#1AFFD5" : "#f97316";
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showModal) {
      setAiDetection(null);
      setErrors({ description: "", amount: "" });
      setFocusedField(null);
    }
  }, [showModal]);

  useEffect(() => {
    const text = newTransaction?.description?.trim() ?? "";
    if (!text || newTransaction?.[MANUAL_FLAG]) {
      setAiDetection(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      try {
        const result = smartDetectCategory(text);
        const cat = result?.category ?? null;
        const conf = result?.confidence ?? 0.6;
        setAiDetection(cat ? { category: cat, confidence: conf } : null);
        if (conf >= 0.8 && cat)
          setNewTransaction((p) =>
            p?.[MANUAL_FLAG] ? p : { ...p, category: cat },
          );
      } catch {
        setAiDetection(null);
      }
    }, 380);
    return () => clearTimeout(debounceRef.current);
  }, [newTransaction?.description, setNewTransaction]);

  const handleTypeToggle = useCallback(
    (t) => {
      const defaultCat = t === "income" ? "Salary" : "Food";
      setNewTransaction((p) => ({
        ...p,
        type: t,
        category: defaultCat,
        [MANUAL_FLAG]: false,
      }));
      setAiDetection(null);
    },
    [setNewTransaction],
  );

  const handleCatSelect = useCallback(
    (cat) => {
      setNewTransaction((p) => ({ ...p, category: cat, [MANUAL_FLAG]: true }));
      setAiDetection(null);
      const desc = newTransaction?.description?.trim();
      if (desc) learnCategory(desc, cat);
    },
    [newTransaction?.description, setNewTransaction],
  );

  const validate = () => {
    const e = { description: "", amount: "" };
    if (!newTransaction?.description?.trim())
      e.description = "Description is required";
    const a = parseFloat(newTransaction?.amount);
    if (!newTransaction?.amount) e.amount = "Amount is required";
    else if (isNaN(a) || a <= 0) e.amount = "Enter a valid amount";
    setErrors(e);
    return !e.description && !e.amount;
  };

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    const desc = newTransaction?.description?.trim();
    if (desc) learnCategory(desc, newTransaction?.category);
    setErrors({ description: "", amount: "" });
    setNewTransaction((p) => {
      const { [MANUAL_FLAG]: _, ...clean } = p ?? {};
      return clean;
    });
    setTimeout(() => handleAddTransaction(), 0);
  }, [newTransaction, handleAddTransaction, setNewTransaction]);

  const today = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear()}-01-01`;

  if (!showModal) return null;

  const modalContent = (
    <>
      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { transform: translateY(16px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes aiPop {
          from { transform: scale(0.97); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        .modal-enter { animation: modalFadeIn 0.28s cubic-bezier(0.34,1.1,0.64,1) both; }
        .ai-pop      { animation: aiPop 0.2s ease-out both; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.4) sepia(1) saturate(0.5);
          cursor: pointer;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }

        .cat-btn { transition: all 0.15s ease; }
        .cat-btn:active { transform: scale(0.93); }

        .modal-scroll::-webkit-scrollbar { width: 3px; }
        .modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .modal-scroll::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius: 2px; }
      `}</style>

      {/* ── Backdrop: always true fullscreen, ignores all parent transforms ── */}
      <div
        onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          background: "rgba(4,6,12,0.80)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* ── Dialog ────────────────────────────────────────────────────── */}
        <div
          className="modal-enter"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 448,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#0d1526",
            border: "1px solid #1a2035",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.12)",
            maxHeight: "92vh",
          }}
        >
          {/* Accent top line */}
          <div
            style={{
              height: 2,
              width: "100%",
              flexShrink: 0,
              background: isIncome
                ? "linear-gradient(90deg, #1AFFD5, #06b6d4)"
                : "linear-gradient(90deg, #f97316, #f59e0b)",
              boxShadow: isIncome ? "0 0 12px #1AFFD540" : "0 0 12px #f9731640",
            }}
          />

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              padding: "16px 20px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #0f1729",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `${accent}15`,
                  border: `1px solid ${accent}30`,
                  color: accent,
                }}
              >
                {isIncome ? "Income" : "Expense"}
              </span>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#e2e8f0",
                  margin: 0,
                }}
              >
                {isIncome ? "Add new income" : "Add new expense"}
              </h2>
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef444440";
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2035";
                e.currentTarget.style.background = "#0a0f1e";
              }}
            >
              <X size={13} color="#6b7280" />
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div
            className="modal-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Description */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                  color: "#374151",
                }}
              >
                Description
              </label>
              <input
                type="text"
                value={newTransaction?.description ?? ""}
                onChange={(e) =>
                  setNewTransaction((p) => ({
                    ...p,
                    description: e.target.value,
                    [MANUAL_FLAG]: false,
                  }))
                }
                onFocus={() => setFocusedField("desc")}
                onBlur={() => setFocusedField(null)}
                placeholder={
                  isIncome ? "e.g. Monthly salary" : "e.g. Lunch at café"
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 14,
                  boxSizing: "border-box",
                  ...inputStyle(
                    !!errors.description,
                    focusedField === "desc",
                    accent,
                  ),
                }}
              />
              {errors.description && (
                <p style={{ fontSize: 10, marginTop: 4, color: "#ef4444" }}>
                  {errors.description}
                </p>
              )}

              {/* AI hint */}
              <div style={{ marginTop: 8, minHeight: 26 }} aria-live="polite">
                {aiDetection ? (
                  <div
                    className="ai-pop"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 12,
                      fontSize: 11,
                      background: `${accent}10`,
                      border: `1px solid ${accent}25`,
                    }}
                  >
                    <Sparkles
                      size={10}
                      color={accent}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, color: "#6b7280" }}>
                      Auto-selected{" "}
                      <span style={{ fontWeight: 600, color: accent }}>
                        {aiDetection.category.replace(/_/g, " ")}
                      </span>{" "}
                      <span style={{ color: "#374151" }}>(AI)</span>
                    </span>
                    <button
                      onClick={() => setAiDetection(null)}
                      style={{
                        color: "#374151",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#1e3a5f",
                    }}
                  >
                    <Sparkles size={9} style={{ color: "#1e3a5f" }} />
                    Type a description for AI category suggestion
                  </p>
                )}
              </div>
            </div>

            {/* Amount + Date */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={newTransaction?.amount ?? ""}
                  onChange={(e) =>
                    setNewTransaction((p) => ({
                      ...p,
                      amount: e.target.value,
                    }))
                  }
                  onFocus={() => setFocusedField("amount")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  min="1"
                  step="0.01"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 14,
                    boxSizing: "border-box",
                    ...inputStyle(
                      !!errors.amount,
                      focusedField === "amount",
                      accent,
                    ),
                  }}
                />
                {errors.amount && (
                  <p style={{ fontSize: 10, marginTop: 4, color: "#ef4444" }}>
                    {errors.amount}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={newTransaction?.date ?? ""}
                  onChange={(e) =>
                    setNewTransaction((p) => ({ ...p, date: e.target.value }))
                  }
                  onFocus={() => setFocusedField("date")}
                  onBlur={() => setFocusedField(null)}
                  min={minDate}
                  max={today}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 14,
                    boxSizing: "border-box",
                    ...inputStyle(false, focusedField === "date", accent),
                  }}
                />
              </div>
            </div>

            {/* Type toggle */}
            {!lockType && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: 8,
                    color: "#374151",
                  }}
                >
                  Type
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 4,
                    padding: 4,
                    borderRadius: 12,
                    background: "#0a0f1e",
                    border: "1px solid #1a2035",
                  }}
                  role="group"
                  aria-label="Transaction type"
                >
                  {["income", "expense"].map((t) => {
                    const active = newTransaction?.type === t;
                    const col = t === "income" ? "#1AFFD5" : "#f97316";
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeToggle(t)}
                        style={
                          active
                            ? {
                                padding: "8px 0",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: "capitalize",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                background: `${col}18`,
                                border: `1px solid ${col}35`,
                                color: col,
                                boxShadow: `0 0 8px ${col}20`,
                              }
                            : {
                                padding: "8px 0",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: "capitalize",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                background: "transparent",
                                border: "1px solid transparent",
                                color: "#374151",
                              }
                        }
                      >
                        {t === "income" ? "↑ Income" : "↓ Expense"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category grid */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Category
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                }}
              >
                {cats.map(({ key, icon, color }) => {
                  const active = newTransaction?.category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCatSelect(key)}
                      className="cat-btn"
                      style={
                        active
                          ? {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              padding: "10px 8px",
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: "pointer",
                              background: `${color}20`,
                              border: `1px solid ${color}50`,
                              color: color,
                              boxShadow: `0 0 10px ${color}20`,
                            }
                          : {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              padding: "10px 8px",
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: "pointer",
                              background: "#0a0f1e",
                              border: "1px solid #1a2035",
                              color: "#374151",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.borderColor = `${color}30`;
                          e.currentTarget.style.color = color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.borderColor = "#1a2035";
                          e.currentTarget.style.color = "#374151";
                        }
                      }}
                    >
                      <span style={{ color: active ? color : "inherit" }}>
                        {icon}
                      </span>
                      {key.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              padding: "16px 20px",
              display: "flex",
              gap: 10,
              borderTop: "1px solid #0f1729",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                color: "#6b7280",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef444430";
                e.currentTarget.style.color = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2035";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                border: "none",
                background: isIncome
                  ? "linear-gradient(135deg, #0d9e75, #1AFFD5)"
                  : "linear-gradient(135deg, #c2410c, #f97316)",
                color: isIncome ? "#001a14" : "#fff",
                boxShadow: isIncome
                  ? "0 0 20px #1AFFD530, 0 4px 12px rgba(0,0,0,0.4)"
                  : "0 0 20px #f9731630, 0 4px 12px rgba(0,0,0,0.4)",
                opacity: loading ? 0.55 : 1,
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <Plus size={14} />
                  {isIncome ? "Add Income" : "Add Expense"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Portal: renders directly into <body>, bypasses all parent CSS transforms/overflow
  return ReactDOM.createPortal(modalContent, document.body);
};

export default AddTransactionModal;
