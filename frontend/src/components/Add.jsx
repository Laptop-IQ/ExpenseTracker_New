import React, { useEffect, useRef, useState, useCallback } from "react";
import { modalStyles } from "../assets/dummyStyles";
import { X } from "lucide-react";
import { smartDetectCategory, learnCategory } from "../utils/smartCategoryAI";

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

  // =========================
  // 🧠 AI STATE
  // =========================
  const [ai, setAi] = useState({
    category: null,
    confidence: 0,
  });

  const [isThinking, setIsThinking] = useState(false);

  const debounceRef = useRef(null);
  const lastTextRef = useRef("");

  // =========================
  // 🧠 AI ENGINE + AUTO SELECT
  // =========================
  useEffect(() => {
    const text = newTransaction?.description?.trim();

    if (!text) {
      setAi({ category: null, confidence: 0 });
      setIsThinking(false);
      lastTextRef.current = "";
      return;
    }

    if (lastTextRef.current === text) return;
    lastTextRef.current = text;

    setIsThinking(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(text);

      const category = typeof result === "string" ? result : result.category;

      const confidence =
        typeof result === "string" ? 0.6 : result.confidence || 0;

      setAi({ category, confidence });

      // =========================
      // 🚀 AUTO SELECT LOGIC
      // =========================
      setNewTransaction((prev) => {
        // user already manually selected → never override
        if (prev?._manualCategory) return prev;

        // AUTO SELECT ONLY HIGH CONFIDENCE
        if (confidence >= 0.8 && category) {
          return {
            ...prev,
            category,
          };
        }

        return prev;
      });

      setIsThinking(false);
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [newTransaction?.description]);

  // =========================
  // 🧠 APPLY AI SUGGESTION
  // =========================
  const applySuggestion = useCallback(() => {
    if (!ai.category) return;

    setNewTransaction((prev) => ({
      ...prev,
      category: ai.category,
      _manualCategory: true,
    }));

    if (newTransaction?.description) {
      learnCategory(newTransaction.description, ai.category);
    }
  }, [ai.category, newTransaction?.description, setNewTransaction]);

  // =========================
  // 🧠 MANUAL CATEGORY SELECT
  // =========================
  const handleCategorySelect = useCallback(
    (cat) => {
      setNewTransaction((prev) => ({
        ...prev,
        category: cat,
        _manualCategory: true,
      }));

      if (newTransaction?.description) {
        learnCategory(newTransaction.description, cat);
      }
    },
    [newTransaction?.description, setNewTransaction],
  );

  // =========================
  // ⛔ SAFE RENDER
  // =========================
  if (!showModal) return null;

  // 📅 DATE LOGIC
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentDate = today.toISOString().split("T")[0];
  const minDate = `${currentYear}-01-01`;


  return (
    <div className={`${modalStyles.overlay} flex items-end md:items-center`}>
      <div
        className={`${modalStyles.modal} w-full md:max-w-lg h-[95vh] flex flex-col`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h3 className={modalStyles.modalTitle}>{title}</h3>
          <button onClick={() => setShowModal(false)}>
            <X size={22} />
          </button>
        </div>

        {/* BODY */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTransaction();
          }}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
        >
          {/* DESCRIPTION */}
          <div>
            <label className={modalStyles.label}>Description</label>

            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className={`${modalStyles.input(colorClass.ring)} h-11 border border-gray-900`}
              placeholder="Enter description"
              required
            />

            {/* AI UI */}
            <div className="mt-2 text-sm">
              {isThinking ? (
                <span className="text-gray-500">🤖 Thinking...</span>
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
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">
                  Type description for AI suggestion
                </span>
              )}
            </div>
          </div>

          {/* AMOUNT */}
          <div>
            <label className={modalStyles.label}>Amount</label>
            <input
              type="number"
              value={newTransaction.amount}
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
            <label className={modalStyles.label}>Date</label>

            <input
              type="date"
              value={newTransaction.date || ""}
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
          {/* TYPE */}
          {type === "both" && (
            <div className="flex gap-2">
              {["income", "expense"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setNewTransaction((prev) => ({ ...prev, type: t }))
                  }
                  className={`flex-1 py-2 rounded-lg ${
                    newTransaction.type === t
                      ? "bg-green-500 text-white"
                      : "bg-gray-100"
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

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isActive = newTransaction.category === cat;
                const isSuggested = ai.category === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm border transition
                      ${
                        isActive
                          ? "bg-green-500 text-white"
                          : "bg-white border-gray-300"
                      }
                      ${
                        isSuggested && !isActive
                          ? "ring-2 ring-green-400 animate-pulse"
                          : ""
                      }
                    `}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleAddTransaction}
            className={`${modalStyles.submitButton(colorClass.button)} w-full py-3`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};;

export default AddTransactionModal;
