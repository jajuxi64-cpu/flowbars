import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../utils/cn';

/* ---------------- Toasts ---------------- */
type Toast = { id: string; text: string; kind: 'ok' | 'err' | 'info' };
const ToastCtx = createContext<{ push: (text: string, kind?: Toast['kind']) => void }>({
  push: () => {},
});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, text, kind }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[92vw] w-80">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs shadow-xl backdrop-blur animate-[fbin_.2s_ease-out]',
              t.kind === 'ok' && 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
              t.kind === 'err' && 'bg-red-500/15 border-red-500/40 text-red-200',
              t.kind === 'info' && 'bg-sky-500/15 border-sky-500/40 text-sky-200',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Buttons & inputs ---------------- */
export function Btn({
  variant = 'default',
  size = 'md',
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'subtle';
  size?: 'sm' | 'md' | 'xs';
}) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
        size === 'xs' && 'px-2 py-1 text-[11px]',
        size === 'sm' && 'px-2.5 py-1.5 text-xs',
        size === 'md' && 'px-3.5 py-2 text-xs',
        variant === 'default' &&
          'bg-neutral-800 border-neutral-700 text-neutral-100 hover:bg-neutral-700',
        variant === 'primary' && 'bg-red-600 border-red-500 text-white hover:bg-red-500',
        variant === 'danger' && 'bg-red-950 border-red-800 text-red-300 hover:bg-red-900',
        variant === 'ghost' && 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800',
        variant === 'subtle' && 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800',
        className,
      )}
    />
  );
}

const inputCls =
  'w-full rounded-md bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 outline-none focus:border-red-500/70 placeholder:text-neutral-600';

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(inputCls, p.className)} />;
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(inputCls, 'font-mono leading-relaxed', p.className)} />;
}
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cn(inputCls, p.className)} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-neutral-600">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-left hover:border-neutral-700"
    >
      <span>
        <span className="block text-xs font-semibold text-neutral-200">{label}</span>
        {hint && <span className="block text-[10px] text-neutral-500">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-red-600' : 'bg-neutral-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit = '',
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        <span>{label}</span>
        <span className="text-neutral-300">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-red-600"
      />
    </div>
  );
}

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-800 bg-neutral-950"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function Panel({
  title,
  desc,
  right,
  children,
  className,
}: {
  title?: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur', className)}
    >
      {(title || right) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
          <div>
            {title && <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-200">{title}</h3>}
            {desc && <p className="mt-0.5 text-[11px] text-neutral-500">{desc}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  color = 'neutral',
}: {
  children: React.ReactNode;
  color?: 'neutral' | 'red' | 'green' | 'amber' | 'blue';
}) {
  const map = {
    neutral: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };
  return (
    <span className={cn('inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold', map[color])}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <div
        className={cn(
          'my-auto w-full rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl',
          wide ? 'max-w-4xl' : 'max-w-lg',
        )}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-100">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            ✕
          </button>
        </header>
        <div className="max-h-[68vh] overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    body: string;
    phrase?: string;
    resolve?: (v: boolean) => void;
  }>({ open: false, title: '', body: '' });
  const [typed, setTyped] = useState('');

  const confirm = (title: string, body: string, phrase?: string) =>
    new Promise<boolean>((resolve) => {
      setTyped('');
      setState({ open: true, title, body, phrase, resolve });
    });

  const node = (
    <Modal
      open={state.open}
      onClose={() => {
        state.resolve?.(false);
        setState((s) => ({ ...s, open: false }));
      }}
      title={state.title}
      footer={
        <>
          <Btn
            onClick={() => {
              state.resolve?.(false);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!!state.phrase && typed !== state.phrase}
            onClick={() => {
              state.resolve?.(true);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Confirm
          </Btn>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-neutral-300">{state.body}</p>
      {state.phrase && (
        <div className="mt-3">
          <Field label={`Type "${state.phrase}" to continue`}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );

  return { confirm, confirmNode: node };
}

export function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
        {icon && <span className="text-sm opacity-70">{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-black text-neutral-50">{value}</div>
      {sub && <div className="text-[10px] text-neutral-500">{sub}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-xs text-neutral-500">
      {text}
    </div>
  );
}
