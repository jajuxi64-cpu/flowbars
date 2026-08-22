import { useState } from "react";
import { Users, MessageSquare, Flag, Bell, Ban, UserCog, Trash2, Pencil, Shield, Volume2, VolumeX, Check, X, Send, KeyRound } from "lucide-react";
import { db, type Row } from "../../lib/backend";
import { useStore, useCollection } from "../../store";
import { auth } from "../../lib/auth";
import { syncUserPermissions } from "../../lib/security";
import { Badge, Btn, Confirm, DataTable, Empty, Field, inputCls, Modal, PageHead, Panel, Tabs, Kv } from "../ui";
import { highestRole } from "../../lib/permissions";

export default function CommunitySection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can } = useStore();
  const { rows: reports } = useCollection("reports");
  const openReports = reports.filter((r) => r.status === "open").length;
  const tabs = [
    { id: "users", label: "Users", icon: <Users size={12} />, perm: "users.view" },
    { id: "profiles", label: "Profiles", icon: <UserCog size={12} />, perm: "users.view" },
    { id: "comments", label: "Comments", icon: <MessageSquare size={12} />, perm: "comments.view" },
    { id: "chat", label: "Chat", icon: <MessageSquare size={12} />, perm: "chat.view" },
    { id: "reports", label: "Reports", icon: <Flag size={12} />, perm: "reports.view", badge: openReports },
    { id: "moderation", label: "Moderation", icon: <Ban size={12} />, perm: "users.mute" },
    { id: "notifications", label: "Notifications", icon: <Bell size={12} />, perm: "notifications.send" },
  ].filter((t) => can(t.perm));
  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "users";

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4">
        {!tabs.length && <Empty text="You hold no community permissions." />}
        {(active === "users" || active === "profiles") && <UsersTable compact={active === "users"} />}
        {active === "comments" && <Comments />}
        {active === "chat" && <ChatMod />}
        {active === "reports" && <Reports />}
        {active === "moderation" && <Moderation />}
        {active === "notifications" && <Notifications />}
      </div>
    </div>
  );
}

/* ------------------------------ users ------------------------------ */
function UsersTable({ compact }: { compact: boolean }) {
  const { roles, can, toast, user: me } = useStore();
  const { rows: users } = useCollection("users");
  const { rows: logins } = useCollection("login_logs");
  const [roleFor, setRoleFor] = useState<Row | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const roleName = (u: Row) => highestRole(u.roles || [], roles);

  async function patch(u: Row, p: Record<string, any>, label: string, perm: string) {
    try {
      await db.update("users", u.id, p, perm, u.username);
      toast(label, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <div>
      <PageHead title={compact ? "Users" : "Profiles"} desc="Accounts, roles and status. Role changes recompute the permission set immediately.">
        <span className="font-mono text-[10px] text-neutral-500">{users.length} accounts · {users.filter((u) => u.banned).length} banned · {users.filter((u) => u.muted).length} muted</span>
      </PageHead>
      <Panel dense>
        <DataTable
          rows={users}
          searchKeys={["username", "email", "provider", "status"]}
          columns={[
            {
              key: "username",
              label: "Account",
              render: (u) => (
                <span className="flex items-center gap-2">
                  <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.username || "u")}&backgroundColor=e10600&textColor=fff&fontFamily=monospace`} className="w-6 h-6 rounded-full" alt="" />
                  <span>
                    <span className="block text-neutral-100">{u.username}{u.id === me?.uid && <span className="text-neutral-600"> (you)</span>}</span>
                    <span className="block text-[10px] text-neutral-600">{u.email}</span>
                  </span>
                </span>
              ),
            },
            { key: "roles", label: "Role", render: (u) => <Badge color={roleName(u)?.color || "#71717a"}>{roleName(u)?.name || "none"}</Badge> },
            { key: "provider", label: "Auth", hideMobile: true, render: (u) => <span className="font-mono text-[10px] text-neutral-500">{u.provider}</span> },
            {
              key: "status",
              label: "State",
              render: (u) => (
                <span className="flex gap-1">
                  {u.banned ? <Badge color="#ef4444">banned</Badge> : u.muted ? <Badge color="#f59e0b">muted</Badge> : <Badge color="#34d399">active</Badge>}
                </span>
              ),
            },
            { key: "lastSeen", label: "Last seen", hideMobile: true, render: (u) => <span className="font-mono text-[10px] text-neutral-500">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : "—"}</span> },
            { key: "logins", label: "Logins", hideMobile: true, render: (u) => <span className="font-mono text-[10px]">{logins.filter((l) => l.identity === u.username && l.result === "success").length}</span> },
          ]}
          rowActions={(u) => (
            <span className="inline-flex gap-0.5">
              <button title="Roles" className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30" disabled={!can("users.roles")} onClick={() => { setRoleFor(u); setSelected(u.roles || []); }}><Shield size={13} /></button>
              <button title={u.muted ? "Unmute" : "Mute"} className="p-1.5 text-neutral-500 hover:text-amber-400 disabled:opacity-30" disabled={!can("users.mute")} onClick={() => patch(u, { muted: !u.muted }, u.muted ? "Unmuted" : "Muted", "users.mute")}>
                {u.muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button title={u.banned ? "Unban" : "Ban"} className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("users.ban")} onClick={() => patch(u, { banned: !u.banned }, u.banned ? "Unbanned" : "Banned", "users.ban")}>
                <Ban size={13} />
              </button>
              <button title="Force password reset" className="p-1.5 text-neutral-500 hover:text-sky-400 disabled:opacity-30" disabled={!can("users.reset")} onClick={async () => { const r = await auth.resetPassword(u.username); toast(r.ok ? "Recovery mail sent" : r.error, r.ok ? "ok" : "err"); }}>
                <KeyRound size={13} />
              </button>
              <button title="Delete" className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("users.delete")} onClick={() => setDel(u)}><Trash2 size={13} /></button>
            </span>
          )}
          onBulk={async (ids) => {
            if (!confirm(`Delete ${ids.length} account records?`)) return;
            try {
              await db.bulkRemove("users", ids, "users.delete");
              toast(`${ids.length} accounts deleted`, "ok");
            } catch (e: any) {
              toast(e.message, "err");
            }
          }}
        />
      </Panel>

      <Modal
        open={!!roleFor}
        onClose={() => setRoleFor(null)}
        title={`Roles — ${roleFor?.username || ""}`}
        footer={
          <>
            <Btn onClick={() => setRoleFor(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={async () => {
                try {
                  await db.update("users", roleFor!.id, { roles: selected }, "users.roles", roleFor!.username);
                  await syncUserPermissions();
                  toast("Roles updated — permissions resynced", "ok");
                  setRoleFor(null);
                } catch (e: any) {
                  toast(e.message, "err");
                }
              }}
            >
              Apply roles
            </Btn>
          </>
        }
      >
        <div className="space-y-1.5">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
              className={`w-full flex items-center gap-3 p-2.5 rounded border transition text-left ${selected.includes(r.id) ? "border-neutral-600 bg-neutral-800" : "border-neutral-800 hover:border-neutral-700"}`}
            >
              <span className="w-3 h-3 rounded-sm border" style={{ background: selected.includes(r.id) ? r.color : "transparent", borderColor: r.color }} />
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] text-neutral-100 font-semibold">{r.name} <span className="text-neutral-600">· rank {r.rank}</span></span>
                <span className="block text-[10px] text-neutral-500">{r.permissions.length} permissions</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <Confirm
        open={!!del}
        danger
        requireText={del?.username}
        title="Delete account"
        confirmLabel="Delete account"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          try {
            await db.remove("users", del!.id, "users.delete", del!.username);
            toast("Account record deleted", "ok");
          } catch (e: any) {
            toast(e.message, "err");
          }
          setDel(null);
        }}
        body={<>Erases the profile record for <b className="text-white">{del?.username}</b>. The Firebase Auth credential itself must be removed from the Firebase console (requires the Admin SDK / service account).</>}
      />
    </div>
  );
}

/* ---------------------------- comments ----------------------------- */
function Comments() {
  const { can, toast } = useStore();
  const { rows: comments } = useCollection("comments");
  const { rows: battles } = useCollection("battles");
  const [edit, setEdit] = useState<Row | null>(null);
  const [body, setBody] = useState("");
  const [del, setDel] = useState<Row | null>(null);

  return (
    <div>
      <PageHead title="Comments" desc="Every comment posted on the public site, with its target battle." />
      <Panel dense>
        <DataTable
          rows={[...comments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))}
          searchKeys={["body", "author"]}
          columns={[
            { key: "body", label: "Comment", render: (c) => <span className="block max-w-[320px] truncate">{c.body}</span> },
            { key: "author", label: "Author", hideMobile: true },
            { key: "target", label: "Battle", hideMobile: true, render: (c) => <span className="text-neutral-500">{battles.find((b) => b.id === c.target)?.title || c.target}</span> },
            { key: "createdAt", label: "When", hideMobile: true, render: (c) => <span className="font-mono text-[10px] text-neutral-500">{new Date(c.createdAt || 0).toLocaleString()}</span> },
            { key: "status", label: "State", render: (c) => <Badge color={c.status === "visible" ? "#34d399" : "#71717a"}>{c.status}</Badge> },
          ]}
          rowActions={(c) => (
            <span className="inline-flex gap-0.5">
              <button className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30" disabled={!can("comments.edit")} onClick={() => { setEdit(c); setBody(c.body); }}><Pencil size={13} /></button>
              <button className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("comments.delete")} onClick={() => setDel(c)}><Trash2 size={13} /></button>
            </span>
          )}
          onBulk={async (ids) => {
            try {
              await db.bulkRemove("comments", ids, "comments.delete");
              toast(`${ids.length} comments removed`, "ok");
            } catch (e: any) {
              toast(e.message, "err");
            }
          }}
        />
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Redact comment" footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" onClick={async () => { try { await db.update("comments", edit!.id, { body, redacted: true }, "comments.edit", edit!.author); toast("Comment updated", "ok"); setEdit(null); } catch (e: any) { toast(e.message, "err"); } }}>Save</Btn></>}>
        <Field label="Body"><textarea rows={4} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      </Modal>

      <Confirm open={!!del} danger title="Delete comment" onClose={() => setDel(null)} onConfirm={async () => { try { await db.remove("comments", del!.id, "comments.delete", del!.author); toast("Comment deleted", "ok"); } catch (e: any) { toast(e.message, "err"); } setDel(null); }} body={<>Remove this comment by <b className="text-white">{del?.author}</b>?</>} />
    </div>
  );
}

/* ------------------------------ chat ------------------------------- */
function ChatMod() {
  const { can, toast } = useStore();
  const { rows } = useCollection("chat");
  const [purge, setPurge] = useState(false);
  const msgs = [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div>
      <PageHead title="Chat moderation" desc="Live community room. Deletions are instant and audited.">
        <Btn variant="danger" size="sm" disabled={!can("chat.purge")} onClick={() => setPurge(true)}>Purge room</Btn>
      </PageHead>
      <Panel dense>
        {msgs.length === 0 ? (
          <Empty text="No messages yet — the room fills up as members talk." />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto fb-scroll divide-y divide-neutral-800/60">
            {msgs.slice(0, 120).map((m) => (
              <div key={m.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-neutral-800/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-neutral-100">{m.sender}</span>
                    <span className="font-mono text-[9px] text-neutral-600">{new Date(m.createdAt || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-[12px] text-neutral-400 break-words">{m.text}</p>
                </div>
                <button
                  className="p-1.5 text-neutral-600 hover:text-red-500 disabled:opacity-30"
                  disabled={!can("chat.moderate")}
                  onClick={async () => { try { await db.remove("chat", m.id, "chat.moderate", m.sender); toast("Message removed", "ok"); } catch (e: any) { toast(e.message, "err"); } }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Confirm
        open={purge}
        danger
        requireText="PURGE"
        title="Purge chat room"
        confirmLabel={`Delete ${msgs.length} messages`}
        onClose={() => setPurge(false)}
        onConfirm={async () => {
          try {
            await db.bulkRemove("chat", msgs.map((m) => m.id), "chat.purge");
            toast("Room purged", "ok");
          } catch (e: any) {
            toast(e.message, "err");
          }
          setPurge(false);
        }}
        body="Every message in the community room will be deleted. This is logged against your account."
      />
    </div>
  );
}

/* ----------------------------- reports ----------------------------- */
function Reports() {
  const { can, toast } = useStore();
  const { rows } = useCollection("reports");
  const { rows: comments } = useCollection("comments");
  const list = [...rows].sort((a, b) => (b.at || 0) - (a.at || 0));

  async function resolve(r: Row, status: string) {
    try {
      await db.update("reports", r.id, { status, resolvedAt: Date.now() }, "reports.resolve", r.targetId);
      if (status === "actioned" && r.targetType === "comment") {
        const c = comments.find((x) => x.id === r.targetId);
        if (c) await db.update("comments", c.id, { status: "removed" }, "comments.delete", c.author);
      }
      toast(`Report ${status}`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <div>
      <PageHead title="Reports" desc="Content flagged by members from the public site." />
      <Panel dense>
        <DataTable
          rows={list}
          selectable={false}
          columns={[
            { key: "targetType", label: "Type" },
            { key: "targetId", label: "Target", hideMobile: true, render: (r) => <span className="font-mono text-[10px] text-neutral-500">{r.targetId}</span> },
            { key: "reason", label: "Reason" },
            { key: "at", label: "Reported", hideMobile: true, render: (r) => <span className="font-mono text-[10px] text-neutral-500">{new Date(r.at || 0).toLocaleString()}</span> },
            { key: "status", label: "State", render: (r) => <Badge color={r.status === "open" ? "#f59e0b" : r.status === "actioned" ? "#ef4444" : "#71717a"}>{r.status}</Badge> },
          ]}
          rowActions={(r) =>
            r.status === "open" ? (
              <span className="inline-flex gap-0.5">
                <button className="p-1.5 text-neutral-500 hover:text-emerald-400 disabled:opacity-30" disabled={!can("reports.resolve")} title="Action" onClick={() => resolve(r, "actioned")}><Check size={13} /></button>
                <button className="p-1.5 text-neutral-500 hover:text-neutral-200 disabled:opacity-30" disabled={!can("reports.resolve")} title="Dismiss" onClick={() => resolve(r, "dismissed")}><X size={13} /></button>
              </span>
            ) : null
          }
        />
      </Panel>
    </div>
  );
}

/* --------------------------- moderation ---------------------------- */
function Moderation() {
  const { can, toast, roles } = useStore();
  const { rows: users } = useCollection("users");
  const flagged = users.filter((u) => u.banned || u.muted);
  return (
    <div>
      <PageHead title="Moderation queue" desc="Accounts currently restricted, with one-click reversal." />
      <div className="grid md:grid-cols-2 gap-3">
        {flagged.map((u) => (
          <Panel key={u.id} dense>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-neutral-100">{u.username}</span>
                {u.banned && <Badge color="#ef4444">banned</Badge>}
                {u.muted && <Badge color="#f59e0b">muted</Badge>}
              </div>
              <Kv k="Role" v={highestRole(u.roles || [], roles)?.name || "—"} />
              <Kv k="Since" v={new Date(u.createdAt || 0).toLocaleDateString()} />
              <div className="flex gap-2 pt-1">
                <Btn size="xs" variant="outline" disabled={!can("users.mute")} onClick={async () => { try { await db.update("users", u.id, { muted: !u.muted }, "users.mute", u.username); toast("Updated", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>
                  {u.muted ? "Unmute" : "Mute"}
                </Btn>
                <Btn size="xs" variant="danger" disabled={!can("users.ban")} onClick={async () => { try { await db.update("users", u.id, { banned: !u.banned }, "users.ban", u.username); toast("Updated", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>
                  {u.banned ? "Unban" : "Ban"}
                </Btn>
              </div>
            </div>
          </Panel>
        ))}
        {!flagged.length && <div className="md:col-span-2"><Empty text="No restricted accounts. The community is clean." /></div>}
      </div>
    </div>
  );
}

/* -------------------------- notifications -------------------------- */
function Notifications() {
  const { can, toast, roles } = useStore();
  const { rows } = useCollection("notifications");
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });

  return (
    <div>
      <PageHead title="Notifications" desc="Broadcast notices shown to members in the community area." />
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
        <Panel title="Compose">
          <div className="space-y-3">
            <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Body"><textarea rows={4} className={inputCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <Field label="Audience">
              <select className={inputCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">Everyone</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Btn
              variant="primary"
              icon={<Send size={12} />}
              disabled={!can("notifications.send")}
              onClick={async () => {
                if (!form.title.trim()) return toast("Title required", "err");
                try {
                  await db.create("notifications", { ...form, createdAt: Date.now() }, "notifications.send", form.title);
                  toast("Notification sent", "ok");
                  setForm({ title: "", body: "", audience: "all" });
                } catch (e: any) {
                  toast(e.message, "err");
                }
              }}
            >
              Send notification
            </Btn>
          </div>
        </Panel>
        <Panel title="Sent" dense>
          <DataTable
            rows={[...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))}
            selectable={false}
            columns={[
              { key: "title", label: "Title" },
              { key: "audience", label: "Audience", hideMobile: true, render: (n) => <span className="font-mono text-[10px]">{n.audience === "all" ? "everyone" : roles.find((r) => r.id === n.audience)?.name || n.audience}</span> },
              { key: "createdAt", label: "Sent", hideMobile: true, render: (n) => <span className="font-mono text-[10px] text-neutral-500">{new Date(n.createdAt || 0).toLocaleString()}</span> },
            ]}
            rowActions={(n) => (
              <button className="p-1.5 text-neutral-500 hover:text-red-500 disabled:opacity-30" disabled={!can("notifications.manage")} onClick={async () => { try { await db.remove("notifications", n.id, "notifications.manage", n.title); toast("Retracted", "ok"); } catch (e: any) { toast(e.message, "err"); } }}>
                <Trash2 size={13} />
              </button>
            )}
          />
        </Panel>
      </div>
    </div>
  );
}
