import React, { useCallback, useRef, useState } from "react";
import { CalendarRange, Check } from "lucide-react";
import SelectorPopover, { SelectorTrigger } from "./SelectorPopover";

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
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const isAll = selectedMonth === null || selectedMonth === undefined;

  const isCurrentMonth =
    !isAll && selectedYear === currentYear && selectedMonth === currentMonth;

  const isFuture = (monthIndex) =>
    selectedYear > currentYear ||
    (selectedYear === currentYear && monthIndex > currentMonth);

  const handleSelect = (monthIndex) => {
    if (monthIndex !== null && isFuture(monthIndex)) return;

    setSelectedMonth(monthIndex);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <SelectorTrigger
        ref={triggerRef}
        icon={CalendarRange}
        label={isAll ? "All months" : MONTHS[selectedMonth]}
        isCurrent={isCurrentMonth}
        open={open}
        onClick={() => setOpen((prev) => !prev)}
        className={className}
      />

      <SelectorPopover
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        title={`Select month · ${selectedYear}`}
        ariaLabel="Select month"
        icon={CalendarRange}
        width={260}
      >
        {({ isSheet }) => (
          <>
            {allowAll && (
              <button
                type="button"
                role="option"
                aria-selected={isAll}
                onClick={() => handleSelect(null)}
                className={`
                  mb-1 flex w-full items-center justify-between
                  rounded-lg px-3
                  font-extrabold transition-all duration-150
                  ${isSheet ? "min-h-12 text-sm" : "py-2.5 text-xs"}
                  ${
                    isAll
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-slate-200 hover:bg-white/[0.04] active:bg-white/[0.06]"
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

            <div className={`grid grid-cols-3 ${isSheet ? "gap-2" : "gap-1"}`}>
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
                      relative flex flex-col items-center justify-center
                      rounded-lg px-2 font-extrabold
                      transition-all duration-150
                      ${isSheet ? "min-h-14 text-sm" : "py-2.5 text-xs"}
                      ${
                        selected
                          ? "bg-violet-500/15 text-violet-300"
                          : disabled
                            ? "cursor-not-allowed text-slate-700"
                            : "text-slate-200 hover:bg-white/[0.04] active:bg-white/[0.08]"
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
          </>
        )}
      </SelectorPopover>
    </>
  );
}

export default MonthSelector;
