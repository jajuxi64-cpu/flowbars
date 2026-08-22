import { Fragment, useEffect, useMemo, useState } from "react";
import { Shield, KeyRound, Database, Settings2, Plug, HardDrive, Trash2, Mail, Lock, Copy, Download, Upload, Plus, Pencil, Trash, RefreshCw, Check } from "lucide-react";
import { COLLECTIONS, COLLECTION_META, db, genId, type CollectionName, type Row } from "../../lib/backend";
import { useStore, useCollection } from "../../store";
import { PERMISSION_DOMAINS, ALL_PERMISSION_KEYS, type Role } from "../../lib/permissions";
import { buildRules, securityPosture, syncUserPermissions, type Posture } from "../../lib/security";
import { envStatus, FIREBASE_READY, APP_ID } from "../../lib/config";
import { Badge, Btn, Confirm, DataTable, Empty, Field, inputCls, Kv, Modal, No, Ok, PageHead, Panel, Tabs } from "../ui";
import { auth } from "../../lib/auth";

const ICONS = ["crown", "shield", "badge", "pen", "gavel", "user", "star", "bolt"];
const COLORS = ["#e10600", "#f59e0b", "#38bdf8", "#a78bfa", "#34d399", "#f472b6", "#71717a", "#facc15"];

export default function SystemSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can } = useStore();
  const tabs = [
    { id: "roles", label: "Roles", icon: <Shield size={12} />, perm: "roles.view" },
    { id: "permissions", label: "Permissions", icon: <KeyRound size={12} />, perm: "permissions.grant" },
    { id: "database", label: "Database", icon: <Database size={12} />, perm: "database.view" },
    { id: "settings", label: "Settings", icon: <Settings2 size={12} />, perm: "settings.view" },
    { id: "integrations", label: "Integrations", icon: <Plug size={12} />, perm: "integrations.view" },
    { id: "api", label: "API", icon: <KeyRound size={12} />, perm: "api.keys" },
    { id: "storage", label: "Storage", icon: <HardDrive size={12} />, perm: "storage.view" },
    { id: "cache", label: "Cache", icon: <Trash2 size={12} />, perm: "cache.clear" },
    { id: "email", label: "Email", icon: <Mail size={12} />, perm: "email.edit" },
    { id: "security", label: "Security", icon: <Lock size={12} />, perm: "security.view" },
  ].filter((t) => can(t.perm));
  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "roles";

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4">
        {!tabs.length && <Empty text="You hold no system permissions." />}
        {active === "roles" && <Roles />}
        {active === "permissions" && <PermissionMatrix />}
        {active === "database" && <DatabaseConsole />}
        {active === "settings" && <SettingsPanel />}
        {active === "integrations" && <Integrations />}
        {active === "api" && <ApiKeys />}
        {active === "storage" && <Storage />}
        {active === "cache" && <Cache />}
        {active === "email" && <EmailPanel />}
        {active === "security" && <Security />}
      </div>
    </div>
  );
}

/* ------------------------------ ROLES ------------------------------ */
function Roles() {
  const { roles, can, toast } = useStore();
  const { rows: users } = useCollection("users");
  const [editing, setEditing] = useState<Role | null>(null);
  const [del, setDel] = useState<Role | null>(null);

  const sorted = useMemo(() => [...roles].sort((a, b) => b.rank - a.rank), [roles]);

  function blank(): Role {
    return { id: genId("role"), name: "New role", slug: `role_${Date.now().toString(36)}`, color: "#71717a", icon: "user", rank: 100, description: "", permissions: [], createdAt: Date.now() };
  }

  async function save(r: Role) {
    try {
      if (roles.some((x) => x.id === r.id)) await db.update("roles", r.id, r as any, "roles.edit", r.name);
      else await db.create("roles", r as any, "roles.create", r.name);
      await syncUserPermissions();
      toast("Role saved — user permissions resynced", "ok");
      setEditing(null);
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <div>
      <PageHead title="Roles & hierarchy" desc="Discord-style roles. Higher rank wins. Permission changes propagate to every holder immediately.">
        <Btn size="sm" variant="primary" icon={<Plus size={12} />} disabled={!can("roles.create")} onClick={() => setEditing(blank())}>Create role</Btn>
      </PageHead>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map((r) => (
          <Panel key={r.id} dense className="hover:border-neutral-700 transition">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded grid place-items-center font-mono text-[11px] font-bold shrink-0" style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
                  {r.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-neutral-100 truncate">{r.name}</span>
                    {r.system && <Badge color="#71717a">system</Badge>}
                  </div>
                  <div className="font-mono text-[9px] text-neutral-600">{r.slug} · rank {r.rank} · {users.filter((u) => (u.roles || []).includes(r.id)).length} members</div>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed min-h-[32px]">{r.description}</p>
              <div className="font-mono text-[10px] text-neutral-400">{r.slug === "owner" ? "ALL PERMISSIONS" : `${r.permissions.length} / ${ALL_PERMISSION_KEYS.length} permissions`}</div>
              <div className="flex gap-1.5 pt-1 border-t border-neutral-800">
                <Btn size="xs" variant="outline" icon={<Pencil size={11} />} disabled={!can("roles.edit") || r.slug === "owner"} onClick={() => setEditing({ ...r })}>Edit</Btn>
                <Btn size="xs" variant="ghost" disabled={!can("roles.duplicate")} onClick={() => setEditing({ ...r, id: genId("role"), slug: `${r.slug}_copy`, name: `${r.name} copy`, system: false })}>Duplicate</Btn>
                <Btn size="xs" variant="danger" icon={<Trash size={11} />} disabled={!can("roles.delete") || r.system} onClick={() => setDel(r)}>Delete</Btn>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <RoleEditor role={editing} onClose={() => setEditing(null)} onSave={save} />

      <Confirm
        open={!!del}
        danger
        requireText={del?.name}
        title="Delete role"
        confirmLabel="Delete role"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          try {
            await db.remove("roles", del!.id, "roles.delete", del!.name);
            const holders = users.filter((u) => (u.roles || []).includes(del!.id));
            for (const u of holders) await db.update("users", u.id, { roles: (u.roles || []).filter((x: string) => x !== del!.id) }, "users.roles", u.username);
            await syncUserPermissions();
            toast("Role deleted", "ok");
          } catch (e: any) {
            toast(e.message, "err");
          }
          setDel(null);
        }}
        body={<>Delete <b className="text-white">{del?.name}</b> and strip it from {users.filter((u) => (u.roles || []).includes(del?.id || "")).length} accounts?</>}
      />
    </div>
  );
}

function RoleEditor({ role, onClose, onSave }: { role: Role | null; onClose: () => void; onSave: (r: Role) => void }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState<Role | null>(role);
  useEffect(() => {
    setR(role);
    setQ("");
  }, [role]);
  if (!r) return null;
  const toggle = (k: string) => setR({ ...r, permissions: r.permissions.includes(k) ? r.permissions.filter((x) => x !== k) : [...r.permissions, k] });
  const domainAll = (keys: string[]) => keys.every((k) => r.permissions.includes(k));

  return (
    <Modal
      open={!!role}
      onClose={onClose}
      title={`${role?.slug === "owner" ? "View" : "Edit"} role — ${r.name}`}
      width="max-w-3xl"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={r.slug === "owner"} onClick={() => onSave(r)}>Save role</Btn></>}
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Name"><input className={inputCls} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label="Slug" hint="Machine identifier, immutable once assigned."><input className={inputCls} value={r.slug} onChange={(e) => setR({ ...r, slug: e.target.value })} /></Field>
        <Field label="Hierarchy rank" hint="Higher rank outranks lower."><input type="number" className={inputCls} value={r.rank} onChange={(e) => setR({ ...r, rank: Number(e.target.value) })} /></Field>
        <Field label="Icon">
          <div className="flex gap-1 flex-wrap">
            {ICONS.map((i) => (
              <button key={i} onClick={() => setR({ ...r, icon: i })} className={`px-2 py-1 font-mono text-[9px] uppercase rounded border ${r.icon === i ? "border-red-700 text-red-400" : "border-neutral-800 text-neutral-500"}`}>{i}</button>
            ))}
          </div>
        </Field>
        <Field label="Colour">
          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setR({ ...r, color: c })} className="w-6 h-6 rounded border-2" style={{ background: c, borderColor: r.color === c ? "#fff" : "transparent" }} />
            ))}
            <input type="color" className="w-8 h-6 rounded cursor-pointer bg-transparent" value={r.color} onChange={(e) => setR({ ...r, color: e.target.value })} />
          </div>
        </Field>
        <Field label="Description"><input className={inputCls} value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input className={inputCls} placeholder="Filter permissions…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="font-mono text-[10px] text-neutral-500 shrink-0">{r.permissions.length} granted</span>
      </div>

      <div className="space-y-2 max-h-[38vh] overflow-y-auto fb-scroll pr-1">
        {PERMISSION_DOMAINS.map((d) => {
          const perms = d.permissions.filter((p) => !q || p.key.includes(q.toLowerCase()) || p.label.toLowerCase().includes(q.toLowerCase()));
          if (!perms.length) return null;
          return (
            <div key={d.domain} className="border border-neutral-800 rounded">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-950/60">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300">{d.label}</span>
                <button className="ml-auto font-mono text-[9px] text-neutral-500 hover:text-red-400" onClick={() => setR({ ...r, permissions: domainAll(perms.map((p) => p.key)) ? r.permissions.filter((k) => !perms.some((p) => p.key === k)) : Array.from(new Set([...r.permissions, ...perms.map((p) => p.key)])) })}>
                  {domainAll(perms.map((p) => p.key)) ? "clear" : "select all"}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-3 px-3 py-1.5">
                {perms.map((p) => (
                  <button key={p.key} onClick={() => toggle(p.key)} className="flex items-start gap-2 py-1 text-left group">
                    <span className="mt-0.5 w-3 h-3 rounded-sm border shrink-0" style={{ background: r.permissions.includes(p.key) ? "#dc2626" : "transparent", borderColor: r.permissions.includes(p.key) ? "#dc2626" : "#404040" }} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] text-neutral-200">{p.key}</span>
                      <span className="block text-[10px] text-neutral-600">{p.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/* ------------------------- PERMISSION MATRIX ------------------------ */
function PermissionMatrix() {
  const { roles, can, toast } = useStore();
  const [q, setQ] = useState("");
  const editable = roles.filter((r) => r.slug !== "owner");

  async function toggle(roleId: string, key: string, has: boolean) {
    const role = roles.find((r) => r.id === roleId)!;
    const perms = has ? role.permissions.filter((p) => p !== key) : [...role.permissions, key];
    try {
      await db.update("roles", roleId, { permissions: perms }, "permissions.grant", `${role.name} → ${key}`);
      await syncUserPermissions();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <div>
      <PageHead title="Permission matrix" desc={`${ALL_PERMISSION_KEYS.length} granular permissions across ${PERMISSION_DOMAINS.length} domains. Owner always holds everything.`}>
        <input className={inputCls + " w-52 py-1.5"} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageHead>
      <Panel dense>
        <div className="overflow-x-auto fb-scroll">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60">
                <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 sticky left-0 bg-neutral-950">Permission</th>
                {editable.map((r) => (
                  <th key={r.id} className="px-2 py-2 font-mono text-[10px] uppercase whitespace-nowrap" style={{ color: r.color }}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_DOMAINS.map((d) => {
                const perms = d.permissions.filter((p) => !q || p.key.includes(q.toLowerCase()));
                if (!perms.length) return null;
                return (
                  <Fragment key={d.domain}>
                    <tr><td colSpan={editable.length + 1} className="px-3 py-1.5 bg-neutral-900 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">{d.label}</td></tr>
                    {perms.map((p) => (
                      <tr key={p.key} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                        <td className="px-3 py-1.5 sticky left-0 bg-neutral-950">
                          <span className="font-mono text-[10px] text-neutral-200">{p.key}</span>
                          <span className="block text-[9px] text-neutral-600">{p.label}</span>
                        </td>
                        {editable.map((r) => {
                          const has = r.permissions.includes(p.key);
                          return (
                            <td key={r.id} className="px-2 py-1.5 text-center">
                              <button
                                disabled={!can("permissions.grant")}
                                onClick={() => toggle(r.id, p.key, has)}
                                className="w-5 h-5 rounded border inline-grid place-items-center transition disabled:opacity-40"
                                style={{ background: has ? r.color : "transparent", borderColor: has ? r.color : "#404040" }}
                              >
                                {has && <Check size={11} className="text-black" />}
                              </button>
                            </td>
                          );
                        })}
                       </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------- DATABASE ------------------------------ */
function DatabaseConsole() {
  const { can, toast } = useStore();
  const [col, setCol] = useState<CollectionName>("battles");
  const { rows } = useCollection(col);
  const [raw, setRaw] = useState<Row | null>(null);
  const [json, setJson] = useState("");
  const [del, setDel] = useState<Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [wipe, setWipe] = useState(false);

  const meta = COLLECTION_META[col];
  const keys = useMemo(() => {
    const set = new Set<string>(meta.fields.map((f) => f.replace("[]", "")));
    rows.slice(0, 25).forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set).filter((k) => !["updatedAt"].includes(k)).slice(0, 6);
  }, [rows, meta]);

  function download(name: string, data: any) {
    const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <PageHead title="Database console" desc="Inspect and manage every entity. All writes are permission-gated and audited.">
        <select className={inputCls + " w-44 py-1.5"} value={col} onChange={(e) => setCol(e.target.value as CollectionName)}>
          {COLLECTIONS.map((c) => <option key={c} value={c}>{COLLECTION_META[c].label}</option>)}
        </select>
        <Btn size="sm" variant="outline" icon={<Download size={12} />} disabled={!can("database.export")} onClick={() => download(`fb_${col}.json`, rows)}>Export</Btn>
        <Btn size="sm" variant="outline" icon={<Upload size={12} />} disabled={!can("database.import")} onClick={() => setImportOpen(true)}>Import</Btn>
        <Btn size="sm" variant="ghost" icon={<Download size={12} />} disabled={!can("database.backup")} onClick={async () => download(`fb_backup_${Date.now()}.json`, await db.snapshotAll())}>Backup all</Btn>
        <Btn size="sm" variant="danger" icon={<Upload size={12} />} disabled={!can("database.restore")} onClick={() => setRestoreOpen(true)}>Restore</Btn>
      </PageHead>

      <Panel dense>
        <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-950/40 font-mono text-[10px] text-neutral-500">
          {meta.description} · <span className="text-neutral-300">{rows.length}</span> records in <code className="text-red-400">{col}</code>
        </div>
        <DataTable
          rows={rows}
          searchKeys={keys}
          columns={keys.map((k) => ({
            key: k,
            label: k,
            render: (r: any) => <span className="block max-w-[180px] truncate font-mono text-[10px]">{typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k] ?? "—")}</span>,
          }))}
          rowActions={(r) => (
            <span className="inline-flex gap-0.5">
              <button className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30" disabled={!can("database.read")} onClick={() => { setRaw(r); setJson(JSON.stringify(r, null, 2)); }}><Pencil size={13} /></button>
              <button className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("database.delete")} onClick={() => setDel(r)}><Trash size={13} /></button>
            </span>
          )}
          onBulk={async (ids) => {
            try {
              const n = await db.bulkRemove(col, ids, "database.bulk");
              toast(`${n} records deleted`, "ok");
            } catch (e: any) {
              toast(e.message, "err");
            }
          }}
        />
      </Panel>

      <Modal
        open={!!raw}
        onClose={() => setRaw(null)}
        title={`Record ${col}/${raw?.id}`}
        width="max-w-2xl"
        footer={
          <>
            <Btn onClick={() => setRaw(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={!can("database.write")}
              onClick={async () => {
                try {
                  const parsed = JSON.parse(json);
                  await db.update(col, raw!.id, parsed, "database.write", raw!.id);
                  toast("Record written", "ok");
                  setRaw(null);
                } catch (e: any) {
                  toast(e.message, "err");
                }
              }}
            >
              Save record
            </Btn>
          </>
        }
      >
        <Field label="JSON document" hint="Direct record editing. Invalid JSON is rejected before it reaches the database.">
          <textarea rows={18} className={inputCls + " text-[11px] leading-relaxed"} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
        </Field>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={`Import into ${col}`} width="max-w-2xl" footer={<><Btn onClick={() => setImportOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={async () => { try { const arr = JSON.parse(importText); const list = Array.isArray(arr) ? arr : [arr]; for (const item of list) await db.create(col, item, "database.import", item?.id || "record"); toast(`${list.length} records imported`, "ok"); setImportOpen(false); } catch (e: any) { toast(e.message, "err"); } }}>Import</Btn></>}>
        <Field label="JSON array of records"><textarea rows={14} className={inputCls + " text-[11px]"} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='[{"id":"x1","title":"…"}]' /></Field>
      </Modal>

      <Modal
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title="Restore database"
        width="max-w-2xl"
        footer={
          <>
            <Btn onClick={() => setRestoreOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={!wipe}
              onClick={async () => {
                try {
                  const data = JSON.parse(restoreText);
                  await db.replaceAll(data, { wipe: true });
                  toast("Database restored from snapshot", "ok");
                  setRestoreOpen(false);
                } catch (e: any) {
                  toast(e.message, "err");
                }
              }}
            >
              Restore
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 border border-red-900 bg-red-950/40 text-[11px] text-red-300 rounded">
            Restoring <b>wipes the current database</b> and replaces it with the snapshot. Enable the safety switch below before confirming.
          </div>
          <label className="flex items-center gap-2 text-[11px] text-neutral-300">
            <input type="checkbox" className="accent-red-600" checked={wipe} onChange={(e) => setWipe(e.target.checked)} /> I understand this overwrites all collections
          </label>
          <Field label="Snapshot JSON"><textarea rows={12} className={inputCls + " text-[11px]"} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} /></Field>
        </div>
      </Modal>

      <Confirm open={!!del} danger title="Delete record" confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={async () => { try { await db.remove(col, del!.id, "database.delete", del!.id); toast("Record deleted", "ok"); } catch (e: any) { toast(e.message, "err"); } setDel(null); }} body={<>Delete <code className="text-red-400">{col}/{del?.id}</code>?</>} />
    </div>
  );
}

/* ---------------------------- SETTINGS ------------------------------ */
function SettingsPanel() {
  const { settings, can, toast } = useStore();
  const [form, setForm] = useState<Record<string, any>>({
    siteName: settings.siteName,
    tagline: settings.tagline,
    registrationOpen: settings.registrationOpen,
    maintenanceMode: settings.maintenanceMode,
    adminPath: settings.adminPath,
    chatPerMin: settings.rateLimits?.chatPerMin,
    commentsPerMin: settings.rateLimits?.commentsPerMin,
    signupPerHour: settings.rateLimits?.signupPerHour,
    passwordAuth: settings.authMethods?.password,
    googleAuth: settings.authMethods?.google,
    facebookAuth: settings.authMethods?.facebook,
  });

  async function save() {
    try {
      await db.setSetting("siteName", form.siteName);
      await db.setSetting("tagline", form.tagline);
      await db.setSetting("registrationOpen", Boolean(form.registrationOpen));
      await db.setSetting("maintenanceMode", Boolean(form.maintenanceMode));
      await db.setSetting("adminPath", String(form.adminPath).replace(/^\/+|[^a-zA-Z0-9-_]/g, ""));
      await db.setSetting("rateLimits", { chatPerMin: Number(form.chatPerMin), commentsPerMin: Number(form.commentsPerMin), signupPerHour: Number(form.signupPerHour) });
      await db.setSetting("authMethods", { password: Boolean(form.passwordAuth), google: Boolean(form.googleAuth), facebook: Boolean(form.facebookAuth), phone: false });
      toast("Settings saved", "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const sw = (k: string) => (
    <button disabled={!can("settings.edit")} onClick={() => setForm({ ...form, [k]: !form[k] })} className={`px-3 py-2 font-mono text-[10px] uppercase rounded border w-full ${form[k] ? "border-emerald-800 text-emerald-400" : "border-neutral-800 text-neutral-600"}`}>
      {form[k] ? "enabled" : "disabled"}
    </button>
  );

  return (
    <div>
      <PageHead title="Platform settings" desc="Persisted to the settings collection and read by the public site at runtime.">
        <Btn size="sm" variant="primary" disabled={!can("settings.edit")} onClick={save}>Save settings</Btn>
      </PageHead>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Identity">
          <div className="space-y-3">
            <Field label="Site name"><input className={inputCls} value={form.siteName || ""} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></Field>
            <Field label="Tagline"><input className={inputCls} value={form.tagline || ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
            <Field label="Control center path" hint="Changing this immediately moves the private admin URL. Bookmarks to the old path will 404.">
              <input className={inputCls} value={form.adminPath || ""} onChange={(e) => setForm({ ...form, adminPath: e.target.value })} />
            </Field>
            <div className="p-2.5 rounded border border-neutral-800 bg-neutral-950 font-mono text-[10px] text-neutral-500 break-all">
              new URL → <span className="text-red-400">#/{form.adminPath}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Access & safety">
          <div className="space-y-3">
            <Field label="Public registration">{sw("registrationOpen")}</Field>
            <Field label="Maintenance mode" hint="Visitors see a maintenance screen; staff keep console access.">{sw("maintenanceMode")}</Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Chat / min"><input type="number" className={inputCls} value={form.chatPerMin ?? 10} onChange={(e) => setForm({ ...form, chatPerMin: e.target.value })} /></Field>
              <Field label="Comments / min"><input type="number" className={inputCls} value={form.commentsPerMin ?? 5} onChange={(e) => setForm({ ...form, commentsPerMin: e.target.value })} /></Field>
              <Field label="Signups / hr"><input type="number" className={inputCls} value={form.signupPerHour ?? 3} onChange={(e) => setForm({ ...form, signupPerHour: e.target.value })} /></Field>
            </div>
          </div>
        </Panel>
        <Panel title="Authentication methods" desc="Phone / SMS verification is not available on this platform." className="lg:col-span-2">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Username + password" hint="PBKDF2 local or Firebase Auth">{sw("passwordAuth")}</Field>
            <Field label="Google OAuth" hint={FIREBASE_READY ? "Requires provider enabled in Firebase console" : "Requires Firebase env vars"}>{sw("googleAuth")}</Field>
            <Field label="Facebook OAuth" hint={FIREBASE_READY ? "Requires app id + provider enabled" : "Requires Firebase env vars"}>{sw("facebookAuth")}</Field>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- INTEGRATIONS --------------------------- */
function Integrations() {
  const { settings, can, toast, backend } = useStore();
  const [form, setForm] = useState(settings.integrations || {});
  const env = envStatus();

  return (
    <div>
      <PageHead title="Integrations" desc="Provider credentials and environment status. Nothing here is simulated — unconfigured providers report as unavailable." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Environment variables" desc={backend === "firestore" ? "Firebase detected — server-verified identity active." : "No Firebase credentials found — running on the local backend."}>
          <div className="space-y-1.5">
            {env.map((e) => (
              <div key={e.key} className="flex items-center gap-3 py-1.5 border-b border-neutral-800/60 last:border-0">
                <code className="font-mono text-[10px] text-neutral-300 flex-1 truncate">{e.key}</code>
                {e.present ? <Ok /> : e.required ? <No>required</No> : <span className="font-mono text-[9px] text-neutral-600">optional</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-neutral-600 mt-3 leading-relaxed">
            Provide these at build time (e.g. Railway → Variables, or a <code>.env</code> file) then rebuild. Google and Facebook OAuth additionally require the
            provider enabled under Firebase Console → Authentication → Sign-in method, with this domain added to the authorised domains list.
          </p>
        </Panel>

        <Panel
          title="Connected services"
          actions={<Btn size="xs" variant="primary" disabled={!can("integrations.edit")} onClick={async () => { try { await db.setSetting("integrations", form, "integrations.edit"); toast("Integrations saved", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>Save</Btn>}
        >
          <div className="space-y-3">
            {(["youtubeChannel", "youtubeApiKey", "instagram", "tiktok", "facebookAppId", "googleClientId"] as const).map((k) => (
              <Field key={k} label={k}>
                <input className={inputCls} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------ API --------------------------------- */
function ApiKeys() {
  const { can, toast } = useStore();
  const { rows } = useCollection("api_keys");
  const [label, setLabel] = useState("");

  return (
    <div>
      <PageHead title="Public read API" desc="Token-gated JSON endpoints over the public collections." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Endpoints" desc="Read-only, rate limited, returns the same documents the public site renders.">
          <div className="space-y-1.5 font-mono text-[10px]">
            {[["GET", "/api/battles"], ["GET", "/api/mcs"], ["GET", "/api/rankings"], ["GET", "/api/news"], ["GET", "/api/events"]].map(([m, p]) => (
              <div key={p} className="flex items-center gap-2 py-1.5 border-b border-neutral-800/60">
                <Badge color="#38bdf8">{m}</Badge>
                <code className="text-neutral-300">{p}</code>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-neutral-600 mt-3 leading-relaxed">
            On static hosting the public site reads Firestore directly under the Security Rules in System → Security. Keys below gate the JSON mirror when a server
            worker is deployed; writes always require a staff permission key.
          </p>
        </Panel>
        <Panel
          title="API keys"
          actions={
            <div className="flex gap-1.5">
              <input className={inputCls + " w-32 py-1"} placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
              <Btn
                size="xs"
                variant="primary"
                disabled={!can("api.keys") || !label.trim()}
                onClick={async () => {
                  try {
                    await db.create("api_keys", { label, token: `fbk_${genId()}${Math.random().toString(36).slice(2, 10)}`, scopes: ["read"], revoked: false, createdAt: Date.now() }, "api.keys", label);
                    setLabel("");
                    toast("Key issued", "ok");
                  } catch (e: any) {
                    toast(e.message, "err");
                  }
                }}
              >
                Issue
              </Btn>
            </div>
          }
          dense
        >
          <DataTable
            rows={rows}
            selectable={false}
            columns={[
              { key: "label", label: "Label" },
              { key: "token", label: "Token", render: (k) => <code className="text-[10px] text-neutral-400">{String(k.token).slice(0, 18)}…</code> },
              { key: "revoked", label: "State", render: (k) => (k.revoked ? <Badge color="#ef4444">revoked</Badge> : <Badge color="#34d399">active</Badge>) },
            ]}
            rowActions={(k) => (
              <button className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("api.keys")} onClick={async () => { try { await db.update("api_keys", k.id, { revoked: true }, "api.keys", k.label); toast("Key revoked", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>
                <Trash size={13} />
              </button>
            )}
          />
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- STORAGE ------------------------------ */
function Storage() {
  const { can, toast } = useStore();
  const [snap, setSnap] = useState<Record<string, Row[]> | null>(null);
  const [busy, setBusy] = useState(false);

  async function measure() {
    setBusy(true);
    setSnap(await db.snapshotAll());
    setBusy(false);
  }
  useEffect(() => {
    if (!snap) void measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = snap ? Object.values(snap).reduce((s, r) => s + r.length, 0) : 0;
  const bytes = snap ? JSON.stringify(snap).length : 0;

  return (
    <div>
      <PageHead title="Storage" desc="Record counts and payload size per collection.">
        <Btn size="sm" variant="outline" icon={<RefreshCw size={12} />} disabled={busy} onClick={measure}>Re-measure</Btn>
      </PageHead>
      <Panel dense>
        <DataTable
          rows={(Object.entries(snap || {}) as [string, Row[]][]).map(([k, v]) => ({ id: k, collection: k, records: v.length, bytes: JSON.stringify(v).length }))}
          selectable={false}
          columns={[
            { key: "collection", label: "Collection", render: (r) => <code className="text-red-400">{r.collection}</code> },
            { key: "records", label: "Records", sort: (a: any, b: any) => a.records - b.records },
            { key: "bytes", label: "Payload", sort: (a: any, b: any) => a.bytes - b.bytes, render: (r) => `${(r.bytes / 1024).toFixed(1)} KB` },
            { key: "desc", label: "Purpose", hideMobile: true, render: (r) => <span className="text-neutral-600">{COLLECTION_META[r.collection as CollectionName]?.description}</span> },
          ]}
        />
      </Panel>
      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <Panel><Kv k="Total records" v={total} /></Panel>
        <Panel><Kv k="Total payload" v={`${(bytes / 1024).toFixed(1)} KB`} /></Panel>
        <Panel>
          <Kv k="Backend" v={FIREBASE_READY ? "Firestore" : "Local"} />
          <Btn size="xs" variant="danger" className="mt-2" disabled={!can("storage.purge")} onClick={async () => { toast("Orphan scan requires a storage bucket — configure VITE_FIREBASE_STORAGE_BUCKET", "info"); }}>
            Purge orphans
          </Btn>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------ CACHE ------------------------------- */
function Cache() {
  const { toast } = useStore();
  const items = [
    { key: "fb:auth:attempts", label: "Login attempt counters" },
    { key: "fb:auth:session", label: "Local session token" },
  ];
  return (
    <div>
      <PageHead title="Cache" desc="Client-side caches. Clearing never touches persisted content." />
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((i) => (
          <Panel key={i.key} dense>
            <div className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[12px] text-neutral-200">{i.label}</div>
                <code className="font-mono text-[9px] text-neutral-600">{i.key}</code>
              </div>
              <Btn size="xs" variant="danger" onClick={() => { localStorage.removeItem(i.key); toast(`${i.label} cleared`, "ok"); }}>Clear</Btn>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ EMAIL ------------------------------- */
function EmailPanel() {
  const { settings, can, toast } = useStore();
  const [form, setForm] = useState(settings.email || {});
  const [to, setTo] = useState("");
  return (
    <div>
      <PageHead title="Email" desc="Transactional mail: recovery links and notifications." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Provider" actions={<Btn size="xs" variant="primary" disabled={!can("email.edit")} onClick={async () => { try { await db.setSetting("email", form, "email.edit"); toast("Email settings saved", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>Save</Btn>}>
          <div className="space-y-3">
            <Field label="Provider" hint="firebase-auth uses Firebase's built-in mail service."><input className={inputCls} value={form.provider || "firebase-auth"} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></Field>
            <Field label="From address"><input className={inputCls} value={form.from || ""} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            <div className="p-2.5 border border-neutral-800 rounded text-[10px] text-neutral-500 leading-relaxed">
              {FIREBASE_READY ? <span className="text-emerald-400">Firebase Auth is configured — recovery mail is dispatched by Google's mail servers.</span> : <span className="text-amber-400">No Firebase credentials: recovery mail cannot be sent. Configure the env vars or wire an SMTP provider.</span>}
            </div>
          </div>
        </Panel>
        <Panel title="Send test">
          <div className="space-y-3">
            <Field label="Recipient username or email"><input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Btn
              variant="outline"
              disabled={!can("email.test") || !to.trim()}
              onClick={async () => {
                const res = await auth.resetPassword(to);
                toast(res.ok ? `Recovery mail sent to ${res.user.email}` : res.error, res.ok ? "ok" : "err");
              }}
            >
              Dispatch test mail
            </Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- SECURITY ----------------------------- */
function Security() {
  const { roles, settings, can, toast } = useStore();
  const [posture, setPosture] = useState<Posture[]>([]);
  const [rules, setRules] = useState("");
  const [sec, setSec] = useState(settings.security || {});
  const [adminPath, setAdminPath] = useState(settings.adminPath || "fb-control-x92k");

  useEffect(() => {
    void securityPosture().then(setPosture);
    setRules(buildRules(roles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.length]);

  return (
    <div>
      <PageHead title="Security" desc="Hardening posture, private route and the server-side rules that enforce this console." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Posture" icon={<Shield size={14} />}>
          <div>
            {posture.map((p) => (
              <div key={p.label} className="flex items-start gap-3 py-2 border-b border-neutral-800/60 last:border-0">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${p.ok ? "bg-emerald-500" : "bg-amber-400"}`} />
                <span className="min-w-0">
                  <span className="block text-[11px] text-neutral-200">{p.label}</span>
                  <span className="block text-[10px] text-neutral-500">{p.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Hardening" icon={<Lock size={14} />}>
          <div className="space-y-3">
            <Field label="Private admin route" hint="The only path that loads this console. Everything else renders the public site.">
              <div className="flex gap-2">
                <input className={inputCls} value={adminPath} onChange={(e) => setAdminPath(e.target.value)} />
                <Btn
                  size="sm"
                  variant="primary"
                  disabled={!can("security.edit")}
                  onClick={async () => {
                    const clean = adminPath.replace(/^\/+|[^a-zA-Z0-9-_]/g, "");
                    if (clean.length < 6) return toast("Use at least 6 characters", "err");
                    await db.setSetting("adminPath", clean, "security.edit");
                    toast(`Admin route moved to /${clean}`, "ok");
                    setTimeout(() => (window.location.hash = `/${clean}/system/security`), 600);
                  }}
                >
                  Move
                </Btn>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Max attempts"><input type="number" className={inputCls} value={sec.maxAttempts ?? 5} onChange={(e) => setSec({ ...sec, maxAttempts: Number(e.target.value) })} /></Field>
              <Field label="Window (min)"><input type="number" className={inputCls} value={Math.round((sec.windowMs ?? 9e5) / 60000)} onChange={(e) => setSec({ ...sec, windowMs: Number(e.target.value) * 60000 })} /></Field>
              <Field label="Base lock (min)"><input type="number" className={inputCls} value={Math.round((sec.baseLockMs ?? 6e4) / 60000)} onChange={(e) => setSec({ ...sec, baseLockMs: Number(e.target.value) * 60000 })} /></Field>
              <Field label="Session (days)"><input type="number" className={inputCls} value={sec.sessionLifetimeDays ?? 30} onChange={(e) => setSec({ ...sec, sessionLifetimeDays: Number(e.target.value) })} /></Field>
            </div>
            <Btn
              variant="outline"
              size="sm"
              disabled={!can("security.edit")}
              onClick={async () => {
                await db.setSetting("security", sec, "security.edit");
                toast("Security policy updated", "ok");
              }}
            >
              Save policy
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={12} />}
              disabled={!can("permissions.grant")}
              onClick={async () => {
                const n = await syncUserPermissions();
                toast(`${n} user documents resynced`, "ok");
              }}
            >
              Resync permissions
            </Btn>
          </div>
        </Panel>

        <Panel
          title="Firestore Security Rules"
          desc="Generated from the live role model. Deploy to enforce every permission server-side."
          className="lg:col-span-2"
          icon={<KeyRound size={14} />}
          actions={
            <>
              <Btn size="xs" variant="outline" icon={<Copy size={11} />} onClick={() => { navigator.clipboard.writeText(rules); toast("Rules copied", "ok"); }}>Copy</Btn>
              <Btn size="xs" variant="ghost" icon={<Download size={11} />} onClick={() => { const b = new Blob([rules], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "firestore.rules"; a.click(); }}>Download</Btn>
            </>
          }
        >
          <pre className="text-[10px] leading-relaxed text-neutral-400 bg-neutral-950 border border-neutral-800 rounded p-3 overflow-x-auto fb-scroll max-h-[320px]">{rules}</pre>
          <p className="text-[10px] text-neutral-600 mt-2">
            App namespace: <code className="text-neutral-400">artifacts/{APP_ID}/public/data</code> · deploy with{" "}
            <code className="text-neutral-400">firebase deploy --only firestore:rules</code>
          </p>
        </Panel>
      </div>
    </div>
  );
}
