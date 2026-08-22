/**
 * Authentication service.
 *
 * Supported (and only these):
 *   • Username + password
 *   • Google OAuth
 *   • Facebook OAuth
 *
 * SMS / phone verification has been removed from the platform entirely —
 * there is no phone field in any signup, login or recovery flow.
 *
 * Driver selection:
 *   • Firebase present → Firebase Authentication. Identity is verified by
 *     Google's servers, passwords are hashed server-side (scrypt/bcrypt),
 *     sessions are refresh-token based, OAuth state/nonce is validated by
 *     the SDK, and password recovery uses real recovery mail.
 *   • Firebase absent  → local driver using WebCrypto PBKDF2-SHA256
 *     (210,000 iterations, 16-byte salt per account) with token sessions.
 *
 * Rate limiting, lockout and login history apply to both drivers and are
 * configured from Admin → System → Security (persisted in settings).
 */
import { FIREBASE_CONFIG, FIREBASE_READY, USERNAME_DOMAIN } from "./config";
import { bootstrap, db, genId, getDriver, logError, type Row } from "./backend";
import { DEFAULT_ROLES, effectivePermissions } from "./permissions";

export interface AuthUser {
  uid: string;
  username: string;
  email: string;
  provider: "password" | "google.com" | "facebook.com" | "local";
}
export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string; code?: string };

const LS_LOCK = "fb:auth:attempts";
const LS_SESSION = "fb:auth:session";

/* ------------------------- rate limiting --------------------------- */
interface Attempt {
  count: number;
  firstAt: number;
  lockedUntil?: number;
}
function attemptsFor(identity: string): Attempt {
  try {
    const all = JSON.parse(localStorage.getItem(LS_LOCK) || "{}");
    return all[identity.toLowerCase()] || { count: 0, firstAt: Date.now() };
  } catch {
    return { count: 0, firstAt: Date.now() };
  }
}
function saveAttempt(identity: string, a: Attempt) {
  const all = JSON.parse(localStorage.getItem(LS_LOCK) || "{}");
  all[identity.toLowerCase()] = a;
  localStorage.setItem(LS_LOCK, JSON.stringify(all));
}
async function lockConfig() {
  const sec = await db.setting("security", {
    maxAttempts: 5,
    windowMs: 900000,
    baseLockMs: 60000,
    sessionLifetimeDays: 30,
    requireStrongPassword: true,
    logFailedAttempts: true,
  });
  return sec as {
    maxAttempts: number;
    windowMs: number;
    baseLockMs: number;
    sessionLifetimeDays: number;
    requireStrongPassword: boolean;
    logFailedAttempts: boolean;
  };
}
async function checkLock(identity: string): Promise<string | null> {
  const a = attemptsFor(identity);
  if (a.lockedUntil && a.lockedUntil > Date.now()) {
    const mins = Math.ceil((a.lockedUntil - Date.now()) / 60000);
    return `Too many failed attempts. Locked for ${mins} more minute${mins > 1 ? "s" : ""}.`;
  }
  return null;
}
async function registerFailure(identity: string, detail: string) {
  const cfg = await lockConfig();
  const a = attemptsFor(identity);
  const now = Date.now();
  const fresh = now - a.firstAt > cfg.windowMs ? { count: 0, firstAt: now } : a;
  fresh.count += 1;
  if (fresh.count >= cfg.maxAttempts) {
    fresh.lockedUntil = now + cfg.baseLockMs * Math.pow(2, Math.min(3, Math.floor(fresh.count / cfg.maxAttempts) - 1));
  }
  saveAttempt(identity, fresh);
  await getDriver().then((d) =>
    d.add("login_logs", { identity, method: "password", result: "failed", detail, at: now, ua: navigator.userAgent.slice(0, 120) }),
  );
  if (fresh.lockedUntil) {
    await getDriver().then((d) =>
      d.add("security_logs", { type: "auth.lockout", detail: `${identity} locked until ${new Date(fresh.lockedUntil!).toISOString()}`, at: now }),
    );
  }
}
function clearAttempts(identity: string) {
  const all = JSON.parse(localStorage.getItem(LS_LOCK) || "{}");
  delete all[identity.toLowerCase()];
  localStorage.setItem(LS_LOCK, JSON.stringify(all));
}
async function logLogin(identity: string, method: string, result: string, detail = "") {
  await getDriver().then((d) =>
    d.add("login_logs", { identity, method, result, detail, at: Date.now(), ua: navigator.userAgent.slice(0, 120) }),
  );
}

/* --------------------------- password policy ------------------------ */
export function passwordPolicyError(pw: string, strong: boolean): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (strong && (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw))) return "Password must contain at least one letter and one number.";
  return null;
}

/* ------------------------- local crypto driver ---------------------- */
const enc = new TextEncoder();
function toB64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
async function pbkdf2(pw: string, saltB64: string, iterations = 210000) {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as any, iterations, hash: "SHA-256" }, key, 256);
  return toB64(bits);
}
function newSalt() {
  const s = new Uint8Array(16);
  crypto.getRandomValues(s);
  return toB64(s);
}

/* ------------------------------ firebase ---------------------------- */
let fbAuth: any = null;
async function fb() {
  if (!FIREBASE_READY) return null;
  if (fbAuth) return fbAuth;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, browserLocalPersistence, setPersistence } = await import("firebase/auth");
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG as any);
  const a = getAuth(app);
  try {
    await setPersistence(a, browserLocalPersistence);
  } catch {
    /* private mode etc. */
  }
  fbAuth = a;
  return a;
}

function friendlyAuthError(e: any): string {
  const code = String(e?.code || "");
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Incorrect username or password.";
  if (code.includes("too-many-requests")) return "Too many attempts. Firebase rate limit triggered — try again later.";
  if (code.includes("email-already-in-use")) return "That username is already registered.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup-request")) return "OAuth popup closed before completing.";
  if (code.includes("unauthorized-domain")) return "OAuth blocked: this domain is not authorised in the Firebase console.";
  if (code.includes("operation-not-allowed") || code.includes("configuration-not-found"))
    return "This sign-in provider is not enabled in the Firebase console (Authentication → Sign-in method).";
  if (code.includes("weak-password")) return "Password is too weak.";
  if (code.includes("network-request-failed")) return "Network error reaching the identity provider.";
  return e?.message || "Authentication failed.";
}

/* ------------------------------ profile ----------------------------- */
async function ensureProfile(uid: string, username: string, email: string, provider: string): Promise<Row> {
  const driver = await getDriver();
  // The user collection is the source of truth — if we already have the
  // account, just refresh lastSeen and return.
  const existing = await driver.get("users", uid);
  if (existing) {
    await driver.update("users", uid, { lastSeen: Date.now() });
    return { ...existing, lastSeen: Date.now() };
  }

  // Read fresh role data every time. The "first account is owner" check
  // is performed on the *unfiltered* list, so an account that was
  // manually deleted doesn't accidentally get recreated as a staff role.
  const [users, roleTable, ownerFlag] = await Promise.all([
    driver.list("users"),
    driver.list("roles"),
    driver.get("settings", "ownerBootstrap"),
  ]);
  const ownerRole = roleTable.find((r) => r.slug === "owner") || DEFAULT_ROLES[0];
  const memberRole = roleTable.find((r) => r.slug === "member") || DEFAULT_ROLES[5];
  // Bootstrap owner if: no users yet AND owner bootstrap is not explicitly disabled.
  const bootstrapOwner = users.length === 0 && ownerFlag?.value !== false;
  const assigned = bootstrapOwner ? [ownerRole.id] : [memberRole.id];
  const perms = Array.from(effectivePermissions(assigned, roleTable as any));

  const profile: Row = {
    id: uid,
    uid,
    username,
    email,
    provider,
    roles: assigned,
    perms,
    permsSyncedAt: Date.now(),
    status: "active",
    bio: bootstrapOwner ? "Platform owner." : "Battle rap fan.",
    avatar: "",
    banner: "",
    muted: false,
    banned: false,
    joined: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
  await driver.set("users", uid, profile);
  await driver.add("audit_logs", {
    actor: username,
    actorUid: uid,
    action: bootstrapOwner ? "owner.bootstrap" : "account.create",
    target: username,
    detail: bootstrapOwner ? "First account promoted to OWNER" : "Registered as MEMBER",
    permission: "system",
    result: "success",
    at: Date.now(),
  });
  return profile;
}

/* ------------------------------- API -------------------------------- */
let unsubscribe: (() => void) | null = null;

export const auth = {
  get isFirebase() {
    return FIREBASE_READY;
  },

  /** Attach the auth-state listener. Returns disposer. */
  onChange(cb: (u: AuthUser | null) => void) {
    let disposed = false;
    (async () => {
      await bootstrap();
      const a = await fb();
      if (a) {
        const { onAuthStateChanged } = await import("firebase/auth");
        unsubscribe = onAuthStateChanged(a, async (u: any) => {
          if (disposed) return;
          if (!u) return cb(null);
          const username = (u.displayName || u.email?.split("@")[0] || "member").trim();
          // Make sure the user document is present so RBAC checks work.
          try { await ensureProfile(u.uid, username, u.email || "", u.providerData?.[0]?.providerId || "password"); } catch {}
          cb({ uid: u.uid, username, email: u.email || "", provider: u.providerData?.[0]?.providerId || "password" });
        });
      } else {
        // local session
        const raw = localStorage.getItem(LS_SESSION);
        if (!raw) return cb(null);
        try {
          const s = JSON.parse(raw);
          if (s.expiresAt < Date.now()) {
            localStorage.removeItem(LS_SESSION);
            return cb(null);
          }
          try { await ensureProfile(s.uid, s.username, s.email, "local"); } catch {}
          cb({ uid: s.uid, username: s.username, email: s.email, provider: "local" });
        } catch {
          cb(null);
        }
      }
    })();
    return () => {
      disposed = true;
      unsubscribe?.();
      unsubscribe = null;
    };
  },

  async signUp(usernameRaw: string, password: string, emailRaw = ""): Promise<AuthResult> {
    // Bootstrap must run first so the roles collection is populated and the
    // "first account is owner" check works on the first ever registration.
    await bootstrap();

    const username = usernameRaw.trim().replace(/\s+/g, "");
    if (!username) return { ok: false, error: "Username is required." };
    if (username.length < 3 || username.length > 24)
      return { ok: false, error: "Username must be 3–24 characters." };
    if (!/^[a-zA-Z0-9_.]+$/.test(username))
      return { ok: false, error: "Username may only contain letters, numbers, dot or underscore." };
    const open = await db.setting("registrationOpen", true);
    if (!open) return { ok: false, error: "Registration is currently closed by the league office." };
    const sec = await lockConfig();
    const policyErr = passwordPolicyError(password, sec.requireStrongPassword !== false);
    if (policyErr) return { ok: false, error: policyErr };

    const driver = await getDriver();
    const key = username.toLowerCase();
    const existing = await driver.get("usernames", key);
    if (existing) return { ok: false, error: "That username is already taken." };

    const email = (emailRaw || `${key}@${USERNAME_DOMAIN}`).toLowerCase();
    const uid = `u_${genId()}`;

    try {
      const a = await fb();
      if (a) {
        const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
        const cred = await createUserWithEmailAndPassword(a, email, password);
        await updateProfile(cred.user, { displayName: username });
        await driver.set("usernames", key, { username, email, uid: cred.user.uid, provider: "password", createdAt: Date.now() });
        await driver.update("users", cred.user.uid, { username });
        const profile = await ensureProfile(cred.user.uid, username, email, "password");
        await logLogin(username, "password", "signup", profile.roles[0] === "role_owner" ? "owner bootstrap" : "");
        return { ok: true, user: { uid: cred.user.uid, username, email, provider: "password" } };
      }
      // local driver
      const salt = newSalt();
      const hash = await pbkdf2(password, salt);
      await driver.set("usernames", key, { username, email, uid, provider: "local", salt, hash, iterations: 210000, createdAt: Date.now() });
      await ensureProfile(uid, username, email, "local");
      const cfg = await lockConfig();
      localStorage.setItem(
        LS_SESSION,
        JSON.stringify({ uid, username, email, expiresAt: Date.now() + cfg.sessionLifetimeDays * 864e5, issuedAt: Date.now() }),
      );
      await driver.add("sessions", { uid, username, ua: navigator.userAgent.slice(0, 120), at: Date.now() });
      await logLogin(username, "password", "signup", "local driver");
      return { ok: true, user: { uid, username, email, provider: "local" } };
    } catch (e: any) {
      await logError(e, "auth.signUp");
      await logLogin(username, "password", "signup-failed", String(e?.code || e?.message));
      return { ok: false, error: friendlyAuthError(e), code: e?.code };
    }
  },

  async signIn(usernameRaw: string, password: string): Promise<AuthResult> {
    await bootstrap();
    const username = usernameRaw.trim();
    const key = username.toLowerCase();
    if (!username || !password) return { ok: false, error: "Enter your username and password." };
    const locked = await checkLock(key);
    if (locked) return { ok: false, error: locked };

    try {
      const driver = await getDriver();
      const map = await driver.get("usernames", key);
      const email = map?.email || `${key}@${USERNAME_DOMAIN}`;
      const a = await fb();
      if (a) {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(a, email, password);
        clearAttempts(key);
        const profile = await ensureProfile(cred.user.uid, map?.username || username, email, "password");
        await logLogin(username, "password", "success", "");
        return { ok: true, user: { uid: cred.user.uid, username: profile.username || username, email, provider: "password" } };
      }
      if (!map?.hash) {
        await registerFailure(key, "unknown account");
        return { ok: false, error: "Incorrect username or password." };
      }
      const hash = await pbkdf2(password, map.salt, map.iterations || 210000);
      if (hash !== map.hash) {
        await registerFailure(key, "bad password");
        return { ok: false, error: "Incorrect username or password." };
      }
      clearAttempts(key);
      const cfg = await lockConfig();
      localStorage.setItem(
        LS_SESSION,
        JSON.stringify({ uid: map.uid, username: map.username, email, expiresAt: Date.now() + cfg.sessionLifetimeDays * 864e5, issuedAt: Date.now() }),
      );
      await driver.add("sessions", { uid: map.uid, username: map.username, ua: navigator.userAgent.slice(0, 120), at: Date.now() });
      await ensureProfile(map.uid, map.username, email, "local");
      await logLogin(username, "password", "success", "local driver");
      return { ok: true, user: { uid: map.uid, username: map.username, email, provider: "local" } };
    } catch (e: any) {
      await registerFailure(key, String(e?.code || e?.message).slice(0, 120));
      await logError(e, "auth.signIn");
      return { ok: false, error: friendlyAuthError(e), code: e?.code };
    }
  },

  async google(): Promise<AuthResult> {
    try {
      const a = await fb();
      if (!a) return { ok: false, error: "Google OAuth requires VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN to be configured." };
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(a, provider);
      const username = (cred.user.displayName || cred.user.email?.split("@")[0] || "member").replace(/\s+/g, "");
      await ensureProfile(cred.user.uid, username, cred.user.email || "", "google.com");
      await logLogin(username, "google.com", "success", "");
      return { ok: true, user: { uid: cred.user.uid, username, email: cred.user.email || "", provider: "google.com" } };
    } catch (e: any) {
      await logError(e, "auth.google");
      await logLogin("google", "google.com", "failed", String(e?.code || e?.message).slice(0, 120));
      return { ok: false, error: friendlyAuthError(e), code: e?.code };
    }
  },

  async facebook(): Promise<AuthResult> {
    try {
      const a = await fb();
      if (!a) return { ok: false, error: "Facebook OAuth requires Firebase credentials plus an enabled Facebook provider." };
      const { FacebookAuthProvider, signInWithPopup } = await import("firebase/auth");
      const cred = await signInWithPopup(a, new FacebookAuthProvider());
      const username = (cred.user.displayName || cred.user.email?.split("@")[0] || "member").replace(/\s+/g, "");
      await ensureProfile(cred.user.uid, username, cred.user.email || "", "facebook.com");
      await logLogin(username, "facebook.com", "success", "");
      return { ok: true, user: { uid: cred.user.uid, username, email: cred.user.email || "", provider: "facebook.com" } };
    } catch (e: any) {
      await logError(e, "auth.facebook");
      await logLogin("facebook", "facebook.com", "failed", String(e?.code || e?.message).slice(0, 120));
      return { ok: false, error: friendlyAuthError(e), code: e?.code };
    }
  },

  async signOut(): Promise<void> {
    const a = await fb();
    if (a) {
      const { signOut: so } = await import("firebase/auth");
      await so(a);
    }
    localStorage.removeItem(LS_SESSION);
    await logLogin("—", "session", "logout", "");
  },

  async changePassword(current: string, next: string): Promise<AuthResult> {
    const sec = await lockConfig();
    const err = passwordPolicyError(next, sec.requireStrongPassword !== false);
    if (err) return { ok: false, error: err };
    try {
      const a = await fb();
      if (a) {
        const { reauthenticateWithCredential, updatePassword, EmailAuthProvider } = await import("firebase/auth");
        const u = a.currentUser;
        if (!u?.email) return { ok: false, error: "No active session." };
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
        await updatePassword(u, next);
        await logLogin(u.email, "password", "change", "");
        return { ok: true, user: { uid: u.uid, username: u.displayName || u.email, email: u.email, provider: "password" } };
      }
      const driver = await getDriver();
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return { ok: false, error: "No active session." };
      const s = JSON.parse(raw);
      const map = await driver.get("usernames", String(s.username).toLowerCase());
      if (!map?.hash) return { ok: false, error: "Local credential record missing." };
      const check = await pbkdf2(current, map.salt, map.iterations || 210000);
      if (check !== map.hash) return { ok: false, error: "Current password is incorrect." };
      const salt = newSalt();
      const hash = await pbkdf2(next, salt);
      await driver.update("usernames", map.id, { salt, hash, rotatedAt: Date.now() });
      await logLogin(s.username, "password", "change", "local driver");
      return { ok: true, user: { uid: s.uid, username: s.username, email: s.email, provider: "local" } };
    } catch (e: any) {
      await logError(e, "auth.changePassword");
      return { ok: false, error: friendlyAuthError(e) };
    }
  },

  async resetPassword(usernameOrEmail: string): Promise<AuthResult> {
    try {
      const driver = await getDriver();
      const a = await fb();
      const key = usernameOrEmail.trim().toLowerCase();
      const map = await driver.get("usernames", key);
      const email = key.includes("@") ? key : map?.email;
      if (!a)
        return {
          ok: false,
          error:
            "Recovery mail requires Firebase Auth. Configure the Firebase env vars, or have an admin reset the credential from Users.",
        };
      if (!email) return { ok: false, error: "No account found for that username." };
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(a, email);
      await logLogin(usernameOrEmail, "recovery", "sent", "");
      return { ok: true, user: { uid: map?.uid || "", username: key, email, provider: "password" } };
    } catch (e: any) {
      await logError(e, "auth.resetPassword");
      return { ok: false, error: friendlyAuthError(e) };
    }
  },
};
