// Note: Tailwind v4 is configured from CSS (see src/index.css).
// Kept as a valid module so tooling (ESLint etc.) can parse it.
export default {
  theme: {
    extend: {
      keyframes: {
        progress: {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
      },
      animation: {
        progress: "progress linear forwards",
      },
    },
  },
};
