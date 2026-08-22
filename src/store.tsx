import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  bootstrap,
  db,
  getDriver,
  logError,
  setActor,
  track,
  type CollectionName,
  type Row,
  type SessionUser,
} from "./lib/backend";
import { auth as authApi, type AuthUser } from "./lib/auth";
import { DEFAULT_ROLES, effectivePermissions, highestRole, type Role } from "./lib/permissions";
import { DEFAULT_DESIGN, DEFAULT_SETTINGS, type DesignConfig } from "./lib/seed";

/* ------------------------- collection hook -------------------------- */
export function useCollection(col: CollectionName, enabled = true): { rows: Row[]; loading: boolean } {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    let off: (() => void) | null = null;
    let alive = true;
    db.subscribe(col, (r) => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    })
      .then((d) => {
        off = d;
      })
      .catch((e) => logError(e, `subscribe:${col}`));
    return () => {
      alive = false;
      off?.();
    };
  }, [col, enabled]);
  return { rows, loading };
}

/* --------------------------- design tokens -------------------------- */
export function applyDesign(design: DesignConfig | null) {
  const d = design || ({ ...DEFAULT_DESIGN } as DesignConfig);
  const r = document.documentElement.style;
  const t = d.tokens;
  r.setProperty("--fb-accent", t.accent);
  r.setProperty("--fb-accent-2", t.accent2);
  r.setProperty("--fb-ink", t.ink);
  r.setProperty("--fb-surface", t.surface);
  r.setProperty("--fb-surface-2", t.surface2);
  r.setProperty("--fb-line", t.line);
  r.setProperty("--fb-text", t.text);
  r.setProperty("--fb-muted", t.muted);
  r.setProperty("--fb-radius", `${t.radius}px`);
  r.setProperty("--fb-radius-lg", `${t.radiusLg}px`);
  r.setProperty("--fb-space", String(t.space));
  r.setProperty("--fb-border-w", `${t.borderW}px`);
  r.setProperty("--fb-shadow", `0 ${20 * t.shadow}px ${50 * t.shadow}px ${-25 * t.shadow}px rgba(0,0,0,${0.9 * t.shadow})`);
  r.setProperty("--fb-font-display", t.fontDisplay);
  r.setProperty("--fb-font-body", t.fontBody);
  r.setProperty("--fb-anim", String(Math.max(0.0001, t.anim)));
  r.setProperty("--fb-grain", String(t.grain));
}

/* ------------------------------ toasts ------------------------------ */
export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "err" | "info";
}

interface Ctx {
  ready: boolean;
  backendBlocked: boolean;
  backend: "firestore" | "local";
  user: AuthUser | null;
  profile: Row | null;
  roles: Role[];
  myRoles: Role[];
  perms: Set<string>;
  can: (key: string) => boolean;
  settings: Record<string, any>;
  setting: <T>(key: string, fallback: T) => T;
  design: DesignConfig;
  designVersion: number;
  reload: () => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  refreshProfile: () => Promise<void>;
}

const StoreCtx = createContext<Ctx>(null as any);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [backendBlocked, setBackendBlocked] = useState(false);
  const [backend, setBackend] = useState<"firestore" | "local">("local");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Row | null>(null);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [settings, setSettings] = useState<Record<string, any>>(DEFAULT_SETTINGS);
  const [design, setDesign] = useState<DesignConfig>({ ...DEFAULT_DESIGN, version: 1, updatedAt: 0, channel: "published" } as DesignConfig);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /* boot */
  useEffect(() => {
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };
    // Safety net: if Firestore's realtime channel is blocked by an ad
    // blocker / privacy extension (net::ERR_BLOCKED_BY_CLIENT), onSnapshot
    // never calls back and never errors, so boot would otherwise hang
    // forever on the loading screen. Force the app to render after a
    // timeout, falling back to whatever defaults are already in state.
    const bootTimeout = setTimeout(() => {
      if (settled) return;
      console.warn("[boot] timed out waiting for backend; showing app with defaults. If you use an ad blocker, some live data may be unavailable until it's disabled for this site.");
      setBackendBlocked(true);
      markReady();
    }, 3000);

    (async () => {
      await bootstrap();
      setBackend((await getDriver()).name);
      track("app.boot");
      const off = await db.subscribe("roles", (r) => setRoles((r as unknown as Role[]) || DEFAULT_ROLES));
      const offS = await db.subscribe("settings", (rows) => {
        const map: Record<string, any> = { ...DEFAULT_SETTINGS };
        rows.forEach((r) => (map[r.id] = r.value));
        setSettings(map);
      });
      const offD = await db.subscribe("design", (rows) => {
        const pub = rows.find((r) => r.id === "published");
        if (pub) setDesign({ ...DEFAULT_DESIGN, ...pub, tokens: { ...DEFAULT_DESIGN.tokens, ...pub.tokens }, components: { ...DEFAULT_DESIGN.components, ...pub.components } } as unknown as DesignConfig);
      });
      clearTimeout(bootTimeout);
      setBackendBlocked(false);
      markReady();
      return () => {
        off();
        offS();
        offD();
      };
    })().catch((e) => {
      logError(e, "store.boot");
      clearTimeout(bootTimeout);
      markReady();
    });
    window.addEventListener("error", (ev) => logError(ev.error || ev.message, "window"));
    window.addEventListener("unhandledrejection", (ev: any) => logError(ev.reason, "promise"));
    return () => clearTimeout(bootTimeout);
  }, []);

  /* auth listener */
  useEffect(() => {
    const off = authApi.onChange(async (u) => {
      setUser(u);
      if (!u) {
        setActor(null);
        setProfile(null);
        return;
      }
      const p = await db.get("users", u.uid);
      setProfile(p);
      const actor: SessionUser = {
        uid: u.uid,
        username: p?.username || u.username,
        email: p?.email || u.email,
        provider: u.provider,
        roles: p?.roles || [],
        profile: p || ({} as Row),
      };
      setActor(actor);
    });
    return off;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await db.get("users", user.uid);
    setProfile(p);
    if (p) setActor({ uid: user.uid, username: p.username, email: p.email, provider: user.provider, roles: p.roles || [], profile: p });
  }, [user]);

  /* live profile updates for the signed-in user */
  useEffect(() => {
    if (!user) return;
    let off: (() => void) | null = null;
    db.subscribe("users", (rows) => {
      const me = rows.find((r) => r.id === user.uid);
      if (me) {
        setProfile(me);
        setActor({
          uid: user.uid,
          username: me.username,
          email: me.email,
          provider: user.provider,
          roles: me.roles || [],
          profile: me,
        });
      }
    }).then((d) => (off = d));
    return () => off?.();
  }, [user]);

  useEffect(() => {
    applyDesign(design);
  }, [design]);

  const perms = useMemo(() => effectivePermissions(profile?.roles || [], roles), [profile?.roles, roles]);
  const can = useCallback((key: string) => perms.has(key), [perms]);
  const myRoles = useMemo(() => (profile?.roles || []).map((id: string) => roles.find((r) => r.id === id)).filter(Boolean) as Role[], [profile, roles]);

  const value: Ctx = {
    ready,
    backendBlocked,
    backend,
    user,
    profile,
    roles,
    myRoles,
    perms,
    can,
    settings,
    setting: <T,>(key: string, fallback: T) => (settings[key] ?? fallback) as T,
    design,
    designVersion: design.version || 1,
    reload: () => refreshProfile(),
    toasts,
    toast,
    dismissToast,
    refreshProfile,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useTopRole() {
  const { myRoles } = useStore();
  return highestRole(myRoles.map((r) => r.id), myRoles);
}

export { track, db, highestRole };
