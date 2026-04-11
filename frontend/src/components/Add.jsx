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
  categories = [
  "Salary",
  "Extra_Income",
  "Freelance",
  "Investment",
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Housing",
  "Annual_Expense",
  "Side_Hustles",
  "Kids_Needs",
  "Vehicle_Expenses",
  "Personal_Care_Expenses",
  "Dairy",
  "Junk_Food",
  "Grocery",
],
  color = "teal",
}) => {
  if (!showModal) return null;

  const colorClass = modalStyles.colorClasses[color];

  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isThinking, setIsThinking] = useState(false);

  const scrollRef = useRef(null);
  const debounceRef = useRef(null);

  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const minDate = `${today.getFullYear()}-01-01`;

  // =========================
  // 🧠 AI CATEGORY (DEBOUNCED)
  // =========================
  useEffect(() => {
    const text = newTransaction?.description?.trim();

    if (!text) {
      setSuggestedCategory(null);
      return;
    }

    setIsThinking(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const result = smartDetectCategory(text);

      setSuggestedCategory(result);
      setIsThinking(false);

      // AUTO APPLY ONLY IF USER HAS NOT OVERRIDDEN
      setNewTransaction((prev) => {
        if (prev?._manualCategory) return prev;

        return {
          ...prev,
          category: result,
        };
      });
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [newTransaction.description, setNewTransaction]);

  // =========================
  // 🧠 USER LEARNING (SAFE)
  // =========================
  const handleCategorySelect = useCallback(
    (cat) => {
      setNewTransaction((prev) => ({
        ...prev,
        category: cat,
        _manualCategory: true,
      }));

      // AI learns from user choice
      if (newTransaction?.description) {
        learnCategory(newTransaction.description, cat);
      }
    },
    [newTransaction?.description, setNewTransaction],
  );

  // =========================
  // 🖱️ DRAG SCROLL (SMOOTH)
  // =========================
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if (!slider) return;

    const startX = e.pageX;
    const scrollLeft = slider.scrollLeft;

    const onMove = (event) => {
      const x = event.pageX;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    };

    const stop = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", stop);
  };

  return (
    <div className={`${modalStyles.overlay} flex items-end md:items-center`}>
      <div
        className={`${modalStyles.modal} w-full md:max-w-lg h-[95vh] md:h-auto rounded-t-2xl md:rounded-xl flex flex-col`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
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
              className={`${modalStyles.input(colorClass.ring)} h-11`}
              placeholder="Enter description"
              required
            />

            <p className="text-xs text-gray-500 mt-1">
              {isThinking
                ? "🤖 AI analyzing..."
                : suggestedCategory
                  ? `🤖 Suggested: ${suggestedCategory}`
                  : "Type description to get AI suggestion"}
            </p>
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
              className={`${modalStyles.input(colorClass.ring)} h-11`}
              placeholder="0.00"
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
                  className={`flex-1 py-2 rounded-lg transition ${
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

            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              className="flex gap-2 overflow-x-auto md:flex-wrap cursor-grab active:cursor-grabbing pb-2"
            >
              {categories.map((cat) => {
                const isActive = newTransaction.category === cat;
                const isSuggested = suggestedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm border transition-all duration-200

                      ${
                        isActive
                          ? "bg-green-500 text-white border-green-500 scale-105 shadow-md"
                          : "bg-white border-gray-300 hover:bg-gray-100"
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

          {/* DATE */}
          <div>
            <label className={modalStyles.label}>Date</label>
            <input
              type="date"
              value={newTransaction.date}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  date: e.target.value,
                }))
              }
              className={`${modalStyles.input(colorClass.ring)} h-11`}
              min={minDate}
              max={currentDate}
              required
            />
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-4 border-t bg-white sticky bottom-0">
          <button
            onClick={handleAddTransaction}
            className={`${modalStyles.submitButton(
              colorClass.button,
            )} w-full py-3`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;
