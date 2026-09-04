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

/* ─── Constants ──────────────────────────────────────────────────────────────── */
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

/* ─── NavItem ─────────────────────────────────────────────────────────────────── */
const NavItem = ({ text, path, Icon, collapsed, onClick }) => {
  const { pathname } = useLocation();
  const isActive =
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <Link
      to={path}
      onClick={onClick}
      className={[
        "group relative flex items-center rounded-xl overflow-hidden",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1",
        isActive
          ? "bg-violet-600 text-white shadow-md shadow-violet-300/40 dark:shadow-violet-900/50"
          : "text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-500/10 dark:hover:text-violet-300",
      ].join(" ")}
      style={{
        padding: "12px 12px",
        minHeight: 48, // mobile-friendly tap target
        WebkitTapHighlightColor: "transparent",
      }}
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
        style={{ width: 24, height: 24 }}
      >
        <Icon size={20} aria-hidden />
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

      {/* Tooltip for collapsed desktop state */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
          {text}
        </span>
      )}
    </Link>
  );
};


/* ─── SidebarContent ──────────────────────────────────────────────────────────── */
const SidebarContent = ({ collapsed, user, onNavClick }) => {
  const navigate = useNavigate();
  const {
    name = "User",
    email = "user@example.com",
    profilePic = "",
  } = user || {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
     
      {/* Nav Items */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1"
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

      {/* Bottom: Help + Logout */}
      <div className="border-t border-gray-100 dark:border-gray-700/60 p-2.5 space-y-1">
        <Link
          to="/contactus"
          onClick={onNavClick}
          className="group relative w-full flex items-center rounded-xl overflow-hidden text-gray-400 dark:text-gray-500 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          style={{
            padding: "12px 12px",
            minHeight: 48,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <motion.span
            layout="position"
            transition={SPRING}
            className="shrink-0 flex items-center"
            style={{ width: 24, height: 24 }}
          >
            <HelpCircle size={20} aria-hidden />
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

        <button
          onClick={() => navigate("/login")}
          className="group relative w-full flex items-center rounded-xl overflow-hidden text-gray-400 dark:text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          style={{
            padding: "12px 12px",
            minHeight: 48,
            background: "none",
            border: "none",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <motion.span
            layout="position"
            transition={SPRING}
            className="shrink-0 flex items-center"
            style={{ width: 24, height: 24 }}
          >
            <LogOut size={20} aria-hidden />
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

/* ─── Mobile Bottom Nav Bar ───────────────────────────────────────────────────── */
const MobileBottomNav = ({ onMenuOpen }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const items = [
    { text: "Home", path: "/", icon: Home },
    { text: "Income", path: "/income", icon: ArrowUp },
    { text: "Expenses", path: "/expense", icon: ArrowDown },
    { text: "Goals", path: "/goals", icon: Target },
    { text: "Profile", path: "/profile", icon: User },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.08)",
      }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around">
        {items.map(({ text, path, icon: Icon }) => {
          const isActive =
            pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center gap-0.5 transition-colors duration-150"
              style={{
                flex: 1,
                padding: "8px 4px 10px",
                color: isActive ? "#7c3aed" : "#9ca3af",
                WebkitTapHighlightColor: "transparent",
                minHeight: 56,
              }}
            >
              <Icon size={22} aria-hidden />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  lineHeight: 1,
                }}
              >
                {text}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
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
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <motion.aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 overflow-hidden"
        animate={{ width: isCollapsed ? COLLAPSED : EXPANDED }}
        transition={SPRING}
      >
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

      {/* Collapse toggle (desktop only) */}
      <motion.div
        className="hidden lg:block fixed z-50 top-[72px]"
        animate={{ left: (isCollapsed ? COLLAPSED : EXPANDED) - 14 }}
        transition={SPRING}
      >
        <motion.button
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          whileHover={{ scale: 1.1 }}
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

      {/* ═══ MOBILE HEADER BAR ═══ */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}
      >
        <div
          className="flex items-center justify-between px-4"
          style={{ height: 56 }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700">
              <span className="text-white font-bold text-sm select-none">
                F
              </span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
                FinTrack
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                Expense Tracker
              </p>
            </div>
          </div>

          {/* Menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      {/* ═══ MOBILE DRAWER ═══ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="lg:hidden fixed inset-0 z-40 bg-black/40 dark:bg-black/60"
              style={{ backdropFilter: "blur(2px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              ref={sidebarRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 shadow-2xl dark:shadow-black/50"
              style={{
                width: Math.min(EXPANDED, 280),
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
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
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <X size={18} aria-hidden />
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

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <MobileBottomNav />
    </>
  );
};

export default Sidebar;
