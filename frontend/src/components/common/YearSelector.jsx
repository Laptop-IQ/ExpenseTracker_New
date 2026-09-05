import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, Sparkles } from "lucide-react";

function YearSelector({
  selectedYear,
  onYearChange,
  currentYear = new Date().getFullYear(),
  variant = "dark",
  size = "md",
  yearsCount = 6,
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);

  const reactId = useId();
  const dropdownId = `year-selector-${reactId}`;

  const years = useMemo(() => {
    return Array.from(
      { length: yearsCount },
      (_, index) => currentYear - index,
    );
  }, [currentYear, yearsCount]);

  const selectedIndex = years.indexOf(selectedYear);
  const isCurrentYear = selectedYear === currentYear;

  const isDark = variant === "dark";

  const theme = isDark
    ? {
        triggerBg:
          "linear-gradient(135deg, rgba(15,18,35,.96), rgba(9,12,25,.96))",
        triggerBorder: "rgba(139,92,246,.28)",
        triggerHoverBorder: "rgba(139,92,246,.55)",

        dropdownBg:
          "linear-gradient(145deg, rgba(14,17,32,.98), rgba(7,10,21,.99))",
        dropdownBorder: "rgba(148,163,184,.12)",

        primary: "#a78bfa",
        primaryStrong: "#8b5cf6",
        primarySoft: "rgba(139,92,246,.13)",

        text: "#f8fafc",
        muted: "#64748b",
        subtle: "#475569",

        itemHover: "rgba(255,255,255,.045)",
        itemSelected:
          "linear-gradient(135deg, rgba(139,92,246,.17), rgba(99,102,241,.08))",

        badgeBg: "rgba(139,92,246,.14)",
        badgeSelected: "rgba(139,92,246,.25)",

        shadow: "0 30px 80px rgba(0,0,0,.55), 0 12px 35px rgba(76,29,149,.16)",
      }
    : {
        triggerBg: "#ffffff",
        triggerBorder: "rgba(148,163,184,.28)",
        triggerHoverBorder: "rgba(124,58,237,.4)",

        dropdownBg: "linear-gradient(145deg, #ffffff 0%, #fafafa 100%)",
        dropdownBorder: "rgba(148,163,184,.2)",

        primary: "#7c3aed",
        primaryStrong: "#6d28d9",
        primarySoft: "rgba(124,58,237,.08)",

        text: "#111827",
        muted: "#64748b",
        subtle: "#94a3b8",

        itemHover: "rgba(15,23,42,.035)",
        itemSelected:
          "linear-gradient(135deg, rgba(124,58,237,.10), rgba(99,102,241,.05))",

        badgeBg: "#f1f5f9",
        badgeSelected: "#ede9fe",

        shadow:
          "0 25px 65px rgba(15,23,42,.14), 0 8px 25px rgba(124,58,237,.08)",
      };

  const sizes = {
    sm: {
      height: "h-9",
      padding: "px-2.5",
      icon: 13,
      text: "text-xs",
      gap: "gap-1.5",
      badge: "h-6 w-6",
    },
    md: {
      height: "h-10",
      padding: "px-3",
      icon: 14,
      text: "text-xs",
      gap: "gap-2",
      badge: "h-6 w-6",
    },
    lg: {
      height: "h-11",
      padding: "px-3.5",
      icon: 16,
      text: "text-sm",
      gap: "gap-2.5",
      badge: "h-7 w-7",
    },
  }[size];

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const dropdownWidth = Math.min(250, window.innerWidth - 24);
    const viewportPadding = 12;
    const dropdownGap = 9;

    let left = rect.left;

    if (left + dropdownWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - dropdownWidth - viewportPadding;
    }

    left = Math.max(viewportPadding, left);

    const estimatedDropdownHeight = 390;

    const shouldOpenAbove =
      rect.bottom + estimatedDropdownHeight >
      window.innerHeight - viewportPadding;

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top - estimatedDropdownHeight - dropdownGap,
        )
      : rect.bottom + dropdownGap;

    return {
      top,
      left,
      width: dropdownWidth,
    };
  }, []);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 250,
  });

  const handleOpen = () => {
    if (!open) {
      const nextPosition = updatePosition();

      if (nextPosition) {
        setPosition(nextPosition);
      }

      const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setFocusedIndex(nextIndex);
    }

    setOpen((prev) => !prev);
  };

  const handleSelect = useCallback(
    (year) => {
      onYearChange?.(year);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onYearChange],
  );

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => {
      const nextPosition = updatePosition();

      if (nextPosition) {
        setPosition(nextPosition);
      }
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

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

  useEffect(() => {
    if (!open || focusedIndex < 0) return;

    optionRefs.current[focusedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [focusedIndex, open]);

  const handleTriggerKeyDown = (event) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      if (!open) {
        handleOpen();
      } else {
        setFocusedIndex((prev) => (prev < years.length - 1 ? prev + 1 : 0));
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        handleOpen();
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : years.length - 1));
      }
    }
  };

  const handleOptionKeyDown = (event, index, year) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(year);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setFocusedIndex((index + 1) % years.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setFocusedIndex(index === 0 ? years.length - 1 : index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setFocusedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setFocusedIndex(years.length - 1);
    }
  };

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? dropdownId : undefined}
        aria-label={`Select year, currently ${selectedYear}`}
        className={`
          group relative inline-flex items-center
          ${sizes.height}
          ${sizes.padding}
          ${sizes.gap}
          rounded-full
          border
          outline-none
          select-none
          transition-all duration-300 ease-out
          hover:-translate-y-[1px]
          active:translate-y-0
          focus-visible:ring-2
          focus-visible:ring-violet-500/30
        `}
        style={{
          color: theme.text,
          background: theme.triggerBg,
          borderColor: open ? theme.triggerHoverBorder : theme.triggerBorder,
          boxShadow: open
            ? "0 0 0 3px rgba(139,92,246,.08), 0 8px 30px rgba(0,0,0,.18)"
            : "0 3px 15px rgba(0,0,0,.08)",
        }}
      >
        {/* Premium glow */}
        <span
          className="
            pointer-events-none absolute inset-0
            rounded-full opacity-0
            transition-opacity duration-300
            group-hover:opacity-100
          "
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(139,92,246,.08), transparent)",
          }}
        />

        {/* Calendar */}
        <span
          className={`
            relative flex shrink-0 items-center justify-center
            ${sizes.badge}
            rounded-full
            transition-all duration-300
            group-hover:scale-105
          `}
          style={{
            color: theme.primary,
            background: theme.primarySoft,
            boxShadow: open ? `0 0 20px ${theme.primarySoft}` : "none",
          }}
        >
          <CalendarDays size={sizes.icon} strokeWidth={2.2} />
        </span>

        {/* Year */}
        <span
          className={`
            relative font-black tracking-tight
            tabular-nums ${sizes.text}
          `}
        >
          {selectedYear}
        </span>

        {/* Current status */}
        {isCurrentYear && (
          <span
            className="
              relative hidden sm:inline-flex
              items-center gap-1.5
              border-l pl-2.5
            "
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,.08)"
                : "rgba(15,23,42,.08)",
            }}
          >
            <span
              className="
                h-1.5 w-1.5 rounded-full
                bg-emerald-400
                shadow-[0_0_9px_rgba(52,211,153,.8)]
                animate-pulse
              "
            />

            <span
              className="
                text-[9px] font-black
                uppercase tracking-[.08em]
              "
              style={{
                color: isDark ? "#34d399" : "#059669",
              }}
            >
              Current
            </span>
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          size={sizes.icon}
          strokeWidth={2.5}
          className={`
            relative shrink-0
            transition-all duration-300
            ${open ? "rotate-180" : "group-hover:translate-y-[1px]"}
          `}
          style={{
            color: theme.muted,
          }}
        />
      </button>

      {/* Dropdown */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            id={dropdownId}
            role="listbox"
            aria-label="Select year"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 999999,
              color: theme.text,
              background: theme.dropdownBg,
              border: `1px solid ${theme.dropdownBorder}`,
              boxShadow: theme.shadow,
            }}
            className="
              overflow-hidden
              rounded-2xl
              backdrop-blur-2xl
              animate-in fade-in zoom-in-95
              duration-200
            "
          >
            {/* Top accent */}
            <div
              className="
                absolute left-6 right-6 top-0
                h-px
              "
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,.7), transparent)",
              }}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between px-4 pb-2.5 pt-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-lg
                  "
                  style={{
                    color: theme.primary,
                    background: theme.primarySoft,
                  }}
                >
                  <CalendarDays size={13} strokeWidth={2.2} />
                </span>

                <div>
                  <div
                    className="
                      text-[10px] font-black
                      uppercase tracking-[.18em]
                    "
                    style={{ color: theme.text }}
                  >
                    Select year
                  </div>

                  <div
                    className="mt-0.5 text-[9px]"
                    style={{ color: theme.muted }}
                  >
                    Choose reporting period
                  </div>
                </div>
              </div>

              <Sparkles
                size={13}
                strokeWidth={2}
                style={{
                  color: theme.primary,
                  opacity: 0.65,
                }}
              />
            </div>

            {/* Divider */}
            <div
              className="mx-4 h-px"
              style={{
                background: isDark
                  ? "rgba(255,255,255,.06)"
                  : "rgba(15,23,42,.07)",
              }}
            />

            {/* Options */}
            <div
              className="
                max-h-[330px]
                overflow-y-auto
                p-2
                scrollbar-thin
              "
            >
              {years.map((year, index) => {
                const selected = year === selectedYear;
                const current = year === currentYear;
                const previous = year === currentYear - 1;
                const focused = index === focusedIndex;

                return (
                  <button
                    key={year}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    tabIndex={focused ? 0 : -1}
                    aria-selected={selected}
                    onClick={() => handleSelect(year)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onKeyDown={(event) =>
                      handleOptionKeyDown(event, index, year)
                    }
                    className="
                      group/option
                      relative flex w-full items-center
                      justify-between
                      rounded-xl
                      px-2.5 py-2.5
                      text-left
                      outline-none
                      transition-all duration-200
                    "
                    style={{
                      background: selected
                        ? theme.itemSelected
                        : focused
                          ? theme.itemHover
                          : "transparent",
                      boxShadow: selected
                        ? "inset 0 0 0 1px rgba(139,92,246,.10)"
                        : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Year badge */}
                      <span
                        className="
                          flex h-8 w-8 shrink-0
                          items-center justify-center
                          rounded-lg
                          text-[10px]
                          font-black
                          tabular-nums
                          transition-all duration-200
                          group-hover/option:scale-105
                        "
                        style={{
                          background: selected
                            ? theme.badgeSelected
                            : theme.badgeBg,
                          color: selected ? theme.primary : theme.muted,
                          boxShadow: selected
                            ? `0 4px 14px ${theme.primarySoft}`
                            : "none",
                        }}
                      >
                        {String(year).slice(-2)}
                      </span>

                      {/* Text */}
                      <div className="min-w-0">
                        <div
                          className="text-xs font-black tabular-nums"
                          style={{
                            color: selected ? theme.primary : theme.text,
                          }}
                        >
                          {year}
                        </div>

                        {current && (
                          <div
                            className="
                              mt-0.5 flex items-center gap-1
                              text-[9px] font-bold
                            "
                            style={{
                              color: "#10b981",
                            }}
                          >
                            <span
                              className="
                                h-1 w-1 rounded-full
                                bg-emerald-400
                              "
                            />
                            Current year
                          </div>
                        )}

                        {previous && !current && (
                          <div
                            className="mt-0.5 text-[9px]"
                            style={{
                              color: theme.muted,
                            }}
                          >
                            Previous year
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected */}
                    {selected && (
                      <span
                        className="
                          flex h-5 w-5 shrink-0
                          items-center justify-center
                          rounded-full
                          text-white
                          animate-in zoom-in-75
                        "
                        style={{
                          background:
                            "linear-gradient(135deg, #8b5cf6, #6366f1)",
                          boxShadow: "0 4px 15px rgba(124,58,237,.35)",
                        }}
                      >
                        <Check size={11} strokeWidth={3.2} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="
                flex items-center justify-between
                border-t px-4 py-2.5
              "
              style={{
                borderColor: isDark
                  ? "rgba(255,255,255,.06)"
                  : "rgba(15,23,42,.07)",
              }}
            >
              <span
                className="text-[8px] font-bold uppercase tracking-[.12em]"
                style={{ color: theme.subtle }}
              >
                {yearsCount} years available
              </span>

              <span
                className="text-[8px] font-semibold"
                style={{ color: theme.subtle }}
              >
                ↑ ↓ Navigate
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default YearSelector;
