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

export function getTimeFrameRange(timeFrame, selectedYear) {
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
    const year =
      selectedYear === now.getFullYear() ? now.getFullYear() : selectedYear;
    const month = selectedYear === now.getFullYear() ? now.getMonth() : 0;
    const start = new Date(year, month, 1);

    let end;
    if (selectedYear === now.getFullYear()) {
      end = new Date(now);
    } else {
      end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start,
      end,
      label:
        selectedYear === now.getFullYear()
          ? "This Month"
          : `${start.toLocaleDateString("en-IN", {
              month: "long",
            })} ${year}`,
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

export function generateChartPoints(timeFrame, selectedYear) {
  const now = new Date();
  const points = [];

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
    const month = selectedYear === now.getFullYear() ? now.getMonth() : 0;
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
