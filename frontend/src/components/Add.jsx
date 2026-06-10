import React, { useEffect, useRef, useState, useCallback } from "react";
import { modalStyles } from "../assets/dummyStyles";
import { X } from "lucide-react";
import { smartDetectCategory, learnCategory } from "../utils/smartCategoryAI";

// ─── Private flag key (kept out of transaction shape) ───────────────────────
const MANUAL_FLAG = "_manualCategory";

const AddTransactionModal = ({
  showModal,
  setShowModal,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  type = "both",
  title = "Add New Transaction",
  buttonText = "Add Transaction",
  categories = [],
  color = "teal",
}) => {
  const colorClass = modalStyles.colorClasses[color];

  // ─── AI STATE ────────────────────────────────────────────────────────────
  const [ai, setAi] = useState({ category: null, confidence: 0 });
  const [isThinking, setIsThinking] = useState(false);

  const debounceRef = useRef(null);
  const lastTextRef = useRef("");
  const isMountedRef = useRef(true);

  // Track mount state to prevent setState after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── AI ENGINE ───────────────────────────────────────────────────────────
  useEffect(() => {
    const text = newTransaction?.description?.trim() ?? "";

    if (!text) {
      setAi({ category: null, confidence: 0 });
      setIsThinking(false);
      lastTextRef.current = "";
      return;
    }

    // Skip if text hasn't changed
    if (lastTextRef.current === text) return;
    lastTextRef.current = text;

    setIsThinking(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      try {
        const result = smartDetectCategory(text);
        const category =
          result && typeof result === "object"
            ? result.category
            : (result ?? null);
        const confidence =
          result && typeof result === "object"
            ? (result.confidence ?? 0.6)
            : 0.6;

        setAi({ category, confidence });

        // Auto-select only on high confidence AND no manual override
        setNewTransaction((prev) => {
          if (prev?.[MANUAL_FLAG]) return prev;
          if (confidence >= 0.8 && category) {
            return { ...prev, category };
          }
          return prev;
        });
      } catch (err) {
        // Silently fail — AI suggestion is non-critical
        console.warn("[AddTransactionModal] smartDetectCategory error:", err);
      } finally {
        if (isMountedRef.current) setIsThinking(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [newTransaction?.description, setNewTransaction]);

  // ─── APPLY AI SUGGESTION ─────────────────────────────────────────────────
  const applySuggestion = useCallback(() => {
    if (!ai.category) return;

    const description = newTransaction?.description?.trim();

    setNewTransaction((prev) => ({
      ...prev,
      category: ai.category,
      [MANUAL_FLAG]: true,
    }));

    if (description) {
      learnCategory(description, ai.category);
    }
  }, [ai.category, newTransaction?.description, setNewTransaction]);

  // ─── MANUAL CATEGORY SELECT ───────────────────────────────────────────────
  const handleCategorySelect = useCallback(
    (cat) => {
      const description = newTransaction?.description?.trim();

      setNewTransaction((prev) => ({
        ...prev,
        category: cat,
        [MANUAL_FLAG]: true,
      }));

      if (description) {
        learnCategory(description, cat);
      }
    },
    [newTransaction?.description, setNewTransaction],
  );

  // ─── TYPE TOGGLE (clears category to avoid cross-type bleed) ─────────────
  const handleTypeToggle = useCallback(
    (t) => {
      setNewTransaction((prev) => ({
        ...prev,
        type: t,
        category: "",
        [MANUAL_FLAG]: false,
      }));
      setAi({ category: null, confidence: 0 });
      lastTextRef.current = "";
    },
    [setNewTransaction],
  );

  // ─── SAFE SUBMIT (strips internal flags before handing off) ──────────────
  const handleSubmit = useCallback(() => {
    setNewTransaction((prev) => {
      // eslint-disable-next-line no-unused-vars
      const { [MANUAL_FLAG]: _flag, ...clean } = prev ?? {};
      return clean;
    });
    // Defer to next tick so state is flushed before parent reads it
    setTimeout(() => handleAddTransaction(), 0);
  }, [handleAddTransaction, setNewTransaction]);

  // ─── DATE BOUNDS ─────────────────────────────────────────────────────────
  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const minDate = `${today.getFullYear()}-01-01`;

  // ─── GUARD ───────────────────────────────────────────────────────────────
  if (!showModal) return null;

  return (
    <div
      className={`${modalStyles.overlay} flex items-end md:items-center`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`${modalStyles.modal} w-full md:max-w-lg h-[95vh] flex flex-col`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h3 id="modal-title" className={modalStyles.modalTitle}>
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => setShowModal(false)}
          >
            <X size={22} />
          </button>
        </div>

        {/* BODY — form handles Enter-key submission, footer button is the CTA */}
        <form
          id="transaction-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
          noValidate
        >
          {/* DESCRIPTION */}
          <div>
            <label htmlFor="txn-description" className={modalStyles.label}>
              Description
            </label>
            <input
              id="txn-description"
              type="text"
              value={newTransaction?.description ?? ""}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  description: e.target.value,
                  // Reset manual flag when description changes so AI can re-suggest
                  [MANUAL_FLAG]: false,
                }))
              }
              className={`${modalStyles.input(colorClass.ring)} h-11 border border-gray-900`}
              placeholder="Enter description"
              autoComplete="off"
              required
            />

            {/* AI HINT */}
            <div className="mt-2 text-sm min-h-[32px]" aria-live="polite">
              {isThinking ? (
                <span className="text-gray-500">🤖 Thinking…</span>
              ) : ai.category ? (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <span className="text-green-600">
                    🤖 {ai.category}{" "}
                    {ai.confidence
                      ? `(${Math.round(ai.confidence * 100)}%)`
                      : ""}
                  </span>
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded-md"
                    aria-label={`Apply AI suggestion: ${ai.category}`}
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">
                  Type a description for an AI suggestion
                </span>
              )}
            </div>
          </div>

          {/* AMOUNT */}
          <div>
            <label htmlFor="txn-amount" className={modalStyles.label}>
              Amount
            </label>
            <input
              id="txn-amount"
              type="number"
              min="0"
              step="0.01"
              value={newTransaction?.amount ?? ""}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              className={`${modalStyles.input(colorClass.ring)} h-11 border border-gray-900`}
              placeholder="0.00"
              required
            />
          </div>

          {/* DATE */}
          <div>
            <label htmlFor="txn-date" className={modalStyles.label}>
              Date
            </label>
            <input
              id="txn-date"
              type="date"
              value={newTransaction?.date ?? ""}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  date: e.target.value,
                }))
              }
              className={`${modalStyles.input(colorClass.ring)} h-11 border border-gray-900`}
              min={minDate}
              max={currentDate}
              required
            />
          </div>

          {/* TYPE TOGGLE */}
          {type === "both" && (
            <div
              className="flex gap-2"
              role="group"
              aria-label="Transaction type"
            >
              {["income", "expense"].map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={newTransaction?.type === t}
                  onClick={() => handleTypeToggle(t)}
                  className={`flex-1 py-2 rounded-lg capitalize transition-colors ${
                    newTransaction?.type === t
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* CATEGORY */}
          <div>
            <label className={modalStyles.label}>Category</label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Categories"
            >
              {categories.map((cat) => {
                const isActive = newTransaction?.category === cat;
                const isSuggested = ai.category === cat && !isActive;

                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleCategorySelect(cat)}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm border transition",
                      isActive
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-white border-gray-300 hover:border-gray-400",
                      isSuggested ? "ring-2 ring-green-400 animate-pulse" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* FOOTER — single submit point */}
        <div className="p-4 border-t bg-white">
          <button
            type="submit"
            form="transaction-form"
            className={`${modalStyles.submitButton(colorClass.button)} w-full py-3`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;
