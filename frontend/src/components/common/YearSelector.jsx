import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown } from "lucide-react";

// Generate year options
const getYearOptions = (currentYear, count = 3) => {
  return Array.from({ length: count }, (_, index) => currentYear - index);
};

function YearSelector({
  selectedYear,
  setSelectedYear,
  currentYear = new Date().getFullYear(),
}) {
  const years = useMemo(() => getYearOptions(currentYear, 3), [currentYear]);

  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 220,
  });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const isCurrentYear = selectedYear === currentYear;

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const dropdownWidth = 220;
    const gap = 8;
    const padding = 12;

    let left = rect.left;

    // Prevent dropdown from going outside right side
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }

    // Prevent dropdown from going outside left side
    left = Math.max(padding, left);

    setPosition({
      top: rect.bottom + gap,
      left,
      width: dropdownWidth,
    });
  }, []);

  // Reposition on resize and scroll
  useEffect(() => {
    if (!open) return;

    const handlePosition = () => {
      updatePosition();
    };

    window.addEventListener("resize", handlePosition);

    window.addEventListener("scroll", handlePosition, true);

    return () => {
      window.removeEventListener("resize", handlePosition);

      window.removeEventListener("scroll", handlePosition, true);
    };
  }, [open, updatePosition]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Close when clicking outside
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

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  // Select year
  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Toggle dropdown
  const handleToggle = () => {
    if (!open) {
      updatePosition();
    }

    setOpen((prev) => !prev);
  };

  return (
    <>
      {/* =========================
          YEAR SELECTOR BUTTON
      ========================== */}
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
        {/* Calendar icon */}
        <span
          className="
            flex h-7 w-7
            items-center justify-center
            rounded-full
            bg-violet-500/10
            text-violet-400
          "
        >
          <CalendarDays size={14} strokeWidth={2.2} />
        </span>

        {/* Selected year */}
        <span
          className="
            text-xs
            font-black
            tracking-tight
            text-slate-100
          "
        >
          {selectedYear}
        </span>

        {/* Current year badge */}
        {isCurrentYear && (
          <span
            className="
              flex items-center gap-1.5
              border-l border-white/10
              pl-2
              text-[9px]
              font-bold
              text-emerald-400
            "
          >
            <span
              className="
                relative
                flex h-1.5 w-1.5
              "
            >
              <span
                className="
                  absolute inset-0
                  animate-ping
                  rounded-full
                  bg-emerald-400/50
                "
              />

              <span
                className="
                  relative
                  h-1.5 w-1.5
                  rounded-full
                  bg-emerald-400
                "
              />
            </span>
            Current
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`
            ml-1
            text-slate-500
            transition-transform duration-200
            ${open ? "rotate-180 text-violet-400" : ""}
          `}
        />
      </button>

      {/* =========================
          DROPDOWN
      ========================== */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            id="year-selector-dropdown"
            role="listbox"
            aria-label="Select year"
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
            {/* Header */}
            <div
              className="
                flex
                items-center
                justify-between
                px-2.5
                pb-2
                pt-1.5
              "
            >
              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-slate-500
                "
              >
                Select year
              </span>

              <CalendarDays size={12} className="text-violet-500/50" />
            </div>

            {/* Year options */}
            <div className="space-y-0.5">
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
                      group/year
                      flex w-full
                      items-center
                      justify-between
                      rounded-xl
                      px-3 py-2.5
                      text-left
                      transition-all duration-150
                      ${selected ? "bg-violet-500/10" : "hover:bg-white/[0.04]"}
                    `}
                  >
                    {/* Left content */}
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      {/* Year badge */}
                      <span
                        className={`
                          flex
                          h-7 w-7
                          items-center
                          justify-center
                          rounded-lg
                          text-[10px]
                          font-black
                          ${
                            selected
                              ? "bg-violet-500/15 text-violet-400"
                              : "bg-white/[0.04] text-slate-500"
                          }
                        `}
                      >
                        {String(year).slice(-2)}
                      </span>

                      {/* Year text */}
                      <div>
                        <div
                          className={`
                            text-xs
                            font-extrabold
                            ${selected ? "text-violet-300" : "text-slate-200"}
                          `}
                        >
                          {year}
                        </div>

                        {/* Current year */}
                        {current && (
                          <div
                            className="
                              mt-0.5
                              text-[9px]
                              font-semibold
                              text-emerald-400
                            "
                          >
                            Current year
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected check */}
                    {selected && (
                      <span
                        className="
                          flex
                          h-5 w-5
                          items-center
                          justify-center
                          rounded-full
                          bg-violet-500
                          text-white
                          shadow-[0_4px_12px_rgba(124,58,237,.35)]
                        "
                      >
                        <Check size={11} strokeWidth={3} />
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

export default YearSelector;
