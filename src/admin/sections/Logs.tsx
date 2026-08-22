import { ScrollText, Lock, Shield, Flag, Trash2, Download } from "lucide-react";
import { db } from "../../lib/backend";
import { useStore, useCollection } from "../../store";
import { Badge, Btn, Confirm, DataTable, Empty, PageHead, Panel, Tabs } from "../ui";
import { useState } from "react";

const resultColor = (r: string) => (r === "success" || r === "signup" ? "#34d399" : r === "denied" || r === "failed" || r === "signup-failed" ? "#ef4444" : "#f59e0b");

export default function LogsSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can } = useStore();
  const tabs = [
    { id: "audit", label: "Audit log", icon: <ScrollText size={12} />, perm: "logs.audit" },
    { id: "logins", label: "Login history", icon: <Lock size={12} />, perm: "logs.logins" },
    { id: "security", label: "Security events", icon: <Shield size={12} />, perm: "logs.security" },
    { id: "errors", label: "System errors", icon: <Flag size={12} />, perm: "logs.errors" },
  ].filter((t) => can(t.perm));
  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "audit";
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4">
        {!tabs.length ? <Empty text="You hold no log permissions." /> : <Stream name={active} />}
      </div>
    </div>
  );
}

function Stream({ name }: { name: string }) {
  const { can, toast } = useStore();
  const col = name === "audit" ? "audit_logs" : name === "logins" ? "login_logs" : name === "security" ? "security_logs" : "error_logs";
  const { rows } = useCollection(col as any);
  const [purge, setPurge] = useState(false);
  const list = [...rows].sort((a, b) => (b.at || 0) - (a.at || 0));

  const columns: Record<string, any[]> = {
    audit: [
      { key: "actor", label: "Actor" },
      { key: "action", label: "Action", render: (r: any) => <code className="text-[10px] text-neutral-200">{r.action}</code> },
      { key: "target", label: "Target", hideMobile: true },
      { key: "permission", label: "Permission", hideMobile: true, render: (r: any) => <code className="text-[10px] text-neutral-500">{r.permission}</code> },
      { key: "result", label: "Result", render: (r: any) => <Badge color={resultColor(r.result)}>{r.result}</Badge> },
      { key: "at", label: "When", render: (r: any) => <span className="font-mono text-[10px] text-neutral-500">{new Date(r.at || 0).toLocaleString()}</span> },
    ],
    logins: [
      { key: "identity", label: "Identity" },
      { key: "method", label: "Method", hideMobile: true },
      { key: "result", label: "Result", render: (r: any) => <Badge color={resultColor(r.result)}>{r.result}</Badge> },
      { key: "detail", label: "Detail", hideMobile: true, render: (r: any) => <span className="text-neutral-600">{r.detail || "—"}</span> },
      { key: "at", label: "When", render: (r: any) => <span className="font-mono text-[10px] text-neutral-500">{new Date(r.at || 0).toLocaleString()}</span> },
    ],
    security: [
      { key: "type", label: "Event", render: (r: any) => <code className="text-[10px] text-red-400">{r.type}</code> },
      { key: "detail", label: "Detail" },
      { key: "at", label: "When", hideMobile: true, render: (r: any) => <span className="font-mono text-[10px] text-neutral-500">{new Date(r.at || 0).toLocaleString()}</span> },
    ],
    errors: [
      { key: "message", label: "Message" },
      { key: "where", label: "Source", hideMobile: true },
      { key: "stack", label: "Stack", hideMobile: true, render: (r: any) => <span className="text-neutral-600 truncate block max-w-[260px]">{r.stack || "—"}</span> },
      { key: "at", label: "When", render: (r: any) => <span className="font-mono text-[10px] text-neutral-500">{new Date(r.at || 0).toLocaleString()}</span> },
    ],
  };

  const titles: Record<string, [string, string]> = {
    audit: ["Audit log", "Every guarded mutation in the console, with the actor and the permission key checked."],
    logins: ["Login history", "Successful and failed authentication attempts, including lockout triggers."],
    security: ["Security events", "Permission violations, unauthenticated write attempts and provider errors."],
    errors: ["System errors", "Runtime errors captured from the public site and the console."],
  };

  return (
    <div>
      <PageHead title={titles[name][0]} desc={titles[name][1]}>
        <Btn
          size="sm"
          variant="outline"
          icon={<Download size={12} />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `fb_${col}.json`;
            a.click();
          }}
        >
          Export
        </Btn>
        <Btn size="sm" variant="danger" icon={<Trash2 size={12} />} disabled={!can("logs.purge")} onClick={() => setPurge(true)}>Purge stream</Btn>
      </PageHead>
      <Panel dense>
        <DataTable rows={list} columns={columns[name]} pageSize={20} searchKeys={undefined} empty="No entries in this stream yet." />
      </Panel>
      <Confirm
        open={purge}
        danger
        requireText="PURGE"
        title="Purge log stream"
        confirmLabel={`Delete ${list.length} entries`}
        onClose={() => setPurge(false)}
        onConfirm={async () => {
          try {
            await db.bulkRemove(col as any, list.map((r) => r.id), "logs.purge");
            toast("Log stream purged", "ok");
          } catch (e: any) {
            toast(e.message, "err");
          }
          setPurge(false);
        }}
        body={<>Permanently delete all <b className="text-white">{list.length}</b> entries in <code className="text-red-400">{col}</code>? Audit history is normally retained — purge only when legally required.</>}
      />
    </div>
  );
}
