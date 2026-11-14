import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { NotificationProvider } from "./Context/NotificationProvider";

// Wake up / pre-connect the API while the app code is still loading, so the
// first real request does not pay for DNS + TLS + a cold server start.
try {
  const apiBase = import.meta.env.VITE_API_BASE;
  if (apiBase) {
    const origin = new URL(apiBase, window.location.href).origin;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    fetch(`${origin}/`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }
} catch {
  /* warm-up is best effort */
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NotificationProvider>
  </React.StrictMode>,
);

import "./styles/app.css";
import "./styles/legacy.css";
