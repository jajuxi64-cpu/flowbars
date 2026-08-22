import { useMemo } from "react";
import { Users, Swords, Newspaper, MessageSquare, Flag, Activity, HardDrive, ShieldCheck, ArrowUpRight, Clock } from "lucide-react";
import { useStore, useCollection } from "../../store";
import { Btn, Panel, StatCard, PageHead, Kv, Badge } from "../ui";
import { LineChart } from "../charts";
import { APP_ID, FIREBASE_READY } from "../../lib/config";

const day = 864e5;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export default function Overview({ go }: { go: (s: string, l?: string) => void }) {
  const { backend, can, profile, roles } = useStore();
  const { rows: users } = useCollection("users");
  const { rows: battles } = useCollection("battles");
  const { rows: news } = useCollection("news");
  const { rows: mcs } = useCollection("mcs");
  const { rows: comments } = useCollection("comments");
  const { rows: chat } = useCollection("chat");
  const { rows: reports } = useCollection("reports");
  const { rows: audit } = useCollection("audit_logs");
  const { rows: analytics } = useCollection("analytics");
  const { rows: errors } = useCollection("error_logs");

  const now = Date.now();
  const online = users.filter((u) => now - (u.lastSeen || 0) < 10 * 60000).length;
  const newUsers7 = users.filter((u) => now - (u.createdAt || 0) < 7 * day).length;
  const openReports = reports.filter((r) => r.status === "open").length;
  const errors24 = errors.filter((e) => now - (e.at || 0) < day).length;

  const series = useMemo(() => {
    const labels: string[] = [];
    const counts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const key = dayKey(now - i * day);
      labels.push(key.slice(5));
      counts.push(analytics.filter((a) => dayKey(a.at || 0) === key).length);
    }
    return { labels, counts };
  }, [analytics, now]);

  const storageBytes = useMemo(() => {
    try {
      return JSON.stringify(localStorage).length;
    } catch {
      return 0;
    }
  }, []);

  const recent = [...audit].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 9);

  return (
    <div>
      <PageHead title="Platform overview" desc="Live figures computed from the database — nothing here is estimated.">
        <Btn variant="outline" size="sm" onClick={() => go("analytics", "traffic")} icon={<ArrowUpRight size={12} />}>Analytics</Btn>
        <Btn variant="outline" size="sm" onClick={() => go("logs", "audit")}>Audit log</Btn>
      </PageHead>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatCard label="Users" value={users.length} sub={`${newUsers7} new (7d)`} icon={<Users size={15} />} accent="#38bdf8" />
        <StatCard label="Online now" value={online} sub="active < 10 min" icon={<Activity size={15} />} accent="#34d399" />
        <StatCard label="Battles" value={battles.length} sub={`${battles.filter((b) => b.status === "published").length} published`} icon={<Swords size={15} />} accent="#dc2626" />
        <StatCard label="News" value={news.length} sub={`${news.filter((n) => n.status === "draft").length} drafts`} icon={<Newspaper size={15} />} accent="#a78bfa" />
        <StatCard label="Community" value={chat.length + comments.length} sub={`${chat.length} chat · ${comments.length} comments`} icon={<MessageSquare size={15} />} accent="#f59e0b" />
        <StatCard label="Open reports" value={openReports} sub={openReports ? "needs triage" : "queue clear"} icon={<Flag size={15} />} accent={openReports ? "#dc2626" : "#34d399"} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <Panel title="Activity — last 14 days" desc="Every tracked behavioural event (page views, battle opens, chat, signups)" icon={<Activity size={14} />}>
          <LineChart labels={series.labels} data={series.counts} />
        </Panel>

        <Panel title="System health" icon={<ShieldCheck size={14} />}>
          <Kv k="Data backend" v={backend === "firestore" ? "Firestore" : "Local persistence"} />
          <Kv k="Identity" v={FIREBASE_READY ? "Firebase Auth" : "Local PBKDF2"} />
          <Kv k="App id" v={APP_ID} />
          <Kv k="Roles defined" v={roles.length} />
          <Kv k="MCs on ladder" v={mcs.length} />
          <Kv k="Errors (24h)" v={<span className={errors24 ? "text-red-400" : "text-emerald-400"}>{errors24}</span>} />
          <Kv k="Client storage" v={`${(storageBytes / 1024).toFixed(1)} KB`} />
          <Kv k="Console user" v={<span>{profile?.username} <Badge color={roles.find((r) => r.id === profile?.roles?.[0])?.color || "#71717a"}>{roles.find((r) => r.id === profile?.roles?.[0])?.name || "member"}</Badge></span>} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Panel
          title="Recent admin actions"
          desc="Immutable audit trail — every guarded mutation"
          icon={<Clock size={14} />}
          dense
          actions={can("logs.audit") ? <Btn size="xs" variant="outline" onClick={() => go("logs", "audit")}>Open</Btn> : undefined}
        >
          <div className="divide-y divide-neutral-800/60">
            {recent.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-800/30">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.result === "denied" ? "bg-red-500" : a.result === "error" ? "bg-amber-400" : "bg-emerald-500"}`} />
                <span className="font-mono text-[11px] text-neutral-200 truncate">{a.action}</span>
                <span className="font-mono text-[10px] text-neutral-600 truncate hidden sm:inline">{a.target}</span>
                <span className="ml-auto font-mono text-[10px] text-neutral-500 shrink-0">{new Date(a.at || 0).toLocaleString()}</span>
              </div>
            ))}
            {!recent.length && <p className="px-4 py-8 text-center text-[11px] text-neutral-600">No admin actions recorded yet.</p>}
          </div>
        </Panel>

        <Panel title="Content pipeline" icon={<HardDrive size={14} />}>
          {[
            { label: "Battles", value: battles.length, to: ["content", "battles"] },
            { label: "MC roster", value: mcs.length, to: ["content", "mcs"] },
            { label: "News items", value: news.length, to: ["content", "news"] },
            { label: "Comments", value: comments.length, to: ["community", "comments"] },
            { label: "Chat messages", value: chat.length, to: ["community", "chat"] },
            { label: "User accounts", value: users.length, to: ["community", "users"] },
          ].map((r) => (
            <button key={r.label} onClick={() => go(r.to[0], r.to[1])} className="w-full flex items-center justify-between py-2 border-b border-neutral-800/60 last:border-0 hover:text-red-400 transition group">
              <span className="font-mono text-[11px] text-neutral-400 group-hover:text-neutral-100">{r.label}</span>
              <span className="font-mono text-[12px] font-bold text-neutral-100">{r.value}</span>
            </button>
          ))}
        </Panel>
      </div>
    </div>
  );
}
