import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Trophy, Swords, MessageSquare, Menu, X, LogOut, User as UserIcon,
  Send, Eye, MapPin, Calendar, Flame, ChevronRight, AlertTriangle, Flag, ShieldCheck,
} from "lucide-react";
import { useStore, useCollection, track } from "../store";
import { db } from "../lib/backend";
import { auth } from "../lib/auth";
import { highestRole } from "../lib/permissions";
import AuthModal from "./AuthModal";

/* ------------------------------ routing ----------------------------- */
function useHashRoute() {
  const [hash, setHash] = useState(() => {
    const h = window.location.hash.replace(/^#/, "");
    return h || "/";
  });
  useEffect(() => {
    const fn = () => {
      const h = window.location.hash.replace(/^#/, "");
      setHash(h || "/");
    };
    fn();
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  const go = (to: string) => {
    const normalised = to.startsWith("/") ? to : `/${to}`;
    // Use history pushState so we don't trigger a hashchange storm that
    // could re-render the home page to empty.
    if (window.location.hash === `#${normalised}`) {
      // already there — just scroll up
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.hash = normalised;
    }
  };
  return { hash, go };
}

export function useReveal(active: boolean, key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    if (!active) {
      el.querySelectorAll(".fb-reveal").forEach((n) => n.classList.add("is-in"));
      return;
    }
    // If the user prefers reduced motion, skip the reveal animation
    // entirely and just make everything visible.
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll(".fb-reveal").forEach((n) => n.classList.add("is-in"));
      return;
    }
    // Reset only the nodes that are *below* the current viewport so
    // already-visible content stays visible (no flash to empty).
    const reveal = el.querySelectorAll(".fb-reveal");
    reveal.forEach((n) => {
      const r = (n as HTMLElement).getBoundingClientRect();
      if (r.top > window.innerHeight * 0.85) n.classList.remove("is-in");
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.12 },
    );
    reveal.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [active, key]);
  return ref;
}

const fmtViews = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n || 0));

/* ============================== SITE ================================ */
export default function PublicSite() {
  const { design, settings, user, profile, myRoles, can, toast } = useStore();
  const { hash, go } = useHashRoute();
  const [authOpen, setAuthOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { rows: battles } = useCollection("battles");
  const { rows: mcs } = useCollection("mcs");
  const { rows: news } = useCollection("news");
  const { rows: events } = useCollection("events");
  const revealRef = useReveal(design.components.revealOnScroll, hash);

  useEffect(() => {
    const parts = hash.split("/").filter(Boolean);
    track("page.view", { route: hash || "/" });
    if (parts[0] === "battle" && parts[1]) track("battle.open", { battle: parts[1] });
  }, [hash]);

  const navItems = useMemo(() => {
    // Home is always first and always present so users can never get stuck
    // on a deep route. Other entries come from the design config and the
    // owner can re-order, rename or hide them in Design Mode → Navigation.
    const cfg = (design.nav || []).filter((n) => n.enabled && n.route !== "home");
    return [{ id: "home", label: "Home", route: "home", enabled: true } as typeof cfg[number], ...cfg];
  }, [design.nav]);
  const sections = useMemo(() => (design.sections || []).filter((s) => s.enabled).sort((a, b) => a.order - b.order), [design.sections]);
  const publishedBattles = battles.filter((b) => b.status === "published").sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const publishedNews = news.filter((n) => n.status === "published").sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const topRole = highestRole(myRoles.map((r) => r.id), myRoles);

  const cardCls = {
    solid: "bg-[var(--fb-surface)] border border-[var(--fb-line)]",
    outline: "bg-transparent border border-[var(--fb-line)]",
    glass: "bg-[var(--fb-surface)]/70 backdrop-blur border border-[var(--fb-line)]",
  }[design.components.cardStyle];
  const btnRadius = { sharp: "0px", rounded: "var(--fb-radius)", pill: "999px" }[design.components.buttonStyle];
  const treatment = design.components.imageTreatment;

  const maintenance = settings.maintenanceMode && !can("admin.access");
  if (maintenance) return <MaintenanceScreen />;

  const route = hash.split("/").filter(Boolean);
  const page = route[0] || "";

  return (
    <div className={`min-h-screen fb-stage ${design.components.noise ? "fb-noise" : ""} relative`} style={{ color: "var(--fb-text)" }}>
      {design.components.gridOverlay && <div className="fb-grid-lines absolute inset-0 pointer-events-none opacity-60" />}

      {/* ---------------------------- HEADER --------------------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-[var(--fb-line)]" style={{ background: "color-mix(in srgb, var(--fb-ink) 82%, transparent)" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              // Always go back to the landing page. Use a real navigation so
              // even if we were already at "/" the content re-renders.
              if (window.location.hash === "" || window.location.hash === "#/" || window.location.hash === "#") {
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              } else {
                window.location.hash = "/";
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 group"
          >
            <span className="w-9 h-9 grid place-items-center bg-[var(--fb-accent)] text-white font-black text-[13px] -skew-x-6 shadow-lg group-hover:brightness-110 transition">F&B</span>
            <span className="hidden xs:block leading-none">
              <span className="fb-display block text-[17px] tracking-wide">{settings.siteName || "FLOW & BARS"}</span>
              <span className="block text-[9px] tracking-[0.24em] text-[var(--fb-accent)] font-semibold">{settings.tagline || "GEORGIAN BATTLE LEAGUE"}</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const isHome = n.route === "home" || n.id === "home";
              const active = isHome ? page === "" : page === n.route;
              return (
                <button
                  key={n.id}
                  onClick={() => go(isHome ? "/" : `/${n.route}`)}
                  className={`px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition rounded-[var(--fb-radius)] ${
                    active ? "bg-[var(--fb-accent)] text-white" : "text-[var(--fb-muted)] hover:text-[var(--fb-text)] hover:bg-white/5"
                  }`}
                >
                  {n.label}
                </button>
              );
            })}
            <a
              href={settings.integrations?.youtubeChannel || "https://www.youtube.com/@FLOW-BARS"}
              target="_blank"
              rel="noreferrer"
              className="ml-2 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase border border-[var(--fb-line)] hover:border-[var(--fb-accent)] hover:text-[var(--fb-accent)] rounded-[var(--fb-radius)] transition"
            >
              <Play size={12} /> YouTube
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button onClick={() => go("/profile")} className="flex items-center gap-2 pl-1 pr-2.5 py-1 border border-[var(--fb-line)] hover:border-[var(--fb-accent)] rounded-full transition">
                  <img src={profile?.avatar || avatarFor(profile?.username)} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-[11px] font-bold hidden sm:inline">{profile?.username}</span>
                  {topRole && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded hidden sm:inline" style={{ background: `${topRole.color}22`, color: topRole.color }}>{topRole.name.toUpperCase()}</span>}
                </button>
                <button onClick={async () => { await auth.signOut(); toast("Signed out", "info"); }} className="p-2 text-[var(--fb-muted)] hover:text-[var(--fb-accent)]" title="Sign out">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-3.5 py-2 text-[11px] font-bold tracking-[0.14em] uppercase bg-[var(--fb-accent)] text-white hover:brightness-110 transition"
                style={{ borderRadius: btnRadius }}
              >
                Sign in
              </button>
            )}
            <button className="md:hidden p-2 text-[var(--fb-muted)]" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="md:hidden border-t border-[var(--fb-line)] bg-[var(--fb-ink)] px-4 py-3 grid gap-1">
            {navItems.map((n) => {
              const isHome = n.route === "home" || n.id === "home";
              return (
                <button
                  key={n.id}
                  onClick={() => { go(isHome ? "/" : `/${n.route}`); setNavOpen(false); }}
                  className="text-left py-2.5 text-xs font-bold tracking-[0.14em] uppercase text-[var(--fb-muted)] border-b border-[var(--fb-line)]/60"
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main ref={revealRef} className="relative z-10 max-w-6xl mx-auto px-4">
        {page === "" && (
          <Home go={go} sections={sections} design={design} battles={publishedBattles} mcs={mcs} news={publishedNews} events={events} cardCls={cardCls} btnRadius={btnRadius} treatment={treatment} />
        )}
        {page === "battles" && <Battles battles={publishedBattles} go={go} cardCls={cardCls} />}
        {page === "battle" && <BattleView id={route[1]} battles={battles} mcs={mcs} go={go} cardCls={cardCls} onNeedAuth={() => setAuthOpen(true)} />}
        {page === "rankings" && <Rankings mcs={mcs} cardCls={cardCls} />}
        {page === "mcs" && <Roster mcs={mcs} cardCls={cardCls} />}
        {page === "news" && <News news={publishedNews} cardCls={cardCls} />}
        {page === "community" && <Community onNeedAuth={() => setAuthOpen(true)} cardCls={cardCls} />}
        {page === "profile" && <Profile go={go} onNeedAuth={() => setAuthOpen(true)} cardCls={cardCls} />}
      </main>

      {/* ---------------------------- FOOTER --------------------------- */}
      <footer className="relative z-10 mt-20 border-t border-[var(--fb-line)] bg-[var(--fb-ink)]/80">
        <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-[1.4fr_repeat(auto-fit,minmax(140px,1fr))]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 grid place-items-center bg-[var(--fb-accent)] text-white font-black text-xs -skew-x-6">F&B</span>
              <span className="fb-display text-lg">{settings.siteName}</span>
            </div>
            <p className="text-xs text-[var(--fb-muted)] leading-relaxed max-w-sm">{design.footer?.blurb}</p>
          </div>
          {(design.footer?.columns || []).map((c, i) => (
            <div key={i}>
              <div className="text-[10px] tracking-[0.2em] font-bold text-[var(--fb-text)] mb-3 uppercase">{c.title}</div>
              <ul className="space-y-2">
                {c.links.map((l, j) => (
                  <li key={j}>
                    <a href={l.href} className="text-xs text-[var(--fb-muted)] hover:text-[var(--fb-accent)] transition">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--fb-line)] py-4 px-4 flex flex-col sm:flex-row gap-2 items-center justify-between text-[10px] tracking-[0.16em] text-[var(--fb-muted)] uppercase max-w-6xl mx-auto">
          <span>{design.footer?.copyright}</span>
          <span className="flex items-center gap-3">
            {(design.footer?.socials || []).map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="hover:text-[var(--fb-accent)]">{s.label}</a>
            ))}
          </span>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function MaintenanceScreen() {
  return (
    <div className="min-h-screen grid place-items-center fb-stage p-6 text-center">
      <div className="max-w-md space-y-4">
        <AlertTriangle className="mx-auto text-[var(--fb-accent)]" size={40} />
        <h1 className="fb-display text-4xl">UNDER MAINTENANCE</h1>
        <p className="text-sm text-[var(--fb-muted)]">The league is upgrading the arena. Staff can still reach the control center.</p>
      </div>
    </div>
  );
}

export function avatarFor(username = "") {
  const seed = (username || "mc").toLowerCase();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e10600,1a1a22&textColor=ffffff&fontFamily=monospace`;
}

function SectionHead({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">{kicker}</div>
        <h2 className="fb-display text-3xl sm:text-4xl uppercase">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ HOME -------------------------------- */
function Home({ go, sections, design, battles, mcs, news, events, cardCls, btnRadius, treatment }: any) {
  const { settings } = useStore();
  const ranked = [...mcs].sort((a: any, b: any) => a.rank - b.rank);
  const totalViews = battles.reduce((s: number, b: any) => s + (Number(b.views) || 0), 0);

  const render = (id: string) => {
    switch (id) {
      case "ticker":
        return (
          <div key="ticker" className="fb-reveal -mx-4 sm:mx-0 border-y border-[var(--fb-line)] py-2.5 overflow-hidden bg-[var(--fb-surface)]">
            <div className="flex w-max fb-marquee gap-8 whitespace-nowrap text-[11px] tracking-[0.2em] uppercase text-[var(--fb-muted)] font-semibold">
              {[0, 1].map((k) => (
                <div key={k} className="flex gap-8">
                  <span className="text-[var(--fb-accent)]">● LIVE — SEASON 5 QUALIFIERS</span>
                  <span>{ranked[0]?.name} HOLDS THE #1 SPOT</span>
                  <span>NEXT EVENT · {events[0]?.date || "TBA"} · {events[0]?.venue || "TBILISI"}</span>
                  <span>{battles.length} OFFICIAL BATTLES ARCHIVED</span>
                  <span>JUDGING PANEL EXPANDED TO FIVE</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "stats":
        return (
          <div key="stats" className="fb-reveal grid grid-cols-2 md:grid-cols-4 gap-3 py-10">
            {[
              { v: mcs.length, l: "Ranked MCs" },
              { v: battles.length, l: "Official battles" },
              { v: fmtViews(totalViews), l: "Total views" },
              { v: events.length, l: "Scheduled events" },
            ].map((s, i) => (
              <div key={i} className={`${cardCls} p-5 fb-hover-lift hover:border-[var(--fb-accent)]`}>
                <div className="fb-display text-3xl sm:text-4xl">{s.v}</div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-[var(--fb-muted)] mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        );
      case "leaders":
        return (
          <div key="leaders" className="fb-reveal py-6">
            <SectionHead kicker="The ladder" title="Top 3 right now" action={<LinkBtn onClick={() => go("/rankings")}>Full rankings</LinkBtn>} />
            <div className="grid sm:grid-cols-3 gap-3">
              {ranked.slice(0, 3).map((mc: any, i: number) => (
                <button key={mc.id} onClick={() => go("/rankings")} className={`${cardCls} p-4 text-left fb-hover-lift hover:border-[var(--fb-accent)] flex items-center gap-3`}>
                  <span className="fb-display text-3xl w-8" style={{ color: ["var(--fb-accent-2)", "#cfd3dc", "#c98a4b"][i] }}>{i + 1}</span>
                  <img src={mc.avatar || avatarFor(mc.name)} alt="" className="w-12 h-12 rounded-full object-cover border border-[var(--fb-line)]" />
                  <span>
                    <span className="fb-display text-lg block leading-tight">{mc.name}</span>
                    <span className="text-[11px] text-[var(--fb-muted)]">{mc.wins}W · {mc.losses}L · {mc.streak}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      case "battles":
        return (
          <div key="battles" className="fb-reveal py-10">
            <SectionHead kicker="Battle vault" title="Latest matchups" action={<LinkBtn onClick={() => go("/battles")}>All battles</LinkBtn>} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {battles.slice(0, 3).map((b: any) => (
                <BattleCard key={b.id} b={b} go={go} cardCls={cardCls} treatment={treatment} />
              ))}
            </div>
          </div>
        );
      case "events":
        return (
          <div key="events" className="fb-reveal py-6">
            <SectionHead kicker="Calendar" title="Upcoming events" />
            <div className="space-y-2">
              {events.filter((e: any) => e.status === "scheduled").slice(0, 4).map((e: any) => (
                <div key={e.id} className={`${cardCls} overflow-hidden fb-hover-lift hover:border-[var(--fb-accent)]`}>
                  {e.image && <img src={e.image} alt="" className="w-full h-28 object-cover" />}
                  <div className="px-4 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span className="fb-display text-xl text-[var(--fb-accent)]">{String(e.date).slice(8, 10)}<span className="text-[10px] text-[var(--fb-muted)] block">/{String(e.date).slice(5, 7)}</span></span>
                    <span className="flex-1 min-w-[160px]">
                      <span className="block text-sm font-bold">{e.title}</span>
                      <span className="text-[11px] text-[var(--fb-muted)] flex items-center gap-1"><MapPin size={11} />{e.venue}</span>
                    </span>
                    <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-1 border border-[var(--fb-line)] rounded-[var(--fb-radius)]">{e.status}</span>
                  </div>
                </div>
              ))}
              {!events.some((e: any) => e.status === "scheduled") && <Empty text="No scheduled events yet." />}
            </div>
          </div>
        );
      case "news":
        return (
          <div key="news" className="fb-reveal py-10">
            <SectionHead kicker="League office" title="News & announcements" action={<LinkBtn onClick={() => go("/news")}>All news</LinkBtn>} />
            <div className="grid md:grid-cols-2 gap-3">
              {news.slice(0, 4).map((n: any) => (
                <button key={n.id} onClick={() => go("/news")} className={`${cardCls} overflow-hidden text-left group fb-hover-lift hover:border-[var(--fb-accent)] flex flex-col`}>
                  {n.image && (
                    <div className="relative h-32 overflow-hidden">
                      <img src={n.image} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${treatment === "duotone" ? "saturate-50 contrast-125" : treatment === "mono" ? "grayscale" : ""}`} onError={(e: any) => { e.currentTarget.parentElement.style.display = "none"; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--fb-surface)] via-transparent" />
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] tracking-[0.2em] font-bold px-2 py-0.5 bg-[var(--fb-accent)] text-white uppercase">{n.tag}</span>
                      <span className="text-[10px] text-[var(--fb-muted)]">{n.date}</span>
                    </div>
                    <div className="fb-display text-xl leading-tight mb-1.5">{n.title}</div>
                    <p className="text-xs text-[var(--fb-muted)] leading-relaxed line-clamp-2">{n.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case "community":
        return (
          <div key="community" className="fb-reveal py-6">
            <div className={`${cardCls} p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}>
              <div>
                <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">Community</div>
                <h3 className="fb-display text-2xl sm:text-3xl uppercase mb-2">The room is open</h3>
                <p className="text-xs text-[var(--fb-muted)] max-w-md">Live chat runs during every event. Predictions, scorecards, arguments — all of it happens here.</p>
              </div>
              <button onClick={() => go("/community")} className="px-5 py-3 text-[11px] font-bold tracking-[0.16em] uppercase bg-[var(--fb-accent)] text-white hover:brightness-110 transition" style={{ borderRadius: btnRadius }}>
                Enter the room
              </button>
            </div>
          </div>
        );
      case "cta":
        return (
          <div key="cta" className="fb-reveal py-12">
            <div className="relative overflow-hidden border border-[var(--fb-line)] rounded-[var(--fb-radius-lg)]">
              <img src={design.hero.image} alt="" className={`absolute inset-0 w-full h-full object-cover opacity-30 ${treatment === "mono" ? "grayscale" : ""}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--fb-ink)] via-[var(--fb-ink)]/70 to-transparent" />
              <div className="relative p-8 sm:p-12 max-w-xl">
                <h3 className="fb-display text-3xl sm:text-5xl uppercase mb-3">Bring your best round</h3>
                <p className="text-sm text-[var(--fb-muted)] mb-6">Qualifiers are open. Film one round, submit it, and the panel does the rest.</p>
                <a href={settings.integrations?.youtubeChannel || "https://www.youtube.com/@FLOW-BARS"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3 text-[11px] font-bold tracking-[0.16em] uppercase border border-[var(--fb-accent)] text-[var(--fb-accent)] hover:bg-[var(--fb-accent)] hover:text-white transition" style={{ borderRadius: btnRadius }}>
                  <Flame size={14} /> How to enter
                </a>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-6">
      {/* HERO — asymmetric, driven by the published design config */}
      <section className="pt-10 pb-6 grid lg:grid-cols-[1.25fr_0.85fr] gap-8 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 border border-[var(--fb-accent)]/40 bg-[var(--fb-accent)]/10 text-[var(--fb-accent)] text-[10px] tracking-[0.24em] font-bold uppercase rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fb-accent)] fb-live-dot" /> {design.hero.eyebrow}
          </span>
          <h1 className="fb-display text-[clamp(2.6rem,8.5vw,5.6rem)] uppercase">
            {!design.hero.accentWord || !design.hero.title.includes(design.hero.accentWord) ? (
              design.hero.title
            ) : design.hero.title.split(design.hero.accentWord).map((part: string, i: number, arr: string[]) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-[var(--fb-accent)]">{design.hero.accentWord}</span>}
              </React.Fragment>
            ))}
          </h1>
          <p className="text-sm sm:text-base text-[var(--fb-muted)] leading-relaxed max-w-lg">{design.hero.subtitle}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => go("/battles")} className="px-6 py-3.5 text-[11px] font-bold tracking-[0.18em] uppercase bg-[var(--fb-accent)] text-white hover:brightness-110 active:scale-[0.98] transition flex items-center gap-2" style={{ borderRadius: btnRadius }}>
              <Swords size={15} /> {design.hero.primaryLabel}
            </button>
            <button onClick={() => go("/rankings")} className="px-6 py-3.5 text-[11px] font-bold tracking-[0.18em] uppercase border border-[var(--fb-line)] hover:border-[var(--fb-text)] transition" style={{ borderRadius: btnRadius }}>
              <Trophy size={15} className="inline -mt-0.5 mr-1" /> {design.hero.secondaryLabel}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="relative border border-[var(--fb-line)] overflow-hidden rounded-[var(--fb-radius-lg)] shadow-[var(--fb-shadow)]">
            <img src={design.hero.image} alt="" className={`w-full h-[260px] sm:h-[340px] object-cover ${treatment === "duotone" ? "contrast-125 saturate-50" : treatment === "mono" ? "grayscale" : ""}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--fb-ink)] via-transparent to-transparent" />
            <div className="absolute inset-x-0 top-0 h-16 bg-[var(--fb-accent)]/10 fb-scanline pointer-events-none" />
            {battles[0] && (
              <button onClick={() => go(`/battle/${battles[0].id}`)} className="absolute inset-x-3 bottom-3 p-3 bg-[var(--fb-ink)]/85 backdrop-blur border border-[var(--fb-line)] text-left hover:border-[var(--fb-accent)] transition flex items-center gap-3">
                <span className="w-10 h-10 grid place-items-center bg-[var(--fb-accent)] text-white shrink-0"><Play size={15} /></span>
                <span className="min-w-0">
                  <span className="block text-[9px] tracking-[0.2em] text-[var(--fb-accent)] font-bold uppercase">Latest result</span>
                  <span className="fb-display text-lg block truncate">{battles[0].title}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {sections.map((s: any) => render(s.id))}
    </div>
  );
}

const LinkBtn = ({ children, onClick }: any) => (
  <button onClick={onClick} className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--fb-accent)] hover:underline flex items-center gap-1 shrink-0">
    {children} <ChevronRight size={13} />
  </button>
);
const Empty = ({ text }: { text: string }) => (
  <div className="border border-dashed border-[var(--fb-line)] rounded-[var(--fb-radius)] p-8 text-center text-xs text-[var(--fb-muted)]">{text}</div>
);

function BattleCard({ b, go, cardCls, treatment }: any) {
  return (
    <button onClick={() => go(`/battle/${b.id}`)} className={`${cardCls} overflow-hidden text-left group fb-hover-lift hover:border-[var(--fb-accent)] flex flex-col`}>
      <div className="relative h-40 overflow-hidden bg-[var(--fb-surface-2)]">
        <img src={b.image || design_fallback} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${treatment === "duotone" ? "saturate-50 contrast-125" : treatment === "mono" ? "grayscale" : ""}`} onError={(e: any) => { e.currentTarget.src = design_fallback; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--fb-ink)] via-transparent" />
        <span className="absolute top-2.5 left-2.5 text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-1 bg-[var(--fb-accent)] text-white">{b.event}</span>
        <span className="absolute bottom-2.5 right-2.5 text-[10px] text-[var(--fb-muted)] flex items-center gap-1"><Eye size={11} />{fmtViews(b.views)}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="fb-display text-xl leading-tight">{b.title}</div>
        <p className="text-[11px] text-[var(--fb-muted)] line-clamp-2 flex-1">{b.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-[var(--fb-line)] text-[10px]">
          <span className="text-emerald-400 font-bold tracking-[0.12em] uppercase">Winner {b.winner} · {b.score}</span>
          <span className="text-[var(--fb-muted)]">{b.date}</span>
        </div>
      </div>
    </button>
  );
}
const design_fallback = "https://images.pexels.com/photos/10063145/pexels-photo-10063145.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=800";

/* ---------------------------- BATTLES ------------------------------- */
function Battles({ battles, go, cardCls }: any) {
  const [q, setQ] = useState("");
  const filtered = battles.filter((b: any) => `${b.title} ${b.event} ${b.mc1} ${b.mc2}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">Archive</div>
          <h1 className="fb-display text-4xl sm:text-5xl uppercase">Battle vault</h1>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search MC or event…" className="w-full sm:w-64 bg-[var(--fb-surface)] border border-[var(--fb-line)] rounded-[var(--fb-radius)] px-3 py-2.5 text-xs focus:outline-none focus:border-[var(--fb-accent)]" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b: any) => <BattleCard key={b.id} b={b} go={go} cardCls={cardCls} treatment="duotone" />)}
      </div>
      {!filtered.length && <Empty text="No battles match that search." />}
    </div>
  );
}

function BattleView({ id, battles, mcs, go, cardCls, onNeedAuth }: any) {
  const { user, profile, settings, toast } = useStore();
  const b = battles.find((x: any) => x.id === id) || battles[0];
  const { rows: comments } = useCollection("comments");
  const [text, setText] = useState("");
  const [play, setPlay] = useState(false);
  if (!b) return <Empty text="Battle not found." />;
  const thread = comments.filter((c) => c.target === b.id && c.status !== "removed").sort((a, b2) => (a.createdAt || 0) - (b2.createdAt || 0));

  async function post() {
    if (!user) return onNeedAuth();
    if (!text.trim()) return;
    if (profile?.muted || profile?.banned) return toast("Your account cannot post right now.", "err");
    const rl = settings.rateLimits?.commentsPerMin || 5;
    const recent = comments.filter((c) => c.authorId === user.uid && Date.now() - (c.createdAt || 0) < 60000);
    if (recent.length >= rl) return toast(`Slow down — ${rl} comments per minute.`, "err");
    try {
      await db.create("comments", { target: b!.id, targetType: "battle", body: text.trim().slice(0, 600), authorId: user.uid, author: profile?.username, status: "visible", createdAt: Date.now() }, "comments.create", b!.title);
      setText("");
      track("comment.create", { battle: b!.id });
      toast("Comment posted", "ok");
    } catch (e: any) {
      toast(e.message || "Could not post comment", "err");
    }
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3 text-[11px] tracking-[0.16em] uppercase">
        <button onClick={() => go("/")} className="text-[var(--fb-muted)] hover:text-[var(--fb-text)]">← Home</button>
        <span className="text-[var(--fb-line)]">/</span>
        <button onClick={() => go("/battles")} className="text-[var(--fb-muted)] hover:text-[var(--fb-accent)]">Battle vault</button>
      </div>
      <div>
        <div className="text-[10px] tracking-[0.24em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">{b.event} · {b.date}</div>
        <h1 className="fb-display text-4xl sm:text-6xl uppercase">{b.title}</h1>
      </div>

      <div className="relative w-full aspect-video bg-black border border-[var(--fb-line)] rounded-[var(--fb-radius-lg)] overflow-hidden">
        {b.youtubeId && play ? (
          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${b.youtubeId}?autoplay=1&rel=0`} title={b.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <button onClick={() => { setPlay(true); track("battle.play", { battle: b.id }); }} className="w-full h-full relative group">
            <img src={b.image || design_fallback} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 saturate-50" />
            <span className="relative z-10 grid place-items-center h-full">
              <span className="w-16 h-16 grid place-items-center bg-[var(--fb-accent)] text-white rounded-full group-hover:scale-110 transition shadow-2xl"><Play size={24} /></span>
            </span>
            {!b.youtubeId && <span className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-[var(--fb-muted)]">Video source not attached yet — admins bind it in the control center.</span>}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className={`${cardCls} p-6 space-y-5`}>
          <h2 className="fb-display text-2xl uppercase">Match overview</h2>
          <p className="text-sm text-[var(--fb-muted)] leading-relaxed">{b.description}</p>
          <div className="grid grid-cols-2 gap-3">
            {[b.mc1, b.mc2].map((name: string, i: number) => {
              const mc = mcs.find((m: any) => m.name === name);
              return (
                <div key={i} className="border border-[var(--fb-line)] rounded-[var(--fb-radius)] p-3 flex items-center gap-3">
                  <img src={mc?.avatar || avatarFor(name)} alt="" className="w-11 h-11 rounded-full object-cover" />
                  <div>
                    <div className="fb-display text-lg leading-none">{name}</div>
                    <div className="text-[10px] text-[var(--fb-muted)]">{mc?.style || "MC"} · {mc?.city || "—"}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fb-muted)] mb-2">Judging panel</div>
            <div className="flex flex-wrap gap-2">
              {(b.judges || []).map((j: string) => <span key={j} className="text-[11px] px-2.5 py-1 border border-[var(--fb-line)] rounded-[var(--fb-radius)]">{j}</span>)}
            </div>
          </div>
        </div>

        <div className={`${cardCls} p-6 space-y-4 h-fit`}>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fb-muted)]">Official decision</div>
            <div className="fb-display text-5xl mt-1">{b.score}</div>
            <div className="text-xs text-emerald-400 font-bold mt-1 tracking-[0.14em] uppercase">Winner · {b.winner}</div>
          </div>
          <div className="text-[11px] text-[var(--fb-muted)] flex items-center gap-1.5"><Eye size={13} /> {fmtViews(b.views)} views</div>
          <a href={`https://www.youtube.com/@FLOW-BARS`} target="_blank" rel="noreferrer" className="block text-center py-3 text-[11px] font-bold tracking-[0.16em] uppercase bg-[var(--fb-accent)] text-white hover:brightness-110 transition rounded-[var(--fb-radius)]">
            Subscribe on YouTube
          </a>
        </div>
      </div>

      {/* comments */}
      <div className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-[var(--fb-accent)]" />
          <h3 className="fb-display text-xl uppercase">Scorecards & takes ({thread.length})</h3>
        </div>
        <div className="flex gap-2 mb-5">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && post()} placeholder={user ? "Drop your scorecard…" : "Sign in to comment"} className="flex-1 bg-[var(--fb-surface-2)] border border-[var(--fb-line)] rounded-[var(--fb-radius)] px-3 py-2.5 text-xs focus:outline-none focus:border-[var(--fb-accent)]" />
          <button onClick={post} className="px-4 py-2.5 bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)] hover:brightness-110 transition"><Send size={14} /></button>
        </div>
        <div className="space-y-3">
          {thread.length === 0 && <Empty text="No comments yet. Be first." />}
          {thread.map((c) => (
            <div key={c.id} className="flex gap-3 pb-3 border-b border-[var(--fb-line)]/60 last:border-0">
              <img src={c.author ? avatarFor(c.author) : avatarFor()} alt="" className="w-8 h-8 rounded-full shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{c.author}</span>
                  <span className="text-[10px] text-[var(--fb-muted)]">{new Date(c.createdAt || 0).toLocaleString()}</span>
                </div>
                <p className="text-xs text-[var(--fb-muted)] mt-0.5 break-words">{c.body}</p>
              </div>
              <button onClick={() => report(c, "comment", toast)} className="ml-auto text-[var(--fb-muted)] hover:text-[var(--fb-accent)]" title="Report"><Flag size={13} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function report(target: any, targetType: string, toast: (m: string, k?: any) => void) {
  await db.create("reports", { targetType, targetId: target.id, reason: "user-flagged", status: "open", at: Date.now() }, "reports.create", target.id);
  toast("Report sent to moderators", "ok");
}

/* ---------------------------- RANKINGS ------------------------------ */
function Rankings({ mcs, cardCls }: any) {
  const ranked = [...mcs].sort((a: any, b: any) => a.rank - b.rank);
  return (
    <div className="py-10 space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">Season 5 ladder</div>
        <h1 className="fb-display text-4xl sm:text-5xl uppercase">Official rankings</h1>
      </div>
      <div className={`${cardCls} overflow-x-auto fb-scroll`}>
        <table className="w-full text-left min-w-[620px]">
          <thead className="text-[10px] tracking-[0.2em] uppercase text-[var(--fb-muted)] border-b border-[var(--fb-line)]">
            <tr>{["#", "MC", "City", "Style", "W", "L", "D", "Win %", "Streak"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ranked.map((mc: any) => {
              const total = mc.wins + mc.losses + (mc.draws || 0) || 1;
              return (
                <tr key={mc.id} className="border-b border-[var(--fb-line)]/50 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3"><span className="fb-display text-lg" style={{ color: mc.rank === 1 ? "var(--fb-accent-2)" : mc.rank <= 3 ? "var(--fb-accent)" : "var(--fb-muted)" }}>{mc.rank}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={mc.avatar || avatarFor(mc.name)} alt="" className="w-9 h-9 rounded-full object-cover border border-[var(--fb-line)]" />
                      <span className="fb-display text-lg">{mc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--fb-muted)]">{mc.city}</td>
                  <td className="px-4 py-3 text-xs text-[var(--fb-muted)]">{mc.style}</td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-400">{mc.wins}</td>
                  <td className="px-4 py-3 text-xs font-bold text-red-400">{mc.losses}</td>
                  <td className="px-4 py-3 text-xs text-[var(--fb-muted)]">{mc.draws || 0}</td>
                  <td className="px-4 py-3 text-xs font-bold">{Math.round((mc.wins / total) * 100)}%</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-1 rounded-[var(--fb-radius)]" style={{ background: "color-mix(in srgb, var(--fb-accent) 16%, transparent)", color: "var(--fb-accent)" }}>{mc.streak}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ ROSTER ------------------------------ */
function Roster({ mcs, cardCls }: any) {
  const ranked = [...mcs].sort((a: any, b: any) => a.rank - b.rank);
  return (
    <div className="py-10 space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">Competitors</div>
        <h1 className="fb-display text-4xl sm:text-5xl uppercase">MC roster</h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranked.map((mc: any) => (
          <div key={mc.id} className={`${cardCls} overflow-hidden fb-hover-lift hover:border-[var(--fb-accent)]`}>
            {mc.banner && <div className="h-24 overflow-hidden"><img src={mc.banner} alt="" className="w-full h-full object-cover" /></div>}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <img src={mc.avatar || avatarFor(mc.name)} alt="" className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: "var(--fb-accent)" }} />
                <div>
                  <div className="fb-display text-2xl leading-none">{mc.name}</div>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)] mt-1">Rank #{mc.rank} · {mc.city}</div>
                </div>
              </div>
              <p className="text-xs text-[var(--fb-muted)] leading-relaxed mb-4">{mc.bio}</p>
              <div className="grid grid-cols-3 text-center border-t border-[var(--fb-line)] pt-3">
                {[["W", mc.wins, "text-emerald-400"], ["L", mc.losses, "text-red-400"], ["STREAK", mc.streak, "text-[var(--fb-accent)]"]].map(([l, v, c]: any) => (
                  <div key={l}><div className={`fb-display text-xl ${c}`}>{v}</div><div className="text-[9px] tracking-[0.16em] uppercase text-[var(--fb-muted)]">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- NEWS ------------------------------- */
function News({ news, cardCls }: any) {
  const [open, setOpen] = useState<string | null>(news[0]?.id || null);
  return (
    <div className="py-10 space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">League office</div>
        <h1 className="fb-display text-4xl sm:text-5xl uppercase">News & events</h1>
      </div>
      <div className="space-y-3">
        {news.map((n: any) => (
          <article key={n.id} className={`${cardCls} overflow-hidden`}>
            <button onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full p-5 sm:p-6 text-left">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-[9px] tracking-[0.2em] font-bold px-2 py-0.5 bg-[var(--fb-accent)] text-white uppercase">{n.tag}</span>
                <span className="text-[10px] text-[var(--fb-muted)] flex items-center gap-1"><Calendar size={11} />{n.date}</span>
                <span className="text-[10px] text-[var(--fb-muted)]">by {n.author || "League Office"}</span>
              </div>
              <h2 className="fb-display text-2xl sm:text-3xl uppercase leading-tight">{n.title}</h2>
              <p className="text-xs text-[var(--fb-muted)] mt-2 leading-relaxed">{n.summary}</p>
            </button>
            {open === n.id && (
              <div className="px-5 sm:px-6 pb-6 border-t border-[var(--fb-line)] pt-4">
                <p className="text-sm text-[var(--fb-muted)] leading-relaxed">{n.content}</p>
              </div>
            )}
          </article>
        ))}
        {!news.length && <Empty text="No news published yet." />}
      </div>
    </div>
  );
}

/* ---------------------------- COMMUNITY ----------------------------- */
function Community({ onNeedAuth, cardCls }: any) {
  const { user, profile, settings, toast } = useStore();
  const { rows } = useCollection("chat");
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const msgs = [...rows].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(-80);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    if (!user) return onNeedAuth();
    if (!text.trim()) return;
    if (profile?.muted || profile?.banned) return toast("Your account is muted.", "err");
    const rl = settings.rateLimits?.chatPerMin || 10;
    const recent = rows.filter((m) => m.uid === user.uid && Date.now() - (m.createdAt || 0) < 60000);
    if (recent.length >= rl) return toast(`Rate limit: ${rl} messages/minute.`, "err");
    try {
      await db.create("chat", { text: text.trim().slice(0, 400), sender: profile?.username || user.username, uid: user.uid, createdAt: Date.now() }, "chat.post", "");
      setText("");
      track("chat.send");
    } catch (e: any) {
      toast(e.message || "Could not send message", "err");
    }
  }

  return (
    <div className="py-10 space-y-5">
      <div>
        <div className="text-[10px] tracking-[0.28em] text-[var(--fb-accent)] font-bold uppercase mb-1.5">Live room</div>
        <h1 className="fb-display text-4xl sm:text-5xl uppercase">Community chat</h1>
      </div>
      <div className={`${cardCls} flex flex-col h-[70vh] overflow-hidden`}>
        <div ref={box} className="flex-1 overflow-y-auto fb-scroll p-4 space-y-3">
          {msgs.length === 0 && <Empty text="Room is quiet. First bar wins." />}
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.uid === user?.uid ? "" : ""}`}>
              <img src={avatarFor(m.sender)} alt="" className="w-8 h-8 rounded-full shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: m.uid === user?.uid ? "var(--fb-accent)" : undefined }}>{m.sender}</span>
                  <span className="text-[10px] text-[var(--fb-muted)]">{new Date(m.createdAt || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm text-[var(--fb-muted)] break-words">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--fb-line)] flex gap-2 bg-[var(--fb-surface-2)]">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={user ? "Say something…" : "Sign in to join the room"} className="flex-1 bg-[var(--fb-ink)] border border-[var(--fb-line)] rounded-[var(--fb-radius)] px-3 py-2.5 text-xs focus:outline-none focus:border-[var(--fb-accent)]" />
          <button onClick={send} className="px-4 bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)] hover:brightness-110 transition"><Send size={15} /></button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ PROFILE ----------------------------- */
function Profile({ go, onNeedAuth, cardCls }: any) {
  const { user, profile, myRoles, toast, refreshProfile } = useStore();
  const [form, setForm] = useState({ username: "", bio: "", avatar: "", banner: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (profile) setForm({ username: profile.username || "", bio: profile.bio || "", avatar: profile.avatar || "", banner: profile.banner || "" });
  }, [profile]);

  if (!user) {
    return (
      <div className="py-24 text-center space-y-4">
        <UserIcon size={40} className="mx-auto text-[var(--fb-muted)]" />
        <h1 className="fb-display text-3xl uppercase">Sign in required</h1>
        <button onClick={onNeedAuth} className="px-5 py-3 text-[11px] font-bold tracking-[0.16em] uppercase bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)]">Sign in</button>
      </div>
    );
  }

  async function save() {
    try {
      await db.update("users", user!.uid, { ...form }, "profile.edit", form.username);
      await refreshProfile();
      toast("Profile updated", "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }
  async function changePw() {
    setMsg("");
    const res = await auth.changePassword(pw.current, pw.next);
    setMsg(res.ok ? "Password changed." : res.error);
    if (res.ok) setPw({ current: "", next: "" });
  }

  const input = "w-full bg-[var(--fb-surface-2)] border border-[var(--fb-line)] rounded-[var(--fb-radius)] px-3 py-2.5 text-xs focus:outline-none focus:border-[var(--fb-accent)]";

  return (
    <div className="py-10 space-y-5">
      <div className={`${cardCls} overflow-hidden`}>
        <div className="h-36 sm:h-44 relative bg-[var(--fb-surface-2)]">
          {profile?.banner ? <img src={profile.banner} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full fb-grid-lines opacity-40" />}
        </div>
        <div className="p-5 -mt-12 relative">
          <img src={profile?.avatar || avatarFor(profile?.username)} alt="" className="w-24 h-24 rounded-full border-4 object-cover" style={{ borderColor: "var(--fb-ink)" }} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="fb-display text-3xl uppercase">{profile?.username}</h1>
            {myRoles.map((r: any) => (
              <span key={r.id} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${r.color}22`, color: r.color }}>{r.name}</span>
            ))}
          </div>
          <p className="text-xs text-[var(--fb-muted)] mt-1.5">{profile?.bio}</p>
          <div className="text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)] mt-3 flex items-center gap-4">
            <span>Joined {profile?.joined}</span>
            <span className="flex items-center gap-1"><ShieldCheck size={12} /> {profile?.provider || "password"}</span>
            {profile?.status === "active" && <span className="text-emerald-400">Active</span>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`${cardCls} p-5 space-y-3`}>
          <h2 className="fb-display text-xl uppercase">Public profile</h2>
          <label className="block text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)]">Username<input className={input + " mt-1"} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label className="block text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)]">Bio<textarea rows={3} className={input + " mt-1"} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
          <label className="block text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)]">Avatar URL<input className={input + " mt-1"} value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></label>
          <label className="block text-[10px] tracking-[0.16em] uppercase text-[var(--fb-muted)]">Banner URL<input className={input + " mt-1"} value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} /></label>
          <button onClick={save} className="w-full py-3 text-[11px] font-bold tracking-[0.16em] uppercase bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)] hover:brightness-110 transition">Save profile</button>
        </div>

        <div className={`${cardCls} p-5 space-y-3`}>
          <h2 className="fb-display text-xl uppercase">Change password</h2>
          <input type="password" className={input} placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" className={input} placeholder="New password (8+ chars, letter + number)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <button onClick={changePw} className="w-full py-3 text-[11px] font-bold tracking-[0.16em] uppercase border border-[var(--fb-line)] hover:border-[var(--fb-accent)] rounded-[var(--fb-radius)] transition">Update password</button>
          {msg && <p className={`text-[11px] ${msg.includes("changed") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
          <div className="pt-3 border-t border-[var(--fb-line)] text-[10px] text-[var(--fb-muted)] leading-relaxed">
            Recovery is handled through the sign-in dialog ("Forgot password") using your account email. Phone / SMS recovery is not offered.
          </div>
          <button onClick={() => go("/")} className="text-[11px] text-[var(--fb-muted)] hover:text-[var(--fb-accent)]">← Back to the site</button>
        </div>
      </div>
    </div>
  );
}
