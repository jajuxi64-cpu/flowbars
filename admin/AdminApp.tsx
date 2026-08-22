import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useDb } from '../lib/hooks';
import { getSettings } from '../lib/seed';
import { Btn, Input, Field, Badge, useToast, EmptyState } from '../ui/kit';
import { cn } from '../utils/cn';
import * as db from '../lib/db';
import { Overview, Analytics, Logs } from './Insights';
import { NewsAdmin, BattlesAdmin, EventsAdmin, McsAdmin, RankingsAdmin, PagesAdmin, TaxonomyAdmin, MediaAdmin } from './Content';
import { UsersAdmin, CommentsAdmin, ChatAdmin, ReportsAdmin, NotificationsAdmin } from './Community';
import { DesignMode } from './Appearance';
import { RolesAdmin, DatabaseAdmin, SettingsAdmin, IntegrationsAdmin, SecurityAdmin, StorageCacheAdmin, EmailAdmin, ApiAdmin } from './System';

type Item = { id: string; label: string; perm: string; icon: string };
type Group = { group: string; items: Item[] };

const NAV: Group[] = [
  {
    group: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview', perm: 'admin.overview.view', icon: '📊' },
      { id: 'analytics', label: 'Analytics', perm: 'analytics.view', icon: '📈' },
    ],
  },
  {
    group: 'Content',
    items: [
      { id: 'news', label: 'News', perm: 'news.view', icon: '📰' },
      { id: 'battles', label: 'Battles', perm: 'battles.view', icon: '🎤' },
      { id: 'events', label: 'Events', perm: 'events.view', icon: '📅' },
      { id: 'mcs', label: 'MCs', perm: 'mcs.view', icon: '🧑‍🎤' },
      { id: 'rankings', label: 'Rankings', perm: 'rankings.view', icon: '🏆' },
      { id: 'pages', label: 'Pages', perm: 'pages.view', icon: '📄' },
      { id: 'taxonomy', label: 'Categories & tags', perm: 'news.view', icon: '🏷' },
      { id: 'media', label: 'Media', perm: 'media.view', icon: '🖼' },
    ],
  },
  {
    group: 'Community',
    items: [
      { id: 'users', label: 'Users', perm: 'users.view', icon: '👥' },
      { id: 'comments', label: 'Comments', perm: 'comments.view', icon: '🗨' },
      { id: 'chat', label: 'Chat', perm: 'chat.view', icon: '💬' },
      { id: 'reports', label: 'Reports', perm: 'reports.view', icon: '🚩' },
      { id: 'notifications', label: 'Notifications', perm: 'notifications.send', icon: '🔔' },
    ],
  },
  {
    group: 'Appearance',
    items: [{ id: 'design', label: 'Design mode', perm: 'design.view', icon: '🎨' }],
  },
  {
    group: 'System',
    items: [
      { id: 'roles', label: 'Roles & permissions', perm: 'roles.view', icon: '🛡' },
      { id: 'database', label: 'Database', perm: 'db.view', icon: '🗄' },
      { id: 'settings', label: 'Settings', perm: 'settings.view', icon: '⚙️' },
      { id: 'integrations', label: 'Integrations', perm: 'integrations.manage', icon: '🔌' },
      { id: 'api', label: 'API & config', perm: 'integrations.manage', icon: '🧩' },
      { id: 'storage', label: 'Storage & cache', perm: 'cache.manage', icon: '💾' },
      { id: 'email', label: 'Email', perm: 'email.manage', icon: '✉️' },
      { id: 'security', label: 'Security', perm: 'security.manage', icon: '🔐' },
    ],
  },
  {
    group: 'Logs',
    items: [
      { id: 'audit', label: 'Audit log', perm: 'logs.view', icon: '📜' },
      { id: 'login', label: 'Login history', perm: 'logs.view', icon: '🔑' },
      { id: 'security-log', label: 'Security events', perm: 'logs.view', icon: '⚠️' },
      { id: 'errors', label: 'System errors', perm: 'logs.view', icon: '🐛' },
    ],
  },
];

export function AdminApp({ exitToSite }: { exitToSite: () => void }) {
  useDb();
  const { user, can, ready, signOut } = useAuth();
  const [section, setSection] = useState('overview');
  const [open, setOpen] = useState(false);

  if (!ready) return <Splash text="Loading…" />;
  if (db.count('users') === 0) return <OwnerSetup />;
  if (!user) return <AdminLogin exitToSite={exitToSite} />;
  if (!can('admin.access'))
    return (
      <Splash
        text={`Signed in as ${user.username}, but your roles do not grant "admin.access". This attempt has been logged.`}
        action={
          <div className="flex gap-2">
            <Btn onClick={exitToSite}>Back to site</Btn>
            <Btn variant="danger" onClick={signOut}>
              Sign out
            </Btn>
          </div>
        }
      />
    );

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length);
  const current = groups.flatMap((g) => g.items).find((i) => i.id === section);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/90 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button className="rounded p-1.5 text-neutral-400 lg:hidden" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <span className="grid h-8 w-8 place-items-center rounded bg-red-600 text-[11px] font-black text-white">F&B</span>
          <div className="leading-tight">
            <div className="text-[11px] font-black uppercase tracking-widest">Control center</div>
            <div className="text-[9px] text-neutral-500">{getSettings().site.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">{can('*') ? 'OWNER' : 'STAFF'}</Badge>
          <span className="hidden text-[11px] text-neutral-400 sm:inline">{user.username}</span>
          <Btn size="xs" onClick={exitToSite}>
            View site
          </Btn>
          <Btn size="xs" variant="danger" onClick={signOut}>
            Sign out
          </Btn>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            'fixed inset-y-14 left-0 z-40 w-60 overflow-y-auto border-r border-neutral-800 bg-neutral-900 p-3 transition-transform lg:static lg:z-auto lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {groups.map((g) => (
            <div key={g.group} className="mb-4">
              <div className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">{g.group}</div>
              {g.items.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    setSection(i.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] font-medium',
                    section === i.id ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
                  )}
                >
                  <span className="w-4 text-center">{i.icon}</span>
                  {i.label}
                </button>
              ))}
            </div>
          ))}
          <div className="px-2 pb-6 text-[9px] leading-relaxed text-neutral-600">
            Local-first build · every action is audit-logged and permission-checked.
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

        <main className="min-w-0 flex-1 p-3 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-black uppercase tracking-widest">{current?.label || 'Dashboard'}</h1>
            <span className="text-[10px] text-neutral-600">
              {db.TABLES.reduce((a, t) => a + db.count(t), 0)} records · {db.count('audit_log')} audited actions
            </span>
          </div>
          <Section id={section} go={setSection} />
        </main>
      </div>
    </div>
  );
}

function Section({ id, go }: { id: string; go: (s: string) => void }) {
  switch (id) {
    case 'overview':
      return <Overview go={go} />;
    case 'analytics':
      return <Analytics />;
    case 'news':
      return <NewsAdmin />;
    case 'battles':
      return <BattlesAdmin />;
    case 'events':
      return <EventsAdmin />;
    case 'mcs':
      return <McsAdmin />;
    case 'rankings':
      return <RankingsAdmin />;
    case 'pages':
      return <PagesAdmin />;
    case 'taxonomy':
      return <TaxonomyAdmin />;
    case 'media':
      return <MediaAdmin />;
    case 'users':
      return <UsersAdmin />;
    case 'comments':
      return <CommentsAdmin />;
    case 'chat':
      return <ChatAdmin />;
    case 'reports':
      return <ReportsAdmin />;
    case 'notifications':
      return <NotificationsAdmin />;
    case 'design':
      return <DesignMode />;
    case 'roles':
      return <RolesAdmin />;
    case 'database':
      return <DatabaseAdmin />;
    case 'settings':
      return <SettingsAdmin />;
    case 'integrations':
      return <IntegrationsAdmin />;
    case 'api':
      return <ApiAdmin />;
    case 'storage':
      return <StorageCacheAdmin />;
    case 'email':
      return <EmailAdmin />;
    case 'security':
      return <SecurityAdmin />;
    case 'audit':
      return <Logs kind="audit" />;
    case 'login':
      return <Logs kind="login" />;
    case 'security-log':
      return <Logs kind="security" />;
    case 'errors':
      return <Logs kind="errors" />;
    default:
      return <EmptyState text="Unknown section." />;
  }
}

function Splash({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-center text-neutral-300">
      <div className="max-w-md space-y-4">
        <div className="text-3xl">🔐</div>
        <p className="text-sm leading-relaxed">{text}</p>
        {action}
      </div>
    </div>
  );
}

function OwnerSetup() {
  const { signUp } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 p-4">
      <form
        className="w-full max-w-md space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await signUp(f);
            toast.push('Owner account created. You now hold god-mode.');
          } catch (e: any) {
            setErr(e.message);
          }
        }}
      >
        <div>
          <h1 className="text-xl font-black uppercase text-neutral-100">First-run owner setup</h1>
          <p className="mt-1 text-[11px] text-neutral-500">
            No accounts exist yet. The first account created becomes the Owner with the god-mode role. This screen can
            never appear again once an owner exists.
          </p>
        </div>
        {err && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-300">{err}</p>}
        <Field label="Username">
          <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Password" hint="Minimum 10 characters with upper, lower, digit and symbol.">
          <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        </Field>
        <Btn variant="primary" className="w-full py-2.5">
          Create owner account
        </Btn>
      </form>
    </div>
  );
}

function AdminLogin({ exitToSite }: { exitToSite: () => void }) {
  const { signIn } = useAuth();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 p-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          try {
            await signIn(f.username, f.password);
          } catch (e: any) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-lg font-black uppercase text-neutral-100">Staff sign-in</h1>
        <p className="text-[11px] text-neutral-500">
          Restricted area. Failed attempts are rate-limited and recorded with timestamp and user agent.
        </p>
        {err && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-300">{err}</p>}
        <Field label="Username or email">
          <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        </Field>
        <Btn variant="primary" className="w-full py-2.5" disabled={busy}>
          Sign in
        </Btn>
        <button type="button" onClick={exitToSite} className="w-full text-[11px] text-neutral-500 hover:text-white">
          ← Back to public site
        </button>
      </form>
    </div>
  );
}
