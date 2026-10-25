import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Heavy, rarely-changing libraries get their own long-cacheable chunks so a
// change in app code does not invalidate them.
const VENDOR_CHUNKS = {
  "vendor-react": ["react", "react-dom", "react-router", "react-router-dom", "scheduler"],
  "vendor-charts": [
    "recharts",
    "recharts-scale",
    "victory-vendor",
    "decimal.js-light",
    "internmap",
    "reselect",
    "immer",
    "redux",
    "@reduxjs",
  ],
  "vendor-motion": ["framer-motion", "motion-dom", "motion-utils"],
  "vendor-icons": ["lucide-react"],
};

function vendorChunk(id) {
  const path = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const index = path.lastIndexOf(marker);

  if (index === -1) return undefined;

  const pkgPath = path.slice(index + marker.length);
  const pkg = pkgPath.startsWith("@")
    ? pkgPath.split("/").slice(0, 2).join("/")
    : pkgPath.split("/")[0];

  if (pkg.startsWith("d3-")) return "vendor-charts";

  for (const [chunk, packages] of Object.entries(VENDOR_CHUNKS)) {
    if (packages.some((name) => pkg === name || pkg.startsWith(`${name}/`))) {
      return chunk;
    }
  }

  return undefined;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
