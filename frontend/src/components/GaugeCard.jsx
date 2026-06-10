import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────────────────────
function fmtINR(n) {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
function ArcGauge({ percentage, gradientStart, gradientEnd, isNegative, uid }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);

  // SVG arc math — semi-circle gauge
  const cx = 80;
  const cy = 72;
  const r = 58;
  const startAngle = -180;
  const endAngle = 0;
  const totalArc = endAngle - startAngle; // 180°

  const toRad = (deg) => (deg * Math.PI) / 180;

  const trackStart = {
    x: cx + r * Math.cos(toRad(startAngle)),
    y: cy + r * Math.sin(toRad(startAngle)),
  };
  const trackEnd = {
    x: cx + r * Math.cos(toRad(endAngle)),
    y: cy + r * Math.sin(toRad(endAngle)),
  };

  const fillAngle = startAngle + (totalArc * clampedPct) / 100;
  const fillEnd = {
    x: cx + r * Math.cos(toRad(fillAngle)),
    y: cy + r * Math.sin(toRad(fillAngle)),
  };
  const largeArc = clampedPct > 50 ? 1 : 0;

  const trackPath = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`;
  const fillPath =
    clampedPct === 0
      ? ""
      : `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  // Needle tip position
  const needleAngle = startAngle + (totalArc * clampedPct) / 100;
  const needleR = r;
  const needleTip = {
    x: cx + needleR * Math.cos(toRad(needleAngle)),
    y: cy + needleR * Math.sin(toRad(needleAngle)),
  };

  return (
    <svg
      viewBox="0 0 160 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: "100%", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
        <filter id={`glow-${uid}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path
        d={trackPath}
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        className="gauge-track"
      />

      {/* Fill arc */}
      {clampedPct > 0 && (
        <path
          d={fillPath}
          stroke={`url(#grad-${uid})`}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          style={{ filter: `url(#glow-${uid})` }}
        />
      )}

      {/* Needle dot */}
      {clampedPct > 0 && (
        <circle
          cx={needleTip.x}
          cy={needleTip.y}
          r="5"
          fill={gradientEnd}
          stroke="white"
          strokeWidth="2"
        />
      )}

      {/* Min / Max labels */}
      <text
        x="14"
        y="82"
        fontSize="9"
        textAnchor="middle"
        fill="currentColor"
        fillOpacity="0.4"
      >
        0%
      </text>
      <text
        x="146"
        y="82"
        fontSize="9"
        textAnchor="middle"
        fill="currentColor"
        fillOpacity="0.4"
      >
        100%
      </text>
    </svg>
  );
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: "999px",
        background: up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: up ? "#10b981" : "#ef4444",
      }}
    >
      <Icon size={10} />
      {Math.abs(pct)}%
    </span>
  );
}

// ─── GaugeCard ────────────────────────────────────────────────────────────────
const GaugeCard = ({
  gauge = {},
  colorInfo = {},
  timeFrameLabel = "",
  highlightNegative = false,
  trend = null, // optional: percent change vs previous period
}) => {
  const { name = "Metric", value = 0, max = 100 } = gauge;

  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const percentage = useMemo(
    () => Math.min((absValue / Math.max(max, 1)) * 100, 100),
    [absValue, max],
  );

  const gradientStart = isNegative
    ? "#f97316"
    : colorInfo.gradientStart || "#0d9488";
  const gradientEnd = isNegative
    ? "#ef4444"
    : colorInfo.gradientEnd || "#0891b2";

  const uid = name.replace(/\s+/g, "-").toLowerCase();

  // Tier label
  const tier = useMemo(() => {
    if (isNegative) return { label: "Deficit", color: "#ef4444" };
    if (percentage >= 80) return { label: "Excellent", color: "#10b981" };
    if (percentage >= 50) return { label: "On track", color: "#3b82f6" };
    if (percentage >= 25) return { label: "Low", color: "#f59e0b" };
    return { label: "Critical", color: "#ef4444" };
  }, [percentage, isNegative]);

  return (
    <div
      style={{
        background: "var(--color-background-primary, #ffffff)",
        border: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12))",
        borderRadius: "16px",
        padding: "0",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: "3px",
          background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
          width: "100%",
        }}
      />

      <div style={{ padding: "14px 16px 16px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            {name}
          </span>
          <TrendBadge pct={trend} />
        </div>

        {/* Value */}
        <div
          style={{
            fontSize: "clamp(18px, 4vw, 22px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: isNegative
              ? "#ef4444"
              : "var(--color-text-primary, #111827)",
            lineHeight: 1.15,
            marginBottom: "2px",
          }}
        >
          {isNegative && (
            <span style={{ fontSize: "0.75em", opacity: 0.7 }}>−</span>
          )}
          {fmtINR(absValue)}
        </div>

        {/* Tier + timeframe */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: tier.color,
              background: tier.color + "18",
              padding: "1px 6px",
              borderRadius: "999px",
            }}
          >
            {tier.label}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--color-text-secondary, #9ca3af)",
            }}
          >
            {timeFrameLabel}
          </span>
        </div>

        {/* Arc gauge */}
        <div style={{ margin: "0 -4px -4px" }}>
          <ArcGauge
            percentage={percentage}
            gradientStart={gradientStart}
            gradientEnd={gradientEnd}
            isNegative={isNegative}
            uid={uid}
          />
        </div>

        {/* Progress bar + percent */}
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "var(--color-text-secondary, #9ca3af)",
              }}
            >
              vs target
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: isNegative
                  ? "#ef4444"
                  : "var(--color-text-primary, #111827)",
              }}
            >
              {Math.round(percentage)}%
            </span>
          </div>
          {/* Linear track */}
          <div
            style={{
              height: "4px",
              background: "var(--color-border-tertiary, rgba(0,0,0,0.08))",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                borderRadius: "999px",
                transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          </div>
        </div>

        {/* Negative warning */}
        {isNegative && highlightNegative && (
          <div
            style={{
              marginTop: "10px",
              padding: "6px 10px",
              background: "rgba(239,68,68,0.06)",
              border: "0.5px solid rgba(239,68,68,0.2)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#ef4444",
              fontWeight: 500,
            }}
          >
            ⚠ Spending exceeds income
          </div>
        )}
      </div>
    </div>
  );
};

export default GaugeCard;
