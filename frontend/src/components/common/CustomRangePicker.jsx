import React, { useCallback, useRef, useState } from "react";
import { CalendarRange, Check, ChevronLeft, ChevronRight } from "lucide-react";
import SelectorPopover, { SelectorTrigger } from "./SelectorPopover";
import {
  formatCustomRangeLabel,
  fromMonthIndex,
  getCurrentMonthIndex,
  getDefaultCustomRange,
  normalizeCustomRange,
  toMonthIndex,
} from "../../utils/commonHelpers";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
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

const YEARS_BACK = 5;

const sameRange = (a, b) => a.start === b.start && a.end === b.end;

/* -------------------------------------------------------------------------- */
/*  Panel (mounted fresh every time the picker opens, so the draft starts     */
/*  from the applied range)                                                   */
/* -------------------------------------------------------------------------- */

function RangePanel({ value, onApply, isSheet }) {
  const now = new Date();
  const max = getCurrentMonthIndex(now);
  const currentYear = now.getFullYear();

  const [draft, setDraft] = useState(() => normalizeCustomRange(value));
  // after the first click we wait for the end month
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hover, setHover] = useState(null);
  const [viewYear, setViewYear] = useState(
    () => fromMonthIndex(normalizeCustomRange(value).end).year,
  );

  const lo = pickingEnd && hover !== null ? Math.min(draft.start, hover) : draft.start;
  const hi = pickingEnd && hover !== null ? Math.max(draft.start, hover) : draft.end;

  const handlePick = (index) => {
    if (index > max) return;

    if (!pickingEnd) {
      setDraft({ start: index, end: index });
      setPickingEnd(true);
      return;
    }

    setDraft({
      start: Math.min(draft.start, index),
      end: Math.max(draft.start, index),
    });
    setPickingEnd(false);
    setHover(null);
  };

  const count = draft.end - draft.start + 1;
  const dirty = !sameRange(draft, normalizeCustomRange(value));

  const cellH = isSheet ? "h-12 text-sm" : "h-10 text-xs";

  return (
    <div className="space-y-3">
      {/* Year navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0b0f1f] px-1.5 py-1.5 shadow-inner shadow-black/20">
        <button
          type="button"
          aria-label="Previous year"
          disabled={viewYear <= currentYear - YEARS_BACK}
          onClick={() => setViewYear((y) => y - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="rounded-lg px-3 py-1 text-sm font-black tracking-tight text-slate-100">
          {viewYear}
        </span>

        <button
          type="button"
          aria-label="Next year"
          disabled={viewYear >= currentYear}
          onClick={() => setViewYear((y) => y + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Month grid with continuous range band */}
      <div className="rounded-2xl border border-white/[0.055] bg-[#090d1b]/80 p-2" onMouseLeave={() => setHover(null)}>
        <div className="grid grid-cols-3 gap-1.5">
        {MONTHS_SHORT.map((name, month) => {
          const index = toMonthIndex(viewYear, month);
          const disabled = index > max;
          const inRange = index >= lo && index <= hi;
          const isStart = index === lo;
          const isEnd = index === hi;
          const edge = inRange && (isStart || isEnd);
          const col = month % 3;

          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              aria-pressed={inRange}
              aria-label={`${MONTHS_LONG[month]} ${viewYear}`}
              onClick={() => handlePick(index)}
              onMouseEnter={() => pickingEnd && !disabled && setHover(index)}
              className={`group relative flex items-center justify-center font-bold outline-none transition ${cellH} ${
                inRange ? "bg-violet-500/15" : ""
              } ${inRange && (isStart || col === 0) ? "rounded-l-xl" : ""} ${
                inRange && (isEnd || col === 2) ? "rounded-r-xl" : ""
              } ${disabled ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`flex h-[85%] w-[88%] items-center justify-center rounded-xl transition ${
                  edge
                    ? "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white shadow-[0_8px_20px_rgba(124,58,237,.38)]"
                    : disabled
                      ? "text-slate-700"
                      : inRange
                        ? "text-violet-200"
                        : "text-slate-300 group-hover:bg-white/[0.06] group-focus-visible:ring-2 group-focus-visible:ring-violet-500/50"
                }`}
              >
                {name}
              </span>
            </button>
          );
        })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between rounded-2xl border border-violet-400/10 bg-gradient-to-r from-violet-500/[0.07] to-white/[0.02] px-3 py-2.5 shadow-[inset_0_1px_rgba(255,255,255,.03)]">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-slate-100">
            {pickingEnd
              ? `${formatCustomRangeLabel(draft)} → pick end month`
              : formatCustomRangeLabel(draft)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
            {pickingEnd
              ? "Tap another month to finish"
              : `${count} month${count === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-white/[0.05] pt-2">
        <button
          type="button"
          onClick={() => {
            setDraft(getDefaultCustomRange());
            setPickingEnd(false);
            setViewYear(currentYear);
          }}
          className={`rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 font-bold text-slate-300 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white active:scale-[.98] ${
            isSheet ? "h-12 text-sm" : "h-9 text-xs"
          }`}
        >
          Reset
        </button>

        <button
          type="button"
          disabled={pickingEnd}
          onClick={() => onApply(draft)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 font-black text-white shadow-[0_8px_24px_rgba(124,58,237,.35)] transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${
            isSheet ? "h-12 text-sm" : "h-9 text-xs"
          }`}
        >
          <Check size={14} strokeWidth={3} />
          {dirty ? "Apply range" : "Done"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CustomRangePicker({ customRange, setCustomRange, className = "" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const handleApply = useCallback(
    (range) => {
      setCustomRange(normalizeCustomRange(range));
      setOpen(false);
      triggerRef.current?.focus();
    },
    [setCustomRange],
  );

  return (
    <>
      <SelectorTrigger
        ref={triggerRef}
        icon={CalendarRange}
        label={formatCustomRangeLabel(customRange)}
        open={open}
        popupRole="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={`col-span-full ${className}`}
      />

      <SelectorPopover
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        title="Custom range"
        ariaLabel="Custom month range"
        icon={CalendarRange}
        contentRole="group"
        width={380}
      >
        {({ isSheet }) => (
          <RangePanel
            value={customRange}
            onApply={handleApply}
            isSheet={isSheet}
          />
        )}
      </SelectorPopover>
    </>
  );
}

export default CustomRangePicker;
