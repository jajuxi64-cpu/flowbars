import { useState } from 'react';
import * as db from '../lib/db';
import { useTable, useDb } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Btn, Panel, Stat, Badge, Select, EmptyState, useToast, useConfirm } from '../ui/kit';

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

function Bars({ data, label }: { data: { k: string; v: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d) => (
          <div key={d.k} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[9px] text-neutral-500 opacity-0 group-hover:opacity-100">{d.v}</span>
            <div className="w-full rounded-t bg-red-600/70" style={{ height: `${(d.v / max) * 100}%` }} />
            <span className="text-[8px] text-neutral-600">{d.k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Overview({ go }: { go: (s: string) => void }) {
  useDb();
  const users = useTable('users');
  const sessions = useTable('sessions');
  const battles = useTable('battles');
  const news = useTable('news');
  const chat = useTable('chat');
  const comments = useTable('comments');
  const reports = useTable('reports');
  const audit = useTable('audit_log');
  const errors = useTable('system_errors');

  const online = sessions.filter((s) => new Date(s.expiresAt) > new Date()).length;
  const newUsers7 = users.filter((u) => new Date(u.createdAt) > daysAgo(7)).length;
  const views = battles.reduce((a, b) => a + Number(b.views || 0), 0);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    const key = d.toISOString().slice(5, 10);
    const count = chat.filter((m) => m.createdAt?.slice(0, 10) === d.toISOString().slice(0, 10)).length;
    return { k: key, v: count };
  });

  const health = [
    { label: 'Database', ok: true, note: `${db.TABLES.reduce((a, t) => a + db.count(t), 0)} records` },
    { label: 'Auth', ok: true, note: `${online} active sessions` },
    { label: 'Errors (24h)', ok: errors.filter((e) => new Date(e.createdAt) > daysAgo(1)).length === 0, note: `${errors.length} logged` },
    { label: 'Open reports', ok: reports.filter((r) => r.status === 'open').length === 0, note: `${reports.filter((r) => r.status === 'open').length} open` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={users.length} sub={`+${newUsers7} in 7 days`} icon="👥" />
        <Stat label="Sessions online" value={online} sub="valid, unexpired" icon="🟢" />
        <Stat label="Battles" value={battles.length} sub={`${battles.filter((b) => b.status === 'published').length} published`} icon="🎤" />
        <Stat label="Battle views" value={views.toLocaleString()} sub="sum of records" icon="👁" />
        <Stat label="News" value={news.length} sub={`${news.filter((n) => n.status === 'draft').length} drafts`} icon="📰" />
        <Stat label="Chat messages" value={chat.length} sub={`${chat.filter((c) => c.deleted).length} removed`} icon="💬" />
        <Stat label="Comments" value={comments.length} sub={`${comments.filter((c) => c.status === 'pending').length} pending`} icon="🗨" />
        <Stat label="Open reports" value={reports.filter((r) => r.status === 'open').length} sub={`${reports.length} total`} icon="🚩" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Community activity" desc="Messages per day, last 7 days">
          <Bars data={week} label="chat messages" />
        </Panel>
        <Panel title="System health">
          <div className="space-y-2">
            {health.map((h) => (
              <div key={h.label} className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950 p-2 text-[11px]">
                <span className="text-neutral-300">{h.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-neutral-500">{h.note}</span>
                  <Badge color={h.ok ? 'green' : 'amber'}>{h.ok ? 'OK' : 'attention'}</Badge>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent admin actions"
        right={
          <Btn size="xs" onClick={() => go('audit')}>
            Full audit log
          </Btn>
        }
      >
        <div className="space-y-1 text-[11px]">
          {[...audit].reverse().slice(0, 12).map((a) => (
            <div key={a.id} className="flex justify-between border-b border-neutral-800/60 py-1">
              <span className="text-neutral-300">
                <b>{a.actor}</b> {a.action} {a.table ? <code className="text-neutral-500">{a.table}</code> : null}
              </span>
              <span className="text-neutral-600">{new Date(a.at).toLocaleString()}</span>
            </div>
          ))}
          {!audit.length && <EmptyState text="No activity recorded yet." />}
        </div>
      </Panel>
    </div>
  );
}

export function Analytics() {
  useDb();
  const events = useTable('analytics_events');
  const battles = useTable('battles');
  const users = useTable('users');
  const chat = useTable('chat');
  const history = useTable('ranking_history');
  const { can } = useAuth();
  const [range, setRange] = useState(7);
  if (!can('analytics.view')) return <EmptyState text="Missing permission analytics.view" />;

  const inRange = (iso: string) => new Date(iso) > daysAgo(range);
  const views = events.filter((e) => e.type === 'pageview' && inRange(e.at));
  const byPage = Object.entries(
    views.reduce<Record<string, number>>((acc, e) => ((acc[e.page] = (acc[e.page] || 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  const perDay = Array.from({ length: range }, (_, i) => {
    const d = daysAgo(range - 1 - i);
    return {
      k: d.toISOString().slice(5, 10),
      v: views.filter((e) => e.at.slice(0, 10) === d.toISOString().slice(0, 10)).length,
    };
  });

  const signups = Array.from({ length: range }, (_, i) => {
    const d = daysAgo(range - 1 - i);
    return {
      k: d.toISOString().slice(5, 10),
      v: users.filter((u) => u.createdAt?.slice(0, 10) === d.toISOString().slice(0, 10)).length,
    };
  });

  return (
    <div className="space-y-4">
      <Panel
        title="Traffic"
        desc="Collected from real page views inside this app (no third-party tracker required)."
        right={
          <Select value={range} onChange={(e) => setRange(Number(e.target.value))} className="w-28">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </Select>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Bars data={perDay} label="page views" />
          <Bars data={signups} label="new registrations" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages">
          <div className="space-y-1 text-[11px]">
            {byPage.map(([p, c]) => (
              <div key={p} className="flex justify-between border-b border-neutral-800/60 py-1">
                <span className="text-neutral-300">{p}</span>
                <span className="text-neutral-500">{c}</span>
              </div>
            ))}
            {!byPage.length && <EmptyState text="No page views recorded yet." />}
          </div>
        </Panel>
        <Panel title="Content performance">
          <div className="space-y-1 text-[11px]">
            {[...battles]
              .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
              .slice(0, 8)
              .map((b) => (
                <div key={b.id} className="flex justify-between border-b border-neutral-800/60 py-1">
                  <span className="text-neutral-300">{b.title}</span>
                  <span className="text-neutral-500">{Number(b.views || 0).toLocaleString()} views</span>
                </div>
              ))}
          </div>
        </Panel>
        <Panel title="Community">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Messages" value={chat.length} />
            <Stat label="Active chatters" value={new Set(chat.map((c) => c.userId)).size} />
          </div>
        </Panel>
        <Panel title="Ranking activity">
          <div className="space-y-1 text-[11px]">
            {[...history].reverse().slice(0, 8).map((h) => (
              <div key={h.id} className="flex justify-between border-b border-neutral-800/60 py-1">
                <span className="text-neutral-300">
                  {h.mc} #{h.from}→#{h.to}
                </span>
                <span className="text-neutral-600">{new Date(h.at).toLocaleDateString()}</span>
              </div>
            ))}
            {!history.length && <EmptyState text="No ranking movements." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function Logs({ kind }: { kind: 'audit' | 'login' | 'security' | 'errors' }) {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [q, setQ] = useState('');
  if (!can('logs.view')) return <EmptyState text="Missing permission logs.view" />;

  const map = {
    audit: { table: 'audit_log' as const, title: 'Audit log', desc: 'Every create/update/delete performed through the dashboard.' },
    login: { table: 'login_history' as const, title: 'Login history', desc: 'Successful and failed authentication attempts.' },
    security: { table: 'security_events' as const, title: 'Security events', desc: 'Denials, rate limits, password events.' },
    errors: { table: 'system_errors' as const, title: 'System errors', desc: 'Runtime errors captured by the global handler.' },
  }[kind];

  const rows = [...db.all(map.table)]
    .reverse()
    .filter((r) => (q ? JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <Panel
      title={map.title}
      desc={map.desc}
      right={
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="w-40 rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs outline-none"
          />
          {can('logs.purge') && (
            <Btn
              size="sm"
              variant="danger"
              onClick={async () => {
                if (!(await confirm('Purge log', `Delete all ${rows.length} entries from ${map.table}?`, 'PURGE'))) return;
                db.truncate(map.table);
                toast.push('Log purged.');
              }}
            >
              Purge
            </Btn>
          )}
        </div>
      }
    >
      {confirmNode}
      <div className="max-h-[520px] space-y-1 overflow-y-auto font-mono text-[10px]">
        {rows.slice(0, 400).map((r) => (
          <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-neutral-800/60 py-1">
            <span className="text-neutral-300">
              {kind === 'audit' && (
                <>
                  <b className="text-red-400">{r.actor}</b> {r.action} {r.table} {r.recordId?.slice(0, 8)}{' '}
                  <span className="text-neutral-600">{r.meta ? JSON.stringify(r.meta).slice(0, 120) : ''}</span>
                </>
              )}
              {kind === 'login' && (
                <>
                  <b className={r.ok ? 'text-emerald-400' : 'text-red-400'}>{r.ok ? 'OK' : 'FAIL'}</b> {r.username} via {r.method}{' '}
                  {r.reason}
                </>
              )}
              {kind === 'security' && (
                <>
                  <b className="text-amber-400">{r.type}</b> {JSON.stringify(r.meta)}
                </>
              )}
              {kind === 'errors' && (
                <>
                  <b className="text-red-400">{r.message}</b> <span className="text-neutral-600">{r.source}</span>
                </>
              )}
            </span>
            <span className="text-neutral-600">{new Date(r.at || r.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {!rows.length && <EmptyState text="Nothing logged." />}
      </div>
    </Panel>
  );
}
