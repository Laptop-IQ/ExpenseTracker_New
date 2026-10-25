import { Download, Loader2, Plus } from "lucide-react";

import CustomRangePicker from "./CustomRangePicker";
import "../../styles/dashboard.css";

const FRAMES = ["daily", "weekly", "monthly", "yearly", "custom"];
const label = (frame) => frame.charAt(0).toUpperCase() + frame.slice(1);

/**
 * Period filter + export + add action, styled like the Dashboard's period bar.
 * Used on the Income and Expense pages.
 */
export default function PeriodControls({
  timeFrame,
  onTimeFrameChange,
  rangeLabel,
  onExport,
  exporting = false,
  onAdd,
  addLabel,
  accent = "primary",
  customRange,
  onCustomRangeChange,
}) {
  return (
    <section className="period-bar" aria-label="Choose a period">
      <div className="period-row">
        <div className="seg" role="group" aria-label="Time frame">
          {FRAMES.map((frame) => (
            <button
              key={frame}
              type="button"
              className={timeFrame === frame ? "on" : ""}
              aria-pressed={timeFrame === frame}
              onClick={() => onTimeFrameChange(frame)}
            >
              {label(frame)}
            </button>
          ))}
        </div>

        <span className="period-label">{rangeLabel}</span>

        <div className="period-actions">
          <button type="button" className="btn" onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 size={15} className="spin" aria-hidden /> : <Download size={15} aria-hidden />}
            {exporting ? "Preparing file" : "Export to Excel"}
          </button>
          {onAdd && (
            <button type="button" className={`btn btn-primary btn-${accent}`} onClick={onAdd} disabled={exporting}>
              <Plus size={16} aria-hidden />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {timeFrame === "custom" && (
        <div className="period-custom">
          <CustomRangePicker customRange={customRange} setCustomRange={onCustomRangeChange} />
        </div>
      )}
    </section>
  );
}
