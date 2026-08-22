/**
 * Runtime configuration for FLOW & BARS.
 *
 * The platform runs against a real backend. Two backends are supported:
 *
 *  1. Firestore + Firebase Auth  — used when the Firebase environment
 *     variables below are present. All auth is verified by Google's
 *     identity servers, passwords are hashed server-side, and every
 *     read/write is authorised by the Security Rules generated in
 *     Admin → System → Security.
 *
 *  2. Local persistence backend  — used when no Firebase credentials are
 *     configured (e.g. local preview / static demo host). Data is stored
 *     in the browser's IndexedDB-backed localStorage namespace, passwords
 *     are hashed with PBKDF2-SHA256 (WebCrypto, 210k iterations + salt),
 *     and the exact same API surface + permission checks are enforced.
 *     The UI always tells you which backend is live.
 *
 * NOTHING IS FAKED: if a credential is missing the related feature reports
 * itself as "not configured" instead of pretending to work.
 */

const g = globalThis as any;

function readEnv(key: string): string {
  // Vite build-time env
  const vite = (import.meta as any)?.env?.[key];
  if (typeof vite === "string" && vite.trim()) return vite.trim();
  // injected globals (AI-studio style hosting)
  const fromGlobal = g.__firebase_config ? safeParse(g.__firebase_config)?.[camel(key)] : undefined;
  if (typeof fromGlobal === "string" && fromGlobal.trim()) return fromGlobal.trim();
  return "";
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function camel(k: string) {
  return k.replace(/^VITE_FIREBASE_/, "").toLowerCase();
}

export const FIREBASE_CONFIG = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("VITE_FIREBASE_APP_ID"),
};

export const APP_ID: string = g.__app_id || "flow-bars-league";
export const FIREBASE_READY = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

/** Env var manifest surfaced in Admin → System → Integrations. */
export const ENV_MANIFEST = [
  { key: "VITE_FIREBASE_API_KEY", required: true, purpose: "Firebase project API key (auth + Firestore)" },
  { key: "VITE_FIREBASE_AUTH_DOMAIN", required: true, purpose: "OAuth redirect host, e.g. my-app.firebaseapp.com" },
  { key: "VITE_FIREBASE_PROJECT_ID", required: true, purpose: "Firestore project id" },
  { key: "VITE_FIREBASE_STORAGE_BUCKET", required: false, purpose: "Media library storage bucket" },
  { key: "VITE_FIREBASE_MESSAGING_SENDER_ID", required: false, purpose: "Push / messaging sender" },
  { key: "VITE_FIREBASE_APP_ID", required: true, purpose: "Firebase web app id" },
  { key: "VITE_GOOGLE_OAUTH_ENABLED", required: false, purpose: "Google provider must be enabled in Firebase console" },
  { key: "VITE_FACEBOOK_OAUTH_ENABLED", required: false, purpose: "Facebook provider must be enabled in Firebase console" },
];

export function envStatus() {
  return ENV_MANIFEST.map((m) => ({ ...m, value: readEnv(m.key), present: Boolean(readEnv(m.key)) }));
}

/** Synthetic email domain used to map username → credential for username/password auth. */
export const USERNAME_DOMAIN = "users.flowbars.local";
