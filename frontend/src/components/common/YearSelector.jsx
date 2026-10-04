import React, { useCallback, useMemo, useRef, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import SelectorPopover, { SelectorTrigger } from "./SelectorPopover";

// Generate year options
const getYearOptions = (currentYear, count = 3) => {
  return Array.from({ length: count }, (_, index) => currentYear - index);
};

function YearSelector({
  selectedYear,
  setSelectedYear,
  currentYear = new Date().getFullYear(),
  className = "",
}) {
  const years = useMemo(() => getYearOptions(currentYear, 3), [currentYear]);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <SelectorTrigger
        ref={triggerRef}
        icon={CalendarDays}
        label={String(selectedYear)}
        isCurrent={selectedYear === currentYear}
        open={open}
        onClick={() => setOpen((prev) => !prev)}
        className={className}
      />

      <SelectorPopover
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        title="Select year"
        ariaLabel="Select year"
        icon={CalendarDays}
        width={220}
      >
        {({ isSheet }) => (
          <div className={isSheet ? "space-y-1.5" : "space-y-0.5"}>
            {years.map((year) => {
              const selected = year === selectedYear;
              const current = year === currentYear;

              return (
                <button
                  key={year}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelectYear(year)}
                  className={`
                    flex w-full items-center justify-between
                    rounded-xl px-3 text-left
                    transition-all duration-150
                    ${isSheet ? "min-h-14 py-2" : "py-2.5"}
                    ${
                      selected
                        ? "bg-violet-500/10"
                        : "hover:bg-white/[0.04] active:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-lg
                        text-[10px] font-black
                        ${
                          selected
                            ? "bg-violet-500/15 text-violet-400"
                            : "bg-white/[0.04] text-slate-500"
                        }
                      `}
                    >
                      {String(year).slice(-2)}
                    </span>

                    <div>
                      <div
                        className={`font-extrabold ${
                          isSheet ? "text-sm" : "text-xs"
                        } ${selected ? "text-violet-300" : "text-slate-200"}`}
                      >
                        {year}
                      </div>

                      {current && (
                        <div className="mt-0.5 text-[9px] font-semibold text-emerald-400">
                          Current year
                        </div>
                      )}
                    </div>
                  </div>

                  {selected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_4px_12px_rgba(124,58,237,.35)]">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SelectorPopover>
    </>
  );
}

export default YearSelector;
