import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  User,
  X,
  Target,
  ChevronRight,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const MENU_ITEMS = [
  { text: "Dashboard", path: "/", icon: Home },
  { text: "Income", path: "/income", icon: ArrowUp },
  { text: "Expenses", path: "/expense", icon: ArrowDown },
  { text: "Goals", path: "/goals", icon: Target },
  { text: "Profile", path: "/profile", icon: User },
];

const EXPANDED = 252;
const COLLAPSED = 72;

const SPRING = { type: "spring", damping: 30, stiffness: 260, mass: 0.7 };
const TEXT_SPRING = { type: "spring", damping: 32, stiffness: 300, mass: 0.6 };

/* ─── NavItem ───────────────────────────────────────────────────────────────── */
const NavItem = ({ text, path, Icon, collapsed, onClick }) => {
  const { pathname } = useLocation();
  const isActive =
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <Link
      to={path}
      onClick={onClick}
      className={[
        "group relative flex items-center rounded-xl px-3 py-2.5 overflow-hidden",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-violet-500 focus-visible:ring-offset-1",
        isActive
          ? "bg-violet-600 text-white shadow-md shadow-violet-300/40 dark:shadow-violet-900/50"
          : "text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-500/10 dark:hover:text-violet-300",
      ].join(" ")}
    >
      <motion.span
        aria-hidden
        animate={{ opacity: isActive && !collapsed ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/60"
      />

      <motion.span
        layout="position"
        transition={SPRING}
        className={[
          "shrink-0 flex items-center justify-center transition-colors duration-150",
          isActive
            ? "text-white"
            : "text-gray-400 group-hover:text-violet-600 dark:text-gray-500 dark:group-hover:text-violet-300",
        ].join(" ")}
      >
        <Icon size={18} aria-hidden />
      </motion.span>

      <motion.span
        animate={{
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          marginLeft: collapsed ? 0 : 12,
        }}
        transition={TEXT_SPRING}
        className="text-sm font-medium whitespace-nowrap overflow-hidden block"
      >
        {text}
      </motion.span>

      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
          {text}
        </span>
      )}
    </Link>
  );
};

/* ─── UserAvatar ─────────────────────────────────────────────────────────────── */
const UserAvatar = ({ name, profilePic, size = 36 }) => {
  const initial = (name ?? "U").charAt(0).toUpperCase();
  if (profilePic) {
    return (
      <img
        src={profilePic}
        alt={name}
        style={{ width: size, height: size, minWidth: size }}
        className="rounded-full object-cover shrink-0 ring-2 ring-violet-200 dark:ring-violet-700"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full shrink-0 flex items-center justify-center bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-semibold text-sm ring-2 ring-violet-200 dark:ring-violet-700"
    >
      {initial}
    </div>
  );
};

/* ─── SidebarContent ─────────────────────────────────────────────────────────── */
const SidebarContent = ({ collapsed, user, onNavClick }) => {
  const navigate = useNavigate();
  const {
    name = "User",
    email = "user@example.com",
    profilePic = "",
  } = user || {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ① USER CARD — sabse upar, brand ke neeche */}
      <div className="px-3 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center px-2 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 overflow-hidden">
          <UserAvatar name={name} profilePic={profilePic} size={34} />
          <motion.div
            animate={{
              maxWidth: collapsed ? 0 : 200,
              opacity: collapsed ? 0 : 1,
              marginLeft: collapsed ? 0 : 10,
            }}
            transition={TEXT_SPRING}
            className="overflow-hidden whitespace-nowrap block min-w-0"
          >
            <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
              {name}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
              {email}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ② NAV ITEMS — middle, flex-1 */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5"
      >
        <motion.p
          animate={{
            opacity: collapsed ? 0 : 1,
            height: collapsed ? 0 : "auto",
          }}
          transition={{ duration: 0.18 }}
          className="px-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-600 select-none overflow-hidden"
        >
          Menu
        </motion.p>

        {MENU_ITEMS.map(({ text, path, icon: Icon }) => (
          <NavItem
            key={path}
            text={text}
            path={path}
            Icon={Icon}
            collapsed={collapsed}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* ③ HELP + LOGOUT — sabse neeche */}
      <div className="border-t border-gray-100 dark:border-gray-700/60 p-2.5 space-y-0.5">
        {/* Help */}
        <Link
          to="/contactus"
          onClick={onNavClick}
          className="group relative w-full flex items-center rounded-xl px-3 py-2.5 overflow-hidden text-gray-400 dark:text-gray-500 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <motion.span
            layout="position"
            transition={SPRING}
            className="shrink-0 flex items-center"
          >
            <HelpCircle size={18} aria-hidden />
          </motion.span>
          <motion.span
            animate={{
              maxWidth: collapsed ? 0 : 180,
              opacity: collapsed ? 0 : 1,
              marginLeft: collapsed ? 0 : 12,
            }}
            transition={TEXT_SPRING}
            className="text-sm font-medium whitespace-nowrap overflow-hidden block"
          >
            Help & support
          </motion.span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
              Help & support
            </span>
          )}
        </Link>

        {/* Logout — red, at the very bottom */}
        <button
          onClick={() => navigate("/login")}
          className="group relative w-full flex items-center rounded-xl px-3 py-2.5 overflow-hidden text-gray-400 dark:text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <motion.span
            layout="position"
            transition={SPRING}
            className="shrink-0 flex items-center"
          >
            <LogOut size={18} aria-hidden />
          </motion.span>
          <motion.span
            animate={{
              maxWidth: collapsed ? 0 : 180,
              opacity: collapsed ? 0 : 1,
              marginLeft: collapsed ? 0 : 12,
            }}
            transition={TEXT_SPRING}
            className="text-sm font-medium whitespace-nowrap overflow-hidden block"
          >
            Log out
          </motion.span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
              Log out
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

/* ─── Sidebar ────────────────────────────────────────────────────────────────── */
const Sidebar = ({ user, isCollapsed, setIsCollapsed }) => {
  const sidebarRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target))
        setMobileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  return (
    <>
      {/* ══════════════════════════════════════
          DESKTOP
          ══════════════════════════════════════ */}

      {/* Sidebar panel — overflow-hidden ONLY on the panel itself */}
      <motion.aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 overflow-hidden"
        animate={{ width: isCollapsed ? COLLAPSED : EXPANDED }}
        transition={SPRING}
      >
        {/* Brand row inside panel (no overflow issue here) */}
        <div className="flex items-center px-4 py-5 border-b border-gray-100 dark:border-gray-700/60 overflow-hidden shrink-0">
          <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 shadow-md shadow-violet-300/40 dark:shadow-violet-900/40">
            <span className="text-white font-bold text-sm select-none">F</span>
          </div>
          <motion.div
            animate={{
              maxWidth: isCollapsed ? 0 : 180,
              opacity: isCollapsed ? 0 : 1,
              marginLeft: isCollapsed ? 0 : 12,
            }}
            transition={TEXT_SPRING}
            className="overflow-hidden whitespace-nowrap block"
          >
            <p className="text-[15px] font-bold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
              FinTrack
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Expense Tracker
            </p>
          </motion.div>
        </div>

        <SidebarContent
          collapsed={isCollapsed}
          user={user}
          onNavClick={() => {}}
        />
      </motion.aside>

      {/* Chevron toggle — rendered OUTSIDE the aside so overflow-hidden can't clip it */}
      <motion.div
        className="hidden lg:block fixed z-50 top-[72px]"
        animate={{ left: (isCollapsed ? COLLAPSED : EXPANDED) - 14 }}
        transition={SPRING}
      >
        <motion.button
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 shadow-md hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <motion.span
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={SPRING}
            className="flex items-center justify-center"
          >
            <ChevronRight size={13} strokeWidth={2.5} aria-hidden />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* ══════════════════════════════════════
          MOBILE FAB
          ══════════════════════════════════════ */}
      <motion.button
        onClick={() => setMobileOpen((p) => !p)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        whileTap={{ scale: 0.9 }}
        style={{ width: 52, height: 52 }}
        className="lg:hidden fixed bottom-5 left-5 z-50 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-400/50 dark:shadow-violet-900/60 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={mobileOpen ? "x" : "menu"}
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center"
          >
            {mobileOpen ? (
              <X size={22} aria-hidden />
            ) : (
              <Menu size={22} aria-hidden />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* ══════════════════════════════════════
          MOBILE DRAWER
          ══════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="lg:hidden fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />

            <motion.aside
              key="drawer"
              ref={sidebarRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 shadow-2xl dark:shadow-black/50"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 32,
                stiffness: 300,
                mass: 0.7,
              }}
            >
              {/* Brand + close */}
              <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 shadow-md shadow-violet-300/40 dark:shadow-violet-900/40">
                    <span className="text-white font-bold text-sm select-none">
                      F
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
                      FinTrack
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Expense Tracker
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <SidebarContent
                collapsed={false}
                user={user}
                onNavClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
