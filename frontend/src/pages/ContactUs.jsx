import { Mail, MapPin, PhoneCall, Send, Moon, Sun } from "lucide-react";
import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env?.VITE_API_BASE || "";

// Minimal notification hook shim (replace with your real one)
const useNotifications = () => ({
  addNotification: (msg) => alert(msg),
});

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const { addNotification } = useNotifications();

  // Sync with system preference on mount
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "dark";
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      addNotification("Please fill all fields ⚠️");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Message sent successfully ✓");
        setFormData({ name: "", email: "", message: "" });
      } else {
        addNotification("Something went wrong ❌");
      }
    } catch (err) {
      console.error(err);
      addNotification("Server error ⚡");
    } finally {
      setLoading(false);
    }
  };

  // ── Design tokens ──────────────────────────────────────────────────────────
  const t = {
    bg: isDark ? "#0f1117" : "#f0fdf8",
    card: isDark ? "#1a1d27" : "#ffffff",
    cardBorder: isDark ? "#2a2e3f" : "#d1fae5",
    sidebar: isDark ? "#141720" : "#ecfdf5",
    sidebarBorder: isDark ? "#2a2e3f" : "#a7f3d0",

    textPrimary: isDark ? "#f0f4f8" : "#0f2d20",
    textSecondary: isDark ? "#94a3b8" : "#4b7563",
    textMuted: isDark ? "#4b5563" : "#9ca3af",

    inputBg: isDark ? "#0f1117" : "#f9fffe",
    inputBorder: isDark ? "#2d3348" : "#a7f3d0",
    inputBorderFocus: isDark ? "#34d399" : "#059669",
    inputText: isDark ? "#f0f4f8" : "#0f2d20",
    inputPlaceholder: isDark ? "#4b5563" : "#9ca3af",

    accent: "#059669",
    accentHover: "#047857",
    accentMuted: isDark ? "#064e3b" : "#d1fae5",
    accentText: isDark ? "#34d399" : "#065f46",

    iconMap: isDark ? "#34d399" : "#059669",
    iconMail: isDark ? "#60a5fa" : "#2563eb",
    iconPhone: isDark ? "#c084fc" : "#7c3aed",

    toggleBg: isDark ? "#1e2435" : "#d1fae5",
    toggleBorder: isDark ? "#2d3348" : "#6ee7b7",
    toggleIcon: isDark ? "#34d399" : "#059669",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: `1px solid ${t.inputBorder}`,
    background: t.inputBg,
    color: t.inputText,
    fontSize: "0.9rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: "0.3rem",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        transition: "background 0.3s",
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px" }}>
        {/* Theme toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "2rem",
              border: `1px solid ${t.toggleBorder}`,
              background: t.toggleBg,
              color: t.toggleIcon,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        {/* Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            borderRadius: "1rem",
            border: `1px solid ${t.cardBorder}`,
            background: t.card,
            overflow: "hidden",
            boxShadow: isDark
              ? "0 4px 32px rgba(0,0,0,0.45)"
              : "0 4px 24px rgba(5,150,105,0.08)",
            transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* ── LEFT: Info panel ── */}
          <div
            style={{
              padding: "2.25rem 2rem",
              background: t.sidebar,
              borderRight: `1px solid ${t.sidebarBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: "0",
            }}
          >
            {/* Eyebrow */}
            <span
              style={{
                display: "inline-block",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.accentText,
                background: t.accentMuted,
                padding: "0.25rem 0.65rem",
                borderRadius: "2rem",
                marginBottom: "1rem",
                alignSelf: "flex-start",
              }}
            >
              Support
            </span>

            <h2
              style={{
                margin: "0 0 0.5rem",
                fontSize: "clamp(1.3rem, 4vw, 1.7rem)",
                fontWeight: 700,
                color: t.textPrimary,
                lineHeight: 1.25,
              }}
            >
              Need help with your finances?
            </h2>
            <p
              style={{
                margin: "0 0 2rem",
                color: t.textSecondary,
                fontSize: "0.9rem",
                lineHeight: 1.6,
              }}
            >
              Track smarter, spend better. We typically respond within 24 hours.
            </p>

            {/* Contact items */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {[
                { Icon: MapPin, color: t.iconMap, label: "Delhi, India" },
                {
                  Icon: Mail,
                  color: t.iconMail,
                  label: "support@expensetracker.com",
                },
                {
                  Icon: PhoneCall,
                  color: t.iconPhone,
                  label: "+91-7986515332",
                },
              ].map(({ Icon, color, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "0.5rem",
                      background: isDark ? `${color}18` : `${color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={color} strokeWidth={2} />
                  </span>
                  <span
                    style={{ fontSize: "0.875rem", color: t.textSecondary }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom decorative bar */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: "2rem",
                display: "flex",
                gap: "4px",
              }}
            >
              {[1, 0.6, 0.35].map((o, i) => (
                <div
                  key={i}
                  style={{
                    height: "3px",
                    flex: i === 0 ? 2 : 1,
                    borderRadius: "2px",
                    background: t.accent,
                    opacity: o,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "2.25rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 0.25rem",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: t.textPrimary,
                }}
              >
                Send a message
              </h3>
              <p
                style={{ margin: 0, fontSize: "0.825rem", color: t.textMuted }}
              >
                Fill in the details below and we'll be in touch.
              </p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="ct-name" style={labelStyle}>
                Your name
              </label>
              <input
                id="ct-name"
                type="text"
                name="name"
                placeholder="Alex Johnson"
                value={formData.name}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = t.inputBorderFocus;
                  e.target.style.boxShadow = `0 0 0 3px ${t.accent}22`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = t.inputBorder;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="ct-email" style={labelStyle}>
                Email address
              </label>
              <input
                id="ct-email"
                type="email"
                name="email"
                placeholder="alex@example.com"
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = t.inputBorderFocus;
                  e.target.style.boxShadow = `0 0 0 3px ${t.accent}22`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = t.inputBorder;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="ct-message" style={labelStyle}>
                Message
              </label>
              <textarea
                id="ct-message"
                name="message"
                rows={4}
                placeholder="Tell us how we can help you…"
                value={formData.message}
                onChange={handleChange}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={(e) => {
                  e.target.style.borderColor = t.inputBorderFocus;
                  e.target.style.boxShadow = `0 0 0 3px ${t.accent}22`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = t.inputBorder;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.8rem",
                borderRadius: "0.5rem",
                border: "none",
                background: loading ? t.textMuted : t.accent,
                color: "#ffffff",
                fontSize: "0.925rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, transform 0.1s",
                letterSpacing: "0.01em",
                marginTop: "0.25rem",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = t.accentHover;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = t.accent;
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={15} strokeWidth={2} />
                  Send message
                </>
              )}
            </button>

            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: t.textMuted,
                textAlign: "center",
              }}
            >
              We never share your information with third parties.
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder {
          color: ${t.inputPlaceholder};
          opacity: 1;
        }
        * { box-sizing: border-box; }
        @media (max-width: 560px) {
          form, div[style*="sidebar"] { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}
