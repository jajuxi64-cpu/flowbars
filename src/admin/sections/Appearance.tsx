import { useEffect, useMemo, useState } from "react";
import { Palette, Monitor, Tablet, Smartphone, Save, Rocket, Undo2, Eye, GripVertical, Trash2, Plus, Type, LayoutGrid, MousePointerClick, Compass, PanelsTopLeft, History } from "lucide-react";
import { db, type Row } from "../../lib/backend";
import { useStore } from "../../store";
import { DEFAULT_DESIGN, type DesignConfig } from "../../lib/seed";
import { Badge, Btn, Confirm, Field, inputCls, PageHead, Panel, Tabs } from "../ui";

const DISPLAY_FONTS = ["'Anton', sans-serif", "'Bebas Neue', sans-serif", "'Oswald', sans-serif", "'Space Grotesk', sans-serif", "'Archivo', sans-serif"];
const BODY_FONTS = ["'Archivo', sans-serif", "'Inter', sans-serif", "'Space Grotesk', sans-serif", "'JetBrains Mono', monospace"];

function varsOf(d: DesignConfig): React.CSSProperties {
  const t = d.tokens;
  return {
    ["--fb-accent" as any]: t.accent,
    ["--fb-accent-2" as any]: t.accent2,
    ["--fb-ink" as any]: t.ink,
    ["--fb-surface" as any]: t.surface,
    ["--fb-surface-2" as any]: t.surface2,
    ["--fb-line" as any]: t.line,
    ["--fb-text" as any]: t.text,
    ["--fb-muted" as any]: t.muted,
    ["--fb-radius" as any]: `${t.radius}px`,
    ["--fb-radius-lg" as any]: `${t.radiusLg}px`,
    ["--fb-border-w" as any]: `${t.borderW}px`,
    ["--fb-font-display" as any]: t.fontDisplay,
    ["--fb-font-body" as any]: t.fontBody,
    ["--fb-anim" as any]: String(t.anim || 1),
    ["--fb-grain" as any]: String(t.grain),
    background: t.ink,
    color: t.text,
    fontFamily: t.fontBody,
  };
}

export default function AppearanceSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const { can, design: live, toast } = useStore();
  const [draft, setDraft] = useState<DesignConfig>({ ...DEFAULT_DESIGN, ...(live as any) } as DesignConfig);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [history, setHistory] = useState<Row[]>([]);
  const [revertTo, setRevertTo] = useState<Row | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const tabs = [
    { id: "design", label: "Design Mode", icon: <Palette size={12} />, perm: "design.view" },
    { id: "theme", label: "Theme & colour", icon: <Palette size={12} />, perm: "theme.edit" },
    { id: "typography", label: "Typography", icon: <Type size={12} />, perm: "typography.edit" },
    { id: "sections", label: "Sections", icon: <LayoutGrid size={12} />, perm: "sections.edit" },
    { id: "navigation", label: "Navigation", icon: <Compass size={12} />, perm: "navigation.edit" },
    { id: "footer", label: "Footer", icon: <PanelsTopLeft size={12} />, perm: "footer.edit" },
    { id: "components", label: "Components", icon: <MousePointerClick size={12} />, perm: "components.edit" },
  ].filter((t) => can(t.perm));
  const active = tabs.some((t) => t.id === sub) ? sub : tabs[0]?.id || "design";

  useEffect(() => {
    db.get("design", "draft").then((r) => {
      if (r) setDraft({ ...DEFAULT_DESIGN, ...(r as any), tokens: { ...DEFAULT_DESIGN.tokens, ...r.tokens }, components: { ...DEFAULT_DESIGN.components, ...r.components } } as unknown as DesignConfig);
    });
    db.list("design").then((rows) => setHistory(rows.filter((r) => r.channel === "history").sort((a, b) => (b.version || 0) - (a.version || 0))));
  }, []);

  const set = (patch: Partial<DesignConfig>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const setTokens = (patch: Partial<DesignConfig["tokens"]>) => set({ tokens: { ...draft.tokens, ...patch } } as Partial<DesignConfig>);
  const setComponents = (patch: Partial<DesignConfig["components"]>) => set({ components: { ...draft.components, ...patch } } as Partial<DesignConfig>);

  async function saveDraft() {
    setBusy(true);
    try {
      await db.update("design", "draft", { ...draft, channel: "draft", updatedAt: Date.now() }, "design.edit", "draft");
      toast("Draft saved — live site unchanged", "ok");
      setDirty(false);
    } catch (e: any) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  async function publish() {
    setBusy(true);
    try {
      const current = await db.get("design", "published");
      if (current) await db.create("design", { ...current, id: `hist_${current.version}_${Date.now()}`, channel: "history" }, "design.publish", `snapshot v${current.version}`);
      const version = (current?.version || 1) + 1;
      await db.update("design", "published", { ...draft, channel: "published", version, updatedAt: Date.now() }, "design.publish", `v${version}`);
      toast(`Published v${version} — live site updated`, "ok");
      setDirty(false);
      setHistory(await db.list("design").then((r) => r.filter((x) => x.channel === "history").sort((a, b) => (b.version || 0) - (a.version || 0))));
    } catch (e: any) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  async function revert(row: Row) {
    setBusy(true);
    try {
      await db.update("design", "draft", { ...row, channel: "draft", updatedAt: Date.now() }, "design.revert", `v${row.version}`);
      await db.update("design", "published", { ...row, channel: "published", updatedAt: Date.now() }, "design.revert", `v${row.version}`);
      setDraft({ ...DEFAULT_DESIGN, ...(row as any) } as unknown as DesignConfig);
      toast(`Reverted to v${row.version}`, "ok");
      setRevertTo(null);
    } catch (e: any) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  const previewWidth = device === "mobile" ? 390 : device === "tablet" ? 768 : "100%";

  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setSub} />
      <div className="pt-4 space-y-4">
        <PageHead title="Design Mode" desc="Edit the draft, preview it, then publish. The live site only changes on publish.">
          <Btn size="sm" variant="outline" icon={<Eye size={12} />} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide preview" : "Show preview"}</Btn>
          <Btn size="sm" variant="ghost" icon={<History size={12} />} onClick={() => setSub("history")} disabled={!tabs.length}>History ({history.length})</Btn>
          <Btn size="sm" variant="outline" icon={<Save size={12} />} disabled={!can("design.edit") || !dirty || busy} onClick={saveDraft}>{dirty ? "Save draft" : "Draft saved"}</Btn>
          <Btn size="sm" variant="primary" icon={<Rocket size={12} />} disabled={!can("design.publish") || busy} onClick={publish}>Publish v{(live.version || 1) + 1}</Btn>
        </PageHead>

        {active === "history" ? (
          <Panel title="Version history" desc="Every publish snapshots the previous live configuration." dense>
            <div className="divide-y divide-neutral-800/60">
              {history.map((h) => (
                <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                  <Badge color="#a78bfa">v{h.version}</Badge>
                  <span className="font-mono text-[10px] text-neutral-500">{new Date(h.updatedAt || 0).toLocaleString()}</span>
                  <span className="ml-auto">
                    <Btn size="xs" variant="danger" icon={<Undo2 size={11} />} disabled={!can("design.revert")} onClick={() => setRevertTo(h)}>Revert</Btn>
                  </span>
                </div>
              ))}
              {!history.length && <p className="p-8 text-center text-[11px] text-neutral-600">No published snapshots yet.</p>}
            </div>
          </Panel>
        ) : (
          <div className={`grid gap-4 ${showPreview ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : ""}`}>
            {/* -------------------------- EDITOR ------------------------- */}
            <div className="space-y-4">
              {(active === "design" || active === "theme") && (
                <Panel title="Colour & surface tokens" desc="Applied through CSS custom properties across the whole public site." icon={<Palette size={14} />}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      ["accent", "Accent"],
                      ["accent2", "Accent 2"],
                      ["ink", "Background"],
                      ["surface", "Surface"],
                      ["surface2", "Surface 2"],
                      ["line", "Border"],
                      ["text", "Text"],
                      ["muted", "Muted"],
                    ] as const).map(([k, label]) => (
                      <div key={k}>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 mb-1">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={(draft.tokens as any)[k]} disabled={!can("theme.edit")} onChange={(e) => setTokens({ [k]: e.target.value } as any)} />
                          <input className={inputCls + " py-1 text-[10px]"} value={(draft.tokens as any)[k]} disabled={!can("theme.edit")} onChange={(e) => setTokens({ [k]: e.target.value } as any)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5">
                    {([
                      ["radius", "Corner radius", 0, 24, 1],
                      ["radiusLg", "Large radius", 0, 32, 1],
                      ["borderW", "Border width", 0, 4, 1],
                      ["shadow", "Shadow depth", 0, 2, 0.1],
                      ["grain", "Film grain", 0, 0.3, 0.01],
                      ["anim", "Motion speed", 0.2, 2, 0.1],
                      ["space", "Spacing scale", 0.8, 1.4, 0.05],
                    ] as const).map(([k, label, min, max, step]) => (
                      <div key={k}>
                        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 mb-1">
                          <span>{label}</span>
                          <span className="text-neutral-300">{(draft.tokens as any)[k]}</span>
                        </div>
                        <input type="range" className="w-full" min={min} max={max} step={step} value={(draft.tokens as any)[k]} disabled={!can("theme.edit")} onChange={(e) => setTokens({ [k]: Number(e.target.value) } as any)} />
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {(active === "design" || active === "typography") && (
                <Panel title="Typography" icon={<Type size={14} />}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Display face">
                      <select className={inputCls} value={draft.tokens.fontDisplay} disabled={!can("typography.edit")} onChange={(e) => setTokens({ fontDisplay: e.target.value })}>
                        {DISPLAY_FONTS.map((f) => <option key={f} value={f}>{f.split("'")[1]}</option>)}
                      </select>
                    </Field>
                    <Field label="Body face">
                      <select className={inputCls} value={draft.tokens.fontBody} disabled={!can("typography.edit")} onChange={(e) => setTokens({ fontBody: e.target.value })}>
                        {BODY_FONTS.map((f) => <option key={f} value={f}>{f.split("'")[1]}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-4 p-4 rounded border border-neutral-800" style={varsOf(draft)}>
                    <div className="fb-display text-3xl" style={{ fontFamily: draft.tokens.fontDisplay }}>THE LOUDEST ROOM IN TBILISI</div>
                    <p className="text-[12px] mt-2" style={{ fontFamily: draft.tokens.fontBody, color: draft.tokens.muted }}>Body copy renders in {draft.tokens.fontBody.split("'")[1]} at the configured scale.</p>
                  </div>
                </Panel>
              )}

              {(active === "design" || active === "sections") && (
                <Panel title="Homepage sections" desc="Order and visibility. Drag-free reordering with the arrows." icon={<LayoutGrid size={14} />}>
                  <div className="space-y-1.5">
                    {[...draft.sections].sort((a, b) => a.order - b.order).map((s, i, arr) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-neutral-800 bg-neutral-950">
                        <GripVertical size={13} className="text-neutral-700" />
                        <span className="flex-1 text-[12px] text-neutral-200">{s.label}</span>
                        <span className="font-mono text-[9px] text-neutral-600">#{s.order}</span>
                        <button disabled={!can("sections.edit") || i === 0} className="p-1 text-neutral-500 hover:text-white disabled:opacity-20" onClick={() => reorder(i, -1)}>↑</button>
                        <button disabled={!can("sections.edit") || i === arr.length - 1} className="p-1 text-neutral-500 hover:text-white disabled:opacity-20" onClick={() => reorder(i, 1)}>↓</button>
                        <button
                          disabled={!can("sections.edit")}
                          className={`px-2 py-0.5 font-mono text-[9px] uppercase rounded border ${s.enabled ? "border-emerald-800 text-emerald-400" : "border-neutral-800 text-neutral-600"}`}
                          onClick={() => set({ sections: draft.sections.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) })}
                        >
                          {s.enabled ? "on" : "off"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {(["eyebrow", "title", "accentWord", "primaryLabel", "secondaryLabel", "image"] as const).map((k) => (
                      <Field key={k} label={`Hero ${k}`} className={k === "image" ? "sm:col-span-2" : ""}>
                        <input className={inputCls} value={(draft.hero as any)[k]} disabled={!can("sections.edit")} onChange={(e) => set({ hero: { ...draft.hero, [k]: e.target.value } } as any)} />
                      </Field>
                    ))}
                    <Field label="Hero subtitle" className="sm:col-span-2">
                      <textarea rows={3} className={inputCls} value={draft.hero.subtitle} disabled={!can("sections.edit")} onChange={(e) => set({ hero: { ...draft.hero, subtitle: e.target.value } } as any)} />
                    </Field>
                  </div>
                </Panel>
              )}

              {(active === "design" || active === "navigation") && (
                <Panel
                  title="Navigation"
                  icon={<Compass size={14} />}
                  actions={<Btn size="xs" variant="outline" icon={<Plus size={11} />} disabled={!can("navigation.edit")} onClick={() => set({ nav: [...draft.nav, { id: `n${Date.now()}`, label: "New link", route: "news", enabled: true }] })}>Add</Btn>}
                >
                  <div className="space-y-1.5">
                    {draft.nav.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 p-2 rounded border border-neutral-800 bg-neutral-950">
                        <input className={inputCls + " py-1 flex-1"} value={n.label} disabled={!can("navigation.edit")} onChange={(e) => set({ nav: draft.nav.map((x) => (x.id === n.id ? { ...x, label: e.target.value } : x)) })} />
                        <input className={inputCls + " py-1 w-28"} value={n.route} disabled={!can("navigation.edit")} onChange={(e) => set({ nav: draft.nav.map((x) => (x.id === n.id ? { ...x, route: e.target.value } : x)) })} />
                        <button disabled={!can("navigation.edit")} className={`px-2 py-1 font-mono text-[9px] uppercase rounded border ${n.enabled ? "border-emerald-800 text-emerald-400" : "border-neutral-800 text-neutral-600"}`} onClick={() => set({ nav: draft.nav.map((x) => (x.id === n.id ? { ...x, enabled: !x.enabled } : x)) })}>
                          {n.enabled ? "on" : "off"}
                        </button>
                        <button className="p-1 text-neutral-600 hover:text-red-500 disabled:opacity-30" disabled={!can("navigation.edit")} onClick={() => set({ nav: draft.nav.filter((x) => x.id !== n.id) })}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {(active === "design" || active === "footer") && (
                <Panel title="Footer" icon={<PanelsTopLeft size={14} />}>
                  <Field label="Blurb"><textarea rows={2} className={inputCls} value={draft.footer.blurb} disabled={!can("footer.edit")} onChange={(e) => set({ footer: { ...draft.footer, blurb: e.target.value } })} /></Field>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <Field label="Copyright"><input className={inputCls} value={draft.footer.copyright} disabled={!can("footer.edit")} onChange={(e) => set({ footer: { ...draft.footer, copyright: e.target.value } })} /></Field>
                    <Field label="Social label / href">
                      <div className="flex gap-2">
                        <input className={inputCls} value={draft.footer.socials[0]?.label || ""} disabled={!can("footer.edit")} onChange={(e) => set({ footer: { ...draft.footer, socials: [{ ...(draft.footer.socials[0] || { href: "" }), label: e.target.value }] } })} />
                        <input className={inputCls} value={draft.footer.socials[0]?.href || ""} disabled={!can("footer.edit")} onChange={(e) => set({ footer: { ...draft.footer, socials: [{ ...(draft.footer.socials[0] || { label: "Link" }), href: e.target.value }] } })} />
                      </div>
                    </Field>
                  </div>
                </Panel>
              )}

              {(active === "design" || active === "components") && (
                <Panel title="Components" icon={<MousePointerClick size={14} />}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Card style">
                      <select className={inputCls} value={draft.components.cardStyle} disabled={!can("components.edit")} onChange={(e) => setComponents({ cardStyle: e.target.value as any })}>
                        <option value="solid">Solid</option><option value="outline">Outline</option><option value="glass">Glass</option>
                      </select>
                    </Field>
                    <Field label="Button style">
                      <select className={inputCls} value={draft.components.buttonStyle} disabled={!can("components.edit")} onChange={(e) => setComponents({ buttonStyle: e.target.value as any })}>
                        <option value="sharp">Sharp</option><option value="rounded">Rounded</option><option value="pill">Pill</option>
                      </select>
                    </Field>
                    <Field label="Image treatment">
                      <select className={inputCls} value={draft.components.imageTreatment} disabled={!can("components.edit")} onChange={(e) => setComponents({ imageTreatment: e.target.value as any })}>
                        <option value="none">None</option><option value="mono">Monochrome</option><option value="duotone">Duotone</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 mt-3">
                    {([
                      ["marquee", "Live ticker marquee"],
                      ["gridOverlay", "Grid overlay"],
                      ["noise", "Film grain layer"],
                      ["revealOnScroll", "Scroll reveal animation"],
                    ] as const).map(([k, label]) => (
                      <button key={k} disabled={!can("components.edit")} onClick={() => setComponents({ [k]: !draft.components[k] } as any)} className="flex items-center justify-between py-2 border-b border-neutral-800/60 text-left">
                        <span className="text-[12px] text-neutral-300">{label}</span>
                        <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded border ${draft.components[k] ? "border-emerald-800 text-emerald-400" : "border-neutral-800 text-neutral-600"}`}>{draft.components[k] ? "on" : "off"}</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              )}
            </div>

            {/* ------------------------- PREVIEW ------------------------- */}
            {showPreview && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Preview</span>
                  <div className="flex gap-1 ml-auto">
                    {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                      <button key={d} onClick={() => setDevice(d)} className={`p-1.5 rounded border ${device === d ? "border-red-700 text-red-400" : "border-neutral-800 text-neutral-500 hover:text-white"}`}><Icon size={13} /></button>
                    ))}
                  </div>
                </div>
                <div className="border border-neutral-800 rounded-lg bg-neutral-950 p-2 overflow-hidden">
                  <div className="mx-auto transition-all duration-300 border border-neutral-800 rounded overflow-hidden" style={{ width: previewWidth, maxWidth: "100%" }}>
                    <div style={{ transform: device === "desktop" ? "none" : "none" }}>
                      <SitePreview design={draft} />
                    </div>
                  </div>
                </div>
                <p className="font-mono text-[10px] text-neutral-600">
                  Draft preview — the public site still serves v{live.version}. {dirty && <span className="text-amber-400">Unsaved changes.</span>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Confirm
        open={!!revertTo}
        danger
        title="Revert live site"
        confirmLabel={`Revert to v${revertTo?.version}`}
        onClose={() => setRevertTo(null)}
        onConfirm={() => revertTo && revert(revertTo)}
        body={<>This overwrites both the draft and the published configuration with snapshot <b className="text-white">v{revertTo?.version}</b>.</>}
      />
    </div>
  );

  function reorder(i: number, dir: -1 | 1) {
    const sorted = [...draft.sections].sort((a, b) => a.order - b.order);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    set({ sections: sorted.map((s, idx) => ({ ...s, order: idx + 1 })) });
  }
}

/* -------------------- faithful preview of the site ------------------ */
function SitePreview({ design: d }: { design: DesignConfig }) {
  const sections = useMemo(() => d.sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order), [d.sections]);
  const btnRadius = { sharp: "0px", rounded: `${d.tokens.radius}px`, pill: "999px" }[d.components.buttonStyle];
  const card = { solid: { background: d.tokens.surface, border: `${d.tokens.borderW}px solid ${d.tokens.line}` }, outline: { border: `${d.tokens.borderW}px solid ${d.tokens.line}` }, glass: { background: `${d.tokens.surface}cc`, border: `${d.tokens.borderW}px solid ${d.tokens.line}` } }[d.components.cardStyle] as React.CSSProperties;

  return (
    <div style={varsOf(d)} className="text-left">
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: `${d.tokens.borderW}px solid ${d.tokens.line}` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 grid place-items-center text-white text-[8px] font-black -skew-x-6" style={{ background: d.tokens.accent }}>F&B</span>
          <span style={{ fontFamily: d.tokens.fontDisplay }} className="text-[11px] tracking-wide">FLOW & BARS</span>
        </span>
        <span className="hidden sm:flex gap-2">
          {d.nav.filter((n) => n.enabled).map((n) => <span key={n.id} className="text-[8px] uppercase tracking-[0.14em]" style={{ color: d.tokens.muted }}>{n.label}</span>)}
        </span>
      </div>

      <div className="p-4 grid gap-3" style={{ background: `radial-gradient(600px 300px at 80% -10%, ${d.tokens.accent}22, transparent 60%), ${d.tokens.ink}` }}>
        <div>
          <span className="inline-block text-[7px] tracking-[0.2em] px-1.5 py-0.5 rounded-full" style={{ color: d.tokens.accent, border: `1px solid ${d.tokens.accent}55` }}>{d.hero.eyebrow}</span>
          <div className="mt-2 text-[clamp(1.2rem,4vw,2rem)] uppercase leading-[0.95]" style={{ fontFamily: d.tokens.fontDisplay }}>
            {d.hero.title.split(d.hero.accentWord).map((p, i, a) => (<span key={i}>{p}{i < a.length - 1 && <span style={{ color: d.tokens.accent }}>{d.hero.accentWord}</span>}</span>))}
          </div>
          <p className="text-[9px] mt-2 max-w-[320px]" style={{ color: d.tokens.muted }}>{d.hero.subtitle}</p>
          <div className="flex gap-2 mt-3">
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 text-white" style={{ background: d.tokens.accent, borderRadius: btnRadius }}>{d.hero.primaryLabel}</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-3 py-1.5" style={{ border: `${d.tokens.borderW}px solid ${d.tokens.line}`, borderRadius: btnRadius, color: d.tokens.text }}>{d.hero.secondaryLabel}</span>
          </div>
        </div>

        {sections.some((s) => s.id === "stats") && (
          <div className="grid grid-cols-4 gap-1.5">
            {[6, 4, "1.2K", 3].map((v, i) => (
              <div key={i} style={{ ...card, borderRadius: d.tokens.radiusLg }} className="p-2">
                <div className="text-[13px] font-bold" style={{ fontFamily: d.tokens.fontDisplay }}>{v}</div>
                <div className="text-[6px] uppercase tracking-[0.14em]" style={{ color: d.tokens.muted }}>{["MCs", "Battles", "Views", "Events"][i]}</div>
              </div>
            ))}
          </div>
        )}

        {sections.some((s) => s.id === "battles") && (
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...card, borderRadius: d.tokens.radiusLg }} className="overflow-hidden">
                <div className="h-10" style={{ background: `linear-gradient(135deg, ${d.tokens.accent}44, ${d.tokens.surface2})` }} />
                <div className="p-1.5">
                  <div className="text-[8px] font-bold uppercase">Matchup {i + 1}</div>
                  <div className="text-[6px]" style={{ color: d.tokens.muted }}>Winner · 3 - 0</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sections.some((s) => s.id === "cta") && (
          <div className="p-3" style={{ ...card, borderRadius: d.tokens.radiusLg }}>
            <div className="text-[11px] uppercase" style={{ fontFamily: d.tokens.fontDisplay }}>Bring your best round</div>
            <div className="text-[7px] mt-1" style={{ color: d.tokens.muted }}>Qualifiers are open.</div>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 flex items-center justify-between text-[6px] uppercase tracking-[0.16em]" style={{ borderTop: `${d.tokens.borderW}px solid ${d.tokens.line}`, color: d.tokens.muted }}>
        <span>{d.footer.copyright}</span>
        <span>{d.footer.socials.map((s) => s.label).join(" · ")}</span>
      </div>
    </div>
  );
}
