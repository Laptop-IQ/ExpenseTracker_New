import React from "react";

/**
 * Spinning 3D coin used for every loading state.
 * Pure CSS (see index.css, `.coin-*`): a stack of thin layers gives the coin a
 * real edge while it rotates around the Y axis.
 */
const EDGE_LAYERS = [-3, -2, -1, 0, 1, 2, 3];

function CoinLoader({
  size = 56,
  label = "Loading",
  showLabel = true,
  className = "",
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className="coin-scene"
        style={{ "--coin-size": `${size}px` }}
        aria-hidden="true"
      >
        <div className="coin-glow" />

        <div className="coin">
          {EDGE_LAYERS.map((z) => (
            <span
              key={z}
              className="coin-edge"
              style={{ transform: `translateZ(${z}px)` }}
            />
          ))}

          <span className="coin-face coin-front">₹</span>
          <span className="coin-face coin-back">₹</span>
        </div>

        <div className="coin-shadow" />
      </div>

      {showLabel && (
        <span className="coin-label text-[11px] font-semibold tracking-[0.18em] text-slate-400">
          {label.toUpperCase()}
          <span className="coin-dots" />
        </span>
      )}
    </div>
  );
}

/** Centered block for page / section loading states. */
export function CoinLoaderBlock({ label = "Loading", minHeight = "50vh" }) {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ minHeight }}
    >
      <CoinLoader label={label} />
    </div>
  );
}

export default CoinLoader;
