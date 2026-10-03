import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Check, ChevronDown } from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Month-wise filter.
 *
 * selectedMonth : 0-11, or null when `allowAll` is on and "All months" is chosen
 * selectedYear  : used to disable future months when the current year is chosen
 * allowAll      : adds an "All months" option (used by the Yearly view)
 */
function MonthSelector({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth(),
  allowAll = false,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 260 });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const isAll = selectedMonth === null || selectedMonth === undefined;

  const isCurrentMonth =
    !isAll && selectedYear === currentYear && selectedMonth === currentMonth;

  const isFuture = (monthIndex) =>
    selectedYear > currentYear ||
    (selectedYear === currentYear && monthIndex > currentMonth);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 260;
    const gap = 8;
    const padding = 12;

    let left = rect.left;

    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }

    left = Math.max(padding, left);

    setPosition({ top: rect.bottom + gap, left, width: dropdownWidth });
  }, []);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      const target = event.target;

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleSelect = (monthIndex) => {
    if (monthIndex !== null && isFuture(monthIndex)) return;

    setSelectedMonth(monthIndex);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="
          group relative
          inline-flex h-10
          items-center gap-2
          rounded-full
          border border-violet-500/30
          bg-[#080b18]
          px-3
          shadow-[0_0_0_1px_rgba(124,58,237,.08),0_8px_30px_rgba(0,0,0,.25)]
          transition-all duration-200
          hover:border-violet-500/50
          hover:bg-[#0b0f20]
          focus:outline-none
          focus:ring-2
          focus:ring-violet-500/20
        "
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
          <CalendarRange size={14} strokeWidth={2.2} />
        </span>

        <span className="text-xs font-black tracking-tight text-slate-100">
          {isAll ? "All months" : MONTHS[selectedMonth]}
        </span>

        {isCurrentMonth && (
          <span className="flex items-center gap-1.5 border-l border-white/10 pl-2 text-[9px] font-bold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Current
          </span>
        )}

        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`ml-1 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180 text-violet-400" : ""
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            aria-label="Select month"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 999999,
            }}
            className="
              overflow-hidden
              rounded-xl
              border border-white/[0.08]
              bg-[#080b18]/[0.98]
              p-1.5
              shadow-[0_24px_70px_rgba(0,0,0,.55),0_0_0_1px_rgba(139,92,246,.08)]
              backdrop-blur-2xl
            "
          >
            <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Select month · {selectedYear}
              </span>

              <CalendarRange size={12} className="text-violet-500/50" />
            </div>

            {allowAll && (
              <button
                type="button"
                role="option"
                aria-selected={isAll}
                onClick={() => handleSelect(null)}
                className={`
                  mb-1 flex w-full items-center justify-between
                  rounded-lg px-3 py-2.5
                  text-xs font-extrabold
                  transition-all duration-150
                  ${
                    isAll
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-slate-200 hover:bg-white/[0.04]"
                  }
                `}
              >
                All months
                {isAll && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
              </button>
            )}

            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((name, index) => {
                const selected = !isAll && index === selectedMonth;
                const disabled = isFuture(index);
                const current =
                  selectedYear === currentYear && index === currentMonth;

                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => handleSelect(index)}
                    className={`
                      relative
                      flex flex-col items-center justify-center
                      rounded-lg
                      px-2 py-2.5
                      text-xs font-extrabold
                      transition-all duration-150
                      ${
                        selected
                          ? "bg-violet-500/15 text-violet-300"
                          : disabled
                            ? "cursor-not-allowed text-slate-700"
                            : "text-slate-200 hover:bg-white/[0.04]"
                      }
                    `}
                  >
                    {name.slice(0, 3)}

                    {current && (
                      <span className="mt-0.5 text-[8px] font-semibold text-emerald-400">
                        Now
                      </span>
                    )}

                    {selected && (
                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500 text-white">
                        <Check size={8} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default MonthSelector;
