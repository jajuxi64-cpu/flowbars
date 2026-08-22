import React, { useMemo, useState } from 'react';
import * as db from '../lib/db';
import { useTable } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Btn, Input, Select, Textarea, Field, Modal, Panel, Badge, useConfirm, useToast, EmptyState } from '../ui/kit';
import { cn } from '../utils/cn';

export type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean' | 'tags' | 'ref' | 'image';
  options?: { value: string; label: string }[];
  refTable?: db.TableName;
  refLabel?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
};

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  width?: string;
};

export function ResourceManager({
  table,
  title,
  desc,
  columns,
  fields,
  perms,
  defaults,
  searchKeys,
  extraActions,
  onAfterChange,
}: {
  table: db.TableName;
  title: string;
  desc?: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  perms: { view: string; create: string; edit: string; delete: string };
  defaults?: Record<string, any>;
  searchKeys?: string[];
  extraActions?: (row: any) => React.ReactNode;
  onAfterChange?: () => void;
}) {
  const rows = useTable(table);
  const { can, user } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'updatedAt', dir: -1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const perPage = 12;

  if (!can(perms.view))
    return <Panel title={title}><EmptyState text={`Your role lacks the "${perms.view}" permission.`} /></Panel>;

  const filtered = useMemo(() => {
    const keys = searchKeys || fields.map((f) => f.key);
    const out = rows.filter((r) =>
      q ? keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q.toLowerCase())) : true,
    );
    out.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
    return out;
  }, [rows, q, sort]);

  const paged = filtered.slice(page * perPage, page * perPage + perPage);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));

  const save = (data: any) => {
    try {
      if (data.id && db.find(table, data.id)) {
        if (!can(perms.edit)) throw new Error('Permission denied: ' + perms.edit);
        db.update(table, data.id, data);
        toast.push('Saved.');
      } else {
        if (!can(perms.create)) throw new Error('Permission denied: ' + perms.create);
        db.insert(table, { ...defaults, ...data, author: user?.username });
        toast.push('Created.');
      }
      setEditing(null);
      onAfterChange?.();
    } catch (e: any) {
      toast.push(e.message, 'err');
    }
  };

  const del = async (ids: string[]) => {
    if (!can(perms.delete)) return toast.push('Permission denied: ' + perms.delete, 'err');
    const ok = await confirm(
      'Delete records',
      `Permanently delete ${ids.length} record(s) from "${table}". This cannot be undone. Create a backup first if unsure.`,
      ids.length > 1 ? 'DELETE' : undefined,
    );
    if (!ok) return;
    db.removeMany(table, ids);
    setSelected([]);
    toast.push(`${ids.length} record(s) deleted.`);
    onAfterChange?.();
  };

  return (
    <Panel
      title={title}
      desc={desc}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            className="w-40"
          />
          <Btn
            size="sm"
            onClick={() => {
              const csv = db.exportCSV(table);
              downloadFile(`${table}.csv`, csv, 'text/csv');
            }}
          >
            Export CSV
          </Btn>
          {can(perms.create) && (
            <Btn size="sm" variant="primary" onClick={() => setEditing({ ...defaults })}>
              + New
            </Btn>
          )}
        </div>
      }
    >
      {confirmNode}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          <span>{selected.length} selected</span>
          <Btn size="xs" variant="danger" onClick={() => del(selected)}>
            Delete selected
          </Btn>
          <Btn size="xs" onClick={() => setSelected([])}>
            Clear
          </Btn>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="w-8 p-2">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && paged.every((r) => selected.includes(r.id))}
                  onChange={(e) =>
                    setSelected(e.target.checked ? Array.from(new Set([...selected, ...paged.map((r) => r.id)])) : [])
                  }
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="cursor-pointer p-2 hover:text-neutral-200"
                  style={{ width: c.width }}
                  onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 1 ? -1 : 1 }))}
                >
                  {c.label} {sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800/80 hover:bg-neutral-800/30">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, r.id] : selected.filter((i) => i !== r.id))
                    }
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="max-w-[280px] truncate p-2 text-neutral-300">
                    {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                  </td>
                ))}
                <td className="whitespace-nowrap p-2 text-right">
                  {extraActions?.(r)}
                  <Btn size="xs" onClick={() => setEditing(r)}>
                    Edit
                  </Btn>{' '}
                  <Btn size="xs" variant="danger" onClick={() => del([r.id])}>
                    Del
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <EmptyState text="No records." />}

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            {filtered.length} records · page {page + 1}/{pages}
          </span>
          <div className="flex gap-2">
            <Btn size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Btn>
            <Btn size="xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Btn>
          </div>
        </div>
      )}

      {editing && (
        <RecordEditor
          fields={fields}
          value={editing}
          title={editing.id ? `Edit ${title}` : `New ${title}`}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Panel>
  );
}

export function RecordEditor({
  fields,
  value,
  title,
  onClose,
  onSave,
}: {
  fields: FieldDef[];
  value: any;
  title: string;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const [form, setForm] = useState<any>({ ...value });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => onSave(form)}>
            Save
          </Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint} className={cn((f.full || f.type === 'textarea') && 'sm:col-span-2')}>
            {f.type === 'textarea' ? (
              <Textarea rows={5} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === 'select' ? (
              <Select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === 'ref' ? (
              <Select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {db.all(f.refTable!).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r[f.refLabel || 'name'] || r.id}
                  </option>
                ))}
              </Select>
            ) : f.type === 'boolean' ? (
              <Select value={form[f.key] ? '1' : '0'} onChange={(e) => set(f.key, e.target.value === '1')}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </Select>
            ) : f.type === 'tags' ? (
              <Input
                value={(form[f.key] || []).join(', ')}
                onChange={(e) =>
                  set(
                    f.key,
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            ) : f.type === 'number' ? (
              <Input type="number" value={form[f.key] ?? 0} onChange={(e) => set(f.key, Number(e.target.value))} />
            ) : f.type === 'date' ? (
              <Input type="date" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <Input value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            )}
            {f.type === 'image' && form[f.key] && (
              <img src={form[f.key]} alt="" className="mt-1 h-16 rounded border border-neutral-800 object-cover" />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}

export function downloadFile(name: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StatusBadge({ status }: { status: string }) {
  const map: any = { published: 'green', draft: 'amber', pending: 'amber', approved: 'green', hidden: 'red', open: 'red', resolved: 'green' };
  return <Badge color={map[status] || 'neutral'}>{status}</Badge>;
}
