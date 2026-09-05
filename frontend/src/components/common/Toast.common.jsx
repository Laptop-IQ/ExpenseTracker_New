import React from "react";
import { Check, AlertCircle, Zap } from "lucide-react";

/**
 * Universal Toast Component
 * Used across Dashboard, Income, Expense pages
 * Supports light and dark modes
 */
function Toast({ toasts, variant = "dark" }) {
  const themeStyles = {
    dark: {
      success: {
        bg: "linear-gradient(135deg,rgba(5,35,27,.96),rgba(7,48,35,.96))",
        border: "#065f3c",
        text: "#34d399",
        icon: "#10b981",
      },
      error: {
        bg: "linear-gradient(135deg,rgba(42,10,10,.96),rgba(58,12,12,.96))",
        border: "#7f1d1d",
        text: "#f87171",
        icon: "#ef4444",
      },
      info: {
        bg: "linear-gradient(135deg,rgba(18,7,31,.96),rgba(28,13,46,.96))",
        border: "#3b1e6e",
        text: "#c4b5fd",
        icon: "#a855f7",
      },
    },
    light: {
      success: {
        bg: "linear-gradient(135deg, rgba(236,253,245,.96), rgba(209,250,229,.96))",
        border: "#a7f3d0",
        text: "#047857",
        icon: "#10b981",
      },
      error: {
        bg: "linear-gradient(135deg, rgba(254,242,242,.96), rgba(254,226,226,.96))",
        border: "#fecaca",
        text: "#dc2626",
        icon: "#ef4444",
      },
      info: {
        bg: "linear-gradient(135deg, rgba(243,232,255,.96), rgba(230,204,255,.96))",
        border: "#d8b4fe",
        text: "#7c3aed",
        icon: "#a855f7",
      },
    },
  };

  const themes = themeStyles[variant];

  return (
    <div
      className="
        pointer-events-none
        fixed
        right-4
        top-4
        z-[9999]
        flex
        w-[calc(100%-2rem)]
        max-w-sm
        flex-col
        gap-2
        sm:right-5
        sm:top-5
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";
        const theme = isSuccess
          ? themes.success
          : isError
            ? themes.error
            : themes.info;

        return (
          <div
            key={toast.id}
            className="
              pointer-events-auto
              flex
              items-center
              gap-3
              rounded-2xl
              border
              px-4
              py-3
              shadow-2xl
              backdrop-blur-xl
              animate-[toastSlide_.35s_cubic-bezier(.34,1.56,.64,1)_both]
            "
            style={{
              background: theme.bg,
              borderColor: theme.border,
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `${theme.icon}20`,
              }}
            >
              {isSuccess ? (
                <Check size={13} color={theme.icon} />
              ) : isError ? (
                <AlertCircle size={13} color={theme.icon} />
              ) : (
                <Zap size={13} color={theme.icon} />
              )}
            </span>

            <span
              className="text-xs font-semibold leading-5"
              style={{ color: theme.text }}
            >
              {toast.message}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlide {
          from {
            transform: translateX(18px) scale(.96);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Toast;
