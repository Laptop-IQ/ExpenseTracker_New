import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Pin,
  PinOff,
  Target,
  User,
  Wallet,
  X,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const MAIN_ITEMS = [
  { text: "Dashboard", short: "Home", path: "/", icon: LayoutDashboard },
  { text: "Income", short: "Income", path: "/income", icon: ArrowUp },
  { text: "Expenses", short: "Expenses", path: "/expense", icon: ArrowDown },
  { text: "Goals", short: "Goals", path: "/goals", icon: Target },
];
const ACCOUNT_ITEMS = [{ text: "Profile", short: "Profile", path: "/profile", icon: User }];
const MOBILE_ITEMS = [...MAIN_ITEMS, ...ACCOUNT_ITEMS];

const EXPANDED = 256;
const COLLAPSED = 76;
const SPRING = { type: "spring", damping: 32, stiffness: 280, mass: 0.7 };
const TEXT = { duration: 0.18, ease: "easeOut" };

const isActivePath = (pathname, path) =>
  pathname === path || (path !== "/" && pathname.startsWith(path));

/* ─── Pieces ────────────────────────────────────────────────────────────── */
const Collapsible = ({ collapsed, children, className = "" }) => (
  <motion.span
    initial={false}
    animate={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 190 }}
    transition={TEXT}
    className={className}
    style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap" }}
  >
    {children}
  </motion.span>
);

const Brand = ({ collapsed = false }) => (
  <>
    <div className="sb-logo" aria-hidden>
      <Wallet size={21} />
    </div>
    <Collapsible collapsed={collapsed} className="sb-brand-text">
      <b>FinTrack</b>
      <small>Expense tracker</small>
    </Collapsible>
  </>
);

const NavItem = ({ text, path, Icon, collapsed, onClick }) => {
  const { pathname } = useLocation();
  const active = isActivePath(pathname, path);
  return (
    <Link
      to={path}
      onClick={onClick}
      className={`sb-link${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} aria-hidden />
      <Collapsible collapsed={collapsed} className="sb-text">
        {text}
      </Collapsible>
      {collapsed && <span className="sb-tip">{text}</span>}
    </Link>
  );
};

const SidebarContent = ({ collapsed, onNavClick, onLogout }) => (
  <>
    <nav aria-label="Main navigation" className="sb-scroll scroll-thin">
      <div className="sb-group">
        <div className="sb-label">{collapsed ? "" : "Menu"}</div>
        {MAIN_ITEMS.map(({ text, path, icon }) => (
          <NavItem key={path} text={text} path={path} Icon={icon} collapsed={collapsed} onClick={onNavClick} />
        ))}
      </div>
      <div className="sb-group">
        <div className="sb-label">{collapsed ? "" : "Account"}</div>
        {ACCOUNT_ITEMS.map(({ text, path, icon }) => (
          <NavItem key={path} text={text} path={path} Icon={icon} collapsed={collapsed} onClick={onNavClick} />
        ))}
        <Link to="/contactus" onClick={onNavClick} className="sb-link">
          <HelpCircle size={20} aria-hidden />
          <Collapsible collapsed={collapsed} className="sb-text">Help and support</Collapsible>
          {collapsed && <span className="sb-tip">Help and support</span>}
        </Link>
      </div>
    </nav>

    <div className="sb-foot">
      {!collapsed && (
        <Link to="/goals" onClick={onNavClick} className="sb-promo">
          <span className="ico"><Target size={18} aria-hidden /></span>
          <span>
            <b>Set a savings goal</b>
            <small>Pick a target and a date</small>
          </span>
        </Link>
      )}
      <button type="button" className="sb-link danger" onClick={onLogout}>
        <LogOut size={20} aria-hidden />
        <Collapsible collapsed={collapsed} className="sb-text">Log out</Collapsible>
        {collapsed && <span className="sb-tip">Log out</span>}
      </button>
    </div>
  </>
);

/* ─── Mobile bottom tabs ────────────────────────────────────────────────── */
const MobileBottomNav = () => {
  const { pathname } = useLocation();
  return (
    <nav className="m-nav" aria-label="Bottom navigation">
      {MOBILE_ITEMS.map(({ short, path, icon: Icon }) => {
        const active = isActivePath(pathname, path);
        return (
          <Link key={path} to={path} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={21} aria-hidden />
            <span>{short}</span>
          </Link>
        );
      })}
    </nav>
  );
};

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
/**
 * Desktop: slim rail that opens when the cursor or keyboard focus enters it,
 * floating over the page so content never jumps. `pinned` keeps it open and
 * lets the page make room for it.
 */
const HOVER_OPEN_DELAY = 70;
const HOVER_CLOSE_DELAY = 200;

const Sidebar = ({ pinned = false, setPinned = () => {}, onLogout = () => {} }) => {
  const drawerRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const { pathname } = useLocation();

  const expanded = pinned || hovered;
  const collapsed = !expanded;
  const floating = hovered && !pinned;

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };
  const handleEnter = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => setHovered(true), HOVER_OPEN_DELAY);
  };
  const handleLeave = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setHovered(false), HOVER_CLOSE_DELAY);
  };
  const handleFocusIn = () => {
    clearTimers();
    setHovered(true);
  };
  const handleFocusOut = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) handleLeave();
  };

  useEffect(() => clearTimers, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      {/* desktop rail */}
      <motion.aside
        aria-label="Sidebar"
        className={`sb${floating ? " floating" : ""}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocusCapture={handleFocusIn}
        onBlurCapture={handleFocusOut}
        initial={false}
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={SPRING}
      >
        <div className="sb-brand">
          <Brand collapsed={collapsed} />
          {expanded && (
            <button
              type="button"
              className="sb-pin"
              onClick={() => setPinned((value) => !value)}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            >
              {pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
            </button>
          )}
        </div>
        <SidebarContent collapsed={collapsed} onNavClick={() => {}} onLogout={onLogout} />
      </motion.aside>

      {/* mobile header */}
      <header className="m-top">
        <div className="sb-brand">
          <Brand />
        </div>
        <button type="button" className="m-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
          <Menu size={21} aria-hidden />
        </button>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              ref={drawerRef}
              className="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={SPRING}
            >
              <div className="sb-brand">
                <Brand />
                <button type="button" className="sb-pin" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X size={18} aria-hidden />
                </button>
              </div>
              <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)} onLogout={onLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <MobileBottomNav />
    </>
  );
};

export default Sidebar;
