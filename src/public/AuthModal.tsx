import { useState } from "react";
import { X, User, Lock, Mail, Loader2, ShieldCheck, KeyRound, Info } from "lucide-react";

const GoogleMark = (p: { size?: number }) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1A6.2 6.2 0 0 1 12 5.9c1.6 0 2.7.7 3.3 1.3l2.6-2.5A9.9 9.9 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.3-.2-2z" />
    <path fill="#34A853" d="M3.9 7.6 7 9.9A6.2 6.2 0 0 1 12 5.9c1.6 0 2.7.7 3.3 1.3l2.6-2.5A9.9 9.9 0 0 0 12 2 10 10 0 0 0 3.9 7.6z" opacity=".0" />
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.9h5.5a4.8 4.8 0 0 1-2 3.1l3 2.3c1.8-1.7 3.1-4.2 3.1-7.3z" />
    <path fill="#FBBC05" d="M12 22a9.7 9.7 0 0 0 6.9-2.7l-3-2.3a6.1 6.1 0 0 1-9-3.2l-3.1 2.4A10 10 0 0 0 12 22z" />
    <path fill="#34A853" d="M6.9 13.8a6 6 0 0 1 0-3.9L3.9 7.6A10 10 0 0 0 3.9 16.4z" />
  </svg>
);
const FacebookMark = (p: { size?: number }) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3v-2.6c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"
    />
  </svg>
);
import { auth } from "../lib/auth";
import { FIREBASE_READY } from "../lib/config";
import { useStore } from "../store";

type Mode = "signin" | "signup" | "reset";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, settings, refreshProfile } = useStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!open) return null;

  const registrationOpen = settings.registrationOpen !== false;
  const methods = settings.authMethods || { password: true, google: true, facebook: true };

  async function run(label: string, fn: () => Promise<any>, closeOnOk = true) {
    setBusy(label);
    setError("");
    setNotice("");
    const res = await fn();
    setBusy(null);
    if (!res?.ok) {
      setError(res?.error || "Something went wrong.");
      return;
    }
    await refreshProfile();
    if (closeOnOk) {
      toast(`Signed in as ${res.user.username}`, "ok");
      onClose();
    }
  }

  const input =
    "w-full bg-[var(--fb-surface-2)] border border-[var(--fb-line)] rounded-[var(--fb-radius)] px-3 py-2.5 text-sm text-[var(--fb-text)] placeholder:text-[var(--fb-muted)] focus:outline-none focus:border-[var(--fb-accent)] transition";

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-[var(--fb-surface)] border border-[var(--fb-line)] sm:rounded-[var(--fb-radius-lg)] rounded-t-[var(--fb-radius-lg)] shadow-2xl overflow-hidden fb-rise"
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--fb-accent)]" />
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <div className="fb-display text-2xl text-[var(--fb-text)]">
              {mode === "signup" ? "JOIN THE LEAGUE" : mode === "reset" ? "RECOVER ACCOUNT" : "SIGN IN"}
            </div>
            <p className="text-xs text-[var(--fb-muted)] mt-1">
              {mode === "reset" ? "We'll send a recovery link to your account email." : "Chat, comment and vote on decisions."}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--fb-muted)] hover:text-[var(--fb-text)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {error && (
            <div className="text-xs border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2 rounded-[var(--fb-radius)] flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-3 py-2 rounded-[var(--fb-radius)]">
              {notice}
            </div>
          )}

          {mode !== "reset" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={busy !== null || methods.google === false}
                  onClick={() => run("google", auth.google)}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-[var(--fb-line)] bg-[var(--fb-surface-2)] hover:border-[var(--fb-accent)] hover:text-[var(--fb-text)] text-[var(--fb-muted)] rounded-[var(--fb-radius)] transition disabled:opacity-40"
                >
                  {busy === "google" ? <Loader2 size={14} className="animate-spin" /> : <GoogleMark size={14} />}
                  Google
                </button>
                <button
                  disabled={busy !== null || methods.facebook === false}
                  onClick={() => run("facebook", auth.facebook)}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-[var(--fb-line)] bg-[var(--fb-surface-2)] hover:border-[var(--fb-accent)] hover:text-[var(--fb-text)] text-[var(--fb-muted)] rounded-[var(--fb-radius)] transition disabled:opacity-40"
                >
                  {busy === "facebook" ? <Loader2 size={14} className="animate-spin" /> : <FacebookMark size={14} />}
                  Facebook
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--fb-line)]" />
                <span className="text-[10px] tracking-[0.2em] text-[var(--fb-muted)]">OR USERNAME</span>
                <div className="flex-1 h-px bg-[var(--fb-line)]" />
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3.5 text-[var(--fb-muted)]" />
                  <input className={input + " pl-9"} placeholder="Username" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} autoComplete="username" />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-3.5 text-[var(--fb-muted)]" />
                  <input
                    className={input + " pl-9"}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (busy !== null) return;
                      void run(
                        "submit",
                        mode === "signup"
                          ? () => auth.signUp(username, password, email)
                          : () => auth.signIn(username, password),
                      );
                    }}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
                {mode === "signup" && (
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3.5 text-[var(--fb-muted)]" />
                    <input
                      className={input + " pl-9"}
                      type="email"
                      placeholder="Email (optional — needed for recovery)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <button
                  disabled={busy !== null || (mode === "signup" && !registrationOpen)}
                  onClick={() => {
                    void run(
                      "submit",
                      mode === "signup"
                        ? () => auth.signUp(username, password, email)
                        : () => auth.signIn(username, password),
                    );
                  }}
                  className="w-full py-3 text-xs font-bold tracking-[0.15em] uppercase bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy === "submit" && <Loader2 size={14} className="animate-spin" />}
                  {mode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
                </button>
                {mode === "signup" && !registrationOpen && (
                  <p className="text-[11px] text-amber-400">Registration is closed by the league office.</p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  className="text-[var(--fb-muted)] hover:text-[var(--fb-accent)]"
                  onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}
                >
                  {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>
                <button
                  className="text-[var(--fb-muted)] hover:text-[var(--fb-accent)]"
                  onClick={() => { setMode("reset"); setError(""); setNotice(""); }}
                >
                  Forgot password
                </button>
              </div>
            </>
          )}

          {mode === "reset" && (
            <div className="space-y-3">
              <input
                className={input}
                placeholder="Username or account email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button
                disabled={busy !== null}
                onClick={async () => {
                  setBusy("reset");
                  setError("");
                  const res = await auth.resetPassword(username);
                  setBusy(null);
                  if (res.ok) setNotice(`Recovery mail dispatched to ${res.user.email}.`);
                  else setError(res.error);
                }}
                className="w-full py-3 text-xs font-bold tracking-[0.15em] uppercase bg-[var(--fb-accent)] text-white rounded-[var(--fb-radius)] hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                {busy === "reset" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} SEND RECOVERY LINK
              </button>
              <button className="w-full text-[11px] text-[var(--fb-muted)] hover:text-[var(--fb-text)]" onClick={() => setMode("signin")}>
                ← Back to sign in
              </button>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2 border-t border-[var(--fb-line)] text-[10px] leading-relaxed text-[var(--fb-muted)]">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--fb-accent)]" />
            <span>
              {FIREBASE_READY
                ? "Verified by Firebase Authentication — passwords hashed server-side, OAuth state validated by the SDK."
                : "Local credential store: PBKDF2-SHA256, 210k iterations, per-account salt. Add Firebase env vars to move to server-verified identity."}{" "}
              Phone / SMS verification is not used on this platform.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
