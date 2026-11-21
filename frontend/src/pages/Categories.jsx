import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  COLOR_PALETTE,
  ICON_MAP,
  ICON_NAMES,
  addCategory,
  deleteCategory,
  saveBuiltin,
  updateCategory,
  useCategories,
} from "../utils/categoryStore";
import "../styles/categories.css";

const TYPES = {
  expense: { label: "Expense", noun: "expense", accent: "#e04158", Icon: ArrowDown },
  income: { label: "Income", noun: "income", accent: "#0f9f6e", Icon: ArrowUp },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ─── small pieces ─────────────────────────────────────────────────────── */
function Toast({ type = "success", message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const Icon = type === "error" ? AlertCircle : CheckCircle;
  return (
    <div className={`cm-toast ${type}`} role="status" aria-live="polite">
      <Icon size={18} aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/* ─── Add / edit dialog ────────────────────────────────────────────────── */
function CategoryDialog({ mode, type, category, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const isBuiltin = Boolean(category?.builtin);
  const [label, setLabel] = useState(category?.label || "");
  const [icon, setIcon] = useState(category?.icon || "Tag");
  const [color, setColor] = useState(category?.color || COLOR_PALETTE[9]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEscape(onClose);

  const Preview = ICON_MAP[icon] || ICON_MAP.Tag;
  const accent = TYPES[type].accent;

  const submit = async (e) => {
    e.preventDefault();
    const name = label.replace(/\s+/g, " ").trim();
    if (!isBuiltin && !name) return setError("Please enter a category name.");
    if (!isBuiltin && !/[\p{L}\p{N}]/u.test(name))
      return setError("Use letters or numbers in the name.");

    setSaving(true);
    setError("");
    let res;
    if (isBuiltin) res = await saveBuiltin({ type, key: category.key, icon, color, hidden: category.hidden });
    else if (isEdit) res = await updateCategory(category.id, { label: name, icon, color });
    else res = await addCategory({ type, label: name, icon, color });
    setSaving(false);

    if (!res.ok) return setError(res.message);
    onSaved(
      isEdit
        ? res.moved
          ? `Updated. ${plural(res.moved, "transaction")} moved to the new name.`
          : "Category updated"
        : "Category added",
    );
  };

  const resetBuiltin = async () => {
    setSaving(true);
    const res = await deleteCategory(category.id);
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onSaved("Reset to default look");
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card cm-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-title" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <h2 id="cm-title">
              {isEdit ? "Edit category" : `New ${TYPES[type].noun} category`}
            </h2>
            <p>{isBuiltin ? "Built-in categories keep their name; you can change the icon and colour." : "Pick a name, an icon and a colour."}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="cm-preview" aria-hidden>
          <span className="cm-badge" style={{ color, background: `${color}1f` }}>
            <Preview size={22} />
          </span>
          <b>{label.trim() || (isBuiltin ? category.display : "Category name")}</b>
        </div>

        <label className="cm-field">
          <span>Name</span>
          <input
            type="text"
            value={label}
            maxLength={30}
            autoFocus={!isBuiltin}
            disabled={isBuiltin}
            placeholder="e.g. Pet care"
            onChange={(e) => {
              setLabel(e.target.value);
              setError("");
            }}
          />
          <small>{label.length}/30</small>
        </label>

        <div className="cm-field">
          <span>Icon</span>
          <div className="cm-icons" role="radiogroup" aria-label="Icon">
            {ICON_NAMES.map((name) => {
              const I = ICON_MAP[name];
              const on = icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={name}
                  title={name}
                  className={on ? "on" : ""}
                  style={on ? { color, borderColor: color, background: `${color}1a` } : undefined}
                  onClick={() => setIcon(name)}
                >
                  <I size={18} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="cm-field">
          <span>Colour</span>
          <div className="cm-colors" role="radiogroup" aria-label="Colour">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                className={color === c ? "on" : ""}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
            <label className="cm-custom-color" title="Custom colour">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" />
            </label>
          </div>
        </div>

        {error && (
          <p className="cm-error" role="alert">
            <AlertCircle size={15} aria-hidden /> {error}
          </p>
        )}

        <div className="modal-actions">
          {isBuiltin && category.customized ? (
            <button type="button" className="btn" onClick={resetBuiltin} disabled={saving}>
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          ) : (
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary cm-save" disabled={saving} style={{ background: accent, borderColor: accent }}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add category"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Delete / hide confirmation ───────────────────────────────────────── */
function ConfirmDialog({ type, category, busy, onCancel, onConfirm }) {
  useEscape(onCancel);
  const builtin = category.builtin;
  const fallback = type === "income" ? "Extra Income" : "Other";
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card cm-dialog cm-confirm" role="alertdialog" aria-modal="true" aria-labelledby="cm-del-title">
        <div className="modal-header">
          <div>
            <h2 id="cm-del-title">{builtin ? `Hide “${category.display}”?` : `Delete “${category.display}”?`}</h2>
            <p>
              {builtin
                ? "It will no longer appear when adding a transaction. Existing transactions keep this category, and you can bring it back any time."
                : category.count > 0
                  ? `${plural(category.count, "transaction")} use this category. They will be moved to “${fallback}”. This can’t be undone.`
                  : "No transactions use this category. This can’t be undone."}
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger cm-save" onClick={onConfirm} disabled={busy} autoFocus>
            {builtin ? <EyeOff size={15} aria-hidden /> : <Trash2 size={15} aria-hidden />}
            {busy ? "Working…" : builtin ? "Hide category" : "Delete category"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function Categories() {
  const { list, loading, loaded, error, reload } = useCategories();
  const [type, setType] = useState("expense");
  const [dialog, setDialog] = useState(null); // { mode, category }
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const all = useMemo(() => list(type, { includeHidden: true }), [list, type]);
  const visible = all.filter((c) => !c.hidden);
  const hidden = all.filter((c) => c.hidden);
  const customCount = all.filter((c) => !c.builtin).length;
  const accent = TYPES[type].accent;

  const notify = (message, kind = "success") => setToast({ message, type: kind, id: Date.now() });

  const runConfirm = async () => {
    setBusy(true);
    let res;
    if (confirm.builtin)
      res = await saveBuiltin({ type, key: confirm.key, icon: confirm.icon, color: confirm.color, hidden: true });
    else res = await deleteCategory(confirm.id);
    setBusy(false);
    if (!res.ok) return notify(res.message, "error");
    notify(
      confirm.builtin
        ? `“${confirm.display}” hidden`
        : res.moved
          ? `Deleted. ${plural(res.moved, "transaction")} moved to “${res.movedTo.replace(/_/g, " ")}”.`
          : "Category deleted",
    );
    setConfirm(null);
  };

  const restore = async (c) => {
    const res = await saveBuiltin({ type, key: c.key, icon: c.icon, color: c.color, hidden: false });
    notify(res.ok ? `“${c.display}” restored` : res.message, res.ok ? "success" : "error");
  };

  return (
    <div className="cm-page" style={{ "--cm-accent": accent }}>
      <header className="card cm-hero">
        <div className="cm-hero-text">
          <h2>Manage categories</h2>
          <p>
            {plural(visible.length, "category")} in use
            {customCount > 0 && ` · ${plural(customCount, "custom one")}`}
          </p>
        </div>
        <div className="cm-tabs" role="tablist" aria-label="Category type">
          {Object.entries(TYPES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={type === key}
              className={type === key ? "on" : ""}
              style={type === key ? { color: t.accent, background: `${t.accent}14`, borderColor: `${t.accent}40` } : undefined}
              onClick={() => setType(key)}
            >
              <t.Icon size={15} aria-hidden /> {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ background: accent, borderColor: accent }}
          onClick={() => setDialog({ mode: "add", category: null })}
        >
          <Plus size={16} aria-hidden /> Add category
        </button>
      </header>

      {error && !loaded && (
        <div className="card cm-state" role="alert">
          <AlertCircle size={18} aria-hidden /> {error}
          <button type="button" className="btn" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <section className="cm-grid" aria-busy={loading && !loaded} aria-label={`${TYPES[type].label} categories`}>
        {visible.map((c) => (
          <article className="card cm-card" key={c.key}>
            <span className="cm-badge" style={{ color: c.color, background: `${c.color}1f` }} aria-hidden>
              <c.Icon size={22} />
            </span>
            <div className="cm-info">
              <b title={c.display}>{c.display}</b>
              <small>
                {plural(c.count, "transaction")}
                <i className={`cm-chip ${c.builtin ? "" : "custom"}`}>{c.builtin ? "Default" : "Custom"}</i>
              </small>
            </div>
            <div className="cm-actions">
              <button type="button" className="icon-button" onClick={() => setDialog({ mode: "edit", category: c })} aria-label={`Edit ${c.display}`} title="Edit">
                <Pencil size={15} aria-hidden />
              </button>
              <button
                type="button"
                className="icon-button cm-del"
                onClick={() => setConfirm(c)}
                aria-label={`${c.builtin ? "Hide" : "Delete"} ${c.display}`}
                title={c.builtin ? "Hide from picker" : "Delete"}
              >
                {c.builtin ? <EyeOff size={15} aria-hidden /> : <Trash2 size={15} aria-hidden />}
              </button>
            </div>
          </article>
        ))}

        <button type="button" className="cm-new" onClick={() => setDialog({ mode: "add", category: null })}>
          <Plus size={20} aria-hidden />
          <span>New {TYPES[type].noun} category</span>
        </button>
      </section>

      {hidden.length > 0 && (
        <section className="card cm-hidden" aria-label="Hidden categories">
          <h3>Hidden categories</h3>
          <p>These are not shown when you add a transaction, but past entries keep them.</p>
          <ul>
            {hidden.map((c) => (
              <li key={c.key}>
                <span className="cm-badge sm" style={{ color: c.color, background: `${c.color}1f` }} aria-hidden>
                  <c.Icon size={16} />
                </span>
                <b>{c.display}</b>
                <button type="button" className="btn" onClick={() => restore(c)}>
                  <RotateCcw size={14} aria-hidden /> Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog && (
        <CategoryDialog
          key={dialog.category?.key || "new"}
          mode={dialog.mode}
          type={type}
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSaved={(msg) => {
            setDialog(null);
            notify(msg);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog type={type} category={confirm} busy={busy} onCancel={() => !busy && setConfirm(null)} onConfirm={runConfirm} />
      )}
      {toast && <Toast key={toast.id} {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}
