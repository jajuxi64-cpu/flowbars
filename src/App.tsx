import { useEffect, useState } from 'react';
import * as db from './lib/db';
import { seedIfEmpty, getSettings } from './lib/seed';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './ui/kit';
import { useHashRoute } from './lib/hooks';
import { PublicSite } from './public/PublicSite';
import { AdminApp } from './admin/AdminApp';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.initDB(seedIfEmpty)
      .then(() => setBooted(true))
      .catch((e) => setError(e.message || String(e)));

    const onError = (ev: ErrorEvent) => {
      try {
        db.insert('system_errors', {
          message: ev.message,
          source: `${ev.filename}:${ev.lineno}`,
          at: new Date().toISOString(),
        });
      } catch {
        /* database may not be ready */
      }
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      try {
        db.insert('system_errors', {
          message: 'Unhandled rejection: ' + String(ev.reason),
          source: 'promise',
          at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (error)
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-center text-sm text-red-300">
        Storage unavailable: {error}. This app needs IndexedDB (disable private-mode restrictions and reload).
      </div>
    );

  if (!booted)
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-950 text-xs uppercase tracking-widest text-neutral-500">
        Loading Flow &amp; Bars…
      </div>
    );

  return (
    <ToastProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ToastProvider>
  );
}

function Router() {
  const [route, nav] = useHashRoute();
  const adminPath = getSettings().security.adminPath;
  const isAdmin = route === adminPath || route.startsWith(adminPath + '/');
  if (isAdmin) return <AdminApp exitToSite={() => nav('')} />;
  return <PublicSite key="public" />;
}
