import React, { useState, useCallback, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Target,
  Trash2,
  X,
  Check,
  Pencil,
  TrendingUp,
  Zap,
  AlertCircle,
  PiggyBank,
  Plane,
  Laptop,
  Home,
  Car,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Shield,
  RefreshCw,
  ChevronRight,
  Lock,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

const getAuthHeader = () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Sky", value: "#0ea5e9" },
];

const GOAL_ICONS = [
  { key: "piggy", icon: <PiggyBank size={16} />, label: "Savings" },
  { key: "plane", icon: <Plane size={16} />, label: "Travel" },
  { key: "laptop", icon: <Laptop size={16} />, label: "Tech" },
  { key: "home", icon: <Home size={16} />, label: "House" },
  { key: "car", icon: <Car size={16} />, label: "Vehicle" },
  { key: "grad", icon: <GraduationCap size={16} />, label: "Study" },
  { key: "health", icon: <HeartPulse size={16} />, label: "Health" },
  { key: "shop", icon: <ShoppingBag size={16} />, label: "Shop" },
  { key: "shield", icon: <Shield size={16} />, label: "Safety" },
  { key: "target", icon: <Target size={16} />, label: "Goal" },
];

const ICON_MAP = Object.fromEntries(GOAL_ICONS.map((g) => [g.key, g.icon]));

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(n) {
  const abs = Math.abs(n ?? 0);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

function monthsLeft(deadline) {
  if (!deadline) return null;
  const [y, m] = deadline.split("-").map(Number);
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - now.getMonth() - 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background:
              t.type === "success"
                ? "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))"
                : t.type === "error"
                  ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))"
                  : "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))",
            border:
              t.type === "success"
                ? "1px solid rgba(16,185,129,0.3)"
                : t.type === "error"
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "toastSlide 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
            pointerEvents: "auto",
            fontSize: 13,
            fontWeight: 500,
            color: "#e2e8f0",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color:
                t.type === "success"
                  ? "#10b981"
                  : t.type === "error"
                    ? "#ef4444"
                    : "#6366f1",
            }}
          >
            {t.type === "success" ? (
              <Check size={16} />
            ) : t.type === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <Zap size={16} />
            )}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS RING
// ─────────────────────────────────────────────────────────────────────────────

function ProgressRing({ percentage, color, size = 100, strokeWidth = 6 }) {
  const clamp = Math.min(Math.max(percentage, 0), 100);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient
          id={`grad-${color}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.1)"
        strokeWidth={strokeWidth}
      />
      {clamp > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#grad-${color})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ icon, label, value, accent }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(71,85,105,0.3)",
        borderRadius: 12,
        padding: "14px 16px",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accent}40`;
        e.currentTarget.style.background = `${accent}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(71,85,105,0.3)";
        e.currentTarget.style.background = "rgba(15,23,42,0.6)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accent}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#e2e8f0",
          margin: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function GoalSkeleton() {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.4)",
        border: "1px solid rgba(71,85,105,0.2)",
        borderRadius: 16,
        padding: "20px",
        animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "rgba(71,85,105,0.2)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 16,
              width: "60%",
              background: "rgba(71,85,105,0.2)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 12,
              width: "40%",
              background: "rgba(71,85,105,0.2)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(71,85,105,0.2)",
          borderRadius: 3,
          marginBottom: 12,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 28,
            background: "rgba(71,85,105,0.2)",
            borderRadius: 6,
          }}
        />
        <div
          style={{
            width: 60,
            height: 28,
            background: "rgba(71,85,105,0.2)",
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function IconButton({ onClick, children, variant = "default", loading }) {
  const styles = {
    default: {
      bg: "rgba(15,23,42,0.6)",
      hover: "rgba(71,85,105,0.2)",
      border: "rgba(71,85,105,0.3)",
      text: "#94a3b8",
    },
    danger: {
      bg: "rgba(239,68,68,0.08)",
      hover: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.2)",
      text: "#ef4444",
    },
  };

  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        background: s.bg,
        border: `1px solid ${s.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "not-allowed" : "pointer",
        color: s.text,
        transition: "all 0.25s ease",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = s.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = s.bg;
      }}
    >
      {loading ? (
        <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        children
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL CARD
// ─────────────────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, onContribute, deleting }) {
  const id = goal._id || goal.id;
  const percentage = Math.min(
    Math.round(((goal.saved ?? 0) / (goal.target || 1)) * 100),
    100,
  );
  const ml = monthsLeft(goal.deadline);
  const isCompleted = goal.isCompleted || percentage >= 100;
  const isOverdue = ml !== null && ml < 0;
  const daysUntilDeadline = ml !== null ? ml * 30 : null;

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.5))",
        border: `1px solid ${isCompleted ? goal.color + "30" : "rgba(71,85,105,0.2)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.3s ease",
        boxShadow: isCompleted
          ? `0 0 24px ${goal.color}20, 0 8px 24px rgba(0,0,0,0.3)`
          : "0 8px 24px rgba(0,0,0,0.2)",
        opacity: deleting ? 0.5 : 1,
        pointerEvents: deleting ? "none" : "auto",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = isCompleted
          ? `0 0 32px ${goal.color}30, 0 12px 32px rgba(0,0,0,0.4)`
          : "0 12px 32px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isCompleted
          ? `0 0 24px ${goal.color}20, 0 8px 24px rgba(0,0,0,0.3)`
          : "0 8px 24px rgba(0,0,0,0.2)";
      }}
    >
      {/* Accent line */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${goal.color}, ${goal.color}40)`,
          boxShadow: `0 0 12px ${goal.color}40`,
        }}
      />

      <div style={{ padding: "20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${goal.color}15`,
                border: `1px solid ${goal.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: goal.color,
                flexShrink: 0,
                fontSize: 20,
              }}
            >
              {ICON_MAP[goal.icon] || <Target size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  margin: "0 0 4px 0",
                  lineHeight: 1.3,
                }}
              >
                {goal.name}
              </h3>
              {goal.deadline && (
                <p
                  style={{
                    fontSize: 12,
                    margin: 0,
                    fontWeight: 500,
                    color: isCompleted
                      ? goal.color
                      : isOverdue
                        ? "#ef4444"
                        : ml !== null && ml <= 2
                          ? "#f59e0b"
                          : "#94a3b8",
                  }}
                >
                  {isCompleted
                    ? "✓ Completed"
                    : isOverdue
                      ? `${Math.abs(ml)} month${Math.abs(ml) !== 1 ? "s" : ""} overdue`
                      : ml === 0
                        ? "Due this month"
                        : `${ml} month${ml !== 1 ? "s" : ""} left`}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <IconButton onClick={() => onEdit(goal)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton
              onClick={() => onDelete(id)}
              variant="danger"
              loading={deleting}
            >
              {!deleting && <Trash2 size={16} />}
            </IconButton>
          </div>
        </div>

        {/* Progress section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 100,
              height: 100,
              flexShrink: 0,
            }}
          >
            <ProgressRing
              percentage={percentage}
              color={goal.color}
              size={100}
              strokeWidth={6}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isCompleted ? (
                <Check size={32} color={goal.color} />
              ) : (
                <>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#e2e8f0",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {percentage}%
                  </span>
                  <span
                    style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                  >
                    progress
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Amount Saved
              </span>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: goal.color,
                  margin: "4px 0 0 0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtINR(goal.saved)}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <span
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}
                >
                  Target
                </span>
                <p
                  style={{
                    fontSize: 13,
                    color: "#cbd5e1",
                    margin: "2px 0 0 0",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtINR(goal.target)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}
                >
                  Remaining
                </span>
                <p
                  style={{
                    fontSize: 13,
                    color: "#cbd5e1",
                    margin: "2px 0 0 0",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isCompleted
                    ? "—"
                    : fmtINR(
                        Math.max((goal.target ?? 0) - (goal.saved ?? 0), 0),
                      )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 6,
              background: "rgba(71,85,105,0.2)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${goal.color}70, ${goal.color})`,
                borderRadius: 3,
                boxShadow: `0 0 8px ${goal.color}50`,
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
        </div>

        {/* Monthly contribution + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            background: "rgba(15,23,42,0.4)",
            border: "1px solid rgba(71,85,105,0.2)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} color={goal.color} />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              <span
                style={{
                  color: goal.color,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtINR(goal.monthly)}
              </span>{" "}
              / mo
            </span>
          </div>
          {!isCompleted ? (
            <button
              onClick={() => onContribute(goal)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                background: `${goal.color}20`,
                border: `1px solid ${goal.color}40`,
                color: goal.color,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${goal.color}30`;
                e.currentTarget.style.borderColor = `${goal.color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${goal.color}20`;
                e.currentTarget.style.borderColor = `${goal.color}40`;
              }}
            >
              <Plus size={12} /> Add funds
            </button>
          ) : (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                background: `${goal.color}15`,
                border: `1px solid ${goal.color}30`,
                color: goal.color,
              }}
            >
              ✓ Complete
            </span>
          )}
        </div>

        {/* Alerts */}
        {isOverdue && !isCompleted && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              fontSize: 11,
              color: "#ef4444",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} />
            Consider adjusting your deadline or increasing contributions.
          </div>
        )}
        {ml !== null && ml >= 0 && ml <= 2 && !isCompleted && !isOverdue && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 10,
              fontSize: 11,
              color: "#f59e0b",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} />
            Accelerate your savings to hit this deadline.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Target size={36} color="#6366f1" />
      </div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#e2e8f0",
          marginBottom: 8,
        }}
      >
        No goals yet
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#94a3b8",
          marginBottom: 28,
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        Create your first savings goal and start building the future you want.
        Track progress and celebrate milestones along the way.
      </p>
      <button
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 24px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow:
            "0 0 20px rgba(99,102,241,0.35), 0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 0 24px rgba(99,102,241,0.45), 0 8px 16px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 0 20px rgba(99,102,241,0.35), 0 4px 12px rgba(0,0,0,0.3)";
        }}
      >
        <Plus size={18} /> Create goal
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function GoalModal({ mode, goal, onClose, onSave, saving }) {
  const isContribute = mode === "contribute";
  const isEdit = mode === "edit";
  const accent = isContribute ? goal?.color || "#6366f1" : "#6366f1";

  const [form, setForm] = useState(() => {
    if (isEdit && goal) {
      return {
        name: goal.name ?? "",
        target: goal.target ?? "",
        saved: goal.saved ?? "",
        monthly: goal.monthly ?? "",
        deadline: goal.deadline || "",
        color: goal.color || "#6366f1",
        icon: goal.icon || "piggy",
      };
    }
    if (isContribute) return { amount: "" };
    return {
      name: "",
      target: "",
      saved: "",
      monthly: "",
      deadline: "",
      color: "#6366f1",
      icon: "piggy",
    };
  });

  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const activeAccent = isContribute ? accent : form.color || "#6366f1";

  function validate() {
    const e = {};
    if (isContribute) {
      const a = parseFloat(form.amount);
      if (!form.amount || isNaN(a) || a <= 0) e.amount = "Enter a valid amount";
    } else {
      if (!form.name?.trim()) e.name = "Name is required";
      if (!form.target || +form.target <= 0) e.target = "Enter a valid target";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    if (isContribute) {
      onSave({
        type: "contribute",
        id: goal._id || goal.id,
        amount: parseFloat(form.amount),
      });
    } else if (isEdit) {
      onSave({
        type: "edit",
        id: goal._id || goal.id,
        ...form,
        target: +form.target,
        saved: +form.saved || 0,
        monthly: +form.monthly || 0,
      });
    } else {
      onSave({
        type: "new",
        ...form,
        target: +form.target,
        saved: +form.saved || 0,
        monthly: +form.monthly || 0,
      });
    }
  }

  const title = isContribute
    ? `Add funds · ${goal?.name}`
    : isEdit
      ? "Edit goal"
      : "Create goal";

  const inputStyles = (field, hasErr) => ({
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 10,
    background: hasErr
      ? "rgba(239,68,68,0.06)"
      : focused === field
        ? "rgba(71,85,105,0.15)"
        : "rgba(15,23,42,0.5)",
    border: `1px solid ${hasErr ? "rgba(239,68,68,0.3)" : focused === field ? `${activeAccent}50` : "rgba(71,85,105,0.2)"}`,
    color: "#e2e8f0",
    outline: "none",
    boxShadow:
      focused === field && !hasErr ? `0 0 0 3px ${activeAccent}15` : "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    fontVariantNumeric: "tabular-nums",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,6,12,0.7)",
          backdropFilter: "blur(12px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.8))",
          border: `1px solid rgba(71,85,105,0.3)`,
          borderRadius: 18,
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(71,85,105,0.1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalSlide 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${activeAccent}60, ${activeAccent})`,
            boxShadow: `0 0 12px ${activeAccent}50`,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(71,85,105,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: `${activeAccent}15`,
                border: `1px solid ${activeAccent}35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Target size={18} color={activeAccent} />
            </div>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#e2e8f0",
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
          <IconButton onClick={onClose} variant="default">
            <X size={18} />
          </IconButton>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {isContribute ? (
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                onFocus={() => setFocused("amount")}
                onBlur={() => setFocused(null)}
                style={inputStyles("amount", !!errors.amount)}
              />
              {errors.amount && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#ef4444",
                    margin: "6px 0 0 0",
                  }}
                >
                  {errors.amount}
                </p>
              )}
              {goal && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 11,
                    background: "rgba(15,23,42,0.4)",
                    border: "1px solid rgba(71,85,105,0.2)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    textAlign: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      Saved
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        margin: "4px 0 0 0",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINR(goal.saved)}
                    </p>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      Remaining
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        margin: "4px 0 0 0",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINR((goal.target ?? 0) - (goal.saved ?? 0))}
                    </p>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      Target
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        margin: "4px 0 0 0",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINR(goal.target)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Goal name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dream vacation"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  style={inputStyles("name", !!errors.name)}
                />
                {errors.name && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "6px 0 0 0",
                    }}
                  >
                    {errors.name}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Target (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="500000"
                    value={form.target}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, target: e.target.value }))
                    }
                    onFocus={() => setFocused("target")}
                    onBlur={() => setFocused(null)}
                    style={inputStyles("target", !!errors.target)}
                  />
                  {errors.target && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#ef4444",
                        margin: "6px 0 0 0",
                      }}
                    >
                      {errors.target}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Already saved (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.saved}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, saved: e.target.value }))
                    }
                    onFocus={() => setFocused("saved")}
                    onBlur={() => setFocused(null)}
                    style={inputStyles("saved", false)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Monthly contribution (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={form.monthly}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, monthly: e.target.value }))
                    }
                    onFocus={() => setFocused("monthly")}
                    onBlur={() => setFocused(null)}
                    style={inputStyles("monthly", false)}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Target date
                  </label>
                  <input
                    type="month"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, deadline: e.target.value }))
                    }
                    onFocus={() => setFocused("deadline")}
                    onBlur={() => setFocused(null)}
                    style={inputStyles("deadline", false)}
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Color
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                  }}
                >
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: 10,
                        background: c.value,
                        border:
                          form.color === c.value
                            ? "3px solid #e2e8f0"
                            : "2px solid transparent",
                        cursor: "pointer",
                        boxShadow:
                          form.color === c.value
                            ? `0 0 12px ${c.value}70`
                            : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Icon
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                  }}
                >
                  {GOAL_ICONS.map((gi) => (
                    <button
                      key={gi.key}
                      onClick={() => setForm((p) => ({ ...p, icon: gi.key }))}
                      style={{
                        padding: "10px 6px",
                        borderRadius: 11,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        background:
                          form.icon === gi.key
                            ? `${form.color}20`
                            : "rgba(15,23,42,0.4)",
                        border: `1px solid ${form.icon === gi.key ? `${form.color}50` : "rgba(71,85,105,0.2)"}`,
                        color: form.icon === gi.key ? form.color : "#64748b",
                        fontSize: 10,
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ color: "inherit" }}>{gi.icon}</span>
                      {gi.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            gap: 12,
            borderTop: "1px solid rgba(71,85,105,0.2)",
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 11,
              background: "rgba(15,23,42,0.5)",
              border: "1px solid rgba(71,85,105,0.2)",
              color: "#94a3b8",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saving)
                e.currentTarget.style.background = "rgba(71,85,105,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15,23,42,0.5)";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1.5,
              padding: "11px 0",
              borderRadius: 11,
              background: `linear-gradient(135deg, ${activeAccent}dd, ${activeAccent})`,
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: `0 0 16px ${activeAccent}40, 0 4px 12px rgba(0,0,0,0.3)`,
              opacity: saving ? 0.7 : 1,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = `0 0 20px ${activeAccent}50, 0 6px 16px rgba(0,0,0,0.4)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 0 16px ${activeAccent}40, 0 4px 12px rgba(0,0,0,0.3)`;
            }}
          >
            {saving ? (
              <>
                <RefreshCw
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Saving…
              </>
            ) : (
              <>
                <Check size={16} />
                {isContribute
                  ? "Add funds"
                  : isEdit
                    ? "Save changes"
                    : "Create goal"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({
    totalTarget: 0,
    totalSaved: 0,
    totalMonthly: 0,
    onTrack: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  const fetchGoals = useCallback(
    async (statusFilter = "all") => {
      setLoading(true);
      try {
        const config = {
          headers: getAuthHeader(),
          ...(statusFilter !== "all" && { params: { status: statusFilter } }),
        };
        const res = await axios.get(`${API_BASE}/goals`, config);
        if (res.data.success) {
          setGoals(res.data.goals || []);
          setSummary({
            totalTarget: res.data.summary?.totalTarget || 0,
            totalSaved: res.data.summary?.totalSaved || 0,
            totalMonthly: res.data.summary?.totalMonthly || 0,
            onTrack: res.data.summary?.onTrack || 0,
            count: res.data.count || 0,
          });
        }
      } catch (err) {
        addToast(
          err?.response?.data?.message || "Failed to load goals",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchGoals(filter);
  }, [filter, fetchGoals]);

  async function createGoal(data) {
    setSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/goals`,
        {
          name: data.name,
          target: data.target,
          saved: data.saved,
          monthly: data.monthly,
          deadline: data.deadline || null,
          color: data.color,
          icon: data.icon,
        },
        { headers: { "Content-Type": "application/json", ...getAuthHeader() } },
      );

      if (res.data.success) {
        setGoals((p) => [res.data.goal, ...p]);
        setSummary((s) => ({
          ...s,
          totalTarget: s.totalTarget + res.data.goal.target,
          totalSaved: s.totalSaved + res.data.goal.saved,
          totalMonthly: s.totalMonthly + res.data.goal.monthly,
          count: s.count + 1,
        }));
        addToast("Goal created successfully!", "success");
        setModal(null);
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Could not create goal",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateGoal(id, data) {
    setSaving(true);
    try {
      const res = await axios.put(
        `${API_BASE}/goals/${id}`,
        {
          name: data.name,
          target: data.target,
          saved: data.saved,
          monthly: data.monthly,
          deadline: data.deadline || null,
          color: data.color,
          icon: data.icon,
        },
        { headers: { "Content-Type": "application/json", ...getAuthHeader() } },
      );

      if (res.data.success) {
        setGoals((p) => p.map((g) => (g._id === id ? res.data.goal : g)));
        addToast("Goal updated!", "success");
        setModal(null);
        fetchGoals(filter);
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Could not update goal",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function contributeGoal(id, amount) {
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/goals/${id}/contribute`,
        { amount },
        { headers: { "Content-Type": "application/json", ...getAuthHeader() } },
      );

      if (res.data.success) {
        setGoals((p) => p.map((g) => (g._id === id ? res.data.goal : g)));
        setSummary((s) => ({
          ...s,
          totalSaved: s.totalSaved + res.data.contributed,
        }));
        addToast("Funds added successfully!", "success");
        setModal(null);
      }
    } catch (err) {
      addToast(err?.response?.data?.message || "Could not add funds", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id) {
    setDeletingId(id);
    try {
      await axios.delete(`${API_BASE}/goals/${id}`, {
        headers: getAuthHeader(),
      });
      const removed = goals.find((g) => g._id === id);
      setGoals((p) => p.filter((g) => g._id !== id));
      if (removed) {
        setSummary((s) => ({
          ...s,
          totalTarget: s.totalTarget - removed.target,
          totalSaved: s.totalSaved - removed.saved,
          totalMonthly: s.totalMonthly - removed.monthly,
          count: Math.max(s.count - 1, 0),
        }));
      }
      addToast("Goal deleted", "info");
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Could not delete goal",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleSave(payload) {
    if (payload.type === "new") createGoal(payload);
    else if (payload.type === "edit") updateGoal(payload.id, payload);
    else if (payload.type === "contribute")
      contributeGoal(payload.id, payload.amount);
  }

  const overallPct =
    summary.totalTarget > 0
      ? Math.round((summary.totalSaved / summary.totalTarget) * 100)
      : 0;

  const visibleGoals = useMemo(() => {
    if (filter === "done") return goals.filter((g) => g.isCompleted);
    if (filter === "active") return goals.filter((g) => !g.isCompleted);
    return goals;
  }, [goals, filter]);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes fadeUp { from { transform: translateY(12px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes toastSlide { from { transform: translateX(24px) scale(0.95); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes modalSlide { from { transform: translateY(16px) scale(0.97); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 0.8 } }
        .goals-container { animation: fadeIn 0.4s ease-out both }
        .stats-row { animation: slideDown 0.5s ease-out both }
        .goals-grid > * { animation: fadeUp 0.5s ease-out both }
        .goals-grid > :nth-child(1) { animation-delay: 0.05s }
        .goals-grid > :nth-child(2) { animation-delay: 0.1s }
        .goals-grid > :nth-child(3) { animation-delay: 0.15s }
        .goals-grid > :nth-child(4) { animation-delay: 0.2s }
        .goals-grid > :nth-child(5) { animation-delay: 0.25s }
        .goals-grid > :nth-child(6) { animation-delay: 0.3s }
        input[type="month"]::-webkit-calendar-picker-indicator {
          filter: brightness(0.7) invert(1);
          cursor: pointer;
        }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <Toast toasts={toasts} />

      <div
        className="goals-container"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0f1419 100%)",
          padding: "24px 20px 48px",
        }}
      >
        {/* Header */}
        <div
          className="stats-row"
          style={{
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#e2e8f0",
                margin: "0 0 6px 0",
                letterSpacing: "-0.02em",
              }}
            >
              Savings Goals
            </h1>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
              {loading
                ? "Loading…"
                : `${summary.count} goal${summary.count !== 1 ? "s" : ""} · ${summary.onTrack} on track`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Filter tabs */}
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "5px",
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(71,85,105,0.2)",
                borderRadius: 11,
              }}
            >
              {["all", "active", "done"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      filter === f
                        ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                        : "transparent",
                    color: filter === f ? "#fff" : "#94a3b8",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textTransform: "capitalize",
                    boxShadow:
                      filter === f ? "0 0 8px rgba(99,102,241,0.3)" : "none",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <IconButton onClick={() => fetchGoals(filter)} loading={loading}>
              <RefreshCw size={16} />
            </IconButton>

            {/* Create button */}
            <button
              onClick={() => setModal({ mode: "new" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 11,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow:
                  "0 0 16px rgba(99,102,241,0.35), 0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={16} /> New goal
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div
          className="stats-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <StatBadge
            icon={<Target size={16} />}
            label="Total target"
            value={loading ? "—" : fmtINR(summary.totalTarget)}
            accent="#6366f1"
          />
          <StatBadge
            icon={<PiggyBank size={16} />}
            label="Total saved"
            value={loading ? "—" : fmtINR(summary.totalSaved)}
            accent="#10b981"
          />
          <StatBadge
            icon={<Zap size={16} />}
            label="Monthly commit"
            value={loading ? "—" : fmtINR(summary.totalMonthly)}
            accent="#f59e0b"
          />
          <StatBadge
            icon={<TrendingUp size={16} />}
            label="Overall progress"
            value={loading ? "—" : `${overallPct}%`}
            accent="#0ea5e9"
          />
        </div>

        {/* Overall progress bar */}
        {!loading && goals.length > 0 && (
          <div
            className="stats-row"
            style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(71,85,105,0.2)",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 28,
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Overall progress
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#6366f1",
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    padding: "2px 10px",
                    borderRadius: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {overallPct}%
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtINR(summary.totalSaved)} of {fmtINR(summary.totalTarget)}
              </p>
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(71,85,105,0.15)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${overallPct}%`,
                  background:
                    "linear-gradient(90deg, #6366f1dd, #7c3aed, #0ea5e9)",
                  borderRadius: 3,
                  boxShadow: "0 0 12px rgba(99,102,241,0.5)",
                  transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
          </div>
        )}

        {/* Goals grid */}
        <div
          className="goals-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <GoalSkeleton key={i} />)
          ) : visibleGoals.length === 0 ? (
            <EmptyState onAdd={() => setModal({ mode: "new" })} />
          ) : (
            visibleGoals.map((g) => (
              <GoalCard
                key={g._id}
                goal={g}
                deleting={deletingId === g._id}
                onEdit={(goal) => setModal({ mode: "edit", goal })}
                onDelete={deleteGoal}
                onContribute={(goal) => setModal({ mode: "contribute", goal })}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <GoalModal
          mode={modal.mode}
          goal={modal.goal}
          saving={saving}
          onClose={() => !saving && setModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
