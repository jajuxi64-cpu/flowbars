import { useState } from 'react';
import * as db from '../lib/db';
import { useDb } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { DesignConfig, getDesign, saveDesign, DEFAULT_DESIGN, HomeSection } from '../lib/design';
import { PublicSite } from '../public/PublicSite';
import { Btn, Panel, Input, Field, Select, Toggle, Slider, ColorInput, useToast, useConfirm, Badge, EmptyState } from '../ui/kit';
import { cn } from '../utils/cn';
import { uid } from '../lib/crypto';

const DEVICES = { desktop: 1280, tablet: 834, mobile: 390 };

const SECTION_TYPES: HomeSection['type'][] = [
  'hero',
  'stats',
  'leaders',
  'featuredBattles',
  'news',
  'events',
  'cta',
  'richText',
];

export function DesignMode() {
  useDb();
  const { can } = useAuth();
  const toast = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [draft, setDraft] = useState<DesignConfig>(() => getDesign('draft'));
  const [tab, setTab] = useState('theme');
  const [device, setDevice] = useState<keyof typeof DEVICES>('desktop');
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  if (!can('design.view')) return <EmptyState text="Missing permission design.view" />;

  const revisions = db.all('design_revisions');
  const set = (path: string, value: any) => {
    if (!can('design.edit')) return toast.push('Permission denied: design.edit', 'err');
    setDraft((d) => {
      const next: any = structuredClone(d);
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const saveDraft = () => {
    if (!can('design.edit')) return toast.push('Permission denied: design.edit', 'err');
    saveDesign('draft', draft);
    setDirty(false);
    toast.push('Draft saved. The live site is unchanged.');
  };

  const publish = async () => {
    if (!can('design.publish')) return toast.push('Permission denied: design.publish', 'err');
    if (!(await confirm('Publish design', 'This replaces the live public website appearance. A revision of the current live design is stored so you can revert.')))
      return;
    db.insert('design_revisions', {
      label: 'Pre-publish snapshot ' + new Date().toLocaleString(),
      config: getDesign('published'),
    });
    saveDesign('draft', draft);
    saveDesign('published', draft);
    setDirty(false);
    toast.push('Design published to the live site.');
  };

  const revert = async (rev: any) => {
    if (!can('design.revert')) return toast.push('Permission denied: design.revert', 'err');
    if (!(await confirm('Revert design', `Restore "${rev.label}" as the live design?`))) return;
    saveDesign('published', rev.config);
    setDraft(rev.config);
    saveDesign('draft', rev.config);
    toast.push('Reverted.');
  };

  const t = draft.theme;

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest">Design mode</span>
          {dirty ? <Badge color="amber">unsaved changes</Badge> : <Badge color="green">draft saved</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-neutral-800">
            {Object.keys(DEVICES).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d as any)}
                className={cn('px-2.5 py-1.5 text-[11px] capitalize', device === d ? 'bg-red-600 text-white' : 'text-neutral-400')}
              >
                {d}
              </button>
            ))}
          </div>
          <Btn size="sm" onClick={() => setShowPreview((p) => !p)}>
            {showPreview ? 'Hide preview' : 'Show preview'}
          </Btn>
          <Btn size="sm" onClick={() => { setDraft(getDesign('published')); setDirty(true); toast.push('Draft reset to live design.'); }}>
            Reset to live
          </Btn>
          <Btn size="sm" onClick={() => { setDraft(DEFAULT_DESIGN); setDirty(true); }}>
            Load defaults
          </Btn>
          <Btn size="sm" onClick={saveDraft}>
            Save draft
          </Btn>
          <Btn size="sm" variant="primary" onClick={publish}>
            Publish
          </Btn>
        </div>
      </div>

      <div className={cn('grid gap-4', showPreview ? 'xl:grid-cols-[minmax(0,380px)_1fr]' : '')}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {['theme', 'typography', 'header', 'navigation', 'homepage', 'footer', 'components', 'responsive', 'revisions'].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setTab(s)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize',
                    tab === s ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white',
                  )}
                >
                  {s}
                </button>
              ),
            )}
          </div>

          {tab === 'theme' && (
            <Panel title="Colours, surfaces & motion">
              <div className="space-y-3">
                <Select value={t.mode} onChange={(e) => set('theme.mode', e.target.value)}>
                  <option value="dark">Dark base</option>
                  <option value="light">Light base</option>
                </Select>
                <ColorInput label="Accent" value={t.accent} onChange={(v) => set('theme.accent', v)} />
                <ColorInput label="Secondary accent" value={t.accent2} onChange={(v) => set('theme.accent2', v)} />
                <ColorInput label="Background" value={t.bg} onChange={(v) => set('theme.bg', v)} />
                <ColorInput label="Surface" value={t.surface} onChange={(v) => set('theme.surface', v)} />
                <ColorInput label="Text" value={t.text} onChange={(v) => set('theme.text', v)} />
                <ColorInput label="Muted text" value={t.muted} onChange={(v) => set('theme.muted', v)} />
                <ColorInput label="Border" value={t.border} onChange={(v) => set('theme.border', v)} />
                <Slider label="Corner radius" value={t.radius} min={0} max={32} unit="px" onChange={(v) => set('theme.radius', v)} />
                <Slider label="Border width" value={t.borderWidth} min={0} max={4} unit="px" onChange={(v) => set('theme.borderWidth', v)} />
                <Slider label="Section spacing" value={t.spacing} min={8} max={64} unit="px" onChange={(v) => set('theme.spacing', v)} />
                <Slider label="Container width" value={t.containerWidth} min={880} max={1600} step={20} unit="px" onChange={(v) => set('theme.containerWidth', v)} />
                <Field label="Shadow depth">
                  <Select value={t.shadow} onChange={(e) => set('theme.shadow', e.target.value)}>
                    {['none', 'soft', 'medium', 'hard'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Toggle label="Animations" checked={t.animations} onChange={(v) => set('theme.animations', v)} />
                <Slider label="Animation speed" value={t.animationSpeed} min={0.25} max={3} step={0.25} unit="x" onChange={(v) => set('theme.animationSpeed', v)} />
              </div>
            </Panel>
          )}

          {tab === 'typography' && (
            <Panel title="Typography">
              <div className="space-y-3">
                <Field label="Heading font stack">
                  <Input value={t.headingFont} onChange={(e) => set('theme.headingFont', e.target.value)} />
                </Field>
                <Field label="Body font stack">
                  <Input value={t.bodyFont} onChange={(e) => set('theme.bodyFont', e.target.value)} />
                </Field>
                <Slider label="Base font size" value={t.baseFontSize} min={12} max={22} unit="px" onChange={(v) => set('theme.baseFontSize', v)} />
                <Slider label="Heading weight" value={t.headingWeight} min={400} max={900} step={100} onChange={(v) => set('theme.headingWeight', v)} />
                <Slider label="Heading tracking" value={t.headingTracking} min={-3} max={6} step={0.5} unit="px" onChange={(v) => set('theme.headingTracking', v)} />
                <Toggle label="Uppercase headings" checked={t.uppercaseHeadings} onChange={(v) => set('theme.uppercaseHeadings', v)} />
              </div>
            </Panel>
          )}

          {tab === 'header' && (
            <Panel title="Header">
              <div className="space-y-3">
                <Field label="Logo text">
                  <Input value={draft.header.logoText} onChange={(e) => set('header.logoText', e.target.value)} />
                </Field>
                <Field label="Logo mark">
                  <Input value={draft.header.logoMark} onChange={(e) => set('header.logoMark', e.target.value)} />
                </Field>
                <Field label="Tagline">
                  <Input value={draft.header.tagline} onChange={(e) => set('header.tagline', e.target.value)} />
                </Field>
                <Toggle label="Sticky header" checked={draft.header.sticky} onChange={(v) => set('header.sticky', v)} />
                <Toggle label="Show CTA button" checked={draft.header.showCta} onChange={(v) => set('header.showCta', v)} />
                <Field label="CTA label">
                  <Input value={draft.header.ctaLabel} onChange={(e) => set('header.ctaLabel', e.target.value)} />
                </Field>
                <Field label="CTA URL">
                  <Input value={draft.header.ctaUrl} onChange={(e) => set('header.ctaUrl', e.target.value)} />
                </Field>
              </div>
            </Panel>
          )}

          {tab === 'navigation' && (
            <Panel
              title="Navigation"
              right={
                <Btn
                  size="xs"
                  onClick={() => set('nav', [...draft.nav, { id: uid('n'), label: 'New link', page: 'home', visible: true }])}
                >
                  + Item
                </Btn>
              }
            >
              <div className="space-y-2">
                {draft.nav.map((n, i) => (
                  <div key={n.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <Input
                      value={n.label}
                      onChange={(e) => set('nav', draft.nav.map((x) => (x.id === n.id ? { ...x, label: e.target.value } : x)))}
                    />
                    <Select
                      value={n.page}
                      onChange={(e) => set('nav', draft.nav.map((x) => (x.id === n.id ? { ...x, page: e.target.value } : x)))}
                    >
                      {['home', 'battles', 'rankings', 'mcs', 'news', 'events', 'community'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      {db.all('pages').map((p) => (
                        <option key={p.id} value={'page:' + p.slug}>
                          page: {p.title}
                        </option>
                      ))}
                    </Select>
                    <div className="flex gap-1">
                      <Btn size="xs" onClick={() => set('nav', draft.nav.map((x) => (x.id === n.id ? { ...x, visible: !x.visible } : x)))}>
                        {n.visible ? '👁' : '🚫'}
                      </Btn>
                      <Btn size="xs" disabled={i === 0} onClick={() => set('nav', swap(draft.nav, i, i - 1))}>
                        ↑
                      </Btn>
                      <Btn size="xs" variant="danger" onClick={() => set('nav', draft.nav.filter((x) => x.id !== n.id))}>
                        ✕
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'homepage' && (
            <Panel
              title="Homepage sections"
              desc="Reorder, hide or add sections. Section content is editable inline."
              right={
                <Select
                  className="w-36"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    set('homepage', [
                      ...draft.homepage,
                      {
                        id: uid('s'),
                        type: e.target.value as HomeSection['type'],
                        title: e.target.value,
                        visible: true,
                        props: e.target.value === 'richText' ? { heading: 'Heading', body: 'Text…' } : { limit: 3 },
                      },
                    ]);
                  }}
                >
                  <option value="">+ Add section…</option>
                  {SECTION_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              }
            >
              <div className="space-y-2">
                {draft.homepage.map((s, i) => (
                  <div key={s.id} className="rounded-md border border-neutral-800 bg-neutral-950 p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-[11px] font-bold text-neutral-200">
                        {s.title} <span className="text-neutral-600">({s.type})</span>
                      </span>
                      <Btn size="xs" onClick={() => set('homepage', draft.homepage.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))}>
                        {s.visible ? '👁' : '🚫'}
                      </Btn>
                      <Btn size="xs" disabled={i === 0} onClick={() => set('homepage', swap(draft.homepage, i, i - 1))}>
                        ↑
                      </Btn>
                      <Btn size="xs" disabled={i === draft.homepage.length - 1} onClick={() => set('homepage', swap(draft.homepage, i, i + 1))}>
                        ↓
                      </Btn>
                      <Btn size="xs" variant="danger" onClick={() => set('homepage', draft.homepage.filter((x) => x.id !== s.id))}>
                        ✕
                      </Btn>
                    </div>
                    <div className="mt-2 grid gap-2">
                      <Input
                        value={s.title}
                        onChange={(e) => set('homepage', draft.homepage.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                        placeholder="Section title"
                      />
                      {Object.keys(s.props || {}).map((k) => (
                        <Input
                          key={k}
                          value={s.props[k]}
                          placeholder={k}
                          onChange={(e) =>
                            set(
                              'homepage',
                              draft.homepage.map((x) =>
                                x.id === s.id
                                  ? {
                                      ...x,
                                      props: {
                                        ...x.props,
                                        [k]: typeof s.props[k] === 'number' ? Number(e.target.value) : e.target.value,
                                      },
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'footer' && (
            <Panel
              title="Footer"
              right={
                <Btn
                  size="xs"
                  onClick={() => set('footer.links', [...draft.footer.links, { id: uid('f'), label: 'Link', url: 'https://' }])}
                >
                  + Link
                </Btn>
              }
            >
              <div className="space-y-3">
                <Toggle label="Show footer" checked={draft.footer.visible} onChange={(v) => set('footer.visible', v)} />
                <Field label="Footer text">
                  <Input value={draft.footer.text} onChange={(e) => set('footer.text', e.target.value)} />
                </Field>
                {draft.footer.links.map((l) => (
                  <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input value={l.label} onChange={(e) => set('footer.links', draft.footer.links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))} />
                    <Input value={l.url} onChange={(e) => set('footer.links', draft.footer.links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))} />
                    <Btn size="xs" variant="danger" onClick={() => set('footer.links', draft.footer.links.filter((x) => x.id !== l.id))}>
                      ✕
                    </Btn>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'components' && (
            <Panel title="Components">
              <div className="space-y-3">
                <Toggle label="Card hover lift" checked={draft.components.cardHover} onChange={(v) => set('components.cardHover', v)} />
                <Toggle label="Card shadows" checked={draft.components.cardShadow} onChange={(v) => set('components.cardShadow', v)} />
                <Slider label="Button radius" value={draft.components.buttonRadius} min={0} max={40} unit="px" onChange={(v) => set('components.buttonRadius', v)} />
                <Slider label="Button weight" value={draft.components.buttonWeight} min={400} max={900} step={100} onChange={(v) => set('components.buttonWeight', v)} />
                <Toggle label="Uppercase buttons" checked={draft.components.buttonUppercase} onChange={(v) => set('components.buttonUppercase', v)} />
              </div>
            </Panel>
          )}

          {tab === 'responsive' && (
            <Panel title="Responsive behaviour">
              <div className="space-y-3">
                <Toggle
                  label="Hide hero artwork on mobile"
                  checked={draft.responsive.mobileHideHeroArt}
                  onChange={(v) => set('responsive.mobileHideHeroArt', v)}
                />
                <Slider label="Tablet columns" value={draft.responsive.tabletColumns} min={1} max={4} onChange={(v) => set('responsive.tabletColumns', v)} />
                <Slider label="Mobile columns" value={draft.responsive.mobileColumns} min={1} max={2} onChange={(v) => set('responsive.mobileColumns', v)} />
              </div>
            </Panel>
          )}

          {tab === 'revisions' && (
            <Panel title="Revisions" desc="Every publish snapshots the previous live design.">
              <div className="space-y-2">
                {[...revisions].reverse().map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950 p-2 text-[11px]">
                    <span className="text-neutral-300">{r.label}</span>
                    <div className="flex gap-1">
                      <Btn size="xs" onClick={() => { setDraft(r.config); setDirty(true); }}>
                        Load to draft
                      </Btn>
                      <Btn size="xs" variant="danger" onClick={() => revert(r)}>
                        Revert live
                      </Btn>
                    </div>
                  </div>
                ))}
                {!revisions.length && <EmptyState text="No revisions yet." />}
              </div>
            </Panel>
          )}
        </div>

        {showPreview && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
              <span>Live draft preview · {device} ({DEVICES[device]}px)</span>
              <span>Not published</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <div
                className="origin-top-left"
                style={{
                  width: DEVICES[device],
                  transform: `scale(${Math.min(1, 900 / DEVICES[device])})`,
                  height: 700 / Math.min(1, 900 / DEVICES[device]),
                  overflowY: 'auto',
                }}
              >
                <PublicSite designOverride={draft} previewMode />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const out = [...arr];
  const tmp = out[a];
  out[a] = out[b];
  out[b] = tmp;
  return out;
}
