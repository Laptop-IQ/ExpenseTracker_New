import { createElement, useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import {
  Baby, Banknote, Bed, Beer, Bike, Book, Briefcase, Bus, Camera, Car, Cat,
  Coffee, Coins, Cookie, CreditCard, Dog, Droplets, Dumbbell, Flame, Fuel,
  Gamepad2, Gift, GraduationCap, Hammer, Heart, HeartPulse, Home, Laptop,
  Leaf, Lightbulb, MoreHorizontal, Music, Palette, PawPrint, Phone, Pill,
  Pizza, Plane, Popcorn, Receipt, Scissors, Shield, Shirt, ShoppingBasket,
  ShoppingCart, Smartphone, Sofa, Sparkles, Star, Stethoscope, Tag, Ticket,
  TrendingUp, Trophy, Umbrella, Utensils, Wallet, Wifi, Wine, Wrench, Zap,
  Milk,
} from "lucide-react";

/* ─── Icon registry (stored by name in the DB) ─────────────────────────── */
export const ICON_MAP = {
  Tag, Wallet, Banknote, Briefcase, Coins, TrendingUp, Utensils, ShoppingBasket,
  Milk, Cookie, Car, Fuel, Home, Zap, HeartPulse, Wrench, ShoppingCart, Gift,
  Scissors, Baby, Shield, MoreHorizontal, Plane, Music, Book, Dumbbell, Coffee,
  PawPrint, Dog, Cat, Smartphone, Laptop, Gamepad2, Shirt, GraduationCap, Bus,
  Bike, Wifi, Pizza, Beer, Wine, Popcorn, Camera, Palette, Hammer, Leaf, Heart,
  Star, Phone, CreditCard, Receipt, Sparkles, Lightbulb, Stethoscope, Pill,
  Droplets, Flame, Sofa, Bed, Trophy, Umbrella, Ticket,
};
export const ICON_NAMES = Object.keys(ICON_MAP);

export const COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#64748b", "#94a3b8",
];

/* ─── Built-in categories (same keys the rest of the app already uses) ─── */
const D = (key, icon, color) => ({ key, icon, color });
export const DEFAULT_CATEGORIES = {
  income: [
    D("Salary", "Wallet", "#0f9f6e"),
    D("Extra_Income", "Banknote", "#3b82f6"),
    D("Freelance", "Briefcase", "#a78bfa"),
    D("Side_Hustles", "Coins", "#f59e0b"),
    D("Investment", "TrendingUp", "#06b6d4"),
  ],
  expense: [
    D("Food", "Utensils", "#f97316"),
    D("Grocery", "ShoppingBasket", "#22c55e"),
    D("Dairy", "Milk", "#fb923c"),
    D("Junk_Food", "Cookie", "#e11d48"),
    D("Transport", "Car", "#3b82f6"),
    D("Fuel", "Fuel", "#f59e0b"),
    D("Housing", "Home", "#8b5cf6"),
    D("Utilities", "Zap", "#14b8a6"),
    D("Healthcare", "HeartPulse", "#ef4444"),
    D("Service", "Wrench", "#84cc16"),
    D("Shopping", "ShoppingCart", "#a855f7"),
    D("Entertainment", "Gift", "#ec4899"),
    D("Investment", "TrendingUp", "#10b981"),
    D("Personal_Care_Expenses", "Scissors", "#f43f5e"),
    D("Kids_Needs", "Baby", "#06b6d4"),
    D("Annual_Expense", "Shield", "#6366f1"),
    D("Other", "MoreHorizontal", "#94a3b8"),
  ],
};

export const prettyKey = (key) => String(key || "").replace(/_/g, " ");

/* ─── Tiny external store ──────────────────────────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const CACHE_KEY = "fintrack:categories";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const tokenTag = () => getToken().slice(-16);

let state = { records: [], usage: { income: {}, expense: {} }, loaded: false, loading: false, error: "" };
const listeners = new Set();
const emit = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

// Show the last known categories instantly, then refresh from the server.
try {
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  if (cached && cached.tag === tokenTag() && Array.isArray(cached.records)) {
    state = { ...state, records: cached.records, usage: cached.usage || state.usage };
  }
} catch {
  /* ignore broken cache */
}

const persist = () => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ tag: tokenTag(), records: state.records, usage: state.usage }),
    );
  } catch {
    /* storage full / blocked */
  }
};

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => state;

export const loadCategories = async (force = false) => {
  if (!getToken()) return;
  if (state.loading || (state.loaded && !force)) return;
  emit({ loading: true, error: "" });
  try {
    const { data } = await axios.get(`${API_BASE}/categories`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    emit({
      records: data.categories || [],
      usage: data.usage || { income: {}, expense: {} },
      loaded: true,
      loading: false,
    });
    persist();
  } catch (err) {
    emit({
      loading: false,
      error: err?.response?.data?.message || "Could not load categories",
    });
  }
};

const errMsg = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

export const addCategory = async ({ type, label, icon, color }) => {
  try {
    await axios.post(`${API_BASE}/categories`, { type, label, icon, color }, { headers: authHeaders() });
    await loadCategories(true);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: errMsg(err) };
  }
};

export const updateCategory = async (id, { label, icon, color }) => {
  try {
    const { data } = await axios.put(`${API_BASE}/categories/${id}`, { label, icon, color }, { headers: authHeaders() });
    await loadCategories(true);
    return { ok: true, moved: data.moved || 0 };
  } catch (err) {
    return { ok: false, message: errMsg(err) };
  }
};

// Built-ins: change colour/icon, or hide/show in the picker.
export const saveBuiltin = async ({ type, key, icon, color, hidden }) => {
  try {
    await axios.put(`${API_BASE}/categories/builtin`, { type, key, icon, color, hidden }, { headers: authHeaders() });
    await loadCategories(true);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: errMsg(err) };
  }
};

export const deleteCategory = async (id) => {
  try {
    const { data } = await axios.delete(`${API_BASE}/categories/${id}`, { headers: authHeaders() });
    await loadCategories(true);
    return { ok: true, moved: data.moved || 0, movedTo: data.movedTo };
  } catch (err) {
    return { ok: false, message: errMsg(err) };
  }
};

/* ─── Selectors ────────────────────────────────────────────────────────── */
const decorate = (item) => ({
  ...item,
  Icon: ICON_MAP[item.icon] || Tag,
  display: item.label || prettyKey(item.key),
});

/**
 * Full list for one type: built-ins (with the user's colour/icon overrides)
 * followed by custom categories. Hidden built-ins are dropped unless asked for.
 */
export const buildList = (snapshot, type, { includeHidden = false } = {}) => {
  const overrides = new Map(
    snapshot.records.filter((r) => r.type === type && r.builtin).map((r) => [r.key, r]),
  );
  const builtIns = DEFAULT_CATEGORIES[type].map((d) => {
    const o = overrides.get(d.key);
    return decorate({
      id: o?._id || null,
      key: d.key,
      label: prettyKey(d.key),
      icon: o?.icon || d.icon,
      color: o?.color || d.color,
      builtin: true,
      hidden: Boolean(o?.hidden),
      customized: Boolean(o && (o.icon !== d.icon || o.color !== d.color)),
      count: snapshot.usage[type]?.[d.key] || 0,
    });
  });
  const custom = snapshot.records
    .filter((r) => r.type === type && !r.builtin)
    .map((r) =>
      decorate({
        id: r._id,
        key: r.key,
        label: r.label,
        icon: r.icon,
        color: r.color,
        builtin: false,
        hidden: false,
        count: snapshot.usage[type]?.[r.key] || 0,
      }),
    );
  const all = [...builtIns, ...custom];
  return includeHidden ? all : all.filter((c) => !c.hidden);
};

export function useCategories() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadCategories();
  }, []);
  return {
    ...snapshot,
    list: (type, opts) => buildList(snapshot, type, opts),
    reload: () => loadCategories(true),
  };
}

/**
 * Lets the older pages (Expense / Income / Layout), which keep their own
 * colour + icon maps, understand custom categories. Mutates the maps they
 * pass in, so call it from the component body.
 */
export function useCategoryRegistry(type, { colors, icons, keys } = {}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadCategories();
  }, []);
  buildList(snapshot, type, { includeHidden: true }).forEach((c) => {
    // Built-ins keep each page's own look unless the user customised them.
    if (c.builtin && !c.customized) return;
    if (colors) colors[c.key] = c.color;
    if (icons) icons[c.key] = createElement(c.Icon, { className: "w-4 h-4" });
    if (keys && !c.builtin && !keys.includes(c.key)) keys.push(c.key);
  });
}

/** Custom categories whose name appears in the description (used by the AI hint). */
export const detectCustomCategory = (text, type) => {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
  const t = ` ${norm(text)} `;
  if (!t.trim()) return null;
  const match = state.records.find(
    (r) => r.type === type && !r.builtin && t.includes(` ${norm(r.label)} `),
  );
  return match ? { category: match.key, confidence: 0.9 } : null;
};
