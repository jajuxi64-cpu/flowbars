import { useState } from 'react';
import * as db from '../lib/db';
import { useTable } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { ResourceManager, StatusBadge, downloadFile } from './Resource';
import { Btn, Panel, EmptyState, useToast, useConfirm, Input, Field } from '../ui/kit';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export function NewsAdmin() {
  const cats = useTable('categories');
  return (
    <ResourceManager
      table="news"
      title="News"
      desc="Articles shown on the public news page."
      perms={{ view: 'news.view', create: 'news.create', edit: 'news.edit', delete: 'news.delete' }}
      defaults={{ status: 'draft', date: new Date().toISOString().slice(0, 10), featured: false }}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'featured', label: 'Featured', render: (r) => (r.featured ? '★' : '') },
      ]}
      fields={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'category', label: 'Category', type: 'select', options: cats.map((c) => ({ value: c.name, label: c.name })) },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions },
        { key: 'featured', label: 'Featured', type: 'boolean' },
        { key: 'cover', label: 'Cover image URL', type: 'image', full: true },
        { key: 'tags', label: 'Tags (comma separated)', type: 'tags', full: true },
        { key: 'summary', label: 'Summary', type: 'textarea' },
        { key: 'body', label: 'Body', type: 'textarea' },
      ]}
    />
  );
}

export function BattlesAdmin() {
  const mcs = useTable('mcs');
  const mcOpts = mcs.map((m) => ({ value: m.id, label: m.name }));
  return (
    <ResourceManager
      table="battles"
      title="Battles"
      desc="Matchups, video sources, judges and official decisions."
      perms={{ view: 'battles.view', create: 'battles.create', edit: 'battles.edit', delete: 'battles.delete' }}
      defaults={{ status: 'draft', videoProvider: 'youtube', views: 0, judges: [], date: new Date().toISOString().slice(0, 10) }}
      columns={[
        { key: 'title', label: 'Battle' },
        { key: 'event', label: 'Event' },
        { key: 'date', label: 'Date' },
        { key: 'score', label: 'Score' },
        { key: 'winner', label: 'Winner', render: (r) => db.find('mcs', r.winner)?.name || '—' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'views', label: 'Views', render: (r) => Number(r.views || 0).toLocaleString() },
      ]}
      fields={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'event', label: 'Event name' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'mc1', label: 'MC 1', type: 'ref', refTable: 'mcs' },
        { key: 'mc2', label: 'MC 2', type: 'ref', refTable: 'mcs' },
        { key: 'winner', label: 'Winner', type: 'select', options: mcOpts },
        { key: 'score', label: 'Score (e.g. 3 - 0)' },
        { key: 'videoProvider', label: 'Video provider', type: 'select', options: [{ value: 'youtube', label: 'YouTube' }] },
        { key: 'videoId', label: 'Video ID', hint: 'The part after ?v= in a YouTube URL' },
        { key: 'views', label: 'Views', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions },
        { key: 'featured', label: 'Featured on homepage', type: 'boolean' },
        { key: 'judges', label: 'Judges (comma separated)', type: 'tags', full: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function EventsAdmin() {
  return (
    <ResourceManager
      table="events"
      title="Events"
      desc="Live dates, venues and capacities."
      perms={{ view: 'events.view', create: 'events.create', edit: 'events.edit', delete: 'events.delete' }}
      defaults={{ status: 'upcoming' }}
      columns={[
        { key: 'title', label: 'Event' },
        { key: 'date', label: 'Date' },
        { key: 'venue', label: 'Venue' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: 'title', label: 'Title' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'time', label: 'Time' },
        { key: 'venue', label: 'Venue' },
        { key: 'city', label: 'City' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'live', label: 'Live' },
            { value: 'finished', label: 'Finished' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        { key: 'ticketUrl', label: 'Ticket URL' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function McsAdmin() {
  return (
    <ResourceManager
      table="mcs"
      title="MCs"
      desc="The competitor roster."
      perms={{ view: 'mcs.view', create: 'mcs.create', edit: 'mcs.edit', delete: 'mcs.delete' }}
      defaults={{ wins: 0, losses: 0, draws: 0, rank: db.count('mcs') + 1, active: true }}
      columns={[
        { key: 'rank', label: '#', width: '48px' },
        {
          key: 'name',
          label: 'MC',
          render: (r) => (
            <span className="flex items-center gap-2">
              <img src={r.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              {r.name}
            </span>
          ),
        },
        { key: 'wins', label: 'W' },
        { key: 'losses', label: 'L' },
        { key: 'draws', label: 'D' },
        { key: 'streak', label: 'Streak' },
        { key: 'active', label: 'Active', render: (r) => (r.active ? 'yes' : 'no') },
      ]}
      fields={[
        { key: 'name', label: 'Name' },
        { key: 'rank', label: 'Rank', type: 'number' },
        { key: 'wins', label: 'Wins', type: 'number' },
        { key: 'losses', label: 'Losses', type: 'number' },
        { key: 'draws', label: 'Draws', type: 'number' },
        { key: 'streak', label: 'Streak' },
        { key: 'country', label: 'Country' },
        { key: 'active', label: 'Active', type: 'boolean' },
        { key: 'avatar', label: 'Avatar URL', type: 'image', full: true },
        { key: 'bio', label: 'Bio', type: 'textarea' },
      ]}
    />
  );
}

export function RankingsAdmin() {
  const mcs = [...useTable('mcs')].sort((a, b) => a.rank - b.rank);
  const battles = useTable('battles');
  const history = useTable('ranking_history');
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();

  if (!can('rankings.view')) return <EmptyState text="Missing permission rankings.view" />;

  const move = (id: string, dir: -1 | 1) => {
    if (!can('rankings.manage')) return toast.push('Permission denied: rankings.manage', 'err');
    const idx = mcs.findIndex((m) => m.id === id);
    const swap = mcs[idx + dir];
    if (!swap) return;
    const a = mcs[idx];
    db.update('mcs', a.id, { rank: swap.rank });
    db.update('mcs', swap.id, { rank: a.rank });
    db.insert('ranking_history', { mc: a.name, from: a.rank, to: swap.rank, at: new Date().toISOString(), reason: 'manual' });
  };

  const recompute = async () => {
    if (!can('rankings.manage')) return toast.push('Permission denied: rankings.manage', 'err');
    const ok = await confirm(
      'Recompute rankings',
      'Recalculates every MC record from published battle results and reorders the ladder by win rate. Current ranks will be overwritten (history is kept).',
    );
    if (!ok) return;
    const stats: Record<string, { w: number; l: number; d: number }> = {};
    mcs.forEach((m) => (stats[m.id] = { w: 0, l: 0, d: 0 }));
    battles
      .filter((b) => b.status === 'published')
      .forEach((b) => {
        [b.mc1, b.mc2].forEach((id) => {
          if (!id || !stats[id]) return;
          if (!b.winner) stats[id].d++;
          else if (b.winner === id) stats[id].w++;
          else stats[id].l++;
        });
      });
    const ordered = [...mcs].sort((a, b) => {
      const ra = rate(stats[a.id]);
      const rb = rate(stats[b.id]);
      return rb - ra || stats[b.id].w - stats[a.id].w;
    });
    ordered.forEach((m, i) => {
      const s = stats[m.id];
      if (m.rank !== i + 1)
        db.insert('ranking_history', { mc: m.name, from: m.rank, to: i + 1, at: new Date().toISOString(), reason: 'recompute' });
      db.update('mcs', m.id, { rank: i + 1, wins: s.w, losses: s.l, draws: s.d });
    });
    toast.push('Rankings recomputed from battle data.');
  };

  const rate = (s: { w: number; l: number; d: number }) => {
    const t = s.w + s.l + s.d;
    return t ? s.w / t : 0;
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <Panel
        title="Ladder"
        desc="Drag-free reordering with full history. Recompute derives records directly from published battles."
        right={
          <Btn size="sm" variant="primary" onClick={recompute}>
            Recompute from battles
          </Btn>
        }
      >
        <div className="space-y-1">
          {mcs.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-2">
              <span className="w-8 text-center text-sm font-black">{m.rank}</span>
              <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              <span className="flex-1 text-xs font-bold">{m.name}</span>
              <span className="text-[11px] text-neutral-500">
                {m.wins}W · {m.losses}L · {m.draws || 0}D
              </span>
              <Btn size="xs" disabled={i === 0} onClick={() => move(m.id, -1)}>
                ↑
              </Btn>
              <Btn size="xs" disabled={i === mcs.length - 1} onClick={() => move(m.id, 1)}>
                ↓
              </Btn>
            </div>
          ))}
        </div>
      </Panel>
      {can('rankings.history') && (
        <Panel title="Ranking history" desc={`${history.length} recorded movements`}>
          <div className="max-h-72 space-y-1 overflow-y-auto text-[11px] text-neutral-400">
            {[...history].reverse().slice(0, 100).map((h) => (
              <div key={h.id} className="flex justify-between border-b border-neutral-800/60 py-1">
                <span>
                  {h.mc}: #{h.from} → #{h.to}
                </span>
                <span className="text-neutral-600">
                  {h.reason} · {new Date(h.at).toLocaleString()}
                </span>
              </div>
            ))}
            {!history.length && <EmptyState text="No movements yet." />}
          </div>
        </Panel>
      )}
    </div>
  );
}

export function PagesAdmin() {
  return (
    <ResourceManager
      table="pages"
      title="Pages"
      desc="Static pages linked in the footer."
      perms={{ view: 'pages.view', create: 'pages.create', edit: 'pages.edit', delete: 'pages.delete' }}
      defaults={{ status: 'draft' }}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions },
        { key: 'body', label: 'Body', type: 'textarea' },
      ]}
    />
  );
}

export function TaxonomyAdmin() {
  return (
    <div className="space-y-4">
      <ResourceManager
        table="categories"
        title="Categories"
        perms={{ view: 'news.view', create: 'taxonomy.manage', edit: 'taxonomy.manage', delete: 'taxonomy.manage' }}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
          {
            key: 'color',
            label: 'Colour',
            render: (r) => <span className="inline-block h-4 w-8 rounded" style={{ background: r.color }} />,
          },
          { key: 'used', label: 'Used by', render: (r) => db.all('news').filter((n) => n.category === r.name).length },
        ]}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
          { key: 'color', label: 'Colour hex' },
        ]}
      />
      <ResourceManager
        table="tags"
        title="Tags"
        perms={{ view: 'news.view', create: 'taxonomy.manage', edit: 'taxonomy.manage', delete: 'taxonomy.manage' }}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
        ]}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
        ]}
      />
    </div>
  );
}

export function MediaAdmin() {
  const media = useTable('media');
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [busy, setBusy] = useState(false);

  if (!can('media.view')) return <EmptyState text="Missing permission media.view" />;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    if (!can('media.upload')) return toast.push('Permission denied: media.upload', 'err');
    setBusy(true);
    for (const file of Array.from(files)) {
      if (file.size > 3_000_000) {
        toast.push(`${file.name} is larger than 3 MB and was skipped.`, 'err');
        continue;
      }
      const dataUrl = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.readAsDataURL(file);
      });
      db.insert('media', { name: file.name, type: file.type, size: file.size, url: dataUrl });
    }
    setBusy(false);
    toast.push('Upload complete.');
  };

  const totalBytes = media.reduce((a, m) => a + (m.size || 0), 0);

  return (
    <Panel
      title="Media library"
      desc={`${media.length} files · ${(totalBytes / 1024 / 1024).toFixed(2)} MB stored in the browser database`}
      right={
        <label className="cursor-pointer rounded-md border border-red-500 bg-red-600 px-3 py-2 text-xs font-semibold text-white">
          {busy ? 'Uploading…' : 'Upload files'}
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
      }
    >
      {confirmNode}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {media.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            <img src={m.url} alt={m.name} className="h-24 w-full object-cover" />
            <div className="space-y-1 p-2">
              <div className="truncate text-[10px] text-neutral-400">{m.name}</div>
              <div className="flex gap-1">
                <Btn
                  size="xs"
                  onClick={() => {
                    navigator.clipboard?.writeText(m.url);
                    toast.push('URL copied.');
                  }}
                >
                  Copy
                </Btn>
                <Btn
                  size="xs"
                  variant="danger"
                  onClick={async () => {
                    if (!can('media.delete')) return toast.push('Permission denied: media.delete', 'err');
                    if (await confirm('Delete file', `Delete ${m.name}?`)) db.remove('media', m.id);
                  }}
                >
                  Del
                </Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!media.length && <EmptyState text="No media uploaded yet." />}
    </Panel>
  );
}

export function ExportButton({ table }: { table: db.TableName }) {
  return (
    <Btn size="xs" onClick={() => downloadFile(`${table}.json`, db.exportJSON([table]))}>
      Export
    </Btn>
  );
}

export { Input, Field };
