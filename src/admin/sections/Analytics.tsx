import { useMemo, useState } from "react";
import { Download, Users, BarChart3, Newspaper, Swords, MessageSquare } from "lucide-react";
import { useStore, useCollection } from "../../store";
import { Badge, Btn, DataTable, Empty, PageHead, Panel, StatCard, Tabs } from "../ui";
import { BarChart, DoughnutChart, LineChart } from "../charts";

const day = 864e5;
const key = (t: number) => new Date(t).toISOString().slice(0, 10);
const last = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - 1 - i) * day);
    return { k: d.toISOString().slice(0, 10), l: d.toISOString().slice(5, 10) };
  });

function useSeries() {
  const { rows: analytics } = useCollection("analytics");
  const { rows: users } = useCollection("users");
  const { rows: battles } = useCollection("battles");
  const { rows: news } = useCollection("news");
  const { rows: chat } = useCollection("chat");
  const { rows: comments } = useCollection("comments");
  const { rows: reports } = useCollection("reports");
  return { analytics, users, battles, news, chat, comments, reports };
}

export default function AnalyticsSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can } = useStore();
  const tabs = [
    { id: "traffic", label: "Traffic", icon: <BarChart3 size={12} />, perm: "analytics.view" },
    { id: "users", label: "Users", icon: <Users size={12} />, perm: "analytics.view" },
    { id: "content", label: "Content", icon: <Newspaper size={12} />, perm: "analytics.view" },
    { id: "battles", label: "Battle views", icon: <Swords size={12} />, perm: "analytics.view" },
    { id: "community", label: "Community", icon: <MessageSquare size={12} />, perm: "analytics.view" },
  ].filter((t) => can(t.perm));
  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "traffic";

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4">
        {!tabs.length ? <Empty text="You hold no analytics permissions." /> : <Body active={active} />}
      </div>
    </div>
  );
}

function Body({ active }: { active: string }) {
  const { analytics, users, battles, news, chat, comments, reports } = useSeries();
  const { can, toast } = useStore();
  const [range, setRange] = useState(14);

  const days = useMemo(() => last(range), [range]);
  const count = (type: string) => days.map((d) => analytics.filter((a) => a.type === type && key(a.at || 0) === d.k).length);

  function exportCsv() {
    const head = ["type", "at", "screen", "ref", "battle"];
    const lines = analytics.map((a) => [a.type, new Date(a.at || 0).toISOString(), a.screen || "", a.ref || "", a.battle || ""].join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `fb_analytics_${Date.now()}.csv`;
    el.click();
    toast("Analytics exported", "ok");
  }

  const rangeBtn = (
    <div className="flex gap-1">
      {[7, 14, 30].map((r) => (
        <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 font-mono text-[10px] rounded border ${range === r ? "border-red-700 text-red-400" : "border-neutral-800 text-neutral-500 hover:text-white"}`}>{r}d</button>
      ))}
    </div>
  );

  if (active === "traffic") {
    const routes = new Map<string, number>();
    analytics.forEach((a) => {
      if (a.type !== "page.view") return;
      routes.set(a.route || "/", (routes.get(a.route || "/") || 0) + 1);
    });
    const devices = { desktop: 0, tablet: 0, mobile: 0 };
    analytics.forEach((a) => {
      const w = parseInt(String(a.screen || "0").split("x")[0] || "0", 10);
      if (!w) return;
      if (w < 640) devices.mobile++;
      else if (w < 1024) devices.tablet++;
      else devices.desktop++;
    });
    return (
      <div>
        <PageHead title="Traffic" desc="Page views recorded by the public site on every route change.">
          {rangeBtn}
          <Btn size="sm" variant="outline" icon={<Download size={12} />} disabled={!can("analytics.export")} onClick={exportCsv}>Export CSV</Btn>
        </PageHead>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Page views" value={analytics.filter((a) => a.type === "page.view").length} sub={`${range}d: ${count("page.view").reduce((s, n) => s + n, 0)}`} accent="#38bdf8" />
          <StatCard label="Battle opens" value={analytics.filter((a) => a.type === "battle.open").length} accent="#dc2626" />
          <StatCard label="Plays started" value={analytics.filter((a) => a.type === "battle.play").length} accent="#34d399" />
          <StatCard label="Sessions" value={analytics.filter((a) => a.type === "app.boot").length} accent="#a78bfa" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Page views per day"><LineChart labels={days.map((d) => d.l)} data={count("page.view")} /></Panel>
          <Panel title="Routes" dense>
            <DataTable
              rows={[...routes.entries()].map(([route, n], i) => ({ id: String(i), route, hits: n }))}
              selectable={false}
              columns={[{ key: "route", label: "Route", render: (r) => <code className="text-[10px]">{r.route}</code> }, { key: "hits", label: "Hits", sort: (a: any, b: any) => a.hits - b.hits }]}
            />
          </Panel>
          <Panel title="Device classes"><DoughnutChart labels={Object.keys(devices)} data={Object.values(devices)} colors={["#dc2626", "#f59e0b", "#38bdf8"]} /></Panel>
          <Panel title="Battle opens per day"><BarChart labels={days.map((d) => d.l)} data={count("battle.open")} color="#dc2626" /></Panel>
        </div>
      </div>
    );
  }

  if (active === "users") {
    const providers = new Map<string, number>();
    users.forEach((u) => providers.set(u.provider || "password", (providers.get(u.provider || "password") || 0) + 1));
    return (
      <div>
        <PageHead title="User analytics" desc="Growth, providers and status — all derived from the users collection." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Accounts" value={users.length} accent="#38bdf8" />
          <StatCard label="New (7d)" value={users.filter((u) => Date.now() - (u.createdAt || 0) < 7 * day).length} accent="#34d399" />
          <StatCard label="Banned" value={users.filter((u) => u.banned).length} accent="#ef4444" />
          <StatCard label="Muted" value={users.filter((u) => u.muted).length} accent="#f59e0b" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Registrations per day">
            <BarChart labels={days.map((d) => d.l)} data={days.map((d) => users.filter((u) => key(u.createdAt || 0) === d.k).length)} color="#38bdf8" />
          </Panel>
          <Panel title="Auth providers"><DoughnutChart labels={[...providers.keys()]} data={[...providers.values()]} colors={["#dc2626", "#38bdf8", "#a78bfa", "#34d399"]} /></Panel>
        </div>
      </div>
    );
  }

  if (active === "content") {
    return (
      <div>
        <PageHead title="Content performance" desc="Publishing cadence and the strongest performing records." />
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Published news per day"><BarChart labels={days.map((d) => d.l)} data={days.map((d) => news.filter((n) => key(Date.parse(n.date) || 0) === d.k).length)} color="#a78bfa" /></Panel>
          <Panel title="Battles added per day"><BarChart labels={days.map((d) => d.l)} data={days.map((d) => battles.filter((b) => key(Date.parse(b.date) || 0) === d.k).length)} color="#dc2626" /></Panel>
          <Panel title="Top battles by views" dense>
            <DataTable
              rows={[...battles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10)}
              selectable={false}
              columns={[{ key: "title", label: "Battle" }, { key: "views", label: "Views", sort: (a: any, b: any) => (a.views || 0) - (b.views || 0) }]}
            />
          </Panel>
          <Panel title="News inventory" dense>
            <DataTable
              rows={news}
              selectable={false}
              columns={[{ key: "title", label: "Headline" }, { key: "tag", label: "Tag", hideMobile: true }, { key: "status", label: "State", render: (n) => <Badge color={n.status === "published" ? "#34d399" : "#f59e0b"}>{n.status}</Badge> }]}
            />
          </Panel>
        </div>
      </div>
    );
  }

  if (active === "battles") {
    const perBattle = battles.map((b) => ({
      id: b.id,
      title: b.title,
      stored: b.views || 0,
      opens: analytics.filter((a) => a.type === "battle.open" && a.battle === b.id).length,
      plays: analytics.filter((a) => a.type === "battle.play" && a.battle === b.id).length,
    }));
    return (
      <div>
        <PageHead title="Battle views" desc="Stored platform totals plus live open/play events captured this session period." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total stored views" value={battles.reduce((s, b) => s + (b.views || 0), 0)} accent="#dc2626" />
          <StatCard label="Opens tracked" value={analytics.filter((a) => a.type === "battle.open").length} accent="#38bdf8" />
          <StatCard label="Plays tracked" value={analytics.filter((a) => a.type === "battle.play").length} accent="#34d399" />
          <StatCard label="Videos attached" value={battles.filter((b) => b.youtubeId).length} sub={`of ${battles.length}`} accent="#f59e0b" />
        </div>
        <Panel title="Per-battle breakdown" dense>
          <DataTable
            rows={perBattle}
            selectable={false}
            columns={[
              { key: "title", label: "Battle" },
              { key: "stored", label: "Stored views", sort: (a: any, b: any) => a.stored - b.stored },
              { key: "opens", label: "Opens", sort: (a: any, b: any) => a.opens - b.opens },
              { key: "plays", label: "Plays", sort: (a: any, b: any) => a.plays - b.plays },
            ]}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Community analytics" desc="Chat volume, commenting and moderation load." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Messages" value={chat.length} accent="#38bdf8" />
        <StatCard label="Comments" value={comments.length} accent="#a78bfa" />
        <StatCard label="Reports" value={reports.length} sub={`${reports.filter((r) => r.status === "open").length} open`} accent="#f59e0b" />
        <StatCard label="Active posters" value={new Set(chat.map((c) => c.uid)).size} accent="#34d399" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Chat messages per day"><LineChart labels={days.map((d) => d.l)} data={days.map((d) => chat.filter((c) => key(c.createdAt || 0) === d.k).length)} color="#38bdf8" /></Panel>
        <Panel title="Comments per day"><LineChart labels={days.map((d) => d.l)} data={days.map((d) => comments.filter((c) => key(c.createdAt || 0) === d.k).length)} color="#a78bfa" /></Panel>
      </div>
    </div>
  );
}
