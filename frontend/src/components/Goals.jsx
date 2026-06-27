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
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

const getAuthHeader = () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GOAL_COLORS = [
  { name: "Violet", value: "#7c3aed" },
  { name: "Cyan", value: "#1AFFD5" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Coral", value: "#FF3D71" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
];

const GOAL_ICONS = [
  { key: "piggy", icon: <PiggyBank size={16} />, label: "Savings" },
  { key: "plane", icon: <Plane size={16} />, label: "Travel" },
  { key: "laptop", icon: <Laptop size={16} />, label: "Tech" },
  { key: "home", icon: <Home size={16} />, label: "Housing" },
  { key: "car", icon: <Car size={16} />, label: "Vehicle" },
  { key: "grad", icon: <GraduationCap size={16} />, label: "Education" },
  { key: "health", icon: <HeartPulse size={16} />, label: "Health" },
  { key: "shop", icon: <ShoppingBag size={16} />, label: "Shopping" },
  { key: "shield", icon: <Shield size={16} />, label: "Emergency" },
  { key: "target", icon: <Target size={16} />, label: "Other" },
];

const ICON_MAP = Object.fromEntries(GOAL_ICONS.map((g) => [g.key, g.icon]));

// ─── Utilities ────────────────────────────────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────────────────────────────────
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
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            background:
              t.type === "success"
                ? "linear-gradient(135deg,#0a2a1f,#0d3327)"
                : t.type === "error"
                  ? "linear-gradient(135deg,#2a0a0a,#330d0d)"
                  : "linear-gradient(135deg,#12071f,#1a0d2e)",
            border:
              t.type === "success"
                ? "1px solid #065f3c"
                : t.type === "error"
                  ? "1px solid #7f1d1d"
                  : "1px solid #3b1e6e",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            pointerEvents: "auto",
            fontSize: 12,
            fontWeight: 600,
            color:
              t.type === "success"
                ? "#34d399"
                : t.type === "error"
                  ? "#f87171"
                  : "#c4b5fd",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                t.type === "success"
                  ? "#10b98120"
                  : t.type === "error"
                    ? "#ef444420"
                    : "#7c3aed20",
              flexShrink: 0,
            }}
          >
            {t.type === "success" ? (
              <Check size={10} />
            ) : t.type === "error" ? (
              <AlertCircle size={10} />
            ) : (
              <Zap size={10} />
            )}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: "#0E1320",
        border: "1px solid #1a2035",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 2, background: "#1a2035" }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "#1a2035",
            }}
            className="sk-pulse"
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 13,
                width: "60%",
                background: "#1a2035",
                borderRadius: 6,
                marginBottom: 6,
              }}
              className="sk-pulse"
            />
            <div
              style={{
                height: 9,
                width: "30%",
                background: "#1a2035",
                borderRadius: 4,
              }}
              className="sk-pulse"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: "#1a2035",
            }}
            className="sk-pulse"
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                height: 18,
                width: "50%",
                background: "#1a2035",
                borderRadius: 6,
              }}
              className="sk-pulse"
            />
            <div
              style={{
                height: 10,
                width: "80%",
                background: "#1a2035",
                borderRadius: 4,
              }}
              className="sk-pulse"
            />
            <div
              style={{
                height: 10,
                width: "65%",
                background: "#1a2035",
                borderRadius: 4,
              }}
              className="sk-pulse"
            />
          </div>
        </div>
        <div
          style={{ height: 40, background: "#1a2035", borderRadius: 12 }}
          className="sk-pulse"
        />
      </div>
    </div>
  );
}

// ─── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, color, size = 84, stroke = 7 }) {
  const clamp = Math.min(Math.max(pct, 0), 100);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp / 100) * circ;
  const uid = `ring-${color.replace("#", "")}-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id={`rg-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1a2035"
        strokeWidth={stroke}
      />
      {clamp > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{
            filter: `url(#rg-${uid})`,
            transition: "stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
function IconBtn({ onClick, children, hoverColor, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "#0a0f1e",
        border: "1px solid #1a2035",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(255,61,113,0.08)"
          : `${hoverColor}12`;
        e.currentTarget.style.borderColor = hoverColor + "40";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#0a0f1e";
        e.currentTarget.style.borderColor = "#1a2035";
      }}
    >
      {children}
    </button>
  );
}

// ─── Mini Stat ────────────────────────────────────────────────────────────────
function MiniStat({ label, value, align = "left" }) {
  return (
    <div style={{ textAlign: align }}>
      <span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }}>
        {label}
      </span>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#9ca3af",
          margin: "1px 0 0",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Warn Strip ───────────────────────────────────────────────────────────────
function WarnStrip({ color, icon, children }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "7px 10px",
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        color,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      {children}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#374151",
        textTransform: "uppercase",
        letterSpacing: "0.13em",
        marginBottom: 5,
      }}
    >
      {children}
    </p>
  );
}

// ─── Error Message ────────────────────────────────────────────────────────────
function ErrMsg({ children }) {
  return (
    <p style={{ fontSize: 10, color: "#FF3D71", marginTop: 4 }}>{children}</p>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onDelete, onContribute, deleting }) {
  const id = goal._id || goal.id;
  const pct = Math.min(
    Math.round(((goal.saved ?? 0) / (goal.target || 1)) * 100),
    100,
  );
  const ml = monthsLeft(goal.deadline);
  const isOverdue = ml !== null && ml < 0;
  const isClose = ml !== null && ml >= 0 && ml <= 3;
  const done = goal.isCompleted || pct >= 100;

  return (
    <div
      style={{
        background: "#0E1320",
        border: `1px solid ${done ? goal.color + "50" : "#1a2035"}`,
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        transition: "transform 0.25s, box-shadow 0.25s",
        boxShadow: done
          ? `0 0 32px ${goal.color}25, 0 4px 24px rgba(0,0,0,0.5)`
          : "0 4px 24px rgba(0,0,0,0.4)",
        opacity: deleting ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${goal.color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = done
          ? `0 0 32px ${goal.color}25, 0 4px 24px rgba(0,0,0,0.5)`
          : "0 4px 24px rgba(0,0,0,0.4)";
      }}
    >
      {/* Accent line */}
      <div
        style={{
          height: 2,
          width: "100%",
          background: `linear-gradient(90deg, ${goal.color}60, ${goal.color})`,
          boxShadow: `0 0 8px ${goal.color}60`,
        }}
      />

      {/* Glow blob */}
      <div
        style={{
          position: "absolute",
          top: -32,
          right: -32,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${goal.color}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ padding: "16px 18px 18px", position: "relative" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: `${goal.color}15`,
                border: `1px solid ${goal.color}35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: goal.color,
                flexShrink: 0,
              }}
            >
              {ICON_MAP[goal.icon] || <Target size={16} />}
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {goal.name}
              </p>
              {goal.deadline && (
                <p
                  style={{
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: 600,
                    color: isOverdue
                      ? "#FF3D71"
                      : isClose
                        ? "#f59e0b"
                        : "#374151",
                  }}
                >
                  {isOverdue
                    ? `${Math.abs(ml)}mo overdue`
                    : ml === 0
                      ? "Due this month"
                      : `${ml}mo left`}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn onClick={() => onEdit(goal)} hoverColor={goal.color}>
              <Pencil size={11} color="#374151" />
            </IconBtn>
            <IconBtn onClick={() => onDelete(id)} hoverColor="#FF3D71" danger>
              {deleting ? (
                <RefreshCw
                  size={11}
                  color="#FF3D71"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Trash2 size={11} color="#374151" />
              )}
            </IconBtn>
          </div>
        </div>

        {/* Ring + amounts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <RingProgress pct={pct} color={goal.color} size={84} stroke={7} />
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
              {done ? (
                <Check size={18} color={goal.color} />
              ) : (
                <>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#e2e8f0",
                      lineHeight: 1,
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {pct}%
                  </span>
                  <span style={{ fontSize: 9, color: "#374151", marginTop: 1 }}>
                    done
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  color: "#374151",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Saved
              </span>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: goal.color,
                  margin: "1px 0 0",
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {fmtINR(goal.saved)}
              </p>
            </div>
            <div
              style={{ height: 1, background: "#0f1729", marginBottom: 6 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <MiniStat label="Target" value={fmtINR(goal.target)} />
              <MiniStat
                label="Remaining"
                value={
                  done
                    ? "—"
                    : fmtINR(
                        Math.max((goal.target ?? 0) - (goal.saved ?? 0), 0),
                      )
                }
                align="right"
              />
            </div>
          </div>
        </div>

        {/* Monthly + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "#0a0f1e",
            border: "1px solid #1a2035",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Zap size={11} color={goal.color} />
            <span style={{ fontSize: 11, color: "#374151" }}>
              <span style={{ color: goal.color, fontWeight: 700 }}>
                {fmtINR(goal.monthly)}
              </span>{" "}
              / month
            </span>
          </div>
          {!done ? (
            <button
              onClick={() => onContribute(goal)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 8,
                background: `${goal.color}15`,
                border: `1px solid ${goal.color}35`,
                color: goal.color,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${goal.color}28`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${goal.color}15`;
              }}
            >
              <Plus size={10} /> Add funds
            </button>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
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

        {/* Warnings */}
        {isOverdue && !done && (
          <WarnStrip color="#FF3D71" icon={<AlertCircle size={11} />}>
            Deadline passed — consider adjusting the target date.
          </WarnStrip>
        )}
        {isClose && !done && (
          <WarnStrip color="#f59e0b" icon={<AlertCircle size={11} />}>
            Deadline approaching — top up to stay on track.
          </WarnStrip>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "rgba(124,58,237,0.1)",
          border: "1px solid rgba(124,58,237,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Target size={28} color="#7c3aed" />
      </div>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#e2e8f0",
          marginBottom: 6,
        }}
      >
        No goals yet
      </p>
      <p
        style={{
          fontSize: 13,
          color: "#374151",
          marginBottom: 22,
          maxWidth: 280,
        }}
      >
        Set a savings goal and track your progress toward what matters most.
      </p>
      <button
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "10px 20px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #7c3aed, #9333ea)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow:
            "0 0 20px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <Plus size={14} /> Create first goal
      </button>
    </div>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────
function GoalModal({ mode, goal, onClose, onSave, saving }) {
  const isContrib = mode === "contribute";
  const isEdit = mode === "edit";
  const accent = isContrib ? goal?.color || "#7c3aed" : "#7c3aed";

  const [form, setForm] = useState(() => {
    if (isEdit && goal) {
      return {
        name: goal.name ?? "",
        target: goal.target ?? "",
        saved: goal.saved ?? "",
        monthly: goal.monthly ?? "",
        deadline: goal.deadline || "",
        color: goal.color || "#7c3aed",
        icon: goal.icon || "piggy",
      };
    }
    if (isContrib) return { amount: "" };
    return {
      name: "",
      target: "",
      saved: "",
      monthly: "",
      deadline: "",
      color: "#7c3aed",
      icon: "piggy",
    };
  });

  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const activeAccent = isContrib ? accent : form.color || "#7c3aed";

  function inputSt(field, hasErr) {
    const isFocused = focused === field;
    return {
      width: "100%",
      padding: "9px 13px",
      fontSize: 13,
      borderRadius: 11,
      background: hasErr
        ? "rgba(255,61,113,0.06)"
        : isFocused
          ? "#0d1526"
          : "#0a0f1e",
      border: `1px solid ${hasErr ? "#FF3D7150" : isFocused ? activeAccent + "55" : "#1a2035"}`,
      color: "#e2e8f0",
      outline: "none",
      boxShadow: isFocused && !hasErr ? `0 0 0 3px ${activeAccent}10` : "none",
      transition: "all 0.2s",
      boxSizing: "border-box",
    };
  }

  function validate() {
    const e = {};
    if (isContrib) {
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
    if (isContrib) {
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

  const title = isContrib
    ? `Add funds · ${goal?.name}`
    : isEdit
      ? "Edit goal"
      : "New goal";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,6,12,0.8)",
          backdropFilter: "blur(14px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
          background: "#0d1526",
          border: "1px solid #1a2035",
          borderRadius: 20,
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalIn 0.22s ease-out both",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${activeAccent}80, ${activeAccent})`,
            boxShadow: `0 0 10px ${activeAccent}50`,
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #0f1729",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `${activeAccent}15`,
                border: `1px solid ${activeAccent}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Target size={14} color={activeAccent} />
            </div>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#e2e8f0",
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
          <IconBtn onClick={onClose} hoverColor="#FF3D71" danger>
            <X size={12} color="#6b7280" />
          </IconBtn>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 18,
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {isContrib ? (
            <div>
              <Label>Amount to add (₹)</Label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                onFocus={() => setFocused("amount")}
                onBlur={() => setFocused(null)}
                style={inputSt("amount", !!errors.amount)}
              />
              {errors.amount && <ErrMsg>{errors.amount}</ErrMsg>}
              {goal && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "#0a0f1e",
                    border: "1px solid #1a2035",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <MiniStat label="Saved" value={fmtINR(goal.saved)} />
                  <MiniStat
                    label="Remaining"
                    value={fmtINR((goal.target ?? 0) - (goal.saved ?? 0))}
                  />
                  <MiniStat
                    label="Target"
                    value={fmtINR(goal.target)}
                    align="right"
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label>Goal name</Label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  style={inputSt("name", !!errors.name)}
                />
                {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <Label>Target (₹)</Label>
                  <input
                    type="number"
                    min="1"
                    placeholder="50000"
                    value={form.target}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, target: e.target.value }))
                    }
                    onFocus={() => setFocused("target")}
                    onBlur={() => setFocused(null)}
                    style={inputSt("target", !!errors.target)}
                  />
                  {errors.target && <ErrMsg>{errors.target}</ErrMsg>}
                </div>
                <div>
                  <Label>Already saved (₹)</Label>
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
                    style={inputSt("saved", false)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <Label>Monthly contribution (₹)</Label>
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
                    style={inputSt("monthly", false)}
                  />
                </div>
                <div>
                  <Label>Target date</Label>
                  <input
                    type="month"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, deadline: e.target.value }))
                    }
                    onFocus={() => setFocused("deadline")}
                    onBlur={() => setFocused(null)}
                    style={inputSt("deadline", false)}
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <Label>Color</Label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: c.value,
                        border:
                          form.color === c.value
                            ? "2px solid #fff"
                            : "2px solid transparent",
                        cursor: "pointer",
                        boxShadow:
                          form.color === c.value
                            ? `0 0 8px ${c.value}80`
                            : "none",
                        transition: "all 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <Label>Icon</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5,1fr)",
                    gap: 6,
                  }}
                >
                  {GOAL_ICONS.map((gi) => (
                    <button
                      key={gi.key}
                      onClick={() => setForm((p) => ({ ...p, icon: gi.key }))}
                      style={{
                        padding: "8px 4px 6px",
                        borderRadius: 10,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                        background:
                          form.icon === gi.key ? `${form.color}18` : "#0a0f1e",
                        border: `1px solid ${form.icon === gi.key ? form.color + "45" : "#1a2035"}`,
                        color: form.icon === gi.key ? form.color : "#374151",
                        fontSize: 9,
                        fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (form.icon !== gi.key) {
                          e.currentTarget.style.borderColor = form.color + "30";
                          e.currentTarget.style.color = form.color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (form.icon !== gi.key) {
                          e.currentTarget.style.borderColor = "#1a2035";
                          e.currentTarget.style.color = "#374151";
                        }
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
            padding: "14px 18px",
            display: "flex",
            gap: 10,
            borderTop: "1px solid #0f1729",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              background: "#0a0f1e",
              border: "1px solid #1a2035",
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: "10px 0",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${activeAccent}cc, ${activeAccent})`,
              border: "none",
              color: activeAccent === "#1AFFD5" ? "#001a14" : "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: `0 0 20px ${activeAccent}35, 0 4px 12px rgba(0,0,0,0.4)`,
              opacity: saving ? 0.65 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {saving ? (
              <>
                <RefreshCw
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Saving…
              </>
            ) : (
              <>
                <Check size={14} />
                {isContrib
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

// ─── Page ─────────────────────────────────────────────────────────────────────
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

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
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

  // ── Create ─────────────────────────────────────────────────────────────────
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
        addToast("Goal created!", "success");
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

  // ── Update ─────────────────────────────────────────────────────────────────
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

  // ── Contribute ─────────────────────────────────────────────────────────────
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
        addToast(res.data.message || "Funds added!", "success");
        setModal(null);
      }
    } catch (err) {
      addToast(err?.response?.data?.message || "Could not add funds", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
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

  // ── Dispatch ───────────────────────────────────────────────────────────────
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
        @keyframes fadeUp  { from{transform:translateY(14px);opacity:0} to{transform:none;opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes toastIn { from{transform:translateX(16px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
        @keyframes modalIn { from{transform:translateY(10px) scale(0.98);opacity:0} to{transform:none;opacity:1} }
        @keyframes skPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .gu-1{animation:fadeUp 0.38s ease both}
        .gu-2{animation:fadeUp 0.38s 0.06s ease both}
        .gu-3{animation:fadeUp 0.38s 0.12s ease both}
        .sk-pulse{animation:skPulse 1.4s ease-in-out infinite}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=month]::-webkit-calendar-picker-indicator{filter:invert(0.35);cursor:pointer}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
      `}</style>

      <Toast toasts={toasts} />

      <div
        style={{
          minHeight: "100vh",
          background: "#080B12",
          padding: "0 0 48px",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="gu-1"
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Target size={14} color="#7c3aed" />
              </div>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Savings Goals
              </h1>
            </div>
            <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>
              {loading
                ? "Loading…"
                : `${summary.count} goal${summary.count !== 1 ? "s" : ""} · ${summary.onTrack} on track`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Filter tabs */}
            <div
              style={{
                display: "flex",
                gap: 1,
                padding: 4,
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                borderRadius: 12,
              }}
            >
              {["all", "active", "done"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      filter === f
                        ? "linear-gradient(135deg,#7c3aed,#9333ea)"
                        : "transparent",
                    color: filter === f ? "#fff" : "#374151",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textTransform: "capitalize",
                    boxShadow:
                      filter === f ? "0 0 10px rgba(124,58,237,0.3)" : "none",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={() => fetchGoals(filter)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#0E1320",
                border: "1px solid #1a2035",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#7c3aed40";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2035";
              }}
            >
              <RefreshCw
                size={13}
                color="#374151"
                style={loading ? { animation: "spin 1s linear infinite" } : {}}
              />
            </button>
            {/* New goal */}
            <button
              onClick={() => setModal({ mode: "new" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 11,
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow:
                  "0 0 18px rgba(124,58,237,0.35), 0 3px 10px rgba(0,0,0,0.4)",
              }}
            >
              <Plus size={13} /> New goal
            </button>
          </div>
        </div>

        {/* ── Summary strip ──────────────────────────────────────────────── */}
        <div
          className="gu-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Total target",
              value: fmtINR(summary.totalTarget),
              accent: "#7c3aed",
              icon: <Target size={14} />,
            },
            {
              label: "Total saved",
              value: fmtINR(summary.totalSaved),
              accent: "#1AFFD5",
              icon: <PiggyBank size={14} />,
            },
            {
              label: "Monthly commit",
              value: fmtINR(summary.totalMonthly),
              accent: "#f59e0b",
              icon: <Zap size={14} />,
            },
            {
              label: "Overall",
              value: `${overallPct}%`,
              accent: "#3b82f6",
              icon: <TrendingUp size={14} />,
            },
          ].map(({ label, value, accent, icon }) => (
            <div
              key={label}
              style={{
                background: "#0E1320",
                border: "1px solid #1a2035",
                borderRadius: 14,
                padding: "12px 14px",
                boxShadow: "0 3px 16px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${accent}15`,
                  border: `1px solid ${accent}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accent,
                  marginBottom: 8,
                }}
              >
                {icon}
              </div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  margin: "0 0 3px",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  margin: 0,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Overall progress bar ────────────────────────────────────────── */}
        {!loading && goals.length > 0 && (
          <div
            className="gu-2"
            style={{
              background: "#0E1320",
              border: "1px solid #1a2035",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Overall progress
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#374151" }}>
                  {fmtINR(summary.totalSaved)} of {fmtINR(summary.totalTarget)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7c3aed",
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    padding: "1px 8px",
                    borderRadius: 999,
                  }}
                >
                  {overallPct}%
                </span>
              </div>
            </div>
            <div
              style={{
                height: 5,
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${overallPct}%`,
                  background:
                    "linear-gradient(90deg, #7c3aed80, #7c3aed, #1AFFD5)",
                  borderRadius: 999,
                  boxShadow: "0 0 8px rgba(124,58,237,0.5)",
                  transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Goals grid ──────────────────────────────────────────────────── */}
        <div
          className="gu-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
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

      {/* ── Modal ───────────────────────────────────────────────────────── */}
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
