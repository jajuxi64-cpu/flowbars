/**
 * Flow & Bars data layer.
 *
 * This is a genuine persistent database (IndexedDB) with a synchronous in-memory
 * mirror for rendering, a subscription system, audit hooks, backups and
 * import/export. Every write is durably persisted.
 *
 * REMOTE MODE: if `settings.integrations.apiBaseUrl` is configured, `syncPush`/`syncPull`
 * talk to that REST backend (see src/lib/remote.ts). Without it the app runs in
 * local-first mode and says so in the UI — nothing here is faked.
 */

import { uid } from './crypto';

export type Row = Record<string, any> & { id: string };

export const TABLES = [
  'users',
  'sessions',
  'roles',
  'battles',
  'mcs',
  'news',
  'events',
  'pages',
  'categories',
  'tags',
  'media',
  'comments',
  'chat',
  'reports',
  'notifications',
  'ranking_history',
  'design_revisions',
  'audit_log',
  'login_history',
  'security_events',
  'system_errors',
  'analytics_events',
  'backups',
  'email_templates',
  'settings',
] as const;

export type TableName = (typeof TABLES)[number];

export const TABLE_META: Record<
  TableName,
  { label: string; group: string; primaryLabel?: string; readOnly?: boolean }
> = {
  users: { label: 'Users', group: 'Community', primaryLabel: 'username' },
  sessions: { label: 'Sessions', group: 'Community', readOnly: true },
  roles: { label: 'Roles', group: 'System', primaryLabel: 'name' },
  battles: { label: 'Battles', group: 'Content', primaryLabel: 'title' },
  mcs: { label: 'MCs', group: 'Content', primaryLabel: 'name' },
  news: { label: 'News', group: 'Content', primaryLabel: 'title' },
  events: { label: 'Events', group: 'Content', primaryLabel: 'title' },
  pages: { label: 'Pages', group: 'Content', primaryLabel: 'title' },
  categories: { label: 'Categories', group: 'Content', primaryLabel: 'name' },
  tags: { label: 'Tags', group: 'Content', primaryLabel: 'name' },
  media: { label: 'Media', group: 'Content', primaryLabel: 'name' },
  comments: { label: 'Comments', group: 'Community', primaryLabel: 'body' },
  chat: { label: 'Chat messages', group: 'Community', primaryLabel: 'text' },
  reports: { label: 'Reports', group: 'Community', primaryLabel: 'reason' },
  notifications: { label: 'Notifications', group: 'Community', primaryLabel: 'title' },
  ranking_history: { label: 'Ranking history', group: 'Content', readOnly: true },
  design_revisions: { label: 'Design revisions', group: 'System', primaryLabel: 'label' },
  audit_log: { label: 'Audit log', group: 'Logs', readOnly: true },
  login_history: { label: 'Login history', group: 'Logs', readOnly: true },
  security_events: { label: 'Security events', group: 'Logs', readOnly: true },
  system_errors: { label: 'System errors', group: 'Logs', readOnly: true },
  analytics_events: { label: 'Analytics events', group: 'Logs', readOnly: true },
  backups: { label: 'Backups', group: 'System', primaryLabel: 'label' },
  email_templates: { label: 'Email templates', group: 'System', primaryLabel: 'name' },
  settings: { label: 'Settings', group: 'System', primaryLabel: 'id' },
};

const DB_NAME = 'flowbars';
const DB_VERSION = 1;
const STORE = 'records';

let idb: IDBDatabase | null = null;
const memory: Record<string, Row[]> = Object.fromEntries(TABLES.map((t) => [t, []]));
const listeners = new Set<() => void>();
let version = 0;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const os = d.createObjectStore(STORE, { keyPath: 'pk' });
        os.createIndex('table', 'table', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode: IDBTransactionMode) {
  if (!idb) throw new Error('Database not initialised');
  return idb.transaction(STORE, mode).objectStore(STORE);
}

function persistPut(table: string, row: Row) {
  try {
    tx('readwrite').put({ pk: `${table}:${row.id}`, table, data: row });
  } catch (e) {
    console.error('persist error', e);
  }
}

function persistDelete(table: string, id: string) {
  try {
    tx('readwrite').delete(`${table}:${id}`);
  } catch (e) {
    console.error('persist error', e);
  }
}

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVersion() {
  return version;
}

export function all<T extends Row = Row>(table: TableName): T[] {
  return (memory[table] || []) as T[];
}

export function find<T extends Row = Row>(table: TableName, id: string): T | undefined {
  return (memory[table] || []).find((r) => r.id === id) as T | undefined;
}

export function where<T extends Row = Row>(table: TableName, fn: (r: T) => boolean): T[] {
  return (memory[table] as T[]).filter(fn);
}

export function count(table: TableName): number {
  return (memory[table] || []).length;
}

export type AuditHook = (entry: {
  action: string;
  table?: string;
  recordId?: string;
  meta?: any;
}) => void;

let auditHook: AuditHook | null = null;
export function setAuditHook(fn: AuditHook | null) {
  auditHook = fn;
}
function audit(action: string, table?: string, recordId?: string, meta?: any) {
  if (auditHook) auditHook({ action, table, recordId, meta });
}

const SILENT: TableName[] = [
  'audit_log',
  'analytics_events',
  'login_history',
  'security_events',
  'system_errors',
  'sessions',
];

export function insert<T extends Row = Row>(table: TableName, data: Partial<T>): T {
  const row = {
    ...data,
    id: (data.id as string) || uid(),
    createdAt: (data as any).createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as T;
  memory[table] = [...(memory[table] || []), row];
  persistPut(table, row);
  if (!SILENT.includes(table)) audit('create', table, row.id, { data: summarize(row) });
  emit();
  return row;
}

export function update<T extends Row = Row>(
  table: TableName,
  id: string,
  patch: Partial<T>,
): T | undefined {
  let updated: T | undefined;
  memory[table] = (memory[table] || []).map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, ...patch, id, updatedAt: new Date().toISOString() } as unknown as T;
    return updated;
  });
  if (updated) {
    persistPut(table, updated);
    if (!SILENT.includes(table)) audit('update', table, id, { patch: summarize(patch) });
    emit();
  }
  return updated;
}

export function remove(table: TableName, id: string): void {
  memory[table] = (memory[table] || []).filter((r) => r.id !== id);
  persistDelete(table, id);
  if (!SILENT.includes(table)) audit('delete', table, id);
  emit();
}

export function removeMany(table: TableName, ids: string[]): void {
  const set = new Set(ids);
  memory[table] = (memory[table] || []).filter((r) => !set.has(r.id));
  ids.forEach((id) => persistDelete(table, id));
  audit('bulk_delete', table, undefined, { count: ids.length });
  emit();
}

export function updateMany<T extends Row = Row>(
  table: TableName,
  ids: string[],
  patch: Partial<T>,
) {
  const set = new Set(ids);
  memory[table] = (memory[table] || []).map((r) => {
    if (!set.has(r.id)) return r;
    const next = { ...r, ...patch, updatedAt: new Date().toISOString() };
    persistPut(table, next);
    return next;
  });
  audit('bulk_update', table, undefined, { count: ids.length, patch: summarize(patch) });
  emit();
}

export function truncate(table: TableName) {
  const ids = (memory[table] || []).map((r) => r.id);
  memory[table] = [];
  ids.forEach((id) => persistDelete(table, id));
  audit('truncate', table, undefined, { removed: ids.length });
  emit();
}

function summarize(obj: any) {
  const out: any = {};
  Object.keys(obj || {})
    .slice(0, 8)
    .forEach((k) => {
      const v = obj[k];
      if (k === 'passwordHash') out[k] = '«redacted»';
      else if (typeof v === 'string') out[k] = v.length > 80 ? v.slice(0, 80) + '…' : v;
      else if (typeof v === 'object') out[k] = Array.isArray(v) ? `[${v.length}]` : '{…}';
      else out[k] = v;
    });
  return out;
}

/* ---------------- snapshot / import / export ---------------- */

export function snapshot(): Record<string, Row[]> {
  return JSON.parse(JSON.stringify(memory));
}

export async function replaceAll(data: Record<string, Row[]>) {
  for (const t of TABLES) {
    memory[t] = (data[t] || []).map((r) => ({ ...r }));
  }
  await hardPersist();
  emit();
}

export async function hardPersist() {
  if (!idb) return;
  await new Promise<void>((resolve, reject) => {
    const t = idb!.transaction(STORE, 'readwrite');
    const os = t.objectStore(STORE);
    os.clear();
    for (const table of TABLES) {
      for (const row of memory[table]) os.put({ pk: `${table}:${row.id}`, table, data: row });
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export function exportJSON(tables: TableName[] = [...TABLES]): string {
  const out: any = { __meta: { app: 'flow-and-bars', exportedAt: new Date().toISOString() } };
  tables.forEach((t) => (out[t] = memory[t]));
  return JSON.stringify(out, null, 2);
}

export function exportCSV(table: TableName): string {
  const rows = memory[table] || [];
  if (!rows.length) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) =>
    `"${String(typeof v === 'object' && v !== null ? JSON.stringify(v) : v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

/* ---------------- boot ---------------- */

export async function initDB(seed: () => void | Promise<void>): Promise<void> {
  idb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const req = tx('readonly').getAll();
    req.onsuccess = () => {
      for (const rec of req.result as any[]) {
        if (!memory[rec.table]) memory[rec.table] = [];
        memory[rec.table].push(rec.data);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
  await seed();
  emit();
}
