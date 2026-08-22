import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import * as db from '../lib/db';
import { useTable, useDb } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { DesignConfig, designToCssVars, getDesign } from '../lib/design';
import { getSettings } from '../lib/seed';
import { Btn, Input, Field, useToast } from '../ui/kit';

/* ---------------------------------- shell --------------------------------- */

export function PublicSite({
  designOverride,
  previewMode,
  initialPage,
}: {
  designOverride?: DesignConfig;
  previewMode?: boolean;
  initialPage?: string;
}) {
  useDb();
  const design = designOverride || getDesign('published');
  const settings = getSettings();
  const [page, setPage] = useState(initialPage || 'home');
  const [param, setParam] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, signOut, can } = useAuth();
  const vars = designToCssVars(design);

  const go = (p: string, id?: string) => {
    setPage(p);
    setParam(id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (previewMode) return;
    db.insert('analytics_events', { type: 'pageview', page, at: new Date().toISOString() });
  }, [page, previewMode]);

  if (settings.site.maintenanceMode && !can('admin.access')) {
    return (
      <div
        style={vars as React.CSSProperties}
        className="flex min-h-screen items-center justify-center p-8 text-center"
      >
        <div>
          <div className="text-5xl">🚧</div>
          <h1 className="mt-4 text-2xl font-black uppercase">{settings.site.name}</h1>
          <p className="mt-2 text-sm opacity-70">{settings.site.maintenanceMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ ...(vars as React.CSSProperties) }}
      className="fb-public min-h-screen"
    >
      <style>{`
        .fb-public{background:var(--fb-bg);color:var(--fb-text);font-family:var(--fb-font-body);font-size:var(--fb-font-size)}
        .fb-public h1,.fb-public h2,.fb-public h3{font-family:var(--fb-font-heading);font-weight:var(--fb-heading-weight);letter-spacing:var(--fb-heading-tracking)}
        .fb-card{background:var(--fb-surface);border:var(--fb-border-width) solid var(--fb-border);border-radius:var(--fb-radius);${design.components.cardShadow ? 'box-shadow:var(--fb-shadow);' : ''}transition:transform var(--fb-anim),border-color var(--fb-anim)}
        ${design.components.cardHover ? '.fb-card:hover{transform:translateY(-3px);border-color:var(--fb-accent)}' : ''}
        .fb-btn{border-radius:var(--fb-btn-radius);font-weight:var(--fb-btn-weight);${design.components.buttonUppercase ? 'text-transform:uppercase;letter-spacing:.06em;' : ''}transition:filter var(--fb-anim)}
        .fb-btn:hover{filter:brightness(1.12)}
        .fb-container{max-width:var(--fb-container);margin:0 auto;padding-left:16px;padding-right:16px}
        @keyframes fbin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        ${design.theme.animations ? '.fb-anim{animation:fbin .5s ease-out both}' : ''}
      `}</style>

      <Header design={design} page={page} go={go} onAuth={() => setAuthOpen(true)} user={user} signOut={signOut} />

      <main className="fb-container py-8">
        {page === 'home' && <Home design={design} go={go} />}
        {page === 'battles' && <Battles go={go} />}
        {page === 'battle' && <BattleView id={param!} go={go} onAuth={() => setAuthOpen(true)} />}
        {page === 'rankings' && <Rankings />}
        {page === 'mcs' && <Roster go={go} />}
        {page === 'news' && <News go={go} />}
        {page === 'article' && <Article id={param!} go={go} onAuth={() => setAuthOpen(true)} />}
        {page === 'events' && <Events />}
        {page === 'community' && <Community onAuth={() => setAuthOpen(true)} />}
        {page === 'account' && <Account go={go} />}
        {page.startsWith('page:') && <StaticPage slug={page.slice(5)} />}
      </main>

      {design.footer.visible && (
        <footer className="mt-16 border-t" style={{ borderColor: 'var(--fb-border)' }}>
          <div className="fb-container flex flex-col items-center justify-between gap-3 py-8 text-xs sm:flex-row">
            <span style={{ color: 'var(--fb-muted)' }}>{design.footer.text}</span>
            <div className="flex flex-wrap items-center gap-4">
              {design.footer.links.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {l.label}
                </a>
              ))}
              {db
                .all('pages')
                .filter((p) => p.status === 'published')
                .map((p) => (
                  <button key={p.id} onClick={() => go('page:' + p.slug)} className="hover:underline">
                    {p.title}
                  </button>
                ))}
            </div>
          </div>
        </footer>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

/* --------------------------------- header --------------------------------- */

function Header({ design, page, go, onAuth, user, signOut }: any) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className={cn('z-30 border-b backdrop-blur', design.header.sticky && 'sticky top-0')}
      style={{ borderColor: 'var(--fb-border)', background: 'color-mix(in srgb, var(--fb-bg) 88%, transparent)' }}
    >
      <div className="fb-container flex h-16 items-center justify-between gap-3">
        <button onClick={() => go('home')} className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center text-sm font-black text-white"
            style={{ background: 'var(--fb-accent)', borderRadius: 'var(--fb-btn-radius)' }}
          >
            {design.header.logoMark}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-black uppercase tracking-widest">{design.header.logoText}</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--fb-accent)' }}>
              {design.header.tagline}
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {design.nav
            .filter((n: any) => n.visible)
            .map((n: any) => (
              <button
                key={n.id}
                onClick={() => go(n.page)}
                className="fb-btn px-3 py-1.5 text-[11px]"
                style={
                  page === n.page
                    ? { background: 'var(--fb-accent)', color: '#fff' }
                    : { color: 'var(--fb-muted)' }
                }
              >
                {n.label}
              </button>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          {design.header.showCta && (
            <a
              href={design.header.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="fb-btn hidden px-3 py-1.5 text-[11px] text-white sm:inline-block"
              style={{ background: 'var(--fb-accent)' }}
            >
              {design.header.ctaLabel}
            </a>
          )}
          {user ? (
            <div className="flex items-center gap-1">
              <button onClick={() => go('account')} className="flex items-center gap-2">
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                <span className="hidden text-[11px] font-bold sm:inline">{user.username}</span>
              </button>
              <button onClick={signOut} className="px-2 text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={onAuth}
              className="fb-btn border px-3 py-1.5 text-[11px]"
              style={{ borderColor: 'var(--fb-border)' }}
            >
              Sign in
            </button>
          )}
          <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-1 border-t px-4 py-3 md:hidden" style={{ borderColor: 'var(--fb-border)' }}>
          {design.nav
            .filter((n: any) => n.visible)
            .map((n: any) => (
              <button
                key={n.id}
                onClick={() => {
                  go(n.page);
                  setOpen(false);
                }}
                className="rounded px-3 py-2 text-left text-xs font-bold"
                style={{ background: page === n.page ? 'var(--fb-accent)' : 'transparent' }}
              >
                {n.label}
              </button>
            ))}
        </div>
      )}
    </header>
  );
}

/* ---------------------------------- home ---------------------------------- */

function Home({ design, go }: { design: DesignConfig; go: (p: string, id?: string) => void }) {
  const battles = useTable('battles').filter((b) => b.status === 'published');
  const news = useTable('news').filter((n) => n.status === 'published');
  const mcs = useTable('mcs');
  const events = useTable('events');

  return (
    <div className="space-y-10">
      {design.homepage
        .filter((s) => s.visible)
        .map((s) => {
          switch (s.type) {
            case 'hero':
              return (
                <section key={s.id} className="fb-anim relative overflow-hidden fb-card p-8 md:p-14">
                  {s.props.image && (
                    <img
                      src={s.props.image}
                      alt=""
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover opacity-30',
                        design.responsive.mobileHideHeroArt && 'hidden sm:block',
                      )}
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(90deg, var(--fb-bg), transparent)' }}
                  />
                  <div
                    className={cn('relative max-w-2xl space-y-4', s.props.align === 'center' && 'mx-auto text-center')}
                  >
                    <span
                      className="inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ borderColor: 'var(--fb-accent)', color: 'var(--fb-accent)' }}
                    >
                      {s.props.eyebrow}
                    </span>
                    <h1 className="text-4xl uppercase leading-none md:text-6xl">{s.props.heading}</h1>
                    <p className="text-sm md:text-base" style={{ color: 'var(--fb-muted)' }}>
                      {s.props.sub}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => go(s.props.primaryTarget)}
                        className="fb-btn px-5 py-3 text-xs text-white"
                        style={{ background: 'var(--fb-accent)' }}
                      >
                        {s.props.primaryLabel}
                      </button>
                      <button
                        onClick={() => go(s.props.secondaryTarget)}
                        className="fb-btn border px-5 py-3 text-xs"
                        style={{ borderColor: 'var(--fb-border)' }}
                      >
                        {s.props.secondaryLabel}
                      </button>
                    </div>
                  </div>
                </section>
              );
            case 'stats': {
              const views = battles.reduce((a, b) => a + (Number(b.views) || 0), 0);
              const items = [
                ['MCs', mcs.length],
                ['Battles', battles.length],
                ['Total views', views.toLocaleString()],
                ['Members', db.count('users')],
              ] as const;
              return (
                <section key={s.id} className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {items.map(([l, v]) => (
                    <div key={l} className="fb-card p-4">
                      <div className="text-2xl font-black">{v}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-muted)' }}>
                        {l}
                      </div>
                    </div>
                  ))}
                </section>
              );
            }
            case 'featuredBattles':
              return (
                <Section key={s.id} title={s.title} onMore={() => go('battles')}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {battles
                      .filter((b) => b.featured)
                      .slice(0, s.props.limit || 4)
                      .map((b) => (
                        <BattleCard key={b.id} b={b} go={go} />
                      ))}
                  </div>
                </Section>
              );
            case 'leaders':
              return (
                <Section key={s.id} title={s.title} onMore={() => go('rankings')}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[...mcs]
                      .sort((a, b) => a.rank - b.rank)
                      .slice(0, s.props.limit || 3)
                      .map((m) => (
                        <div key={m.id} className="fb-card flex items-center gap-3 p-4">
                          <img src={m.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                          <div>
                            <div className="text-base font-black">
                              #{m.rank} {m.name}
                            </div>
                            <div className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                              {m.wins}W · {m.losses}L · {winRate(m)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </Section>
              );
            case 'news':
              return (
                <Section key={s.id} title={s.title} onMore={() => go('news')}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {news.slice(0, s.props.limit || 3).map((n) => (
                      <button key={n.id} onClick={() => go('article', n.id)} className="fb-card overflow-hidden text-left">
                        {n.cover && <img src={n.cover} alt="" className="h-32 w-full object-cover" />}
                        <div className="space-y-1 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-accent)' }}>
                            {n.category} · {n.date}
                          </div>
                          <h3 className="text-base">{n.title}</h3>
                          <p className="line-clamp-2 text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                            {n.summary}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
              );
            case 'events':
              return (
                <Section key={s.id} title={s.title} onMore={() => go('events')}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {events.slice(0, s.props.limit || 3).map((e) => (
                      <div key={e.id} className="fb-card p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-accent)' }}>
                          {e.date} · {e.time}
                        </div>
                        <h3 className="mt-1 text-base">{e.title}</h3>
                        <p className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                          {e.venue}, {e.city}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              );
            case 'cta':
              return (
                <section key={s.id} className="fb-card p-8 text-center">
                  <h2 className="text-2xl uppercase">{s.props.heading}</h2>
                  <p className="mt-2 text-sm" style={{ color: 'var(--fb-muted)' }}>
                    {s.props.sub}
                  </p>
                  <button
                    onClick={() => go(s.props.target)}
                    className="fb-btn mt-4 px-5 py-3 text-xs text-white"
                    style={{ background: 'var(--fb-accent)' }}
                  >
                    {s.props.label}
                  </button>
                </section>
              );
            case 'richText':
              return (
                <section key={s.id} className="fb-card p-6">
                  <h2 className="mb-2 text-xl uppercase">{s.props.heading}</h2>
                  <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--fb-muted)' }}>
                    {s.props.body}
                  </p>
                </section>
              );
            default:
              return null;
          }
        })}
    </div>
  );
}

function Section({ title, onMore, children }: any) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-xl uppercase">{title}</h2>
        {onMore && (
          <button onClick={onMore} className="text-[11px] font-bold" style={{ color: 'var(--fb-accent)' }}>
            See all →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function winRate(m: any) {
  const total = (m.wins || 0) + (m.losses || 0) + (m.draws || 0);
  return total ? Math.round(((m.wins || 0) / total) * 100) + '%' : '—';
}

function mcName(id: string) {
  return db.find('mcs', id)?.name || '—';
}

function BattleCard({ b, go }: any) {
  return (
    <button onClick={() => go('battle', b.id)} className="fb-card overflow-hidden text-left">
      <div className="relative aspect-video bg-black">
        {b.videoId && (
          <img
            src={`https://img.youtube.com/vi/${b.videoId}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <span
          className="absolute bottom-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: 'var(--fb-accent)' }}
        >
          {b.event}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-base">{b.title}</h3>
        <p className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
          {b.date} · {Number(b.views || 0).toLocaleString()} views · {b.score}
        </p>
      </div>
    </button>
  );
}

/* --------------------------------- battles -------------------------------- */

function Battles({ go }: any) {
  const battles = useTable('battles').filter((b) => b.status === 'published');
  const [q, setQ] = useState('');
  const filtered = battles.filter((b) =>
    (b.title + b.event + mcName(b.mc1) + mcName(b.mc2)).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase">Battles</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search battles or MCs"
          className="rounded-md border px-3 py-2 text-xs outline-none"
          style={{ background: 'var(--fb-surface)', borderColor: 'var(--fb-border)', color: 'var(--fb-text)' }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <BattleCard key={b.id} b={b} go={go} />
        ))}
      </div>
      {!filtered.length && <p className="text-xs opacity-60">No battles found.</p>}
    </div>
  );
}

function BattleView({ id, go, onAuth }: any) {
  const b = db.find('battles', id);
  if (!b) return <p>Battle not found.</p>;
  return (
    <div className="space-y-6">
      <button onClick={() => go('battles')} className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
        ← All battles
      </button>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-accent)' }}>
          {b.event}
        </div>
        <h1 className="text-3xl uppercase md:text-5xl">{b.title}</h1>
      </div>
      <div className="aspect-video w-full overflow-hidden bg-black" style={{ borderRadius: 'var(--fb-radius)' }}>
        {b.videoId ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${b.videoId}`}
            title={b.title}
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="grid h-full place-items-center text-xs opacity-60">No video attached yet.</div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="fb-card space-y-3 p-5 md:col-span-2">
          <h2 className="text-lg uppercase">Overview</h2>
          <p className="text-sm" style={{ color: 'var(--fb-muted)' }}>
            {b.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {(b.judges || []).map((j: string) => (
              <span key={j} className="rounded border px-2 py-1 text-[10px] font-bold" style={{ borderColor: 'var(--fb-border)' }}>
                Judge · {j}
              </span>
            ))}
          </div>
        </div>
        <div className="fb-card space-y-2 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-accent)' }}>
            Decision
          </div>
          <div className="text-3xl font-black">{b.score}</div>
          <div className="text-xs text-emerald-400">Winner: {mcName(b.winner)}</div>
          <div className="pt-2 text-[11px]" style={{ color: 'var(--fb-muted)' }}>
            {mcName(b.mc1)} vs {mcName(b.mc2)}
          </div>
        </div>
      </div>
      <CommentThread target={`battle:${b.id}`} onAuth={onAuth} />
    </div>
  );
}

/* -------------------------------- rankings -------------------------------- */

function Rankings() {
  const mcs = [...useTable('mcs')].sort((a, b) => a.rank - b.rank);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl uppercase">Rankings</h1>
      <div className="fb-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fb-muted)' }}>
              <th className="p-3">#</th>
              <th className="p-3">MC</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">D</th>
              <th className="p-3 text-center">Rate</th>
              <th className="p-3 text-center">Streak</th>
            </tr>
          </thead>
          <tbody>
            {mcs.map((m) => (
              <tr key={m.id} className="border-t" style={{ borderColor: 'var(--fb-border)' }}>
                <td className="p-3 font-black">{m.rank}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <span className="font-bold">{m.name}</span>
                  </div>
                </td>
                <td className="p-3 text-center text-emerald-400">{m.wins}</td>
                <td className="p-3 text-center text-red-400">{m.losses}</td>
                <td className="p-3 text-center">{m.draws || 0}</td>
                <td className="p-3 text-center font-bold">{winRate(m)}</td>
                <td className="p-3 text-center text-[11px]">{m.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Roster(_: any) {
  const mcs = useTable('mcs');
  const battles = useTable('battles');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl uppercase">Roster</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mcs.map((m) => {
          const count = battles.filter((b) => b.mc1 === m.id || b.mc2 === m.id).length;
          return (
            <div key={m.id} className="fb-card p-5 text-center">
              <img src={m.avatar} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
              <h3 className="mt-3 text-lg">{m.name}</h3>
              <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--fb-accent)' }}>
                Rank #{m.rank}
              </div>
              <p className="mt-2 line-clamp-3 text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                {m.bio}
              </p>
              <div className="mt-3 text-[11px]">
                {m.wins}W · {m.losses}L · {count} battles
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------- news --------------------------------- */

function News({ go }: any) {
  const news = useTable('news').filter((n) => n.status === 'published');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl uppercase">News</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {news.map((n) => (
          <button key={n.id} onClick={() => go('article', n.id)} className="fb-card overflow-hidden text-left">
            {n.cover && <img src={n.cover} alt="" className="h-40 w-full object-cover" />}
            <div className="space-y-1 p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fb-accent)' }}>
                {n.category} · {n.date}
              </div>
              <h2 className="text-xl">{n.title}</h2>
              <p className="text-xs" style={{ color: 'var(--fb-muted)' }}>
                {n.summary}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Article({ id, go, onAuth }: any) {
  const n = db.find('news', id);
  if (!n) return <p>Not found.</p>;
  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => go('news')} className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
        ← All news
      </button>
      <h1 className="text-3xl uppercase md:text-4xl">{n.title}</h1>
      <div className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
        {n.category} · {n.date}
      </div>
      {n.cover && <img src={n.cover} alt="" className="w-full object-cover" style={{ borderRadius: 'var(--fb-radius)' }} />}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
      <CommentThread target={`news:${n.id}`} onAuth={onAuth} />
    </article>
  );
}

function Events() {
  const events = [...useTable('events')].sort((a, b) => (a.date > b.date ? 1 : -1));
  return (
    <div className="space-y-5">
      <h1 className="text-3xl uppercase">Events</h1>
      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="fb-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-lg">{e.title}</h2>
              <p className="text-[11px]" style={{ color: 'var(--fb-muted)' }}>
                {e.date} {e.time} · {e.venue}, {e.city}
              </p>
            </div>
            <span className="rounded border px-2 py-1 text-[10px] font-bold uppercase" style={{ borderColor: 'var(--fb-border)' }}>
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaticPage({ slug }: { slug: string }) {
  const p = useTable('pages').find((x) => x.slug === slug);
  if (!p) return <p>Page not found.</p>;
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl uppercase">{p.title}</h1>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
    </article>
  );
}

/* -------------------------------- community ------------------------------- */

function Community({ onAuth }: any) {
  const messages = useTable('chat');
  const { user } = useAuth();
  const settings = getSettings();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const visible = messages.filter((m) => !m.deleted).slice(-200);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return onAuth();
    if (!text.trim()) return;
    if (settings.site.chatLocked) return toast.push('Chat is locked by moderators.', 'err');
    if (user.muted) return toast.push('You are muted.', 'err');
    const slow = settings.site.chatSlowModeSeconds;
    if (slow > 0) {
      const last = [...messages].reverse().find((m) => m.userId === user.id);
      if (last && Date.now() - new Date(last.createdAt).getTime() < slow * 1000)
        return toast.push(`Slow mode: wait ${slow}s between messages.`, 'err');
    }
    db.insert('chat', {
      text: text.trim(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      deleted: false,
    });
    setText('');
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl uppercase">Community</h1>
      <div className="fb-card flex h-[540px] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {visible.length === 0 && <p className="py-16 text-center text-xs opacity-50">No messages yet.</p>}
          {visible.map((m) => (
            <div key={m.id} className="flex gap-2">
              <img src={m.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold">{m.username}</span>
                  <span className="text-[10px]" style={{ color: 'var(--fb-muted)' }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm">{m.text}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-3" style={{ borderColor: 'var(--fb-border)' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? 'Drop a bar…' : 'Sign in to chat'}
            className="flex-1 rounded-md border px-3 py-2 text-xs outline-none"
            style={{ background: 'var(--fb-bg)', borderColor: 'var(--fb-border)', color: 'var(--fb-text)' }}
          />
          <button className="fb-btn px-4 py-2 text-xs text-white" style={{ background: 'var(--fb-accent)' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentThread({ target, onAuth }: { target: string; onAuth: () => void }) {
  const all = useTable('comments');
  const { user } = useAuth();
  const settings = getSettings();
  const [text, setText] = useState('');
  const toast = useToast();
  if (!settings.site.commentsEnabled) return null;
  const list = all.filter((c) => c.target === target && c.status === 'approved');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return onAuth();
    if (!text.trim()) return;
    db.insert('comments', {
      target,
      body: text.trim(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      status: settings.site.commentsRequireApproval ? 'pending' : 'approved',
    });
    setText('');
    toast.push(settings.site.commentsRequireApproval ? 'Comment sent for approval.' : 'Comment posted.');
  };

  return (
    <section className="space-y-3 pt-4">
      <h3 className="text-lg uppercase">Comments ({list.length})</h3>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? 'Add a comment' : 'Sign in to comment'}
          className="flex-1 rounded-md border px-3 py-2 text-xs outline-none"
          style={{ background: 'var(--fb-surface)', borderColor: 'var(--fb-border)', color: 'var(--fb-text)' }}
        />
        <button className="fb-btn px-4 py-2 text-xs text-white" style={{ background: 'var(--fb-accent)' }}>
          Post
        </button>
      </form>
      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="fb-card flex items-start justify-between gap-3 p-3">
            <div className="flex gap-2">
              <img src={c.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              <div>
                <div className="text-[11px] font-bold">{c.username}</div>
                <p className="text-sm">{c.body}</p>
              </div>
            </div>
            <button
              className="text-[10px]"
              style={{ color: 'var(--fb-muted)' }}
              onClick={() => {
                if (!user) return onAuth();
                db.insert('reports', {
                  target: 'comment:' + c.id,
                  reason: 'Reported by user',
                  reporter: user.username,
                  status: 'open',
                });
                toast.push('Reported to moderators.');
              }}
            >
              Report
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------- account -------------------------------- */

function Account(_: any) {
  const { user, changePassword, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ bio: user?.bio || '', avatar: user?.avatar || '' });
  const [pw, setPw] = useState({ a: '', b: '' });
  if (!user) return <p>Sign in first.</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl uppercase">{user.username}</h1>
      <div className="fb-card space-y-3 p-5">
        <Field label="Bio">
          <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <Field label="Avatar URL">
          <Input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
        </Field>
        <Btn
          variant="primary"
          onClick={() => {
            db.update('users', user.id, form);
            refresh();
            toast.push('Profile saved.');
          }}
        >
          Save profile
        </Btn>
      </div>
      {user.provider === 'password' && (
        <div className="fb-card space-y-3 p-5">
          <h2 className="text-lg uppercase">Change password</h2>
          <Field label="Current password">
            <Input type="password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
          </Field>
          <Field label="New password">
            <Input type="password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
          </Field>
          <Btn
            onClick={async () => {
              try {
                await changePassword(pw.a, pw.b);
                toast.push('Password changed.');
                setPw({ a: '', b: '' });
              } catch (e: any) {
                toast.push(e.message, 'err');
              }
            }}
          >
            Update password
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- auth modal ------------------------------- */

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, oauthSignIn, requestReset, resetWithToken } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [f, setF] = useState({ username: '', email: '', password: '', token: '', newPw: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const settings = getSettings();

  const run = async (fn: () => Promise<any>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-100">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-black uppercase">
            {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            ✕
          </button>
        </div>

        {err && (
          <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-[11px] leading-relaxed text-red-300">
            {err}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Btn
            className="w-full"
            disabled={busy}
            onClick={() => run(async () => (await oauthSignIn('google'), onClose()))}
          >
            Continue with Google
          </Btn>
          <Btn
            className="w-full"
            disabled={busy}
            onClick={() => run(async () => (await oauthSignIn('facebook'), onClose()))}
          >
            Continue with Facebook
          </Btn>
          {(!settings.integrations.googleClientId || !settings.integrations.facebookAppId) && (
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Social sign-in requires OAuth credentials. Configure them in Admin → System → Integrations
              (or via VITE_GOOGLE_CLIENT_ID / VITE_FACEBOOK_APP_ID environment variables).
            </p>
          )}
        </div>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase text-neutral-600">
          <div className="h-px flex-1 bg-neutral-800" /> or <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {mode !== 'reset' ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (mode === 'signup') await signUp({ username: f.username, email: f.email, password: f.password });
                else await signIn(f.username, f.password);
                onClose();
              });
            }}
          >
            <Field label="Username">
              <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
            </Field>
            {mode === 'signup' && (
              <Field label="Email (optional)">
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Field>
            )}
            <Field label="Password">
              <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            </Field>
            <Btn variant="primary" className="w-full py-2.5" disabled={busy}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Btn>
          </form>
        ) : (
          <div className="space-y-3">
            <Field label="Username or email">
              <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            </Field>
            <Btn
              className="w-full"
              onClick={() =>
                run(async () => {
                  const token = await requestReset(f.username);
                  setF((s) => ({ ...s, token }));
                  toast.push('Reset token generated.');
                })
              }
            >
              Generate reset token
            </Btn>
            {f.token && (
              <p className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-200">
                Token: <code>{f.token}</code> — no email provider is configured, so the token is shown here.
                Configure SMTP/API in Admin → System → Email to deliver it by mail.
              </p>
            )}
            <Field label="Reset token">
              <Input value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} />
            </Field>
            <Field label="New password">
              <Input type="password" value={f.newPw} onChange={(e) => setF({ ...f, newPw: e.target.value })} />
            </Field>
            <Btn
              variant="primary"
              className="w-full"
              onClick={() =>
                run(async () => {
                  await resetWithToken(f.token, f.newPw);
                  toast.push('Password reset. You can sign in now.');
                  setMode('login');
                })
              }
            >
              Reset password
            </Btn>
          </div>
        )}

        <div className="mt-4 flex justify-between text-[11px] text-neutral-500">
          <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="hover:text-white">
            {mode === 'signup' ? 'Have an account? Sign in' : 'Create an account'}
          </button>
          <button onClick={() => setMode('reset')} className="hover:text-white">
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
