import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────────────────────
function fmtINR(n) {
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

// ─── Arc Gauge ─────────────────────────────────────────────────────────────────
function ArcGauge({ percentage, gradientStart, gradientEnd, isNegative, uid }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);

  const cx = 80,
    cy = 72,
    r = 56;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const startAngle = -180;
  const endAngle = 0;
  const totalArc = 180;

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

  const needleAngle = startAngle + (totalArc * clampedPct) / 100;
  const needleTip = {
    x: cx + r * Math.cos(toRad(needleAngle)),
    y: cy + r * Math.sin(toRad(needleAngle)),
  };

  // Needle base (pivot point slightly above center bottom of arc)
  const baseX = cx;
  const baseY = cy + 2;

  // Needle line end is just short of the tip
  const needleShortR = r - 6;
  const needleLine = {
    x: cx + needleShortR * Math.cos(toRad(needleAngle)),
    y: cy + needleShortR * Math.sin(toRad(needleAngle)),
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

        {/* Glow filter */}
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Tip glow */}
        <filter
          id={`tipglow-${uid}`}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Subtle bg sector ticks */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const tAngle = startAngle + (totalArc * tick) / 100;
        const inner = r - 14;
        const outer = r - 8;
        return (
          <line
            key={tick}
            x1={cx + inner * Math.cos(toRad(tAngle))}
            y1={cy + inner * Math.sin(toRad(tAngle))}
            x2={cx + outer * Math.cos(toRad(tAngle))}
            y2={cy + outer * Math.sin(toRad(tAngle))}
            stroke="#1e3a5f"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}

      {/* Track */}
      <path
        d={trackPath}
        stroke="#1a2035"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Fill arc */}
      {clampedPct > 0 && (
        <path
          d={fillPath}
          stroke={`url(#grad-${uid})`}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={{ filter: `url(#glow-${uid})` }}
        />
      )}

      {/* Needle */}
      {clampedPct > 0 && (
        <>
          <line
            x1={baseX}
            y1={baseY}
            x2={needleLine.x}
            y2={needleLine.y}
            stroke="#374151"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Tip dot with glow */}
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r="4.5"
            fill={gradientEnd}
            style={{ filter: `url(#tipglow-${uid})` }}
          />
          <circle cx={needleTip.x} cy={needleTip.y} r="2.5" fill="#0d1526" />
          {/* Pivot */}
          <circle cx={baseX} cy={baseY} r="3" fill="#1a2035" />
          <circle cx={baseX} cy={baseY} r="1.5" fill="#374151" />
        </>
      )}

      {/* Min / Max labels */}
      <text
        x="14"
        y="84"
        fontSize="8.5"
        textAnchor="middle"
        fill="#1e3a5f"
        fontWeight="600"
      >
        0%
      </text>
      <text
        x="146"
        y="84"
        fontSize="8.5"
        textAnchor="middle"
        fill="#1e3a5f"
        fontWeight="600"
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
        fontSize: "10px",
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: "999px",
        background: up ? "rgba(26,255,213,0.08)" : "rgba(255,61,113,0.08)",
        border: up
          ? "1px solid rgba(26,255,213,0.2)"
          : "1px solid rgba(255,61,113,0.2)",
        color: up ? "#1AFFD5" : "#FF3D71",
      }}
    >
      <Icon size={9} />
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
  trend = null,
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
    : colorInfo.gradientStart || "#7c3aed";
  const gradientEnd = isNegative
    ? "#FF3D71"
    : colorInfo.gradientEnd || "#1AFFD5";

  const uid = name.replace(/\s+/g, "-").toLowerCase();

  const tier = useMemo(() => {
    if (isNegative) return { label: "Deficit", color: "#FF3D71" };
    if (percentage >= 80) return { label: "Excellent", color: "#1AFFD5" };
    if (percentage >= 50) return { label: "On track", color: "#7c3aed" };
    if (percentage >= 25) return { label: "Low", color: "#f59e0b" };
    return { label: "Critical", color: "#FF3D71" };
  }, [percentage, isNegative]);

  return (
    <>
      <style>{`
        @keyframes gaugeBarGrow {
          from { width: 0%; }
          to   { width: ${Math.round(percentage)}%; }
        }
        .gauge-bar-${uid} {
          animation: gaugeBarGrow 0.8s cubic-bezier(0.34,1.56,0.64,1) both;
          animation-delay: 0.15s;
        }
      `}</style>

      <div
        style={{
          background: "#0E1320",
          border: `1px solid ${isNegative ? "#FF3D7130" : "#1a2035"}`,
          borderRadius: "18px",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          boxShadow: isNegative
            ? "0 4px 32px rgba(255,61,113,0.12), 0 0 0 1px rgba(255,61,113,0.08)"
            : "0 4px 32px rgba(0,0,0,0.45)",
          transition: "box-shadow 0.3s, transform 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = isNegative
            ? `0 8px 40px rgba(255,61,113,0.2), 0 0 0 1px ${gradientEnd}30`
            : `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${gradientEnd}25`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = isNegative
            ? "0 4px 32px rgba(255,61,113,0.12), 0 0 0 1px rgba(255,61,113,0.08)"
            : "0 4px 32px rgba(0,0,0,0.45)";
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
            boxShadow: `0 0 10px ${gradientEnd}50`,
            width: "100%",
            flexShrink: 0,
          }}
        />

        {/* Ambient glow blob */}
        <div
          style={{
            position: "absolute",
            top: -24,
            right: -24,
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${gradientEnd}12 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ padding: "14px 16px 16px", position: "relative" }}>
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#374151",
              }}
            >
              {name}
            </span>
            <TrendBadge pct={trend} />
          </div>

          {/* Value */}
          <div
            style={{
              fontSize: "clamp(18px,4vw,22px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: isNegative ? "#FF3D71" : "#e2e8f0",
              lineHeight: 1.1,
              marginBottom: "6px",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {isNegative && (
              <span
                style={{ fontSize: "0.72em", color: "#FF3D71", marginRight: 1 }}
              >
                −
              </span>
            )}
            {fmtINR(absValue)}
          </div>

          {/* Tier + timeframe row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: tier.color,
                background: `${tier.color}15`,
                border: `1px solid ${tier.color}30`,
                padding: "1px 7px",
                borderRadius: "999px",
              }}
            >
              {tier.label}
            </span>
            {timeFrameLabel && (
              <span style={{ fontSize: "10px", color: "#374151" }}>
                {timeFrameLabel}
              </span>
            )}
          </div>

          {/* Arc gauge SVG */}
          <div style={{ margin: "0 -4px -2px" }}>
            <ArcGauge
              percentage={percentage}
              gradientStart={gradientStart}
              gradientEnd={gradientEnd}
              isNegative={isNegative}
              uid={uid}
            />
          </div>

          {/* Linear progress bar + percent */}
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
                  fontSize: "9px",
                  color: "#1e3a5f",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                vs target
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: isNegative ? "#FF3D71" : "#c9d1e8",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {Math.round(percentage)}%
              </span>
            </div>

            {/* Track */}
            <div
              style={{
                height: "3px",
                background: "#0a0f1e",
                border: "1px solid #1a2035",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                className={`gauge-bar-${uid}`}
                style={{
                  height: "100%",
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                  borderRadius: "999px",
                  boxShadow: `0 0 6px ${gradientEnd}60`,
                }}
              />
            </div>
          </div>

          {/* Negative warning */}
          {isNegative && highlightNegative && (
            <div
              style={{
                marginTop: "10px",
                padding: "7px 10px",
                background: "rgba(255,61,113,0.06)",
                border: "1px solid rgba(255,61,113,0.2)",
                borderRadius: "10px",
                fontSize: "10px",
                color: "#FF3D71",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span style={{ fontSize: 13 }}>⚠</span>
              Spending exceeds income
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GaugeCard;
