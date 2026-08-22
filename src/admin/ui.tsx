import React, { useMemo, useState } from "react";
import { X, Search, ChevronLeft, ChevronRight, ArrowUpDown, Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "../utils/cn";

/* Admin UI kit — deliberately dense, neutral and independent from the
   public site's design tokens so Design Mode never breaks the console. */

export function Panel({
  title,
  desc,
  icon,
  actions,
  children,
  className,
  dense,
}: {
  title?: string;
  desc?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section className={cn("bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-neutral-900/80">
          {icon && <span className="text-red-500">{icon}</span>}
          <div className="min-w-0 flex-1">
            {title && <h3 className="font-mono text-[12px] font-bold tracking-[0.14em] uppercase text-neutral-100">{title}</h3>}
            {desc && <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{desc}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={dense ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  icon,
  disabled,
  type = "button",
  title,
  className,
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "xs";
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  const v = {
    primary: "bg-red-600 hover:bg-red-500 text-white border border-red-600",
    danger: "bg-neutral-900 hover:bg-red-600/15 text-red-400 border border-red-900 hover:border-red-600",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600",
    outline: "bg-transparent hover:bg-neutral-800 text-neutral-200 border border-neutral-700",
    ghost: "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-transparent",
  }[variant];
  const s = { xs: "px-2 py-1 text-[10px]", sm: "px-2.5 py-1.5 text-[11px]", md: "px-3.5 py-2 text-[11px]" }[size];
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 font-mono font-bold tracking-[0.1em] uppercase rounded transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none", v, s, className)}
    >
      {icon}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block font-mono text-[10px] tracking-[0.16em] uppercase text-neutral-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-neutral-600 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-[12px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-red-600 transition font-mono";

export function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 text-left py-2 group disabled:opacity-40"
    >
      <span className={cn("w-9 h-5 rounded-full relative shrink-0 transition", checked ? "bg-red-600" : "bg-neutral-700")}>
        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", checked ? "left-4.5 translate-x-0" : "left-0.5")} style={{ left: checked ? 18 : 2 }} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] text-neutral-200 font-medium">{label}</span>
        {desc && <span className="block text-[10px] text-neutral-500">{desc}</span>}
      </span>
    </button>
  );
}

export function Badge({ children, color = "#71717a", solid }: { children: React.ReactNode; color?: string; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-[0.1em] uppercase whitespace-nowrap"
      style={solid ? { background: color, color: "#0a0a0a" } : { background: `${color}1f`, color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-neutral-900 border border-neutral-800 sm:rounded-lg shadow-2xl my-0 sm:my-8", width)}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <h3 className="font-mono text-[12px] font-bold tracking-[0.14em] uppercase">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={16} /></button>
        </header>
        <div className="p-4 max-h-[70vh] overflow-y-auto fb-scroll">{children}</div>
        {footer && <footer className="px-4 py-3 border-t border-neutral-800 flex justify-end gap-2 bg-neutral-900/60">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  requireText,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
  busy?: boolean;
}) {
  const [val, setVal] = useState("");
  const ok = !requireText || val === requireText;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant={danger ? "primary" : "success"} disabled={!ok || busy} onClick={onConfirm} icon={busy ? <Loader2 size={12} className="animate-spin" /> : undefined}>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {danger && (
          <div className="flex gap-2 p-3 rounded border border-red-900 bg-red-950/40 text-[11px] text-red-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>This action is recorded in the audit log and attributed to your account.</span>
          </div>
        )}
        <div className="text-[12px] text-neutral-300 leading-relaxed">{body}</div>
        {requireText && (
          <Field label={`Type "${requireText}" to continue`}>
            <input className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sort?: (a: T, b: T) => number;
  width?: string;
  hideMobile?: boolean;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  selectable = true,
  onBulk,
  rowActions,
  pageSize = 12,
  searchKeys,
  empty = "No records",
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  selectable?: boolean;
  onBulk?: (ids: string[]) => void;
  rowActions?: (row: T) => React.ReactNode;
  pageSize?: number;
  searchKeys?: (keyof T | string)[];
  empty?: string;
  toolbar?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((r) =>
        (searchKeys ? (searchKeys as string[]) : Object.keys(r)).some((k) => String((r as any)[k] ?? "").toLowerCase().includes(needle)),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sort) out = [...out].sort((a, b) => col.sort!(a, b) * dir);
    }
    return out;
  }, [rows, q, sortKey, dir, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  React.useEffect(() => setPage(0), [q, rows.length]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-neutral-800 bg-neutral-950/50">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-600" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={inputCls + " pl-8 py-1.5"} />
        </div>
        {toolbar}
        <span className="font-mono text-[10px] text-neutral-500">{filtered.length} rec</span>
      </div>

      {sel.length > 0 && onBulk && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-neutral-800 bg-red-950/30">
          <span className="font-mono text-[11px] text-red-300">{sel.length} selected</span>
          <Btn size="xs" variant="danger" onClick={() => { onBulk(sel); setSel([]); }}>Bulk action</Btn>
          <button className="text-[10px] text-neutral-500 hover:text-white ml-auto" onClick={() => setSel([])}>clear</button>
        </div>
      )}

      <div className="overflow-x-auto fb-scroll">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/60">
              {selectable && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    className="accent-red-600"
                    checked={view.length > 0 && view.every((r) => sel.includes(r.id))}
                    onChange={(e) => setSel(e.target.checked ? Array.from(new Set([...sel, ...view.map((r) => r.id)])) : sel.filter((id) => !view.some((r) => r.id === id)))}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn("px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-500 whitespace-nowrap", c.hideMobile && "hidden md:table-cell")} style={{ width: c.width }}>
                  <button className="inline-flex items-center gap-1 hover:text-neutral-200" onClick={() => { if (!c.sort) return; setSortKey(c.key); setDir((d) => (sortKey === c.key ? ((d * -1) as 1 | -1) : 1)); }}>
                    {c.label}
                    {c.sort && <ArrowUpDown size={10} className={sortKey === c.key ? "text-red-500" : "text-neutral-700"} />}
                  </button>
                </th>
              ))}
              {rowActions && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition">
                {selectable && (
                  <td className="px-3 py-2">
                    <input type="checkbox" className="accent-red-600" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((i) => i !== r.id))} />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2 text-[11px] text-neutral-300 align-middle", c.hideMobile && "hidden md:table-cell")}>
                    {c.render ? c.render(r) : String((r as any)[c.key] ?? "—")}
                  </td>
                ))}
                {rowActions && <td className="px-2 py-2 text-right whitespace-nowrap">{rowActions(r)}</td>}
              </tr>
            ))}
            {!view.length && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-[11px] text-neutral-600">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800 bg-neutral-950/50">
          <Btn size="xs" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} icon={<ChevronLeft size={12} />}>Prev</Btn>
          <span className="font-mono text-[10px] text-neutral-500">{page + 1} / {pages}</span>
          <Btn size="xs" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Next<ChevronRight size={12} /></Btn>
        </div>
      )}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 hover:border-neutral-700 transition">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-neutral-500">{label}</span>
        <span style={{ color: accent || "#71717a" }}>{icon}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-neutral-50 mt-1.5">{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <p className="text-[11px] text-neutral-600 font-mono">{text}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: React.ReactNode; badge?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto fb-scroll border-b border-neutral-800 bg-neutral-950/40 px-2 pt-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase rounded-t border-b-2 transition",
            active === t.id ? "border-red-600 text-white bg-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-300",
          )}
        >
          {t.icon}
          {t.label}
          {t.badge !== undefined && <span className="text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function PageHead({ title, desc, children }: { title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-[0.06em] uppercase text-neutral-50">{title}</h1>
        <p className="text-[11px] text-neutral-500 mt-1">{desc}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-800/60 last:border-0">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-500">{k}</span>
      <span className="font-mono text-[11px] text-neutral-200 text-right break-all">{v}</span>
    </div>
  );
}

export const Ok = ({ children }: { children?: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"><Check size={11} />{children || "OK"}</span>
);
export const No = ({ children }: { children?: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-red-400 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"><AlertTriangle size={11} />{children || "Missing"}</span>
);
