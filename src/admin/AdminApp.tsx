import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Newspaper, Swords, CalendarRange, Mic, Trophy, FileText, Tags, Image,
  Users, MessageSquare, Flag, Bell, Palette, Shield, Database, Settings2, Plug, KeyRound,
  HardDrive, Trash2, Mail, BarChart3, ScrollText, LogOut, Menu, X, ExternalLink, Lock,
  ChevronRight, Loader2, UserCog, Ban,
} from "lucide-react";
import { useStore, useCollection } from "../store";
import { auth } from "../lib/auth";
import { FIREBASE_READY } from "../lib/config";
import { Btn, Field, inputCls, Panel } from "./ui";
import Overview from "./sections/Overview";
import ContentSection from "./sections/Content";
import CommunitySection from "./sections/Community";
import AppearanceSection from "./sections/Appearance";
import SystemSection from "./sections/System";
import AnalyticsSection from "./sections/Analytics";
import LogsSection from "./sections/Logs";

interface NavLeaf {
  id: string;
  label: string;
  icon: any;
  perm: string;
}
interface NavGroup {
  id: string;
  label: string;
  icon: any;
  perm: string;
  leaves: NavLeaf[];
}

const NAV: NavGroup[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, perm: "dashboard.view", leaves: [{ id: "main", label: "Platform overview", icon: LayoutDashboard, perm: "dashboard.view" }] },
  {
    id: "content",
    label: "Content",
    icon: Newspaper,
    perm: "news.view",
    leaves: [
      { id: "news", label: "News", icon: Newspaper, perm: "news.view" },
      { id: "battles", label: "Battles", icon: Swords, perm: "battles.view" },
      { id: "events", label: "Events", icon: CalendarRange, perm: "events.view" },
      { id: "mcs", label: "MCs", icon: Mic, perm: "mcs.view" },
      { id: "rankings", label: "Rankings", icon: Trophy, perm: "rankings.view" },
      { id: "pages", label: "Pages", icon: FileText, perm: "pages.view" },
      { id: "categories", label: "Categories", icon: Tags, perm: "categories.manage" },
      { id: "tags", label: "Tags", icon: Tags, perm: "tags.manage" },
      { id: "media", label: "Media", icon: Image, perm: "media.view" },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    perm: "users.view",
    leaves: [
      { id: "users", label: "Users", icon: Users, perm: "users.view" },
      { id: "profiles", label: "Profiles", icon: UserCog, perm: "users.view" },
      { id: "comments", label: "Comments", icon: MessageSquare, perm: "comments.view" },
      { id: "chat", label: "Chat", icon: MessageSquare, perm: "chat.view" },
      { id: "reports", label: "Reports", icon: Flag, perm: "reports.view" },
      { id: "moderation", label: "Moderation", icon: Ban, perm: "users.mute" },
      { id: "notifications", label: "Notifications", icon: Bell, perm: "notifications.send" },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    perm: "design.view",
    leaves: [
      { id: "design", label: "Design Mode", icon: Palette, perm: "design.view" },
      { id: "theme", label: "Theme & colour", icon: Palette, perm: "theme.edit" },
      { id: "typography", label: "Typography", icon: FileText, perm: "typography.edit" },
      { id: "sections", label: "Homepage sections", icon: LayoutDashboard, perm: "sections.edit" },
      { id: "navigation", label: "Navigation", icon: ChevronRight, perm: "navigation.edit" },
      { id: "footer", label: "Footer", icon: FileText, perm: "footer.edit" },
      { id: "components", label: "Components", icon: Image, perm: "components.edit" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Shield,
    perm: "settings.view",
    leaves: [
      { id: "roles", label: "Roles", icon: Shield, perm: "roles.view" },
      { id: "permissions", label: "Permissions", icon: KeyRound, perm: "permissions.grant" },
      { id: "database", label: "Database", icon: Database, perm: "database.view" },
      { id: "settings", label: "Settings", icon: Settings2, perm: "settings.view" },
      { id: "integrations", label: "Integrations", icon: Plug, perm: "integrations.view" },
      { id: "api", label: "API", icon: KeyRound, perm: "api.keys" },
      { id: "storage", label: "Storage", icon: HardDrive, perm: "storage.view" },
      { id: "cache", label: "Cache", icon: Trash2, perm: "cache.clear" },
      { id: "email", label: "Email", icon: Mail, perm: "email.edit" },
      { id: "security", label: "Security", icon: Lock, perm: "security.view" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    perm: "analytics.view",
    leaves: [
      { id: "users", label: "Users", icon: Users, perm: "analytics.view" },
      { id: "traffic", label: "Traffic", icon: BarChart3, perm: "analytics.view" },
      { id: "content", label: "Content", icon: Newspaper, perm: "analytics.view" },
      { id: "battles", label: "Battle views", icon: Swords, perm: "analytics.view" },
      { id: "community", label: "Community", icon: MessageSquare, perm: "analytics.view" },
    ],
  },
  {
    id: "logs",
    label: "Logs",
    icon: ScrollText,
    perm: "logs.view",
    leaves: [
      { id: "audit", label: "Audit log", icon: ScrollText, perm: "logs.audit" },
      { id: "logins", label: "Login history", icon: Lock, perm: "logs.logins" },
      { id: "security", label: "Security events", icon: Shield, perm: "logs.security" },
      { id: "errors", label: "System errors", icon: Flag, perm: "logs.errors" },
    ],
  },
];

export default function AdminApp({ adminPath }: { adminPath: string }) {
  const { ready, user, profile, can, perms, backend, myRoles } = useStore();
  const [hash, setHash] = useState(window.location.hash.replace(/^#/, ""));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const fn = () => setHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  const parts = hash.split("/").filter(Boolean);
  const section = parts[1] || firstAllowedSection(can);
  const sub = parts[2] || "main";
  const go = (s: string, l?: string) => {
    window.location.hash = `/${adminPath}/${s}${l ? `/${l}` : ""}`;
    setNavOpen(false);
  };

  const groups = useMemo(
    () =>
      NAV.filter((g) => can(g.perm))
        .map((g) => ({ ...g, leaves: g.leaves.filter((l) => can(l.perm)) }))
        .filter((g) => g.leaves.length),
    [can],
  );

  if (!ready) return <BootScreen label="Loading control center…" />;
  if (!user || !profile) return <AdminLogin adminPath={adminPath} />;
  if (!can("admin.access")) return <Forbidden adminPath={adminPath} />;

  const topRole = myRoles[0];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex">
      {/* ------------------------- SIDEBAR ------------------------ */}
      <aside
        className={`fixed lg:sticky top-0 z-[70] h-screen w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-transform ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-neutral-800">
          <span className="w-8 h-8 grid place-items-center bg-red-600 text-white font-black text-[11px] -skew-x-6">F&B</span>
          <span className="min-w-0">
            <span className="block font-mono text-[11px] font-bold tracking-[0.18em] uppercase leading-tight">Control center</span>
            <span className="block font-mono text-[9px] text-neutral-500">/{adminPath}</span>
          </span>
          <button className="ml-auto lg:hidden text-neutral-500" onClick={() => setNavOpen(false)}><X size={16} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto fb-scroll py-3">
          {groups.map((g) => {
            const GIcon = g.icon;
            const activeGroup = g.id === section;
            return (
              <div key={g.id} className="mb-1">
                <button
                  onClick={() => go(g.id, g.leaves[0]?.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 font-mono text-[11px] font-bold tracking-[0.14em] uppercase transition ${
                    activeGroup ? "text-white bg-neutral-900 border-l-2 border-red-600" : "text-neutral-500 hover:text-neutral-200 border-l-2 border-transparent"
                  }`}
                >
                  <GIcon size={14} /> {g.label}
                </button>
                {activeGroup && g.leaves.length > 1 && (
                  <div className="ml-4 pl-3 border-l border-neutral-800 my-1">
                    {g.leaves.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => go(g.id, l.id)}
                        className={`w-full text-left px-3 py-1.5 text-[11px] transition flex items-center gap-2 ${
                          sub === l.id ? "text-red-400 font-semibold" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 p-3 space-y-2">
          <div className="font-mono text-[9px] text-neutral-600 leading-relaxed">
            <div className="flex items-center justify-between"><span>BACKEND</span><span className={backend === "firestore" ? "text-emerald-400" : "text-amber-400"}>{backend.toUpperCase()}</span></div>
            <div className="flex items-center justify-between"><span>PERMISSIONS</span><span className="text-neutral-400">{perms.size}</span></div>
            <div className="flex items-center justify-between"><span>ROLE</span><span style={{ color: topRole?.color }}>{(topRole?.name || "—").toUpperCase()}</span></div>
          </div>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 z-[65] bg-black/70 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* -------------------------- MAIN -------------------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-[60] h-14 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 flex items-center gap-3 px-3 sm:px-5">
          <button className="lg:hidden text-neutral-400" onClick={() => setNavOpen(true)}><Menu size={18} /></button>
          <div className="font-mono text-[11px] text-neutral-500 truncate">
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300">{section}</span>
            <span className="text-neutral-600"> / </span>
            <span className="text-red-400">{sub}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="#/" className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500 hover:text-white"><ExternalLink size={12} /> SITE</a>
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
              <img src={avatarFor(profile?.username)} className="w-5 h-5 rounded-full" alt="" />
              <span className="font-mono text-[10px] text-neutral-300">{profile?.username}</span>
            </span>
            <button
              onClick={async () => { await auth.signOut(); window.location.hash = "/"; }}
              className="p-2 text-neutral-500 hover:text-red-500"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 max-w-[1600px] w-full mx-auto">
          {section === "overview" && <Overview go={go} />}
          {section === "content" && <ContentSection sub={sub} setSub={(s: string) => go("content", s)} />}
          {section === "community" && <CommunitySection sub={sub} setSub={(s: string) => go("community", s)} />}
          {section === "appearance" && <AppearanceSection sub={sub} setSub={(s: string) => go("appearance", s)} />}
          {section === "system" && <SystemSection sub={sub} setSub={(s: string) => go("system", s)} />}
          {section === "analytics" && <AnalyticsSection sub={sub} setSub={(s: string) => go("analytics", s)} />}
          {section === "logs" && <LogsSection sub={sub} setSub={(s: string) => go("logs", s)} />}
          {!NAV.some((n) => n.id === section) && <Panel title="Not found"><p className="text-[11px] text-neutral-500">Unknown console section.</p></Panel>}
        </main>
      </div>
    </div>
  );
}

function firstAllowedSection(can: (k: string) => boolean) {
  const g = NAV.find((n) => can(n.perm));
  return g?.id || "overview";
}

function avatarFor(username = "") {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username || "admin")}&backgroundColor=e10600&textColor=ffffff&fontFamily=monospace`;
}

/* -------------------------- BOOT / GATES -------------------------- */
function BootScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 grid place-items-center">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto text-red-600 animate-spin" size={26} />
        <p className="font-mono text-[11px] text-neutral-500 tracking-[0.2em] uppercase">{label}</p>
      </div>
    </div>
  );
}

function Forbidden({ adminPath }: { adminPath: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 grid place-items-center p-6">
      <div className="max-w-sm w-full bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center space-y-3">
        <Lock className="mx-auto text-red-600" size={28} />
        <h1 className="font-mono text-sm font-bold tracking-[0.16em] uppercase">403 — Not authorised</h1>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Your account is authenticated but does not hold <code className="text-red-400">admin.access</code>. The attempt has been written to the security log.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Btn variant="outline" onClick={() => (window.location.hash = "/")}>Back to site</Btn>
          <Btn variant="danger" onClick={async () => { await auth.signOut(); window.location.hash = `/${adminPath}`; }}>Switch account</Btn>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ adminPath }: { adminPath: string }) {
  const { toast, refreshProfile } = useStore();
  const { rows: users } = useCollection("users");
  const [mode, setMode] = useState<"signin" | "bootstrap">(users.length ? "signin" : "bootstrap");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!users.length) setMode("bootstrap");
  }, [users.length]);

  async function attempt(kind: "signin" | "bootstrap" | "google" | "facebook") {
    setBusy(kind);
    setErr("");
    const res =
      kind === "signin" ? await auth.signIn(username, password)
      : kind === "bootstrap" ? await auth.signUp(username, password, email)
      : kind === "google" ? await auth.google()
      : await auth.facebook();
    setBusy("");
    if (!res.ok) return setErr(res.error);
    await refreshProfile();
    toast(`Authenticated as ${res.user.username}`, "ok");
    window.location.hash = `/${adminPath}/overview/main`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 grid place-items-center p-4 fb-grid-lines">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="h-1 bg-red-600" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 grid place-items-center bg-red-600 text-white font-black text-[11px] -skew-x-6">F&B</span>
            <div>
              <div className="font-mono text-[12px] font-bold tracking-[0.18em] uppercase">Control center</div>
              <div className="font-mono text-[9px] text-neutral-500">/{adminPath} · staff only</div>
            </div>
          </div>

          {err && <div className="text-[11px] text-red-300 border border-red-900 bg-red-950/40 rounded p-2.5">{err}</div>}

          {mode === "bootstrap" ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-amber-300 border border-amber-900/60 bg-amber-950/30 rounded p-2.5 leading-relaxed">
                No owner exists yet. The account you create here is promoted to <b>OWNER</b> with full platform control.
              </div>
              <Field label="Owner username"><input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></Field>
              <Field label="Password" hint="8+ characters, letters and numbers."><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Recovery email (recommended)"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Btn variant="primary" className="w-full justify-center" disabled={!!busy} icon={busy === "bootstrap" ? <Loader2 size={12} className="animate-spin" /> : undefined} onClick={() => attempt("bootstrap")}>
                Create owner account
              </Btn>
            </div>
          ) : (
            <div className="space-y-2.5">
              <Field label="Username"><input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" onKeyDown={(e) => e.key === "Enter" && attempt("signin")} /></Field>
              <Field label="Password"><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && attempt("signin")} /></Field>
              <Btn variant="primary" className="w-full justify-center" disabled={!!busy} icon={busy === "signin" ? <Loader2 size={12} className="animate-spin" /> : undefined} onClick={() => attempt("signin")}>
                Authenticate
              </Btn>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="font-mono text-[9px] text-neutral-600 tracking-[0.2em]">SSO</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Btn variant="outline" className="justify-center" disabled={!!busy} onClick={() => attempt("google")}>Google</Btn>
            <Btn variant="outline" className="justify-center" disabled={!!busy} onClick={() => attempt("facebook")}>Facebook</Btn>
          </div>

          {!FIREBASE_READY && (
            <p className="text-[10px] text-neutral-600 leading-relaxed">
              Firebase env vars are absent → credentials are verified against the local PBKDF2 store. Configure{" "}
              <code className="text-neutral-400">VITE_FIREBASE_*</code> for server-verified identity and OAuth.
            </p>
          )}
          <a href="#/" className="block text-center font-mono text-[10px] text-neutral-600 hover:text-neutral-400">← public site</a>
        </div>
      </div>
    </div>
  );
}
