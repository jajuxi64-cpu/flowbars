import { useState } from 'react';
import * as db from '../lib/db';
import { useTable, useDb } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { PERMISSIONS, PERMISSION_GROUPS, permsInGroup, matches } from '../lib/permissions';
import { getSettings, saveSettings } from '../lib/seed';
import { Btn, Panel, Input, Field, Select, Toggle, Badge, Modal, useToast, useConfirm, EmptyState, Textarea } from '../ui/kit';
import { downloadFile, ResourceManager } from './Resource';
import { cn } from '../utils/cn';
import { uid } from '../lib/crypto';

/* --------------------------------- roles ---------------------------------- */

export function RolesAdmin() {
  const roles = [...useTable('roles')].sort((a, b) => b.position - a.position);
  const users = useTable('users');
  const { can, user: me } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [sel, setSel] = useState<string | null>(roles[0]?.id || null);
  const role = roles.find((r) => r.id === sel);
  const myTop = Math.max(0, ...roles.filter((r) => (me?.roles || []).includes(r.id)).map((r) => r.position));

  if (!can('roles.view')) return <EmptyState text="Missing permission roles.view" />;

  const editable = (r: any) => can('*') || (can('roles.edit') && r.position < myTop);

  const patch = (p: any) => {
    if (!role) return;
    if (!editable(role)) return toast.push('You cannot edit a role at or above your own position.', 'err');
    db.update('roles', role.id, p);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {confirmNode}
      <Panel
        title="Roles"
        desc={`${roles.length} roles`}
        right={
          can('roles.create') && (
            <Btn
              size="xs"
              onClick={() => {
                const r = db.insert('roles', {
                  name: 'New role',
                  color: '#8b5cf6',
                  icon: '🎯',
                  position: 20,
                  permissions: [],
                  description: '',
                });
                setSel(r.id);
              }}
            >
              + Role
            </Btn>
          )
        }
      >
        <div className="space-y-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSel(r.id)}
              className={cn(
                'flex w-full items-center justify-between rounded border px-2 py-1.5 text-[11px]',
                sel === r.id ? 'border-red-500 bg-red-500/10' : 'border-neutral-800 bg-neutral-950',
              )}
            >
              <span style={{ color: r.color }}>
                {r.icon} {r.name}
              </span>
              <span className="text-neutral-600">{users.filter((u) => (u.roles || []).includes(r.id)).length}</span>
            </button>
          ))}
        </div>
      </Panel>

      {role ? (
        <Panel
          title={`${role.icon} ${role.name}`}
          desc={`${role.permissions.includes('*') ? 'All permissions' : role.permissions.length + ' permissions'} · position ${role.position}`}
          right={
            <div className="flex gap-2">
              {can('roles.create') && (
                <Btn
                  size="xs"
                  onClick={() => {
                    const copy = db.insert('roles', { ...role, id: undefined, name: role.name + ' copy', system: false });
                    setSel(copy.id);
                    toast.push('Role duplicated.');
                  }}
                >
                  Duplicate
                </Btn>
              )}
              {can('roles.delete') && !role.system && (
                <Btn
                  size="xs"
                  variant="danger"
                  onClick={async () => {
                    if (!(await confirm('Delete role', `Delete "${role.name}"? Members keep their other roles.`, 'DELETE'))) return;
                    users
                      .filter((u) => (u.roles || []).includes(role.id))
                      .forEach((u) => db.update('users', u.id, { roles: u.roles.filter((x: string) => x !== role.id) }));
                    db.remove('roles', role.id);
                    setSel(null);
                  }}
                >
                  Delete
                </Btn>
              )}
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name">
              <Input defaultValue={role.name} onBlur={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Icon">
              <Input defaultValue={role.icon} onBlur={(e) => patch({ icon: e.target.value })} />
            </Field>
            <Field label="Colour">
              <Input type="color" defaultValue={role.color} onBlur={(e) => patch({ color: e.target.value })} />
            </Field>
            <Field label="Hierarchy position" hint="Higher outranks lower">
              <Input
                type="number"
                defaultValue={role.position}
                onBlur={(e) => can('roles.hierarchy') ? patch({ position: Number(e.target.value) }) : toast.push('Permission denied: roles.hierarchy', 'err')}
              />
            </Field>
            <Field label="Description" className="sm:col-span-4">
              <Input defaultValue={role.description} onBlur={(e) => patch({ description: e.target.value })} />
            </Field>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={role.permissions.includes('*') ? 'red' : 'neutral'}>
                {role.permissions.includes('*') ? 'GOD MODE (*)' : 'scoped'}
              </Badge>
              {can('*') && (
                <Btn
                  size="xs"
                  onClick={() =>
                    patch({ permissions: role.permissions.includes('*') ? [] : ['*'] })
                  }
                >
                  Toggle god mode
                </Btn>
              )}
              <Btn size="xs" onClick={() => patch({ permissions: PERMISSIONS.map((p) => p.key) })}>
                Grant all listed
              </Btn>
              <Btn size="xs" onClick={() => patch({ permissions: [] })}>
                Revoke all
              </Btn>
            </div>

            {PERMISSION_GROUPS.map((g) => (
              <div key={g} className="rounded-md border border-neutral-800 bg-neutral-950 p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{g}</span>
                  <div className="flex gap-1">
                    <Btn
                      size="xs"
                      onClick={() =>
                        patch({
                          permissions: Array.from(new Set([...role.permissions, ...permsInGroup(g).map((p) => p.key)])),
                        })
                      }
                    >
                      All
                    </Btn>
                    <Btn
                      size="xs"
                      onClick={() =>
                        patch({
                          permissions: role.permissions.filter((k: string) => !permsInGroup(g).some((p) => p.key === k)),
                        })
                      }
                    >
                      None
                    </Btn>
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {permsInGroup(g).map((p) => {
                    const on = matches(role.permissions, p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() =>
                          patch({
                            permissions: role.permissions.includes(p.key)
                              ? role.permissions.filter((k: string) => k !== p.key)
                              : [...role.permissions, p.key],
                          })
                        }
                        className={cn(
                          'flex items-start gap-2 rounded border p-1.5 text-left text-[10px]',
                          on ? 'border-emerald-600/50 bg-emerald-600/10 text-emerald-200' : 'border-neutral-800 text-neutral-400',
                        )}
                      >
                        <span>{on ? '✓' : '·'}</span>
                        <span>
                          <code className="block text-[10px]">{p.key}</code>
                          <span className="text-neutral-500">{p.label}</span>
                          {p.danger && <span className="ml-1 text-red-400">⚠</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState text="Select a role." />
      )}
    </div>
  );
}

/* ------------------------------- database --------------------------------- */

export function DatabaseAdmin() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [table, setTable] = useState<db.TableName>('users');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const backups = useTable('backups');

  if (!can('db.view')) return <EmptyState text="Missing permission db.view" />;

  const rows = db.all(table).filter((r) => (q ? JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) : true));
  const meta = db.TABLE_META[table];
  const cols = Array.from(new Set(rows.slice(0, 20).flatMap((r) => Object.keys(r)))).slice(0, 7);

  const relations: Record<string, string> = {
    battles: 'mc1 / mc2 / winner → mcs',
    comments: 'userId → users, target → battles|news',
    chat: 'userId → users',
    sessions: 'userId → users',
    users: 'roles[] → roles',
    notifications: 'userId → users',
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <Panel title="Database" desc="Structured access with safeguards. Read-only tables cannot be edited here.">
        <div className="flex flex-wrap gap-2">
          {db.TABLES.map((t) => (
            <button
              key={t}
              onClick={() => setTable(t)}
              className={cn(
                'rounded border px-2 py-1 text-[10px]',
                table === t ? 'border-red-500 bg-red-500/10 text-red-200' : 'border-neutral-800 text-neutral-400',
              )}
            >
              {t} <span className="text-neutral-600">{db.count(t)}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title={`${meta.label} · ${rows.length} records`}
        desc={relations[table] ? 'Relations: ' + relations[table] : 'No declared relations'}
        right={
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search JSON…" value={q} onChange={(e) => setQ(e.target.value)} className="w-40" />
            {can('db.export') && (
              <>
                <Btn size="sm" onClick={() => downloadFile(`${table}.json`, db.exportJSON([table]))}>
                  JSON
                </Btn>
                <Btn size="sm" onClick={() => downloadFile(`${table}.csv`, db.exportCSV(table), 'text/csv')}>
                  CSV
                </Btn>
              </>
            )}
            {can('db.edit') && !meta.readOnly && (
              <Btn size="sm" variant="primary" onClick={() => setEditing({ __new: true, json: '{\n  \n}' })}>
                + Record
              </Btn>
            )}
            {can('db.truncate') && (
              <Btn
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (await confirm('Truncate table', `Delete ALL ${db.count(table)} records in "${table}". Irreversible.`, 'TRUNCATE')) {
                    db.truncate(table);
                    toast.push('Table truncated.');
                  }
                }}
              >
                Truncate
              </Btn>
            )}
          </div>
        }
      >
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[700px] text-left text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase text-neutral-500">
                {cols.map((c) => (
                  <th key={c} className="p-2">
                    {c}
                  </th>
                ))}
                <th className="p-2 text-right">Row</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r) => (
                <tr key={r.id} className="border-t border-neutral-800/70">
                  {cols.map((c) => (
                    <td key={c} className="max-w-[200px] truncate p-2 text-neutral-400">
                      {c === 'passwordHash' ? '«hashed»' : typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '')}
                    </td>
                  ))}
                  <td className="p-2 text-right">
                    <Btn size="xs" onClick={() => setEditing({ id: r.id, json: JSON.stringify(r, null, 2) })}>
                      Inspect
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <EmptyState text="No records." />}
      </Panel>

      <Panel title="Backups & restore" desc="Full snapshots of every table stored inside the database.">
        <div className="flex flex-wrap gap-2">
          {can('db.backup') && (
            <Btn
              size="sm"
              variant="primary"
              onClick={() => {
                const snap = db.snapshot();
                delete (snap as any).backups;
                db.insert('backups', {
                  label: 'Manual backup ' + new Date().toLocaleString(),
                  data: snap,
                  size: JSON.stringify(snap).length,
                });
                toast.push('Backup created.');
              }}
            >
              Create backup
            </Btn>
          )}
          {can('db.export') && (
            <Btn size="sm" onClick={() => downloadFile(`flowbars-full-export.json`, db.exportJSON())}>
              Export everything
            </Btn>
          )}
          {can('db.import') && (
            <label className="cursor-pointer rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-semibold">
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!(await confirm('Import data', 'This REPLACES all current data with the file contents. A safety backup is taken first.', 'IMPORT')))
                    return;
                  const text = await file.text();
                  try {
                    const parsed = JSON.parse(text);
                    const safety = db.snapshot();
                    db.insert('backups', { label: 'Pre-import safety ' + new Date().toLocaleString(), data: safety, size: JSON.stringify(safety).length });
                    const merged = { ...parsed, backups: db.all('backups') };
                    await db.replaceAll(merged);
                    toast.push('Import complete.');
                  } catch (err: any) {
                    toast.push('Import failed: ' + err.message, 'err');
                  }
                }}
              />
            </label>
          )}
        </div>
        <div className="mt-3 space-y-1">
          {[...backups].reverse().map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950 p-2 text-[11px]">
              <span className="text-neutral-300">
                {b.label} <span className="text-neutral-600">· {(b.size / 1024).toFixed(1)} KB</span>
              </span>
              <div className="flex gap-1">
                <Btn size="xs" onClick={() => downloadFile(b.label.replace(/\W+/g, '_') + '.json', JSON.stringify(b.data, null, 2))}>
                  Download
                </Btn>
                {can('db.restore') && (
                  <Btn
                    size="xs"
                    variant="danger"
                    onClick={async () => {
                      if (!(await confirm('Restore backup', 'All current data will be replaced by this snapshot.', 'RESTORE'))) return;
                      await db.replaceAll({ ...b.data, backups: db.all('backups') });
                      toast.push('Backup restored.');
                    }}
                  >
                    Restore
                  </Btn>
                )}
                <Btn size="xs" onClick={() => db.remove('backups', b.id)}>
                  ✕
                </Btn>
              </div>
            </div>
          ))}
          {!backups.length && <EmptyState text="No backups yet." />}
        </div>
      </Panel>

      {editing && (
        <Modal
          open
          wide
          onClose={() => setEditing(null)}
          title={editing.__new ? `New record · ${table}` : `Record · ${editing.id}`}
          footer={
            <>
              {!editing.__new && can('db.delete') && !meta.readOnly && (
                <Btn
                  variant="danger"
                  onClick={async () => {
                    if (!(await confirm('Delete record', 'Delete this record permanently?'))) return;
                    db.remove(table, editing.id);
                    setEditing(null);
                  }}
                >
                  Delete
                </Btn>
              )}
              {can('db.edit') && !meta.readOnly && (
                <Btn
                  variant="primary"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(editing.json);
                      if (editing.__new) db.insert(table, parsed);
                      else db.update(table, editing.id, parsed);
                      setEditing(null);
                      toast.push('Record saved.');
                    } catch (e: any) {
                      toast.push('Invalid JSON: ' + e.message, 'err');
                    }
                  }}
                >
                  Save
                </Btn>
              )}
            </>
          }
        >
          {meta.readOnly && <p className="mb-2 text-[11px] text-amber-300">This table is read-only for integrity reasons.</p>}
          <Textarea rows={18} value={editing.json} onChange={(e) => setEditing({ ...editing, json: e.target.value })} />
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------- settings -------------------------------- */

export function SettingsAdmin() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const s = getSettings();
  if (!can('settings.view')) return <EmptyState text="Missing permission settings.view" />;
  const w = (patch: any) => {
    if (!can('settings.edit')) return toast.push('Permission denied: settings.edit', 'err');
    saveSettings(patch);
  };
  return (
    <div className="space-y-4">
      <Panel title="Site" desc="Global public site configuration.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Site name">
            <Input defaultValue={s.site.name} onBlur={(e) => w({ site: { name: e.target.value } })} />
          </Field>
          <Field label="Tagline">
            <Input defaultValue={s.site.tagline} onBlur={(e) => w({ site: { tagline: e.target.value } })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input defaultValue={s.site.description} onBlur={(e) => w({ site: { description: e.target.value } })} />
          </Field>
          <Field label="Language">
            <Select defaultValue={s.site.language} onChange={(e) => w({ site: { language: e.target.value } })}>
              <option value="en">English</option>
              <option value="ka">ქართული</option>
            </Select>
          </Field>
          <Field label="Timezone">
            <Input defaultValue={s.site.timezone} onBlur={(e) => w({ site: { timezone: e.target.value } })} />
          </Field>
          <Toggle label="Maintenance mode" hint="Public site hidden from non-admins" checked={s.site.maintenanceMode} onChange={(v) => w({ site: { maintenanceMode: v } })} />
          <Toggle label="Registration open" checked={s.site.registrationOpen} onChange={(v) => w({ site: { registrationOpen: v } })} />
          <Toggle label="Comments enabled" checked={s.site.commentsEnabled} onChange={(v) => w({ site: { commentsEnabled: v } })} />
          <Toggle label="Comments require approval" checked={s.site.commentsRequireApproval} onChange={(v) => w({ site: { commentsRequireApproval: v } })} />
          <Field label="Maintenance message" className="sm:col-span-2">
            <Input defaultValue={s.site.maintenanceMessage} onBlur={(e) => w({ site: { maintenanceMessage: e.target.value } })} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

export function IntegrationsAdmin() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const s = getSettings();
  const [testing, setTesting] = useState('');
  if (!can('integrations.manage')) return <EmptyState text="Missing permission integrations.manage" />;
  const w = (patch: any) => saveSettings({ integrations: { ...s.integrations, ...patch } });

  return (
    <div className="space-y-4">
      <Panel title="Authentication providers" desc="Real OAuth credentials. Without these, social sign-in is disabled and says so.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Google OAuth Client ID"
            hint="Google Cloud Console → Credentials → OAuth client (Web). Add this exact origin to Authorised JavaScript origins."
          >
            <Input defaultValue={s.integrations.googleClientId} onBlur={(e) => w({ googleClientId: e.target.value.trim() })} />
          </Field>
          <Field label="Facebook App ID" hint="developers.facebook.com → App → Facebook Login → allowed domains.">
            <Input defaultValue={s.integrations.facebookAppId} onBlur={(e) => w({ facebookAppId: e.target.value.trim() })} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Badge color={s.integrations.googleClientId ? 'green' : 'red'}>
            Google: {s.integrations.googleClientId ? 'configured' : 'not configured'}
          </Badge>
          <Badge color={s.integrations.facebookAppId ? 'green' : 'red'}>
            Facebook: {s.integrations.facebookAppId ? 'configured' : 'not configured'}
          </Badge>
          <Badge color="neutral">Current origin: {window.location.origin}</Badge>
        </div>
      </Panel>

      <Panel title="Remote API / sync" desc="Optional REST backend. When set, the connection test performs a real HTTP request.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="API base URL" hint="e.g. https://api.flowbars.ge — set via VITE_API_BASE_URL or here.">
            <Input defaultValue={s.integrations.apiBaseUrl} onBlur={(e) => w({ apiBaseUrl: e.target.value.trim() })} />
          </Field>
          <Field label="Webhook URL" hint="Receives JSON on publish events.">
            <Input defaultValue={s.integrations.webhookUrl} onBlur={(e) => w({ webhookUrl: e.target.value.trim() })} />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Btn
            size="sm"
            onClick={async () => {
              if (!s.integrations.apiBaseUrl) return toast.push('Set an API base URL first.', 'err');
              setTesting('…');
              try {
                const r = await fetch(s.integrations.apiBaseUrl.replace(/\/$/, '') + '/health');
                setTesting(`HTTP ${r.status}`);
                toast.push(`Reachable: HTTP ${r.status}`);
              } catch (e: any) {
                setTesting('failed');
                toast.push('Connection failed: ' + e.message, 'err');
              }
            }}
          >
            Test connection
          </Btn>
          <span className="text-[11px] text-neutral-500">{testing}</span>
        </div>
      </Panel>

      <Panel title="Other services">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="YouTube channel URL">
            <Input defaultValue={s.integrations.youtubeChannel} onBlur={(e) => w({ youtubeChannel: e.target.value })} />
          </Field>
          <Field label="Analytics ID (e.g. GA4)" hint="Stored for your deployment configuration.">
            <Input defaultValue={s.integrations.analyticsId} onBlur={(e) => w({ analyticsId: e.target.value })} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

export function SecurityAdmin() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const s = getSettings();
  const sessions = useTable('sessions');
  if (!can('security.manage')) return <EmptyState text="Missing permission security.manage" />;
  const w = (patch: any) => saveSettings({ security: { ...s.security, ...patch } });

  return (
    <div className="space-y-4">
      {confirmNode}
      <Panel title="Secret admin URL" desc="The dashboard is only reachable through this path fragment.">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Admin path" hint={`Current: ${window.location.origin}/#/${s.security.adminPath}`}>
            <Input id="adminPath" defaultValue={s.security.adminPath} />
          </Field>
          <Btn
            variant="primary"
            onClick={async () => {
              if (!can('security.adminpath')) return toast.push('Permission denied: security.adminpath', 'err');
              const el = document.getElementById('adminPath') as HTMLInputElement;
              const val = el.value.trim().replace(/^\/+|\/+$/g, '');
              if (val.length < 6) return toast.push('Use at least 6 characters.', 'err');
              if (!(await confirm('Change admin URL', `New admin entrance: /#/${val}. Bookmark it — the old path stops working immediately.`)))
                return;
              w({ adminPath: val });
              toast.push('Admin URL changed.');
              window.location.hash = '/' + val;
            }}
          >
            Change
          </Btn>
          <Btn
            onClick={() => {
              const el = document.getElementById('adminPath') as HTMLInputElement;
              el.value = 'fb-' + uid().slice(0, 10);
            }}
          >
            Suggest random
          </Btn>
        </div>
        <p className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200">
          Deployment note: this build is a static single-page app, so the secret path is an obscurity layer, not the
          security boundary. Authorisation is enforced on every action by the session + RBAC layer, and admin data is
          never rendered without a valid session. For network-level protection, deploy behind a reverse proxy that also
          restricts <code>/{s.security.adminPath}</code> (or run the app against a REST backend configured in
          Integrations, which must repeat these permission checks server-side).
        </p>
      </Panel>

      <Panel title="Authentication policy">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Session lifetime (hours)">
            <Input type="number" defaultValue={s.security.sessionHours} onBlur={(e) => w({ sessionHours: Number(e.target.value) })} />
          </Field>
          <Field label="Max failed logins before lockout">
            <Input type="number" defaultValue={s.security.maxLoginAttempts} onBlur={(e) => w({ maxLoginAttempts: Number(e.target.value) })} />
          </Field>
          <Field label="Lockout window (minutes)">
            <Input type="number" defaultValue={s.security.lockoutMinutes} onBlur={(e) => w({ lockoutMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Minimum password length">
            <Input type="number" defaultValue={s.security.minPasswordLength} onBlur={(e) => w({ minPasswordLength: Number(e.target.value) })} />
          </Field>
          <Toggle label="Require strong passwords" checked={s.security.requireStrongPassword} onChange={(v) => w({ requireStrongPassword: v })} />
          <Field label="Audit retention (days)">
            <Input type="number" defaultValue={s.security.auditRetentionDays} onBlur={(e) => w({ auditRetentionDays: Number(e.target.value) })} />
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          Passwords are hashed with PBKDF2-SHA256 ({150_000} iterations, per-user random salt) via the Web Crypto API.
          Phone verification does not exist anywhere in this system.
        </p>
      </Panel>

      <Panel title="Active sessions" desc={`${sessions.length} sessions`}>
        <div className="max-h-64 space-y-1 overflow-y-auto text-[11px]">
          {sessions.map((x) => (
            <div key={x.id} className="flex items-center justify-between border-b border-neutral-800/60 py-1">
              <span className="text-neutral-300">{db.find('users', x.userId)?.username || 'unknown'}</span>
              <span className="truncate px-2 text-neutral-600">{x.agent}</span>
              <span className="flex items-center gap-2">
                <span className="text-neutral-600">exp {new Date(x.expiresAt).toLocaleString()}</span>
                <Btn size="xs" variant="danger" onClick={() => db.remove('sessions', x.id)}>
                  Revoke
                </Btn>
              </span>
            </div>
          ))}
          {!sessions.length && <EmptyState text="No sessions." />}
        </div>
      </Panel>
    </div>
  );
}

export function StorageCacheAdmin() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [usage, setUsage] = useState<string>('measuring…');
  const s = getSettings();

  useState(() => {
    navigator.storage?.estimate?.().then((e) => {
      setUsage(`${((e.usage || 0) / 1024 / 1024).toFixed(2)} MB used of ~${((e.quota || 0) / 1024 / 1024).toFixed(0)} MB quota`);
    });
    return undefined;
  });

  const bytes = JSON.stringify(db.snapshot()).length;

  return (
    <div className="space-y-4">
      {confirmNode}
      <Panel title="Storage" desc="Real browser storage measurements.">
        <div className="grid gap-3 sm:grid-cols-3 text-[11px]">
          <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="text-neutral-500">Dataset size</div>
            <div className="text-lg font-black">{(bytes / 1024).toFixed(1)} KB</div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="text-neutral-500">Quota</div>
            <div className="text-lg font-black">{usage}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
            <div className="text-neutral-500">Media files</div>
            <div className="text-lg font-black">{db.count('media')}</div>
          </div>
        </div>
      </Panel>
      <Panel title="Cache">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Cache enabled" checked={s.cache.enabled} onChange={(v) => saveSettings({ cache: { ...s.cache, enabled: v } })} />
          <Field label="TTL (seconds)">
            <Input type="number" defaultValue={s.cache.ttlSeconds} onBlur={(e) => saveSettings({ cache: { ...s.cache, ttlSeconds: Number(e.target.value) } })} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            size="sm"
            onClick={async () => {
              if (!can('cache.manage')) return toast.push('Permission denied: cache.manage', 'err');
              const keys = await caches?.keys?.();
              if (keys?.length) await Promise.all(keys.map((k) => caches.delete(k)));
              toast.push(`Purged ${keys?.length || 0} cache store(s).`);
            }}
          >
            Purge browser caches
          </Btn>
          <Btn
            size="sm"
            variant="danger"
            onClick={async () => {
              if (!(await confirm('Rebuild storage', 'Rewrites every record from memory to IndexedDB. Safe but heavy.'))) return;
              await db.hardPersist();
              toast.push('Storage rebuilt.');
            }}
          >
            Rebuild storage index
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

export function EmailAdmin() {
  useDb();
  const s = getSettings();
  const { can } = useAuth();
  if (!can('email.manage')) return <EmptyState text="Missing permission email.manage" />;
  return (
    <div className="space-y-4">
      <Panel title="Email delivery" desc="Templates are stored and used by the reset flow. Delivery requires a provider.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From name">
            <Input defaultValue={s.email.fromName} onBlur={(e) => saveSettings({ email: { ...s.email, fromName: e.target.value } })} />
          </Field>
          <Field label="From address">
            <Input defaultValue={s.email.fromAddress} onBlur={(e) => saveSettings({ email: { ...s.email, fromAddress: e.target.value } })} />
          </Field>
          <Field label="Provider" hint="e.g. resend / sendgrid — requires a server-side endpoint to keep the key secret.">
            <Input defaultValue={s.email.provider} onBlur={(e) => saveSettings({ email: { ...s.email, provider: e.target.value } })} />
          </Field>
          <Field label="API key reference" hint="Store the real key as a server env var; this field is only a reference label.">
            <Input defaultValue={s.email.apiKey} onBlur={(e) => saveSettings({ email: { ...s.email, apiKey: e.target.value } })} />
          </Field>
        </div>
        {!s.email.provider && (
          <p className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            No provider configured, so password-reset tokens are surfaced in the UI instead of being emailed. This is
            stated to users at the point of use rather than pretending mail was sent.
          </p>
        )}
      </Panel>
      <ResourceManager
        table="email_templates"
        title="Templates"
        perms={{ view: 'email.manage', create: 'email.manage', edit: 'email.manage', delete: 'email.manage' }}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'key', label: 'Key' },
          { key: 'subject', label: 'Subject' },
        ]}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'key', label: 'Key' },
          { key: 'subject', label: 'Subject' },
          { key: 'body', label: 'Body', type: 'textarea' },
        ]}
      />
    </div>
  );
}

export function ApiAdmin() {
  useDb();
  const s = getSettings();
  const { can } = useAuth();
  if (!can('integrations.manage')) return <EmptyState text="Missing permission integrations.manage" />;
  const env = [
    ['VITE_GOOGLE_CLIENT_ID', s.integrations.googleClientId, 'Google OAuth web client ID'],
    ['VITE_FACEBOOK_APP_ID', s.integrations.facebookAppId, 'Facebook Login app ID'],
    ['VITE_API_BASE_URL', s.integrations.apiBaseUrl, 'Optional REST backend base URL'],
  ];
  return (
    <div className="space-y-4">
      <Panel title="Required configuration" desc="Set these as environment variables at build time, or in Integrations at runtime.">
        <div className="space-y-2 text-[11px]">
          {env.map(([k, v, d]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950 p-2">
              <div>
                <code className="text-neutral-200">{k}</code>
                <div className="text-neutral-500">{d}</div>
              </div>
              <Badge color={v ? 'green' : 'red'}>{v ? 'set' : 'missing'}</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Backend contract" desc="If you attach a REST backend, it must implement these endpoints and repeat every permission check server-side.">
        <pre className="overflow-x-auto rounded bg-neutral-950 p-3 text-[10px] leading-relaxed text-neutral-400">{`GET    /health
POST   /auth/login            { username, password }        -> { token, user }
POST   /auth/register         { username, email, password }  -> { token, user }
POST   /auth/logout
POST   /auth/oauth/google     { credential }                 -> verify JWT server-side
POST   /auth/oauth/facebook   { accessToken }                -> verify with Graph API
GET    /me                                                   -> user + effective permissions
GET    /:table                ?q&sort&page                   -> requires <table>.view
POST   /:table                                               -> requires <table>.create
PATCH  /:table/:id                                           -> requires <table>.edit
DELETE /:table/:id                                           -> requires <table>.delete
GET    /design/published | /design/draft
POST   /design/publish                                       -> requires design.publish
GET    /audit                                                -> requires logs.view`}</pre>
      </Panel>
    </div>
  );
}
