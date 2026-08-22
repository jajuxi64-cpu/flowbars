import * as db from './db';

export type NavItem = { id: string; label: string; page: string; visible: boolean };
export type HomeSection = {
  id: string;
  type:
    | 'hero'
    | 'stats'
    | 'leaders'
    | 'featuredBattles'
    | 'news'
    | 'events'
    | 'cta'
    | 'richText';
  title: string;
  visible: boolean;
  props: Record<string, any>;
};

export type DesignConfig = {
  theme: {
    mode: 'dark' | 'light';
    accent: string;
    accent2: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    radius: number;
    shadow: 'none' | 'soft' | 'medium' | 'hard';
    borderWidth: number;
    spacing: number;
    containerWidth: number;
    headingFont: string;
    bodyFont: string;
    baseFontSize: number;
    headingWeight: number;
    headingTracking: number;
    uppercaseHeadings: boolean;
    bgImage: string;
    bgImageOpacity: number;
    animations: boolean;
    animationSpeed: number;
  };
  header: {
    logoText: string;
    logoMark: string;
    tagline: string;
    sticky: boolean;
    showThemeToggle: boolean;
    ctaLabel: string;
    ctaUrl: string;
    showCta: boolean;
  };
  nav: NavItem[];
  homepage: HomeSection[];
  footer: {
    visible: boolean;
    text: string;
    links: { id: string; label: string; url: string }[];
  };
  components: {
    cardHover: boolean;
    cardShadow: boolean;
    buttonRadius: number;
    buttonUppercase: boolean;
    buttonWeight: number;
    imageRatio: string;
    iconStyle: 'emoji' | 'none';
  };
  responsive: {
    mobileHideHeroArt: boolean;
    tabletColumns: number;
    mobileColumns: number;
  };
};

export const DEFAULT_DESIGN: DesignConfig = {
  theme: {
    mode: 'dark',
    accent: '#ef4444',
    accent2: '#f59e0b',
    bg: '#0a0a0a',
    surface: '#141414',
    text: '#fafafa',
    muted: '#a3a3a3',
    border: '#262626',
    radius: 14,
    shadow: 'medium',
    borderWidth: 1,
    spacing: 24,
    containerWidth: 1180,
    headingFont: "'Archivo Black', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    baseFontSize: 16,
    headingWeight: 900,
    headingTracking: -1,
    uppercaseHeadings: true,
    bgImage: '',
    bgImageOpacity: 0.25,
    animations: true,
    animationSpeed: 1,
  },
  header: {
    logoText: 'FLOW & BARS',
    logoMark: 'F&B',
    tagline: 'Georgian Battle League',
    sticky: true,
    showThemeToggle: true,
    ctaLabel: 'YouTube',
    ctaUrl: 'https://www.youtube.com/@FLOW-BARS',
    showCta: true,
  },
  nav: [
    { id: 'n1', label: 'Home', page: 'home', visible: true },
    { id: 'n2', label: 'Battles', page: 'battles', visible: true },
    { id: 'n3', label: 'Rankings', page: 'rankings', visible: true },
    { id: 'n4', label: 'MCs', page: 'mcs', visible: true },
    { id: 'n5', label: 'News', page: 'news', visible: true },
    { id: 'n6', label: 'Events', page: 'events', visible: true },
    { id: 'n7', label: 'Community', page: 'community', visible: true },
  ],
  homepage: [
    {
      id: 's1',
      type: 'hero',
      title: 'Hero',
      visible: true,
      props: {
        eyebrow: 'Season 5 is live',
        heading: 'The ultimate bars are dropping',
        sub: "Georgia's premier competitive battle rap league. Real matchups, real judges, real records.",
        primaryLabel: 'Watch battles',
        primaryTarget: 'battles',
        secondaryLabel: 'View rankings',
        secondaryTarget: 'rankings',
        image:
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&h=700&fit=crop',
        align: 'left',
      },
    },
    { id: 's2', type: 'stats', title: 'Stats strip', visible: true, props: {} },
    { id: 's3', type: 'featuredBattles', title: 'Featured battles', visible: true, props: { limit: 4 } },
    { id: 's4', type: 'leaders', title: 'League leaders', visible: true, props: { limit: 3 } },
    { id: 's5', type: 'news', title: 'Latest news', visible: true, props: { limit: 3 } },
    { id: 's6', type: 'events', title: 'Upcoming events', visible: true, props: { limit: 3 } },
    {
      id: 's7',
      type: 'cta',
      title: 'Call to action',
      visible: true,
      props: {
        heading: 'Think you have the bars?',
        sub: 'Registration for Season 5 qualifiers is open.',
        label: 'Join the community',
        target: 'community',
      },
    },
  ],
  footer: {
    visible: true,
    text: '© 2026 Flow & Bars League. All rights reserved.',
    links: [
      { id: 'f1', label: 'YouTube', url: 'https://www.youtube.com/@FLOW-BARS' },
      { id: 'f2', label: 'Instagram', url: 'https://instagram.com' },
    ],
  },
  components: {
    cardHover: true,
    cardShadow: true,
    buttonRadius: 10,
    buttonUppercase: true,
    buttonWeight: 800,
    imageRatio: '16/9',
    iconStyle: 'emoji',
  },
  responsive: { mobileHideHeroArt: false, tabletColumns: 2, mobileColumns: 1 },
};

export function deepMerge<T>(base: T, patch: any): T {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(base) || Array.isArray(patch)) return patch as T;
  if (typeof base !== 'object' || typeof patch !== 'object') return patch as T;
  const out: any = { ...base };
  for (const k of Object.keys(patch)) out[k] = deepMerge((base as any)[k], patch[k]);
  return out;
}

export function getDesign(which: 'published' | 'draft'): DesignConfig {
  const row = db.find('settings', which === 'published' ? 'design_published' : 'design_draft');
  return deepMerge(DEFAULT_DESIGN, row?.value || {});
}

export function saveDesign(which: 'published' | 'draft', cfg: DesignConfig) {
  const id = which === 'published' ? 'design_published' : 'design_draft';
  if (db.find('settings', id)) db.update('settings', id, { value: cfg });
  else db.insert('settings', { id, value: cfg });
}

const SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 2px 10px rgba(0,0,0,.25)',
  medium: '0 10px 30px rgba(0,0,0,.35)',
  hard: '0 18px 50px rgba(0,0,0,.55)',
};

export function designToCssVars(d: DesignConfig): Record<string, string> {
  const t = d.theme;
  return {
    '--fb-accent': t.accent,
    '--fb-accent-2': t.accent2,
    '--fb-bg': t.bg,
    '--fb-surface': t.surface,
    '--fb-text': t.text,
    '--fb-muted': t.muted,
    '--fb-border': t.border,
    '--fb-radius': `${t.radius}px`,
    '--fb-shadow': SHADOWS[t.shadow] || SHADOWS.medium,
    '--fb-border-width': `${t.borderWidth}px`,
    '--fb-space': `${t.spacing}px`,
    '--fb-container': `${t.containerWidth}px`,
    '--fb-font-heading': t.headingFont,
    '--fb-font-body': t.bodyFont,
    '--fb-font-size': `${t.baseFontSize}px`,
    '--fb-heading-weight': String(t.headingWeight),
    '--fb-heading-tracking': `${t.headingTracking}px`,
    '--fb-btn-radius': `${d.components.buttonRadius}px`,
    '--fb-btn-weight': String(d.components.buttonWeight),
    '--fb-anim': t.animations ? `${0.25 / (t.animationSpeed || 1)}s` : '0s',
  };
}
