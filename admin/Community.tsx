import { useState } from 'react';
import * as db from '../lib/db';
import { useTable } from '../lib/hooks';
import { useAuth, User } from '../lib/auth';
import { hashPassword, randomToken } from '../lib/crypto';
import { getSettings, saveSettings } from '../lib/seed';
import { Btn, Panel, Input, Field, Badge, Modal, Toggle, useToast, useConfirm, EmptyState, Select } from '../ui/kit';
import { StatusBadge } from './Resource';

export function UsersAdmin() {
  const users = useTable<User>('users');
  const roles = useTable('roles');
  const sessions = useTable('sessions');
  const { can, user: me } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'role_member' });

  if (!can('users.view')) return <EmptyState text="Missing permission users.view" />;

  const myTop = Math.max(0, ...roles.filter((r) => (me?.roles || []).includes(r.id)).map((r) => r.position));
  const targetTop = (u: User) => Math.max(0, ...roles.filter((r) => (u.roles || []).includes(r.id)).map((r) => r.position));
  const outranks = (u: User) => can('*') || myTop > targetTop(u);

  const list = users.filter((u) =>
    (u.username + ' ' + (u.email || '')).toLowerCase().includes(q.toLowerCase()),
  );

  const guard = (perm: string, u: User) => {
    if (!can(perm)) {
      toast.push('Permission denied: ' + perm, 'err');
      return false;
    }
    if (!outranks(u)) {
      toast.push('Role hierarchy: you cannot act on an equal or higher role.', 'err');
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <Panel
        title="Users"
        desc={`${users.length} accounts · ${sessions.length} active sessions`}
        right={
          <div className="flex gap-2">
            <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} className="w-40" />
            {can('users.create') && (
              <Btn size="sm" variant="primary" onClick={() => setCreating(true)}>
                + New user
              </Btn>
            )}
          </div>
        }
      >
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="p-2">User</th>
                <th className="p-2">Roles</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Status</th>
                <th className="p-2">Last seen</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-neutral-800/80">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-neutral-100">{u.username}</div>
                        <div className="text-[10px] text-neutral-500">{u.email || 'no email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).map((rid) => {
                        const r = db.find('roles', rid);
                        return r ? (
                          <span
                            key={rid}
                            className="rounded border px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ borderColor: r.color, color: r.color }}
                          >
                            {r.icon} {r.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="p-2 text-neutral-400">{u.provider}</td>
                  <td className="p-2">
                    {u.banned ? <Badge color="red">banned</Badge> : u.muted ? <Badge color="amber">muted</Badge> : <Badge color="green">active</Badge>}
                  </td>
                  <td className="p-2 text-[10px] text-neutral-500">
                    {u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '—'}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right">
                    <Btn size="xs" onClick={() => setEditing(u)}>
                      Manage
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <EmptyState text="No users." />}
      </Panel>

      {creating && (
        <Modal
          open
          onClose={() => setCreating(false)}
          title="Create user"
          footer={
            <Btn
              variant="primary"
              onClick={async () => {
                if (!newUser.username || newUser.password.length < 8)
                  return toast.push('Username and a password of 8+ characters are required.', 'err');
                if (users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase()))
                  return toast.push('Username taken.', 'err');
                db.insert('users', {
                  username: newUser.username,
                  email: newUser.email,
                  passwordHash: await hashPassword(newUser.password),
                  provider: 'password',
                  roles: [newUser.role],
                  avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${newUser.username}`,
                  banned: false,
                });
                setCreating(false);
                toast.push('User created.');
              }}
            >
              Create
            </Btn>
          }
        >
          <div className="space-y-3">
            <Field label="Username">
              <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </Field>
            <Field label="Temporary password">
              <Input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Manage · ${editing.username}`} wide>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Field label="Username">
                <Input
                  defaultValue={editing.username}
                  onBlur={(e) => can('users.edit') && db.update('users', editing.id, { username: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  defaultValue={editing.email}
                  onBlur={(e) => can('users.edit') && db.update('users', editing.id, { email: e.target.value })}
                />
              </Field>
              <Field label="Bio">
                <Input
                  defaultValue={editing.bio}
                  onBlur={(e) => can('users.edit') && db.update('users', editing.id, { bio: e.target.value })}
                />
              </Field>
              <Field label="Avatar URL">
                <Input
                  defaultValue={editing.avatar}
                  onBlur={(e) => can('users.edit') && db.update('users', editing.id, { avatar: e.target.value })}
                />
              </Field>
            </div>

            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Roles</span>
                <div className="space-y-1">
                  {roles.map((r) => {
                    const has = (editing.roles || []).includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          if (!guard('users.roles', editing)) return;
                          if (r.position >= myTop && !can('*'))
                            return toast.push('You cannot grant a role at or above your own.', 'err');
                          const roleList = has
                            ? (editing.roles || []).filter((x: string) => x !== r.id)
                            : [...(editing.roles || []), r.id];
                          db.update('users', editing.id, { roles: roleList });
                          setEditing({ ...editing, roles: roleList });
                        }}
                        className="flex w-full items-center justify-between rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-[11px] hover:border-neutral-700"
                      >
                        <span style={{ color: r.color }}>
                          {r.icon} {r.name} <span className="text-neutral-600">· pos {r.position}</span>
                        </span>
                        <span>{has ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Btn
                  size="sm"
                  onClick={() => {
                    if (!guard('users.mute', editing)) return;
                    db.update('users', editing.id, { muted: !editing.muted });
                    setEditing({ ...editing, muted: !editing.muted });
                    toast.push(editing.muted ? 'Unmuted.' : 'Muted.');
                  }}
                >
                  {editing.muted ? 'Unmute' : 'Mute'}
                </Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (!guard('users.ban', editing)) return;
                    if (!(await confirm('Ban user', `Ban ${editing.username}? All sessions will be revoked.`))) return;
                    db.update('users', editing.id, { banned: !editing.banned });
                    db.all('sessions')
                      .filter((s) => s.userId === editing.id)
                      .forEach((s) => db.remove('sessions', s.id));
                    setEditing({ ...editing, banned: !editing.banned });
                    toast.push('Ban state updated.');
                  }}
                >
                  {editing.banned ? 'Unban' : 'Ban'}
                </Btn>
                <Btn
                  size="sm"
                  onClick={() => {
                    if (!guard('users.sessions.revoke', editing)) return;
                    const s = db.all('sessions').filter((x) => x.userId === editing.id);
                    s.forEach((x) => db.remove('sessions', x.id));
                    toast.push(`${s.length} session(s) revoked.`);
                  }}
                >
                  Revoke sessions
                </Btn>
                <Btn
                  size="sm"
                  onClick={() => {
                    if (!guard('users.password.reset', editing)) return;
                    const token = randomToken(12);
                    db.update('users', editing.id, {
                      resetToken: token,
                      resetExpires: new Date(Date.now() + 3600_000).toISOString(),
                      mustChangePassword: true,
                    });
                    navigator.clipboard?.writeText(token);
                    toast.push('Reset token created and copied: ' + token);
                  }}
                >
                  Force reset
                </Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  className="col-span-2"
                  onClick={async () => {
                    if (!guard('users.delete', editing)) return;
                    if (!(await confirm('Delete user', `Permanently delete ${editing.username}?`, 'DELETE'))) return;
                    db.remove('users', editing.id);
                    setEditing(null);
                    toast.push('User deleted.');
                  }}
                >
                  Delete account
                </Btn>
              </div>

              <div className="rounded border border-neutral-800 bg-neutral-950 p-2 text-[10px] text-neutral-500">
                Sessions: {sessions.filter((s) => s.userId === editing.id).length} · Comments:{' '}
                {db.all('comments').filter((c) => c.userId === editing.id).length} · Messages:{' '}
                {db.all('chat').filter((c) => c.userId === editing.id).length}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function CommentsAdmin() {
  const comments = useTable('comments');
  const { can } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  if (!can('comments.view')) return <EmptyState text="Missing permission comments.view" />;
  const list = comments.filter((c) => filter === 'all' || c.status === filter);
  return (
    <Panel
      title="Comments"
      desc={`${comments.length} total`}
      right={
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-32">
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="hidden">Hidden</option>
        </Select>
      }
    >
      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded border border-neutral-800 bg-neutral-950 p-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold text-neutral-200">{c.username}</span>
                <StatusBadge status={c.status} />
                <span className="text-neutral-600">{c.target}</span>
              </div>
              <p className="text-xs text-neutral-300">{c.body}</p>
            </div>
            <div className="flex gap-1">
              {can('comments.moderate') && (
                <>
                  <Btn size="xs" onClick={() => db.update('comments', c.id, { status: 'approved' })}>
                    Approve
                  </Btn>
                  <Btn size="xs" onClick={() => db.update('comments', c.id, { status: 'hidden' })}>
                    Hide
                  </Btn>
                </>
              )}
              {can('comments.delete') && (
                <Btn
                  size="xs"
                  variant="danger"
                  onClick={() => {
                    db.remove('comments', c.id);
                    toast.push('Comment deleted.');
                  }}
                >
                  Del
                </Btn>
              )}
            </div>
          </div>
        ))}
        {!list.length && <EmptyState text="No comments." />}
      </div>
    </Panel>
  );
}

export function ChatAdmin() {
  const chat = useTable('chat');
  const { can, user } = useAuth();
  const toast = useToast();
  const settings = getSettings();
  const [announce, setAnnounce] = useState('');
  if (!can('chat.view')) return <EmptyState text="Missing permission chat.view" />;
  return (
    <div className="space-y-4">
      <Panel title="Chat controls">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Lock chat"
            hint="Blocks all new public messages"
            checked={settings.site.chatLocked}
            onChange={(v) => {
              if (!can('chat.lock')) return toast.push('Permission denied: chat.lock', 'err');
              saveSettings({ site: { ...settings.site, chatLocked: v } });
            }}
          />
          <Field label="Slow mode (seconds between messages)">
            <Input
              type="number"
              defaultValue={settings.site.chatSlowModeSeconds}
              onBlur={(e) => {
                if (!can('chat.lock')) return toast.push('Permission denied: chat.lock', 'err');
                saveSettings({ site: { ...settings.site, chatSlowModeSeconds: Number(e.target.value) } });
                toast.push('Slow mode updated.');
              }}
            />
          </Field>
          {can('chat.announce') && (
            <div className="sm:col-span-2 flex gap-2">
              <Input value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="System announcement…" />
              <Btn
                variant="primary"
                onClick={() => {
                  if (!announce.trim()) return;
                  db.insert('chat', {
                    text: '📢 ' + announce,
                    username: 'SYSTEM',
                    userId: user?.id,
                    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=system',
                    system: true,
                    deleted: false,
                  });
                  setAnnounce('');
                  toast.push('Announcement posted.');
                }}
              >
                Post
              </Btn>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Message log" desc={`${chat.length} messages`}>
        <div className="max-h-[420px] space-y-1 overflow-y-auto">
          {[...chat].reverse().map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 border-b border-neutral-800/60 py-1 text-[11px]">
              <span className={m.deleted ? 'text-neutral-600 line-through' : 'text-neutral-300'}>
                <b className="text-neutral-100">{m.username}</b> {m.text}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-neutral-600">{new Date(m.createdAt).toLocaleTimeString()}</span>
                {can('chat.moderate') && (
                  <Btn size="xs" variant="danger" onClick={() => db.update('chat', m.id, { deleted: !m.deleted })}>
                    {m.deleted ? 'Restore' : 'Remove'}
                  </Btn>
                )}
              </span>
            </div>
          ))}
          {!chat.length && <EmptyState text="No chat messages." />}
        </div>
      </Panel>
    </div>
  );
}

export function ReportsAdmin() {
  const reports = useTable('reports');
  const { can } = useAuth();
  const toast = useToast();
  if (!can('reports.view')) return <EmptyState text="Missing permission reports.view" />;
  return (
    <Panel title="Reports" desc={`${reports.filter((r) => r.status === 'open').length} open`}>
      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950 p-2 text-[11px]">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <span className="text-neutral-300">{r.target}</span>
              </div>
              <div className="text-neutral-500">
                {r.reason} — by {r.reporter}
              </div>
            </div>
            {can('reports.resolve') && r.status === 'open' && (
              <div className="flex gap-1">
                <Btn
                  size="xs"
                  onClick={() => {
                    db.update('reports', r.id, { status: 'resolved' });
                    const [kind, id] = String(r.target).split(':');
                    if (kind === 'comment') db.update('comments', id, { status: 'hidden' });
                    toast.push('Resolved and content hidden.');
                  }}
                >
                  Resolve + hide
                </Btn>
                <Btn size="xs" onClick={() => db.update('reports', r.id, { status: 'dismissed' })}>
                  Dismiss
                </Btn>
              </div>
            )}
          </div>
        ))}
        {!reports.length && <EmptyState text="No reports." />}
      </div>
    </Panel>
  );
}

export function NotificationsAdmin() {
  const notes = useTable('notifications');
  const users = useTable('users');
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  if (!can('notifications.send')) return <EmptyState text="Missing permission notifications.send" />;
  return (
    <div className="space-y-4">
      <Panel title="Send notification" desc="Delivered to member accounts inside the platform.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">All users ({users.length})</option>
              <option value="staff">Staff only</option>
            </Select>
          </Field>
          <Field label="Body" className="sm:col-span-2">
            <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
        </div>
        <Btn
          className="mt-3"
          variant="primary"
          onClick={() => {
            if (!form.title) return;
            const targets =
              form.audience === 'all'
                ? users
                : users.filter((u) => (u.roles || []).some((r: string) => r !== 'role_member'));
            targets.forEach((u) =>
              db.insert('notifications', { title: form.title, body: form.body, userId: u.id, read: false }),
            );
            toast.push(`Sent to ${targets.length} user(s).`);
            setForm({ title: '', body: '', audience: 'all' });
          }}
        >
          Send
        </Btn>
      </Panel>
      <Panel title="Sent notifications" desc={`${notes.length} records`}>
        <div className="max-h-72 space-y-1 overflow-y-auto text-[11px]">
          {[...notes].reverse().slice(0, 80).map((n) => (
            <div key={n.id} className="flex justify-between border-b border-neutral-800/60 py-1">
              <span className="text-neutral-300">
                <b>{n.title}</b> — {n.body}
              </span>
              <span className="text-neutral-600">{db.find('users', n.userId)?.username}</span>
            </div>
          ))}
          {!notes.length && <EmptyState text="Nothing sent yet." />}
        </div>
      </Panel>
    </div>
  );
}
