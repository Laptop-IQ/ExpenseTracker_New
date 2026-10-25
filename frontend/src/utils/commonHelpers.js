/* ============================================================================
   COMMON HELPERS - Shared across Income, Expense & Dashboard
============================================================================ */

/* --------------------------------------------------------------------------
   DATE & TIME HELPERS
-------------------------------------------------------------------------- */

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function getMonthKey(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function getYear(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) return "Select month";
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "Select month";
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateInputValue(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toIsoWithClientTime(dateValue) {
  if (!dateValue) {
    return new Date().toISOString();
  }

  if (typeof dateValue === "string" && dateValue.length === 10) {
    const now = new Date();
    return new Date(
      `${dateValue}T${now.toTimeString().slice(0, 8)}`
    ).toISOString();
  }

  const parsed = new Date(dateValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

export function formatTransactionDate(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTransactionDateMobile(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateInRange(dateValue, start, end) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;

  const startDate = new Date(start);
  const endDate = new Date(end);

  d.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return d >= startDate && d <= endDate;
}

/* --------------------------------------------------------------------------
   FORMATTING HELPERS
-------------------------------------------------------------------------- */

export function fmtINR(value) {
  const n = Number(value || 0);

  if (n >= 10000000) {
    return `₹${(n / 10000000).toFixed(1)}Cr`;
  }

  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(1)}L`;
  }

  if (n >= 1000) {
    return `₹${(n / 1000).toFixed(1)}K`;
  }

  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatFullINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatCategory(category) {
  return String(category || "Other").replace(/_/g, " ");
}

/* --------------------------------------------------------------------------
   RANGE HELPERS
-------------------------------------------------------------------------- */

export function getYearOptions(currentYear, count = 5) {
  return Array.from({ length: count }, (_, index) => currentYear - index);
}

export function getMonthRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function getYearRange(year) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/* --------------------------------------------------------------------------
   CUSTOM MONTH RANGE
   A range is { start, end } where each value is a "month index":
   year * 12 + month (month is 0-11). Plain integers keep comparisons,
   "last N months" maths and year changes trivial.
-------------------------------------------------------------------------- */

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = MONTH_LONG.map((name) => name.slice(0, 3));

export const toMonthIndex = (year, month) => year * 12 + month;

export const fromMonthIndex = (index) => ({
  year: Math.floor(index / 12),
  month: ((index % 12) + 12) % 12,
});

export const getCurrentMonthIndex = (now = new Date()) =>
  toMonthIndex(now.getFullYear(), now.getMonth());

export function getDefaultCustomRange(now = new Date()) {
  const max = getCurrentMonthIndex(now);

  return { start: max - 2, end: max };
}

/** Sorts start/end, clamps to the current month and fills missing values. */
export function normalizeCustomRange(range, now = new Date()) {
  const max = getCurrentMonthIndex(now);

  let start = Number.isInteger(range?.start) ? range.start : max - 2;
  let end = Number.isInteger(range?.end) ? range.end : max;

  if (start > end) [start, end] = [end, start];

  return { start: Math.min(start, max), end: Math.min(end, max) };
}

export function getCustomMonthCount(range) {
  const { start, end } = normalizeCustomRange(range);

  return end - start + 1;
}

export function formatCustomRangeLabel(range) {
  const { start, end } = normalizeCustomRange(range);
  const from = fromMonthIndex(start);
  const to = fromMonthIndex(end);

  if (start === end) return `${MONTH_LONG[from.month]} ${from.year}`;

  if (from.year === to.year) {
    return `${MONTH_SHORT[from.month]} – ${MONTH_SHORT[to.month]} ${to.year}`;
  }

  return `${MONTH_SHORT[from.month]} ${from.year} – ${MONTH_SHORT[to.month]} ${to.year}`;
}

/* --------------------------------------------------------------------------
   TIME FRAME RANGE
-------------------------------------------------------------------------- */

export function getTimeFrameRange(
  timeFrame,
  selectedYear,
  selectedMonth,
  customRange,
) {
  const now = new Date();

  if (timeFrame === "daily") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    return {
      start,
      end,
      label: "Today",
    };
  }

  if (timeFrame === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end: new Date(now),
      label: "This Week",
    };
  }

  if (timeFrame === "monthly") {
    const year = selectedYear;
    const month =
      Number.isInteger(selectedMonth) && selectedMonth >= 0 && selectedMonth <= 11
        ? selectedMonth
        : selectedYear === now.getFullYear()
          ? now.getMonth()
          : 0;
    const start = new Date(year, month, 1);
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth();

    let end;
    if (isCurrentMonth) {
      end = new Date(now);
    } else {
      end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start,
      end,
      label: isCurrentMonth
        ? "This Month"
        : `${start.toLocaleDateString("en-IN", {
            month: "long",
          })} ${year}`,
    };
  }

  if (timeFrame === "custom") {
    const { start: startIndex, end: endIndex } = normalizeCustomRange(
      customRange,
      now,
    );

    const from = fromMonthIndex(startIndex);
    const to = fromMonthIndex(endIndex);

    return {
      start: new Date(from.year, from.month, 1),
      end:
        endIndex === getCurrentMonthIndex(now)
          ? new Date(now)
          : new Date(to.year, to.month + 1, 0, 23, 59, 59, 999),
      label: formatCustomRangeLabel({ start: startIndex, end: endIndex }),
    };
  }

  const start = new Date(selectedYear, 0, 1);
  const end =
    selectedYear === now.getFullYear()
      ? new Date(now)
      : new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  return {
    start,
    end,
    label:
      selectedYear === now.getFullYear()
        ? `Year ${selectedYear} · YTD`
        : `Year ${selectedYear}`,
  };
}

/* --------------------------------------------------------------------------
   CHART DATA BUILDERS
-------------------------------------------------------------------------- */

export function buildChartPoints(mode, periodValue) {
  const points = [];

  if (mode === "month") {
    const [year, month] = periodValue.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();

    for (let i = 1; i <= days; i++) {
      points.push({
        key: `${year}-${pad2(month)}-${pad2(i)}`,
        date: new Date(year, month - 1, i),
        label: String(i),
        day: i,
      });
    }

    return points;
  }

  const year = Number(periodValue);

  for (let month = 0; month < 12; month++) {
    points.push({
      key: `${year}-${pad2(month + 1)}`,
      date: new Date(year, month, 1),
      label: new Date(year, month, 1).toLocaleDateString("en-IN", {
        month: "short",
      }),
      month,
    });
  }

  return points;
}

export function generateChartPoints(
  timeFrame,
  selectedYear,
  selectedMonth,
  customRange,
) {
  const now = new Date();
  const points = [];

  if (timeFrame === "custom") {
    const { start, end } = normalizeCustomRange(customRange, now);

    // one month -> daily bars, several months -> one bar per month
    if (start === end) {
      const { year, month } = fromMonthIndex(start);

      return generateChartPoints("monthly", year, month);
    }

    const multiYear = fromMonthIndex(start).year !== fromMonthIndex(end).year;

    for (let index = start; index <= end; index++) {
      const { year, month } = fromMonthIndex(index);
      const date = new Date(year, month, 1);

      points.push({
        key: `${year}-${pad2(month + 1)}`,
        date,
        label: multiYear
          ? `${MONTH_SHORT[month]} '${String(year).slice(-2)}`
          : MONTH_SHORT[month],
        month,
        year,
        isCurrent: index === getCurrentMonthIndex(now),
      });
    }

    return points;
  }

  if (timeFrame === "daily") {
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now);
      hour.setHours(i, 0, 0, 0);
      points.push({
        date: hour,
        label: hour.toLocaleTimeString([], { hour: "2-digit" }),
        hour: i,
        isCurrent: i === now.getHours(),
      });
    }
    return points;
  }

  if (timeFrame === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      points.push({
        date: day,
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        day: day.getDate(),
        month: day.getMonth(),
        isCurrent:
          day.getDate() === now.getDate() &&
          day.getMonth() === now.getMonth() &&
          day.getFullYear() === now.getFullYear(),
      });
    }
    return points;
  }

  if (timeFrame === "monthly") {
    const year = selectedYear;
    const month =
      Number.isInteger(selectedMonth) && selectedMonth >= 0 && selectedMonth <= 11
        ? selectedMonth
        : selectedYear === now.getFullYear()
          ? now.getMonth()
          : 0;
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= days; i++) {
      const day = new Date(year, month, i);
      points.push({
        date: day,
        label: String(i),
        day: i,
        month,
        isCurrent:
          selectedYear === now.getFullYear() &&
          month === now.getMonth() &&
          i === now.getDate(),
      });
    }
    return points;
  }

  for (let i = 0; i < 12; i++) {
    const month = new Date(selectedYear, i, 1);
    points.push({
      date: month,
      label: month.toLocaleDateString("en-IN", { month: "short" }),
      month: i,
      isCurrent:
        selectedYear === now.getFullYear() && i === now.getMonth(),
    });
  }

  return points;
}

/* --------------------------------------------------------------------------
   AUTH HELPERS
-------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   PERIOD HELPERS (shared by the Layout stat cards, pages and Dashboard)
-------------------------------------------------------------------------- */

/** Range for the whole period selection (year / month / yearly-month / custom). */
export function resolvePeriodRange({
  timeFrame,
  selectedYear,
  selectedMonth,
  yearMonth,
  customRange,
}) {
  if (timeFrame === "yearly" && yearMonth !== null && yearMonth !== undefined) {
    return getTimeFrameRange("monthly", selectedYear, yearMonth);
  }

  return getTimeFrameRange(timeFrame, selectedYear, selectedMonth, customRange);
}

/**
 * [currentStart, nextStart) is the selected period, [previousStart,
 * currentStart) the equally sized period before it. Returns null for
 * daily / weekly, which are always relative to "now".
 */
export function getPeriodBounds({
  timeFrame,
  selectedYear,
  selectedMonth,
  yearMonth,
  customRange,
}) {
  const monthBounds = (year, month) => ({
    currentStart: new Date(year, month, 1),
    nextStart: new Date(year, month + 1, 1),
    previousStart: new Date(year, month - 1, 1),
    previousLabel: "Previous Month",
  });

  if (timeFrame === "monthly") return monthBounds(selectedYear, selectedMonth);

  if (timeFrame === "yearly") {
    if (yearMonth !== null && yearMonth !== undefined) {
      return monthBounds(selectedYear, yearMonth);
    }

    return {
      currentStart: new Date(selectedYear, 0, 1),
      nextStart: new Date(selectedYear + 1, 0, 1),
      previousStart: new Date(selectedYear - 1, 0, 1),
      previousLabel: "Last Year",
    };
  }

  if (timeFrame === "custom") {
    const { start, end } = normalizeCustomRange(customRange);
    const from = fromMonthIndex(start);
    const to = fromMonthIndex(end);
    const count = end - start + 1;

    return {
      currentStart: new Date(from.year, from.month, 1),
      nextStart: new Date(to.year, to.month + 1, 1),
      previousStart: new Date(from.year, from.month - count, 1),
      previousLabel: "Previous Period",
    };
  }

  return null;
}

/* --------------------------------------------------------------------------
   CHART KEYS - one place decides how a transaction maps to a chart bar
-------------------------------------------------------------------------- */

/** true when bars are days of one month (instead of months of a year) */
export function isDailyGranularity(timeFrame, customRange) {
  return (
    timeFrame === "monthly" ||
    (timeFrame === "custom" && getCustomMonthCount(customRange) === 1)
  );
}

export function chartKeyForDate(timeFrame, date, customRange) {
  if (timeFrame === "daily") return date.getHours();

  if (timeFrame === "weekly") {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  if (timeFrame === "monthly") return date.getDate();

  if (timeFrame === "custom") {
    return isDailyGranularity(timeFrame, customRange)
      ? date.getDate()
      : `${date.getFullYear()}-${date.getMonth()}`;
  }

  return date.getMonth();
}

export function chartKeyForPoint(timeFrame, point, customRange) {
  if (timeFrame === "daily") return point.hour;

  return chartKeyForDate(timeFrame, point.date, customRange);
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}
