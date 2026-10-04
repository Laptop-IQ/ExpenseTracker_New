import React, { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Phones get a bottom sheet (big tap targets, thumb reachable);             */
/*  larger screens get a small popover anchored to the trigger.               */
/* -------------------------------------------------------------------------- */

const SHEET_QUERY = "(max-width: 639px)";

function subscribe(callback) {
  const media = window.matchMedia(SHEET_QUERY);
  media.addEventListener?.("change", callback);

  return () => media.removeEventListener?.("change", callback);
}

const getSnapshot = () => window.matchMedia(SHEET_QUERY).matches;
const getServerSnapshot = () => false;

/* ------------------------------ TRIGGER ----------------------------------- */

export function SelectorTrigger({
  ref,
  icon: Icon,
  label,
  isCurrent = false,
  open,
  onClick,
  className = "",
  popupRole = "listbox",
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup={popupRole === "listbox" ? "listbox" : "dialog"}
      aria-expanded={open}
      className={`
        group relative
        inline-flex h-11 w-full min-w-0 items-center gap-2
        rounded-full
        border border-violet-500/30
        bg-[#080b18]
        px-2.5 sm:h-10 sm:w-auto sm:px-3
        shadow-[0_0_0_1px_rgba(124,58,237,.08),0_8px_30px_rgba(0,0,0,.25)]
        transition-all duration-200
        hover:border-violet-500/50 hover:bg-[#0b0f20]
        active:scale-[.98]
        focus:outline-none focus:ring-2 focus:ring-violet-500/20
        ${className}
      `}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
        <Icon size={14} strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1 truncate text-left text-xs font-black tracking-tight text-slate-100 sm:flex-none">
        {label}
      </span>

      {isCurrent && (
        <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-bold text-emerald-400 sm:border-l sm:border-white/10 sm:pl-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="hidden sm:inline">Current</span>
        </span>
      )}

      <ChevronDown
        size={14}
        strokeWidth={2.5}
        className={`shrink-0 text-slate-500 transition-transform duration-200 sm:ml-1 ${
          open ? "rotate-180 text-violet-400" : ""
        }`}
      />
    </button>
  );
}

/* ------------------------------ POPOVER ----------------------------------- */

/**
 * children: ({ isSheet }) => ReactNode   (the option list)
 */
function SelectorPopover({
  open,
  onClose,
  triggerRef,
  title,
  ariaLabel,
  icon: Icon,
  width = 260,
  contentRole = "listbox",
  children,
}) {
  const isSheet = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const panelRef = useRef(null);

  // Position is written straight to the DOM node (no state, no extra render)
  const place = useCallback(() => {
    const node = panelRef.current;
    const trigger = triggerRef.current;

    if (!node || !trigger) return;

    const rect = trigger.getBoundingClientRect();
    const padding = 12;
    const gap = 8;
    const panelWidth = Math.min(width, window.innerWidth - padding * 2);

    // Prefer aligning the popover's right edge with the trigger. This keeps
    // the premium picker visually attached to the control and prevents it
    // from spilling into the next column on wide dashboard layouts.
    // Keep the panel visually attached to the trigger's left edge first.
    // If there is not enough room, clamp it inside the viewport. This avoids
    // the picker jumping far to the left and covering unrelated dashboard
    // content on wide screens.
    const preferredLeft = rect.left;
    const left = Math.min(
      Math.max(padding, preferredLeft),
      window.innerWidth - panelWidth - padding,
    );

    let top = rect.bottom + gap;
    const availableHeight = window.innerHeight - padding * 2;
    const height = Math.min(node.scrollHeight, availableHeight);

    // not enough room below -> open upwards
    if (
      top + height > window.innerHeight - padding &&
      rect.top - gap - height > padding
    ) {
      top = rect.top - gap - height;
    }

    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
    node.style.width = `${panelWidth}px`;
  }, [triggerRef, width]);

  const setPanel = useCallback(
    (node) => {
      panelRef.current = node;
      if (node) place();
    },
    [place],
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      }
    };

    const handleOutside = (event) => {
      if (isSheet) return; // sheet has its own backdrop

      const target = event.target;

      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    const handleMove = () => {
      if (!isSheet) place();
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("resize", handleMove);
    window.addEventListener("scroll", handleMove, true);

    // keep the page from scrolling behind the sheet
    const previousOverflow = document.body.style.overflow;
    if (isSheet) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("resize", handleMove);
      window.removeEventListener("scroll", handleMove, true);

      if (isSheet) document.body.style.overflow = previousOverflow;
    };
  }, [open, isSheet, onClose, place, triggerRef]);

  if (!open) return null;

  /* ------------------------------ bottom sheet ---------------------------- */
  if (isSheet) {
    return createPortal(
      <div className="fixed inset-0 z-[999999]">
        <div
          className="animate-sheet-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-[#080b18] px-3 pt-2 shadow-[0_-24px_70px_rgba(0,0,0,.6)]"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-white/15" />

          <div className="flex items-center justify-between pb-2 pl-2">
            <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              {Icon && <Icon size={14} className="text-violet-400" />}
              {title}
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <div role={contentRole} aria-label={ariaLabel}>
            {children({ isSheet: true })}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /* -------------------------------- popover ------------------------------- */
  return createPortal(
    <div
      ref={setPanel}
      style={{ position: "fixed", top: 0, left: 0, width, zIndex: 999999 }}
      className="animate-popover-in max-h-[min(82dvh,700px)] overflow-y-auto overscroll-contain rounded-[24px] border border-violet-400/[0.14] bg-[linear-gradient(180deg,rgba(15,20,39,.995),rgba(6,9,20,.995))] p-3 shadow-[0_30px_100px_rgba(0,0,0,.68),0_0_0_1px_rgba(139,92,246,.10),0_0_55px_rgba(124,58,237,.12)] backdrop-blur-2xl"
    >
      <div className="mb-1 flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300/80">
            {title}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            Select a period to update your insights
          </p>
        </div>

        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-[0_0_18px_rgba(124,58,237,.12)]">
            <Icon size={14} />
          </span>
        )}
      </div>

      <div role={contentRole} aria-label={ariaLabel}>
        {children({ isSheet: false })}
      </div>
    </div>,
    document.body,
  );
}

export default SelectorPopover;
