/**
 * Common Utility Functions
 * Shared across Dashboard, Income, and Expense pages
 */

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format number to INR with compact notation (K, L, Cr)
 * @param {number} value - The value to format
 * @param {boolean} compact - Whether to use compact notation (default: true)
 * @returns {string} Formatted INR string
 */
export function fmtINR(value, compact = true) {
  const n = Number(value) || 0;

  if (compact) {
    if (n >= 10000000) {
      return `₹${(n / 10000000).toFixed(1)}Cr`;
    }
    if (n >= 100000) {
      return `₹${(n / 100000).toFixed(1)}L`;
    }
    if (n >= 1000) {
      return `₹${(n / 1000).toFixed(1)}K`;
    }
  }

  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Format number to full INR format with decimals
 * @param {number} value - The value to format
 * @returns {string} Formatted INR string with decimals
 */
export function fmtINRFull(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Safe number conversion
 * @param {any} value - Value to convert
 * @returns {number} Safe number or 0
 */
export function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Normalize date to Date object
 * @param {string|Date} value - Date value to normalize
 * @returns {Date|null} Normalized date or null
 */
export function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Check if date is within range
 * @param {string|Date} dateValue - Date to check
 * @param {string|Date} start - Range start
 * @param {string|Date} end - Range end
 * @returns {boolean} Whether date is in range
 */
export function isDateInRange(dateValue, start, end) {
  const date = normalizeDate(dateValue);
  if (!date) return false;

  const startDate = new Date(start);
  const endDate = new Date(end);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return date >= startDate && date <= endDate;
}

/**
 * Convert date to ISO format with client time
 * @param {string|Date} dateValue - Date value
 * @returns {string} ISO string
 */
export function toIsoWithClientTime(dateValue) {
  if (!dateValue) {
    return new Date().toISOString();
  }

  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const now = new Date();

    const localDate = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      0
    );

    return localDate.toISOString();
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

/**
 * Get date input value (YYYY-MM-DD format)
 * @param {string|Date} dateValue - Date value
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateInputValue(dateValue = new Date()) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Format date for display
 * @param {string|Date} dateValue - Date to format
 * @param {string} format - 'full' | 'short' | 'mobile'
 * @returns {string} Formatted date
 */
export function formatDate(dateValue, format = "full") {
  const d = normalizeDate(dateValue);
  if (!d) return "Invalid date";

  switch (format) {
    case "short":
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

    case "mobile":
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

    default:
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  }
}

/**
 * Get current year
 * @returns {number} Current year
 */
export function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Get year from date
 * @param {string|Date} dateValue - Date value
 * @returns {number|null} Year or null
 */
export function getYear(dateValue) {
  const d = normalizeDate(dateValue);
  return d ? d.getFullYear() : null;
}

// ============================================================================
// ARRAY & OBJECT UTILITIES
// ============================================================================

/**
 * Pad string with zeros
 * @param {number} value - Value to pad
 * @param {number} length - Desired length
 * @returns {string} Padded string
 */
export function padZero(value, length = 2) {
  return String(value).padStart(length, "0");
}

/**
 * Get year options for dropdown
 * @param {number} currentYear - Current year
 * @param {number} count - Number of years to generate
 * @returns {number[]} Array of years
 */
export function getYearOptions(currentYear, count = 5) {
  return Array.from({ length: count }, (_, index) => currentYear - index);
}

/**
 * Format category name (replace underscores with spaces)
 * @param {string} category - Category name
 * @returns {string} Formatted category
 */
export function formatCategory(category) {
  return String(category || "Other").replace(/_/g, " ");
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Get authorization headers
 * @returns {Object} Authorization headers object
 */
export function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("authToken");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

/**
 * Get error message from axios error
 * @param {Error} error - Axios error object
 * @param {string} fallback - Fallback message
 * @returns {string} Error message
 */
export function getErrorMessage(error, fallback = "An error occurred") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

// ============================================================================
// TIME FRAME UTILITIES
// ============================================================================

/**
 * Get time frame range
 * @param {string} timeFrame - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {number} selectedYear - Selected year (for yearly filter)
 * @returns {Object} Range with start, end, and label
 */
export function getTimeFrameRange(timeFrame, selectedYear) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (timeFrame === "daily") {
    return {
      start,
      end: new Date(now),
      label: "Today",
    };
  }

  if (timeFrame === "weekly") {
    const s = new Date(start);
    s.setDate(start.getDate() - start.getDay());
    s.setHours(0, 0, 0, 0);

    return {
      start: s,
      end: new Date(now),
      label: "This Week",
    };
  }

  if (timeFrame === "monthly") {
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(now),
      label: "This Month",
    };
  }

  // yearly
  return {
    start: new Date(start.getFullYear(), 0, 1),
    end: new Date(now),
    label: `Year ${selectedYear || start.getFullYear()}`,
  };
}

/**
 * Get previous time frame range
 * @param {string} timeFrame - Time frame type
 * @returns {Object} Previous range with start, end, and label
 */
export function getPreviousTimeFrameRange(timeFrame) {
  const now = new Date();

  if (timeFrame === "daily") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    return {
      start: yesterday,
      end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
      label: "Yesterday",
    };
  }

  if (timeFrame === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      start,
      end,
      label: "Last Week",
    };
  }

  if (timeFrame === "monthly") {
    const month = now.getMonth() - 1;
    const year = month < 0 ? now.getFullYear() - 1 : now.getFullYear();

    return {
      start: new Date(year, month < 0 ? 11 : month, 1),
      end: new Date(year, (month + 1) % 12, 0, 23, 59, 59, 999),
      label: "Last Month",
    };
  }

  // yearly
  const prevYear = now.getFullYear() - 1;

  return {
    start: new Date(prevYear, 0, 1),
    end: new Date(prevYear, 11, 31, 23, 59, 59, 999),
    label: `Year ${prevYear}`,
  };
}

// ============================================================================
// TRANSACTION UTILITIES
// ============================================================================

/**
 * Normalize transaction object
 * @param {Object} item - Raw transaction
 * @param {string} fallbackType - Fallback type
 * @returns {Object} Normalized transaction
 */
export function normalizeTransaction(item, fallbackType = "expense") {
  const rawType = String(item?.type || fallbackType).toLowerCase();
  const type = rawType === "income" || rawType === "expense" ? rawType : fallbackType;

  return {
    id:
      item?._id ||
      item?.id ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,

    date: normalizeDate(item?.date)
      ? new Date(item.date).toISOString()
      : new Date().toISOString(),

    description:
      item?.description ||
      item?.note ||
      item?.title ||
      (type === "income" ? "Income" : "Expense"),

    amount: Math.abs(Number(item?.amount) || 0),

    type,

    category: item?.category || (type === "income" ? "Salary" : "Other"),
  };
}

/**
 * Normalize array of transactions
 * @param {Array} items - Array of transactions
 * @param {string} fallbackType - Fallback type
 * @returns {Array} Normalized transactions
 */
export function normalizeTransactions(items, fallbackType) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) =>
    normalizeTransaction(item, fallbackType || item?.type || "expense")
  );
}

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate data from transactions
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Calculated data
 */
export function calculateData(transactions) {
  if (!Array.isArray(transactions)) {
    return {
      income: 0,
      expenses: 0,
    };
  }

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  return {
    income,
    expenses,
    savings: income - expenses,
  };
}

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate date value
 * @param {any} value - Value to validate
 * @returns {boolean} Whether value is valid date
 */
export function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate amount
 * @param {any} amount - Amount to validate
 * @returns {boolean} Whether amount is valid
 */
export function isValidAmount(amount) {
  const num = Number(amount);
  return Number.isFinite(num) && num > 0;
}
