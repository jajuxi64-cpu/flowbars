import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Newspaper, Swords, CalendarRange, Mic, Trophy, FileText, Tags, Image as ImageIcon, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { db, type CollectionName, type Row } from "../../lib/backend";
import { useStore, useCollection } from "../../store";
import { Btn, Confirm, DataTable, Field, inputCls, Modal, PageHead, Panel, Tabs, Badge, Empty } from "../ui";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "date" | "url" | "list" | "boolean";
  options?: string[];
  hint?: string;
  required?: boolean;
}
interface EntityDef {
  col: CollectionName;
  title: string;
  desc: string;
  perms: { create: string; edit: string; del: string };
  fields: FieldDef[];
  columns: { key: string; label: string; hideMobile?: boolean }[];
  blank: Record<string, any>;
}

const ENTITIES: Record<string, EntityDef> = {
  news: {
    col: "news",
    title: "News",
    desc: "Announcements, interviews and league bulletins",
    perms: { create: "news.create", edit: "news.edit", del: "news.delete" },
    fields: [
      { key: "title", label: "Headline", type: "text", required: true },
      { key: "tag", label: "Tag", type: "select", options: ["ANNOUNCEMENT", "INTERVIEW", "LEAGUE", "RESULT", "EVENT"] },
      { key: "date", label: "Publish date", type: "date" },
      { key: "author", label: "Author", type: "text" },
      { key: "image", label: "Cover image URL", type: "url", hint: "Shown on the public news card" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "content", label: "Full body", type: "textarea" },
      { key: "featured", label: "Feature on homepage", type: "boolean" },
    ],
    columns: [
      { key: "title", label: "Headline" },
      { key: "tag", label: "Tag", hideMobile: true },
      { key: "date", label: "Date", hideMobile: true },
      { key: "status", label: "Status" },
    ],
    blank: { title: "", tag: "ANNOUNCEMENT", date: new Date().toISOString().slice(0, 10), status: "draft", summary: "", content: "", author: "", image: "" },
  },
  battles: {
    col: "battles",
    title: "Battles",
    desc: "Official matchups, video sources and judged decisions",
    perms: { create: "battles.create", edit: "battles.edit", del: "battles.delete" },
    fields: [
      { key: "title", label: "Matchup title", type: "text", required: true, hint: "e.g. NIKA vs SHOTA" },
      { key: "event", label: "Event / show", type: "text" },
      { key: "mc1", label: "MC 1", type: "text" },
      { key: "mc2", label: "MC 2", type: "text" },
      { key: "image", label: "Cover / poster image URL", type: "url", hint: "Shown on the public card and the battle hero" },
      { key: "youtubeId", label: "YouTube video ID", type: "text", hint: "The id from youtube.com/watch?v=ID" },
      { key: "date", label: "Event date", type: "date" },
      { key: "score", label: "Score", type: "text", hint: "e.g. 3 - 0" },
      { key: "winner", label: "Winner", type: "text" },
      { key: "judges", label: "Judges", type: "list", hint: "Comma separated" },
      { key: "views", label: "Stored views", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
      { key: "description", label: "Public description", type: "textarea" },
    ],
    columns: [
      { key: "title", label: "Matchup" },
      { key: "event", label: "Event", hideMobile: true },
      { key: "score", label: "Score" },
      { key: "views", label: "Views", hideMobile: true },
      { key: "status", label: "State" },
    ],
    blank: { title: "", event: "", mc1: "", mc2: "", image: "", youtubeId: "", date: new Date().toISOString().slice(0, 10), score: "0 - 0", winner: "", judges: [], views: 0, status: "draft", description: "" },
  },
  events: {
    col: "events",
    title: "Events",
    desc: "Shows, qualifiers and tournament dates",
    perms: { create: "events.create", edit: "events.edit", del: "events.delete" },
    fields: [
      { key: "title", label: "Event title", type: "text", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "venue", label: "Venue", type: "text" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "image", label: "Cover image URL", type: "url" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "live", "completed", "cancelled"] },
    ],
    columns: [
      { key: "title", label: "Event" },
      { key: "date", label: "Date", hideMobile: true },
      { key: "venue", label: "Venue", hideMobile: true },
      { key: "status", label: "State" },
    ],
    blank: { title: "", date: new Date().toISOString().slice(0, 10), venue: "", capacity: 0, image: "", description: "", status: "draft" },
  },
  mcs: {
    col: "mcs",
    title: "MC roster",
    desc: "Competitors, records and bios",
    perms: { create: "mcs.create", edit: "mcs.edit", del: "mcs.delete" },
    fields: [
      { key: "name", label: "Stage name", type: "text", required: true },
      { key: "city", label: "City", type: "text" },
      { key: "style", label: "Style", type: "text" },
      { key: "avatar", label: "Avatar / cover URL", type: "url", hint: "Used on the public roster and as card art" },
      { key: "banner", label: "Profile banner URL", type: "url" },
      { key: "wins", label: "Wins", type: "number" },
      { key: "losses", label: "Losses", type: "number" },
      { key: "draws", label: "Draws", type: "number" },
      { key: "streak", label: "Streak", type: "text", hint: "e.g. 3W or 1L" },
      { key: "bio", label: "Bio", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "MC" },
      { key: "city", label: "City", hideMobile: true },
      { key: "wins", label: "W" },
      { key: "losses", label: "L" },
      { key: "streak", label: "Streak", hideMobile: true },
    ],
    blank: { name: "", city: "", style: "", avatar: "", banner: "", wins: 0, losses: 0, draws: 0, streak: "—", bio: "" },
  },
  pages: {
    col: "pages",
    title: "Pages",
    desc: "Static pages (rules, about, contact)",
    perms: { create: "pages.create", edit: "pages.edit", del: "pages.delete" },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
      { key: "body", label: "Body", type: "textarea" },
    ],
    columns: [
      { key: "title", label: "Page" },
      { key: "slug", label: "Slug", hideMobile: true },
      { key: "status", label: "State" },
    ],
    blank: { title: "", slug: "", status: "draft", body: "" },
  },
  categories: {
    col: "categories",
    title: "Categories",
    desc: "Top-level content taxonomy",
    perms: { create: "categories.manage", edit: "categories.manage", del: "categories.manage" },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text" },
    ],
    columns: [{ key: "name", label: "Category" }, { key: "slug", label: "Slug" }],
    blank: { name: "", slug: "" },
  },
  tags: {
    col: "tags",
    title: "Tags",
    desc: "Free-form content tags",
    perms: { create: "tags.manage", edit: "tags.manage", del: "tags.manage" },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text" },
    ],
    columns: [{ key: "name", label: "Tag" }, { key: "slug", label: "Slug" }],
    blank: { name: "", slug: "" },
  },
  media: {
    col: "media",
    title: "Media library",
    desc: "Assets referenced by battles, MCs and news",
    perms: { create: "media.upload", edit: "media.edit", del: "media.delete" },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "url", label: "URL", type: "url", required: true },
      { key: "type", label: "Type", type: "select", options: ["image", "video", "audio", "document"] },
      { key: "size", label: "Dimensions / size", type: "text" },
    ],
    columns: [
      { key: "name", label: "Asset" },
      { key: "type", label: "Type", hideMobile: true },
      { key: "size", label: "Size", hideMobile: true },
    ],
    blank: { name: "", url: "", type: "image", size: "" },
  },
};

/* -------------------------- generic editor ------------------------- */
function EntityEditor({ id }: { id: string }) {
  const def = ENTITIES[id];
  const { can, toast } = useStore();
  const { rows } = useCollection(def.col);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (row?: Row) => {
    setEditing(row || ({ id: "", ...def.blank } as Row));
    setForm(row ? { ...row } : { ...def.blank });
  };

  async function save() {
    setBusy(true);
    try {
      if (editing?.id && rows.some((r) => r.id === editing.id)) {
        await db.update(def.col, editing.id, form, def.perms.edit, String(form.title || form.name));
        toast("Record updated", "ok");
      } else {
        await db.create(def.col, form, def.perms.create, String(form.title || form.name));
        toast("Record created", "ok");
      }
      setEditing(null);
    } catch (e: any) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  const statusColor = (s: string) => (s === "published" || s === "scheduled" || s === "completed" ? "#34d399" : s === "archived" || s === "cancelled" ? "#71717a" : "#f59e0b");

  return (
    <div>
      <PageHead title={def.title} desc={def.desc}>
        <Btn variant="primary" size="sm" icon={<Plus size={12} />} disabled={!can(def.perms.create)} onClick={() => open()}>New {id.replace(/s$/, "")}</Btn>
      </PageHead>

      <Panel dense>
        <DataTable
          rows={rows}
          searchKeys={["title", "name", "slug", "event", "status", "tag"]}
          columns={def.columns.map((c) => ({
            ...c,
            sort: (a: any, b: any) => String(a[c.key] ?? "").localeCompare(String(b[c.key] ?? "")),
            render: (r: any) =>
              c.key === "status" || c.key === "state" ? (
                <Badge color={statusColor(r[c.key])}>{r[c.key] || "—"}</Badge>
              ) : (
                <span className="truncate block max-w-[220px]">{String(r[c.key] ?? "—")}</span>
              ),
          }))}
          rowActions={(r) => (
            <span className="inline-flex gap-1">
              <button className="p-1.5 text-neutral-500 hover:text-white" onClick={() => open(r)} disabled={!can(def.perms.edit)} title="Edit"><Pencil size={13} /></button>
              <button className="p-1.5 text-neutral-500 hover:text-red-500" onClick={() => setDel(r)} disabled={!can(def.perms.del)} title="Delete"><Trash2 size={13} /></button>
            </span>
          )}
          onBulk={async (ids) => {
            try {
              await db.bulkRemove(def.col, ids, def.perms.del);
              toast(`${ids.length} records deleted`, "ok");
            } catch (e: any) {
              toast(e.message, "err");
            }
          }}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id && rows.some((r) => r.id === editing.id) ? `Edit ${id}` : `New ${id}`}
        width="max-w-2xl"
        footer={<><Btn onClick={() => setEditing(null)}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save record"}</Btn></>}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {def.fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              {f.type === "textarea" ? (
                <textarea rows={4} className={inputCls} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.type === "select" ? (
                <select className={inputCls} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "list" ? (
                <input className={inputCls} value={Array.isArray(form[f.key]) ? form[f.key].join(", ") : form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              ) : f.type === "boolean" ? (
                <button type="button" onClick={() => setForm({ ...form, [f.key]: !form[f.key] })} className={`px-3 py-2 text-[11px] font-mono rounded border ${form[f.key] ? "border-emerald-700 text-emerald-400 bg-emerald-950/40" : "border-neutral-800 text-neutral-500"}`}>
                  {form[f.key] ? "YES" : "NO"}
                </button>
              ) : (
                <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} className={inputCls} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
              )}
            </Field>
          ))}
          {def.fields.some((f) => f.key === "image" || f.key === "avatar" || f.key === "url") && form.image && (
            <div className="sm:col-span-2">
              <img src={form.image} alt="" className="h-28 rounded border border-neutral-800 object-cover" />
            </div>
          )}
        </div>
      </Modal>

      <Confirm
        open={!!del}
        danger
        onClose={() => setDel(null)}
        onConfirm={async () => {
          try {
            await db.remove(def.col, del!.id, def.perms.del, String(del!.title || del!.name));
            toast("Record deleted", "ok");
          } catch (e: any) {
            toast(e.message, "err");
          }
          setDel(null);
        }}
        title="Delete record"
        confirmLabel="Delete permanently"
        body={<>Remove <b className="text-white">{String(del?.title || del?.name)}</b> from <code className="text-red-400">{def.col}</code>? This cannot be undone.</>}
      />
    </div>
  );
}

/* ----------------------------- rankings ---------------------------- */
function Rankings() {
  const { can, toast } = useStore();
  const { rows: mcs } = useCollection("mcs");
  const { rows: battles } = useCollection("battles");
  const ranked = useMemo(() => [...mcs].sort((a, b) => (a.rank || 999) - (b.rank || 999)), [mcs]);

  async function move(row: Row, dir: -1 | 1) {
    const target = ranked.find((m) => m.rank === (row.rank || 0) + dir);
    try {
      await db.update("mcs", row.id, { rank: (row.rank || 0) + dir }, "rankings.manage", row.name);
      if (target) await db.update("mcs", target.id, { rank: row.rank }, "rankings.manage", target.name);
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  async function recalc() {
    const tally: Record<string, { w: number; l: number }> = {};
    battles.filter((b) => b.status !== "draft").forEach((b) => {
      [b.mc1, b.mc2].forEach((name: string) => {
        if (!name) return;
        tally[name] = tally[name] || { w: 0, l: 0 };
        if (b.winner === name) tally[name].w++;
        else if (b.winner) tally[name].l++;
      });
    });
    const sorted = mcs
      .map((m) => ({ m, t: tally[m.name] || { w: m.wins || 0, l: m.losses || 0 } }))
      .sort((a, b) => b.t.w / Math.max(1, b.t.w + b.t.l) - a.t.w / Math.max(1, a.t.w + a.t.l));
    try {
      for (let i = 0; i < sorted.length; i++) {
        await db.update("mcs", sorted[i].m.id, { wins: sorted[i].t.w, losses: sorted[i].t.l, rank: i + 1 }, "rankings.recalc", sorted[i].m.name);
      }
      toast("Ladder recalculated from battle results", "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <div>
      <PageHead title="Rankings" desc="Ladder positions are editable and can be recomputed from recorded battle decisions.">
        <Btn variant="outline" size="sm" icon={<RefreshCw size={12} />} disabled={!can("rankings.recalc")} onClick={recalc}>Recalculate</Btn>
      </PageHead>
      <Panel dense>
        <DataTable
          rows={ranked}
          selectable={false}
          searchKeys={["name", "city"]}
          columns={[
            { key: "rank", label: "#", width: "60px", render: (r) => <span className="font-mono font-bold text-red-400">{r.rank}</span> },
            { key: "name", label: "MC" },
            { key: "city", label: "City", hideMobile: true },
            { key: "wins", label: "W", render: (r) => <span className="text-emerald-400 font-bold">{r.wins}</span> },
            { key: "losses", label: "L", render: (r) => <span className="text-red-400 font-bold">{r.losses}</span> },
            { key: "streak", label: "Streak", hideMobile: true },
          ]}
          rowActions={(r) => (
            <span className="inline-flex gap-0.5">
              <button className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30" disabled={!can("rankings.manage")} onClick={() => move(r, -1)}><ArrowUp size={13} /></button>
              <button className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30" disabled={!can("rankings.manage")} onClick={() => move(r, 1)}><ArrowDown size={13} /></button>
            </span>
          )}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------ shell ------------------------------ */
export default function ContentSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can } = useStore();
  const tabs = [
    { id: "news", label: "News", icon: <Newspaper size={12} />, perm: "news.view" },
    { id: "battles", label: "Battles", icon: <Swords size={12} />, perm: "battles.view" },
    { id: "events", label: "Events", icon: <CalendarRange size={12} />, perm: "events.view" },
    { id: "mcs", label: "MCs", icon: <Mic size={12} />, perm: "mcs.view" },
    { id: "rankings", label: "Rankings", icon: <Trophy size={12} />, perm: "rankings.view" },
    { id: "pages", label: "Pages", icon: <FileText size={12} />, perm: "pages.view" },
    { id: "categories", label: "Categories", icon: <Tags size={12} />, perm: "categories.manage" },
    { id: "tags", label: "Tags", icon: <Tags size={12} />, perm: "tags.manage" },
    { id: "media", label: "Media", icon: <ImageIcon size={12} />, perm: "media.view" },
  ].filter((t) => can(t.perm));

  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "news";

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4">
        {!tabs.length ? <Empty text="You hold no content permissions." /> : active === "rankings" ? <Rankings /> : <EntityEditor id={active} />}
      </div>
    </div>
  );
}
