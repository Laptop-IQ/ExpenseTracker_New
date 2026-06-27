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
  BarChart2,
  Settings,
} from "lucide-react";

const MENU_ITEMS = [
  { text: "Dashboard", path: "/", icon: <Home size={18} /> },
  { text: "Income", path: "/income", icon: <ArrowUp size={18} /> },
  { text: "Expenses", path: "/expense", icon: <ArrowDown size={18} /> },
  { text: "Goals", path: "/goals", icon: <Target size={18} /> },
  { text: "Profile", path: "/profile", icon: <User size={18} /> },
];

const Sidebar = ({ user, isCollapsed, setIsCollapsed }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    name: username = "User",
    email = "user@example.com",
    profilePic = "",
  } = user || {};
  const initial = username.charAt(0).toUpperCase();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        mobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target)
      )
        setMobileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  const handleLogout = () => navigate("/login");

  const SidebarContent = ({ collapsed }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-gray-50 dark:border-gray-700 ${collapsed ? "justify-center" : ""}`}
      >
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-200 dark:shadow-violet-900/40">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight"
          >
            Expense Tracker
          </motion.span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {MENU_ITEMS.map(({ text, path, icon }) => {
          const isActive =
            pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={`${text}-${path}`}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
                ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/40"
                    : "text-gray-500 hover:bg-violet-50 hover:text-violet-700 dark:text-gray-400 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? text : undefined}
            >
              <span
                className={`shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-violet-600 dark:text-gray-500 dark:group-hover:text-violet-400"}`}
              >
                {icon}
              </span>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium"
                >
                  {text}
                </motion.span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div
        className={`border-t border-gray-50 dark:border-gray-700 p-3 space-y-1`}
      >
        <Link
          to="/contactus"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:text-gray-500 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 transition-all ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Support" : undefined}
        >
          <HelpCircle size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Help</span>}
        </Link>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        ref={sidebarRef}
        className="hidden lg:flex fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-black/30 z-40 flex-col"
        animate={{ width: isCollapsed ? 72 : 250 }}
        transition={{ type: "spring", damping: 28, stiffness: 200 }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500 transition-all z-50"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline
              points={isCollapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}
            />
          </svg>
        </button>

        <SidebarContent collapsed={isCollapsed} />
      </motion.aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen((p) => !p)}
        className="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-300 dark:shadow-violet-900/50 flex items-center justify-center"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-40 flex">
            <motion.div
              className="absolute inset-0 bg-gray-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              ref={sidebarRef}
              className="relative w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-xl dark:shadow-black/50 z-50"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28 }}
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
