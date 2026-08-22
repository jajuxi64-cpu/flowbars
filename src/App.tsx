import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store";
import PublicSite from "./public/PublicSite";
import AdminApp from "./admin/AdminApp";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

function Splash() {
  return (
    <div className="min-h-screen bg-[#07070a] grid place-items-center">
      <div className="text-center space-y-3">
        <span className="inline-block w-10 h-10 bg-red-600 text-white font-black text-sm grid place-items-center -skew-x-6 animate-pulse">F&B</span>
        <p className="font-mono text-[10px] tracking-[0.3em] text-neutral-600 uppercase">Loading league data</p>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-[120] space-y-2 w-[min(92vw,340px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fb-rise flex items-start gap-2.5 px-3.5 py-2.5 rounded border bg-neutral-900/95 backdrop-blur shadow-2xl"
          style={{ borderColor: t.kind === "ok" ? "#065f46" : t.kind === "err" ? "#7f1d1d" : "#262626" }}
        >
          <span className={t.kind === "ok" ? "text-emerald-400" : t.kind === "err" ? "text-red-400" : "text-neutral-400"}>
            {t.kind === "ok" ? <CheckCircle size={15} /> : t.kind === "err" ? <AlertCircle size={15} /> : <Info size={15} />}
          </span>
          <span className="flex-1 text-[11px] text-neutral-200 leading-relaxed">{t.msg}</span>
          <button onClick={() => dismissToast(t.id)} className="text-neutral-600 hover:text-white"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

function Router() {
  const { settings, ready } = useStore();
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, ""));

  useEffect(() => {
    const fn = () => setHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  if (!ready) return <Splash />;

  const adminPath = String(settings.adminPath || "fb-control-x92k");
  const first = hash.split("/").filter(Boolean)[0] || "";

  // The control center is reachable ONLY on the configured secret path.
  // Any other path renders the public site — there is no admin chrome,
  // no admin link and no way to reach the console by guessing a route.
  if (first === adminPath) return <AdminApp adminPath={adminPath} />;
  return <PublicSite />;
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
      <Toasts />
    </StoreProvider>
  );
}
