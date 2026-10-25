import { useMemo, useState } from "react";
import { getDefaultCustomRange } from "./commonHelpers";

/**
 * The period the user is looking at: year, month (monthly view), month inside
 * the yearly view (null = all months) and a custom month range.
 *
 * Layout owns one instance and shares it through the outlet context, so the
 * stat cards, every page and the charts always describe the same period.
 */
export function useCreatePeriod() {
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [yearMonth, setYearMonth] = useState(null);
  const [customRange, setCustomRange] = useState(() =>
    getDefaultCustomRange(),
  );

  return useMemo(
    () => ({
      selectedYear,
      setSelectedYear,
      selectedMonth,
      setSelectedMonth,
      yearMonth,
      setYearMonth,
      customRange,
      setCustomRange,
    }),
    // setters from useState are stable, listed so the memo is fully declared
    [
      selectedYear,
      setSelectedYear,
      selectedMonth,
      setSelectedMonth,
      yearMonth,
      setYearMonth,
      customRange,
      setCustomRange,
    ],
  );
}

/** Uses the shared period from the outlet context, or its own when absent. */
export function usePeriod(outletContext) {
  const local = useCreatePeriod();

  return outletContext?.period ?? local;
}
