/**
 * FLOW & BARS data layer.
 *
 * One API, two real drivers:
 *   • FirestoreBackend — modular v11 SDK, live onSnapshot subscriptions.
 *   • LocalBackend     — durable browser storage with the same semantics.
 *
 * Every mutation funnels through `guard()`, which resolves the calling
 * user's roles from the database (never from a client-side claim), checks
 * the granular permission key, writes an audit record and only then
 * performs the write. The identical model is compiled into Firestore
 * Security Rules so it is enforced server-side too.
 */
import { APP_ID, FIREBASE_CONFIG, FIREBASE_READY } from "./config";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLES, effectivePermissions, type Role } from "./permissions";
import { DEFAULT_CONTENT, DEFAULT_DESIGN, DEFAULT_SETTINGS } from "./seed";

export type Row = Record<string, any> & { id: string };

export const COLLECTIONS = [
  "settings",
  "design",
  "roles",
  "users",
  "usernames",
  "sessions",
  "battles",
  "mcs",
  "news",
  "events",
  "pages",
  "categories",
  "tags",
  "media",
  "comments",
  "chat",
  "reports",
  "notifications",
  "analytics",
  "audit_logs",
  "login_logs",
  "security_logs",
  "error_logs",
  "api_keys",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export const COLLECTION_META: Record<CollectionName, { label: string; fields: string[]; description: string }> = {
  settings: { label: "Platform settings", fields: ["key", "value", "updatedAt"], description: "Singleton configuration documents." },
  design: { label: "Design versions", fields: ["channel", "tokens", "sections", "version"], description: "Draft / published / history design payloads." },
  roles: { label: "Roles", fields: ["name", "slug", "rank", "color", "icon", "permissions[]"], description: "RBAC role definitions." },
  users: { label: "Users", fields: ["uid", "username", "email", "roles[]", "status", "createdAt"], description: "Account profiles." },
  usernames: { label: "Username index", fields: ["username", "email", "uid"], description: "Case-insensitive username → credential map." },
  sessions: { label: "Sessions", fields: ["uid", "ip", "ua", "provider", "at"], description: "Active and historic sign-in sessions." },
  battles: { label: "Battles", fields: ["title", "event", "mc1", "mc2", "youtubeId", "score", "winner"], description: "Official matchups." },
  mcs: { label: "MC roster", fields: ["name", "rank", "wins", "losses", "draws", "bio"], description: "Competitors." },
  news: { label: "News", fields: ["title", "tag", "date", "summary", "content", "status"], description: "Announcements and articles." },
  events: { label: "Events", fields: ["title", "date", "venue", "status"], description: "Shows and tournaments." },
  pages: { label: "Pages", fields: ["title", "slug", "body", "status"], description: "Static pages." },
  categories: { label: "Categories", fields: ["name", "slug"], description: "Content taxonomy." },
  tags: { label: "Tags", fields: ["name", "slug"], description: "Content tags." },
  media: { label: "Media", fields: ["name", "url", "type", "size"], description: "Asset library." },
  comments: { label: "Comments", fields: ["body", "authorId", "target", "status"], description: "User comments." },
  chat: { label: "Chat messages", fields: ["text", "sender", "uid", "createdAt"], description: "Community room." },
  reports: { label: "Reports", fields: ["reason", "targetType", "targetId", "status"], description: "Moderation queue." },
  notifications: { label: "Notifications", fields: ["title", "body", "audience", "createdAt"], description: "In-platform notices." },
  analytics: { label: "Analytics events", fields: ["type", "at", "meta"], description: "Real behavioural events." },
  audit_logs: { label: "Audit log", fields: ["actor", "action", "target", "at"], description: "Every admin mutation." },
  login_logs: { label: "Login history", fields: ["identity", "method", "result", "at"], description: "Authentication attempts." },
  security_logs: { label: "Security events", fields: ["type", "detail", "at"], description: "Violations, lockouts, rule errors." },
  error_logs: { label: "System errors", fields: ["message", "stack", "at"], description: "Captured runtime errors." },
  api_keys: { label: "API keys", fields: ["label", "scopes", "createdAt", "revoked"], description: "Public read-API keys." },
};

/* ------------------------------------------------------------------ */
/* ids + helpers                                                       */
/* ------------------------------------------------------------------ */
export function genId(prefix = "") {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${prefix ? "_" : ""}${Date.now().toString(36)}${rnd}`;
}

export interface BackendDriver {
  name: "firestore" | "local";
  list(col: CollectionName): Promise<Row[]>;
  get(col: CollectionName, id: string): Promise<Row | null>;
  set(col: CollectionName, id: string, data: Record<string, any>): Promise<void>;
  add(col: CollectionName, data: Record<string, any>): Promise<Row>;
  update(col: CollectionName, id: string, patch: Record<string, any>): Promise<void>;
  remove(col: CollectionName, id: string): Promise<void>;
  bulkRemove(col: CollectionName, ids: string[]): Promise<number>;
  subscribe(col: CollectionName, cb: (rows: Row[]) => void): () => void;
  snapshotAll(): Promise<Record<string, Row[]>>;
  replaceAll(data: Record<string, Row[]>, opts?: { wipe?: boolean }): Promise<void>;
}

/* ---------------------------- LOCAL DRIVER ------------------------- */
const LS_KEY = `fb:db:${APP_ID}:v1`;
type LocalShape = Record<string, Record<string, Row>>;

function readLocal(): LocalShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeLocal(db: LocalShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("[fb] storage write failed", e);
  }
  const subs = localListeners.get("*") || new Set();
  subs.forEach((fn) => fn());
}

const localListeners = new Map<string, Set<() => void>>();
function localNotify(col: CollectionName) {
  (localListeners.get(col) || new Set()).forEach((fn) => fn());
  (localListeners.get("*") || new Set()).forEach((fn) => fn());
}

export const localDriver: BackendDriver = {
  name: "local",
  async list(col) {
    return Object.values(readLocal()[col] || {});
  },
  async get(col, id) {
    return readLocal()[col]?.[id] || null;
  },
  async set(col, id, data) {
    const db = readLocal();
    db[col] = db[col] || {};
    db[col][id] = { ...db[col][id], ...data, id, updatedAt: Date.now() };
    writeLocal(db);
    localNotify(col);
  },
  async add(col, data) {
    const id = (data.id as string) || genId(col.slice(0, 3));
    const row: Row = { ...data, id, createdAt: data.createdAt || Date.now(), updatedAt: Date.now() };
    const db = readLocal();
    db[col] = db[col] || {};
    db[col][id] = row;
    writeLocal(db);
    localNotify(col);
    return row;
  },
  async update(col, id, patch) {
    const db = readLocal();
    if (!db[col]?.[id]) throw new Error(`Record ${col}/${id} not found`);
    db[col][id] = { ...db[col][id], ...patch, updatedAt: Date.now() };
    writeLocal(db);
    localNotify(col);
  },
  async remove(col, id) {
    const db = readLocal();
    if (db[col]?.[id]) {
      delete db[col][id];
      writeLocal(db);
      localNotify(col);
    }
  },
  async bulkRemove(col, ids) {
    const db = readLocal();
    let n = 0;
    ids.forEach((id) => {
      if (db[col]?.[id]) {
        delete db[col][id];
        n++;
      }
    });
    if (n) {
      writeLocal(db);
      localNotify(col);
    }
    return n;
  },
  subscribe(col, cb) {
    const set = localListeners.get(col) || new Set<() => void>();
    const fn = () => cb(Object.values(readLocal()[col] || {}));
    set.add(fn);
    localListeners.set(col, set);
    fn();
    return () => {
      set.delete(fn);
    };
  },
  async snapshotAll() {
    const db = readLocal();
    const out: Record<string, Row[]> = {};
    COLLECTIONS.forEach((c) => (out[c] = Object.values(db[c] || {})));
    return out;
  },
  async replaceAll(data, opts) {
    const db: LocalShape = opts?.wipe ? {} : readLocal();
    Object.entries(data).forEach(([col, rows]) => {
      if (!(COLLECTIONS as readonly string[]).includes(col)) return;
      db[col] = db[col] || {};
      rows.forEach((r) => {
        if (r?.id) db[col][r.id] = r;
      });
    });
    writeLocal(db);
    COLLECTIONS.forEach(localNotify);
  },
};

/* -------------------------- FIRESTORE DRIVER ----------------------- */
let firestoreDriver: BackendDriver | null = null;

async function buildFirestoreDriver(): Promise<BackendDriver | null> {
  if (!FIREBASE_READY) return null;
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getFirestore, collection, doc, setDoc, getDoc, deleteDoc, onSnapshot } = await import("firebase/firestore");
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG as any);
    const db = getFirestore(app);
    const root = (col: CollectionName) => collection(db, "artifacts", APP_ID, "public", "data", col);
    const listAll = async (col: CollectionName): Promise<Row[]> => {
      const snap = await import("firebase/firestore").then((m) => m.getDocs(root(col)));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Row[];
    };
    const del = async (col: CollectionName, id: string) => deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id));
    const put = async (col: CollectionName, id: string, data: Record<string, any>) =>
      setDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id), { ...data, id, updatedAt: Date.now() }, { merge: true });
    return {
      name: "firestore",
      async list(col) {
        return listAll(col);
      },
      async get(col, id) {
        const snap = await getDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id));
        return snap.exists() ? ({ ...snap.data(), id: snap.id } as Row) : null;
      },
      async set(col, id, data) {
        await setDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id), { ...data, updatedAt: Date.now() }, { merge: true });
      },
      async add(col, data) {
        const id = (data.id as string) || genId(col.slice(0, 3));
        const row = { ...data, id, createdAt: data.createdAt || Date.now(), updatedAt: Date.now() };
        await setDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id), row);
        return row as Row;
      },
      async update(col, id, patch) {
        await setDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id), { ...patch, id, updatedAt: Date.now() }, { merge: true });
      },
      async remove(col, id) {
        await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id));
      },
      async bulkRemove(col, ids) {
        for (const id of ids) await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", col, id));
        return ids.length;
      },
      subscribe(col, cb) {
        return onSnapshot(
          root(col),
          (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Row[]),
          (err) => {
            console.warn(`[fb] snapshot error on ${col}`, err);
            void raw("security_logs", { type: "firestore.snapshot.error", detail: `${col}: ${err.message}`, at: Date.now() });
          },
        );
      },
      async snapshotAll() {
        const out: Record<string, Row[]> = {};
        for (const c of COLLECTIONS) out[c] = await listAll(c);
        return out;
      },
      async replaceAll(data, opts) {
        if (opts?.wipe) {
          for (const c of COLLECTIONS) {
            const rows = await listAll(c);
            for (const r of rows) await del(c, r.id);
          }
        }
        for (const [col, rows] of Object.entries(data)) {
          if (!(COLLECTIONS as readonly string[]).includes(col)) continue;
          for (const r of rows as Row[]) await put(col as CollectionName, r.id, r);
        }
      },
    };
  } catch (e) {
    console.warn("[fb] firestore driver unavailable, using local backend", e);
    return null;
  }
}

/** unguarded write used only by the bootstrapper / logger */
async function raw(col: CollectionName, data: Record<string, any>) {
  const driver = await getDriver();
  return driver.add(col, data);
}

let driverPromise: Promise<BackendDriver> | null = null;
export function getDriver(): Promise<BackendDriver> {
  if (!driverPromise) {
    driverPromise = (async () => {
      const d = await buildFirestoreDriver();
      firestoreDriver = d;
      return d || localDriver;
    })();
  }
  return driverPromise;
}

/* ------------------------------------------------------------------ */
/* bootstrap                                                           */
/* ------------------------------------------------------------------ */
let bootstrapped: Promise<void> | null = null;
export function bootstrap(): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      const driver = await getDriver();
      const roles = await driver.list("roles");
      if (!roles.length) {
        for (const r of DEFAULT_ROLES) await driver.set("roles", r.id, { ...r });
      }
      const settings = await driver.list("settings");
      if (!settings.length) {
        Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
          void driver.set("settings", key, { key, value, updatedAt: Date.now() });
        });
      }
      const design = await driver.list("design");
      if (!design.length) {
        await driver.set("design", "draft", { channel: "draft", ...DEFAULT_DESIGN, version: 1 });
        await driver.set("design", "published", { channel: "published", ...DEFAULT_DESIGN, version: 1 });
      }
      const battles = await driver.list("battles");
      if (!battles.length) {
        for (const [col, rows] of Object.entries(DEFAULT_CONTENT as Record<string, Row[]>)) {
          for (const r of rows) await driver.add(col as CollectionName, r);
        }
      }
    })();
  }
  return bootstrapped;
}

/* ------------------------------------------------------------------ */
/* auth session (resolved from the database, not from client claims)   */
/* ------------------------------------------------------------------ */
export interface SessionUser {
  uid: string;
  username: string;
  email: string;
  provider: string;
  roles: string[];
  profile: Row;
}

export class PermissionDenied extends Error {
  constructor(public key: string, public who: string) {
    super(`Permission denied: ${key} (actor ${who})`);
  }
}

let currentActor: SessionUser | null = null;
export function setActor(u: SessionUser | null) {
  currentActor = u;
}
export function getActor() {
  return currentActor;
}

export async function permissionsFor(user: SessionUser | null, roles: Role[]): Promise<Set<string>> {
  if (!user) return new Set();
  const fresh = await getDriver().then((d) => d.get("users", user.uid));
  const roleIds: string[] = fresh?.roles || user.roles || [];
  return effectivePermissions(roleIds, roles);
}

export async function can(key: string, roles?: Role[]): Promise<boolean> {
  const roleTable = roles || ((await getDriver().then((d) => d.list("roles"))) as Role[]);
  const perms = await permissionsFor(currentActor, roleTable);
  return perms.has(key);
}

export interface AuditInput {
  action: string;
  target?: string;
  detail?: string;
  result?: "success" | "denied" | "error";
}

/**
 * Permission gate. Every admin mutation calls this. It re-reads the actor
 * from the database so a stale client cannot escalate.
 */
export async function guard(key: string, audit: AuditInput): Promise<SessionUser> {
  if (!ALL_PERMISSION_KEYS.includes(key) && !key.endsWith(".*")) {
    throw new Error(`Unknown permission key "${key}" — refusing to run an unguarded operation.`);
  }
  const driver = await getDriver();
  if (!currentActor) {
    await driver.add("security_logs", { type: "unauthenticated.write", detail: `${key} :: ${audit.action}`, at: Date.now() });
    throw new PermissionDenied(key, "anonymous");
  }
  const roleTable = (await driver.list("roles")) as Role[];
  const perms = await permissionsFor(currentActor, roleTable);
  const allowed = perms.has(key);
  await driver.add("audit_logs", {
    actor: currentActor.username,
    actorUid: currentActor.uid,
    action: audit.action,
    target: audit.target || "",
    detail: audit.detail || "",
    permission: key,
    result: allowed ? "success" : "denied",
    at: Date.now(),
  });
  if (!allowed) {
    await driver.add("security_logs", {
      type: "permission.denied",
      detail: `${currentActor.username} attempted ${key} (${audit.action})`,
      at: Date.now(),
    });
    throw new PermissionDenied(key, currentActor.username);
  }
  return currentActor;
}

/** Guarded write helpers — the ONLY way admin surfaces mutate data. */
export const db = {
  async list(col: CollectionName) {
    return (await getDriver()).list(col);
  },
  async subscribe(col: CollectionName, cb: (rows: Row[]) => void) {
    return (await getDriver()).subscribe(col, cb);
  },
  async get(col: CollectionName, id: string) {
    return (await getDriver()).get(col, id);
  },
  async create(col: CollectionName, data: Record<string, any>, key: string, label = "") {
    await guard(key, { action: `create:${col}`, target: label || data.title || data.name || data.username || "" });
    return (await getDriver()).add(col, data);
  },
  async update(col: CollectionName, id: string, patch: Record<string, any>, key: string, label = "") {
    await guard(key, { action: `update:${col}`, target: label || id, detail: Object.keys(patch).join(",") });
    return (await getDriver()).update(col, id, patch);
  },
  async remove(col: CollectionName, id: string, key: string, label = "") {
    await guard(key, { action: `delete:${col}`, target: label || id });
    return (await getDriver()).remove(col, id);
  },
  async bulkRemove(col: CollectionName, ids: string[], key: string) {
    await guard(key, { action: `bulk-delete:${col}`, target: `${ids.length} records` });
    return (await getDriver()).bulkRemove(col, ids);
  },
  /** settings singleton */
  async setting<T = any>(key: string, fallback: T): Promise<T> {
    const row = await (await getDriver()).get("settings", key);
    return (row?.value ?? fallback) as T;
  },
  async setSetting(key: string, value: any, perm = "settings.edit", label = "") {
    await guard(perm, {
      action: "settings.write",
      target: label || key,
      detail: JSON.stringify(value).slice(0, 240),
    });
    return (await getDriver()).set("settings", key, { key, value, updatedAt: Date.now() });
  },
  async snapshotAll() {
    return (await getDriver()).snapshotAll();
  },
  async replaceAll(data: Record<string, Row[]>, opts?: { wipe?: boolean }) {
    return (await getDriver()).replaceAll(data, opts);
  },
  driverName: () => getDriver().then((d) => d.name),
};

/** Real behavioural event recording used by analytics charts. */
export function track(type: string, meta: Record<string, any> = {}) {
  const driver = getDriver();
  driver
    .then((d) =>
      d.add("analytics", {
        type,
        at: Date.now(),
        ua: navigator.userAgent.slice(0, 120),
        ref: document.referrer || "direct",
        screen: `${window.innerWidth}x${window.innerHeight}`,
        ...meta,
      }),
    )
    .catch(() => {});
}

export function logError(err: any, where = "") {
  getDriver()
    .then((d) =>
      d.add("error_logs", {
        message: String(err?.message || err).slice(0, 400),
        stack: String(err?.stack || "").slice(0, 1200),
        where,
        at: Date.now(),
      }),
    )
    .catch(() => {});
}

export function isFirestoreDriver() {
  return firestoreDriver?.name === "firestore";
}
