# FinTrack UI/UX upgrade

- New design system: `src/styles/app.css` (tokens, shell, sidebar, buttons, modal, toast)
- Dashboard styles: `src/styles/dashboard.css`
- Income/Expense harmonisation: `src/styles/legacy.css`
- Rewritten: `components/Sidebar.jsx` (logout now clears session), `components/Layout.jsx` (sidebar + topbar shell), `pages/Dashboard.jsx` (logic unchanged)
- Light-themed: Add modal, range/year/month pickers, toast, Goals, Profile, ContactUs, Income, Expense, auth pages
- Removed: `Layout.css`, `premium.css` (no longer imported)
- Tailwind `dark:` is now opt-in via a `.dark` class (see `src/index.css`)

## Category details
- New page `src/pages/CategoryDetail.jsx` at `/expense/category/:name` (year, month and sort filters, month-wise chart and table, transactions list, category switcher)
- Reached from Dashboard donut (slice or list row) and Expense "Top categories" rows
- "View all N categories" toggles on both the donut list and Expense Top categories
- `CategoryDetail` takes `kind="expense" | "income"`; income version lives at `/income/source/:name`
- Topbar actions (updated time, refresh, Add transaction, profile chip) are hidden on /income, /expense, /goals and /profile (see `hideTopbarActions` in `Layout.jsx`)
