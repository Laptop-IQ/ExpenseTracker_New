import { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { EXPENSE_CATEGORY_ICONS, INCOME_CATEGORY_ICONS } from "../assets/color";
import "../styles/category.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAGE_SIZE = 15;

const KINDS = {
  expense: {
    type: "expense",
    icons: EXPENSE_CATEGORY_ICONS,
    back: "/expense",
    backLabel: "Back to expenses",
    route: "/expense/category",
    noun: "Category",
    nounLower: "category",
    verb: "Spent",
    gerund: "spending",
    sign: "−",
    bar: "#ee6a0b",
    dim: "#f9d3b5",
    tint: "var(--primary-50)",
    ink: "var(--primary)",
    emptyAction: "Add an expense",
  },
  income: {
    type: "income",
    icons: INCOME_CATEGORY_ICONS,
    back: "/income",
    backLabel: "Back to income",
    route: "/income/source",
    noun: "Source",
    nounLower: "source",
    verb: "Earned",
    gerund: "earnings",
    sign: "+",
    bar: "#0f9f6e",
    dim: "#bfe6d6",
    tint: "var(--income-50)",
    ink: "var(--income)",
    emptyAction: "Add income",
  },
};

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const full = (n) => `₹${nf.format(Math.round(Number(n) || 0))}`;
const short = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};
const label = (c) => String(c || "Other").replace(/_/g, " ");

function ChartTip({ active, payload, verb = "Spent" }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="tip">
      <p className="tip-title">{MONTHS_LONG[row.idx]}</p>
      <p className="tip-row">
        <span>{verb}</span>
        <b className="mono">{full(row.amount)}</b>
      </p>
      <p className="tip-row">
        <span>Transactions</span>
        <b className="mono">{row.count}</b>
      </p>
    </div>
  );
}

export default function CategoryDetail({ kind = "expense" }) {
  const K = KINDS[kind] || KINDS.expense;
  const { name } = useParams();
  const navigate = useNavigate();
  // `transactions` is already narrowed to the period chosen elsewhere in the app
  // (for example "Monthly"). This page does its own year and month filtering,
  // so it needs the complete history.
  const outlet = useOutletContext() || {};
  const transactions = outlet.allTransactions ?? outlet.transactions ?? [];

  const category = decodeURIComponent(name || "Other");

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === K.type && t.date && !Number.isNaN(new Date(t.date).getTime())),
    [transactions, K.type],
  );

  const inCategory = useMemo(
    () => expenses.filter((t) => (t.category || "Other") === category),
    [expenses, category],
  );

  const allCategories = useMemo(() => {
    const totals = {};
    expenses.forEach((t) => {
      const c = t.category || "Other";
      totals[c] = (totals[c] || 0) + (Number(t.amount) || 0);
    });
    if (!(category in totals)) totals[category] = 0;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses, category]);

  const years = useMemo(
    () => [...new Set(inCategory.map((t) => new Date(t.date).getFullYear()))].sort((a, b) => b - a),
    [inCategory],
  );

  const [yearPick, setYearPick] = useState("");
  const [month, setMonth] = useState("all");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const year = years.includes(Number(yearPick)) ? Number(yearPick) : years[0] ?? new Date().getFullYear();

  const yearItems = useMemo(
    () => inCategory.filter((t) => new Date(t.date).getFullYear() === year),
    [inCategory, year],
  );

  const monthly = useMemo(
    () =>
      MONTHS.map((m, idx) => {
        const items = yearItems.filter((t) => new Date(t.date).getMonth() === idx);
        return { month: m, idx, count: items.length, amount: items.reduce((s, t) => s + (Number(t.amount) || 0), 0) };
      }),
    [yearItems],
  );

  const yearTotal = monthly.reduce((s, r) => s + r.amount, 0);
  const activeMonths = monthly.filter((r) => r.count > 0);
  const average = activeMonths.length ? yearTotal / activeMonths.length : 0;
  const peak = activeMonths.reduce((best, r) => (!best || r.amount > best.amount ? r : best), null);
  const allTime = inCategory.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const selectedIdx = month === "all" ? null : Number(month);

  const filtered = useMemo(() => {
    const list = selectedIdx === null ? yearItems : yearItems.filter((t) => new Date(t.date).getMonth() === selectedIdx);
    return [...list].sort((a, b) =>
      sort === "highest"
        ? (Number(b.amount) || 0) - (Number(a.amount) || 0)
        : sort === "oldest"
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date),
    );
  }, [yearItems, selectedIdx, sort]);

  const filteredTotal = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const filtersActive = selectedIdx !== null || sort !== "newest" || yearPick !== "";
  const icon = K.icons?.[category] ?? K.icons?.Other ?? null;

  const pickMonth = (idx) => {
    setMonth((current) => (String(idx) === current ? "all" : String(idx)));
    setVisible(PAGE_SIZE);
  };
  const reset = () => {
    setYearPick("");
    setMonth("all");
    setSort("newest");
    setVisible(PAGE_SIZE);
  };
  const goCategory = (value) => {
    reset();
    navigate(`${K.route}/${encodeURIComponent(value)}`);
  };

  return (
    <div className="cat-page">
      <button type="button" className="cat-back" onClick={() => navigate(K.back)}>
        <ArrowLeft size={16} aria-hidden /> {K.backLabel}
      </button>

      <header className="card cat-hero">
        <span className="cat-badge" aria-hidden style={{ color: K.ink, background: K.tint }}>{icon}</span>
        <div className="cat-hero-text">
          <h2>{label(category)}</h2>
          <p>
            {inCategory.length} {inCategory.length === 1 ? "transaction" : "transactions"} · {full(allTime)} all time
          </p>
        </div>
        <label className="cat-field cat-switch">
          <span>{K.noun}</span>
          <select value={category} onChange={(e) => goCategory(e.target.value)}>
            {allCategories.map(([c, total]) => (
              <option key={c} value={c}>{label(c)} · {short(total)}</option>
            ))}
          </select>
        </label>
      </header>

      {inCategory.length === 0 ? (
        <div className="card empty" style={{ minHeight: 260 }}>
          <p className="empty-title">No {label(category)} {K.type === "income" ? "income" : "expenses"} yet</p>
          <p className="empty-text">Add a transaction for this {K.nounLower} and its monthly breakdown will show up here.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(K.back)}>{K.backLabel.replace("Back to ", "Go to ")}</button>
        </div>
      ) : (
        <>
          <section className="card cat-filters" aria-label="Filters">
            <label className="cat-field">
              <span>Year</span>
              <select value={year} onChange={(e) => { setYearPick(e.target.value); setVisible(PAGE_SIZE); }}>
                {(years.length ? years : [year]).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="cat-field">
              <span>Month</span>
              <select value={month} onChange={(e) => { setMonth(e.target.value); setVisible(PAGE_SIZE); }}>
                <option value="all">All months</option>
                {MONTHS_LONG.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
            </label>
            <label className="cat-field">
              <span>Sort transactions</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
              </select>
            </label>
            <button type="button" className="btn" onClick={reset} disabled={!filtersActive}>
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          </section>

          <section className="cat-kpis" aria-label="Summary">
            <div className="kpi kpi-static">
              <span className="kpi-label">{K.verb} in {year}</span>
              <strong className="kpi-value mono">{full(yearTotal)}</strong>
              <span className="kpi-hint">{yearItems.length} transactions</span>
            </div>
            <div className="kpi kpi-static">
              <span className="kpi-label">{selectedIdx === null ? "Selected period" : MONTHS_LONG[selectedIdx]}</span>
              <strong className="kpi-value mono">{full(filteredTotal)}</strong>
              <span className="kpi-hint">{filtered.length} transactions</span>
            </div>
            <div className="kpi kpi-static">
              <span className="kpi-label">Average per active month</span>
              <strong className="kpi-value mono">{full(average)}</strong>
              <span className="kpi-hint">{activeMonths.length} {activeMonths.length === 1 ? "month" : "months"} with {K.gerund}</span>
            </div>
            <div className="kpi kpi-static">
              <span className="kpi-label">Highest month</span>
              <strong className="kpi-value mono">{peak ? full(peak.amount) : "₹0"}</strong>
              <span className="kpi-hint">{peak ? MONTHS_LONG[peak.idx] : `No ${K.gerund} this year`}</span>
            </div>
          </section>

          <section className="card">
            <header className="card-head">
              <div>
                <h3 className="card-title">{K.gerund.charAt(0).toUpperCase() + K.gerund.slice(1)} by month, {year}</h3>
                <p className="card-sub">Select a bar to filter the transactions below</p>
              </div>
              {selectedIdx !== null && (
                <button type="button" className="chip chip-blue cat-clear" onClick={() => setMonth("all")}>
                  {MONTHS_LONG[selectedIdx]} · clear
                </button>
              )}
            </header>
            <div className="cat-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={short} />
                  <Tooltip content={<ChartTip verb={K.verb} />} cursor={{ fill: "rgba(37,99,235,.06)" }} />
                  <Bar
                    dataKey="amount"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={38}
                    cursor="pointer"
                    onClick={(entry) => pickMonth(entry?.idx ?? entry?.payload?.idx)}
                  >
                    {monthly.map((row) => (
                      <Cell key={row.month} fill={selectedIdx === null || selectedIdx === row.idx ? K.bar : K.dim} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="cat-grid">
            <section className="card">
              <header className="card-head">
                <div>
                  <h3 className="card-title">Month-wise breakdown</h3>
                  <p className="card-sub">Share of {year} {K.gerund}</p>
                </div>
              </header>
              <ul className="cat-months">
                {monthly.map((row) => {
                  const pct = yearTotal ? (row.amount / yearTotal) * 100 : 0;
                  return (
                    <li key={row.month}>
                      <button
                        type="button"
                        className={selectedIdx === row.idx ? "on" : ""}
                        onClick={() => pickMonth(row.idx)}
                        disabled={row.count === 0}
                        aria-pressed={selectedIdx === row.idx}
                      >
                        <span className="cm-name">{MONTHS_LONG[row.idx]}</span>
                        <span className="cm-bar"><i style={{ width: `${pct}%`, background: K.bar }} /></span>
                        <span className="cm-count">{row.count}</span>
                        <b className="mono">{row.count ? full(row.amount) : "–"}</b>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card">
              <header className="card-head">
                <div>
                  <h3 className="card-title">Transactions</h3>
                  <p className="card-sub">
                    {selectedIdx === null ? year : `${MONTHS_LONG[selectedIdx]} ${year}`} · {filtered.length} found
                  </p>
                </div>
              </header>
              {filtered.length === 0 ? (
                <div className="empty"><p className="empty-text">No transactions for this filter.</p></div>
              ) : (
                <>
                  <ul className="cat-tx">
                    {filtered.slice(0, visible).map((t) => (
                      <li key={t.id || `${t.date}-${t.amount}-${t.description}`}>
                        <span className="tx-text">
                          <b>{t.description || label(category)}</b>
                          <small>{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
                        </span>
                        <strong className="mono" style={{ color: K.type === "income" ? "var(--income)" : undefined }}>{K.sign}{full(t.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                  {filtered.length > visible && (
                    <button type="button" className="btn cat-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Show more ({filtered.length - visible} left)
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
