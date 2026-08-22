import * as db from './db';
import { DEFAULT_DESIGN } from './design';

export type SettingsShape = {
  site: {
    name: string;
    tagline: string;
    description: string;
    language: string;
    timezone: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    registrationOpen: boolean;
    publicChat: boolean;
    chatSlowModeSeconds: number;
    chatLocked: boolean;
    commentsEnabled: boolean;
    commentsRequireApproval: boolean;
  };
  security: {
    adminPath: string;
    sessionHours: number;
    maxLoginAttempts: number;
    lockoutMinutes: number;
    minPasswordLength: number;
    requireStrongPassword: boolean;
    twoStepForAdmins: boolean;
    auditRetentionDays: number;
  };
  integrations: {
    googleClientId: string;
    facebookAppId: string;
    apiBaseUrl: string;
    youtubeChannel: string;
    analyticsId: string;
    webhookUrl: string;
  };
  email: { fromName: string; fromAddress: string; provider: string; apiKey: string };
  cache: { enabled: boolean; ttlSeconds: number };
};

export const DEFAULT_SETTINGS: SettingsShape = {
  site: {
    name: 'Flow & Bars',
    tagline: 'Georgian Battle League',
    description: "Georgia's premier competitive battle rap league.",
    language: 'en',
    timezone: 'Asia/Tbilisi',
    maintenanceMode: false,
    maintenanceMessage: 'We are upgrading the arena. Back shortly.',
    registrationOpen: true,
    publicChat: true,
    chatSlowModeSeconds: 0,
    chatLocked: false,
    commentsEnabled: true,
    commentsRequireApproval: false,
  },
  security: {
    adminPath: 'fb-control-x92k',
    sessionHours: 12,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    minPasswordLength: 10,
    requireStrongPassword: true,
    twoStepForAdmins: false,
    auditRetentionDays: 365,
  },
  integrations: {
    googleClientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '',
    facebookAppId: (import.meta as any).env?.VITE_FACEBOOK_APP_ID || '',
    apiBaseUrl: (import.meta as any).env?.VITE_API_BASE_URL || '',
    youtubeChannel: 'https://www.youtube.com/@FLOW-BARS',
    analyticsId: '',
    webhookUrl: '',
  },
  email: { fromName: 'Flow & Bars', fromAddress: 'no-reply@flowbars.ge', provider: '', apiKey: '' },
  cache: { enabled: true, ttlSeconds: 300 },
};

export function getSettings(): SettingsShape {
  const row = db.find('settings', 'app');
  return { ...DEFAULT_SETTINGS, ...(row?.value || {}) } as SettingsShape;
}

export function saveSettings(patch: Partial<SettingsShape>) {
  const current = getSettings();
  const next: any = { ...current };
  for (const k of Object.keys(patch)) next[k] = { ...(current as any)[k], ...(patch as any)[k] };
  if (db.find('settings', 'app')) db.update('settings', 'app', { value: next });
  else db.insert('settings', { id: 'app', value: next });
  return next as SettingsShape;
}

export const DEFAULT_ROLES = [
  {
    id: 'role_owner',
    name: 'Owner',
    color: '#ef4444',
    icon: '👑',
    position: 100,
    system: true,
    permissions: ['*'],
    description: 'God mode. Full unrestricted control of the platform.',
  },
  {
    id: 'role_admin',
    name: 'Administrator',
    color: '#f59e0b',
    icon: '🛡️',
    position: 80,
    system: false,
    permissions: [
      'admin.access',
      'admin.overview.view',
      'admin.health.view',
      'news.*',
      'battles.*',
      'events.*',
      'mcs.*',
      'rankings.*',
      'pages.*',
      'taxonomy.manage',
      'media.view',
      'media.upload',
      'media.delete',
      'users.view',
      'users.edit',
      'users.ban',
      'users.mute',
      'users.roles',
      'users.sessions.revoke',
      'comments.view',
      'comments.moderate',
      'comments.delete',
      'chat.view',
      'chat.moderate',
      'chat.lock',
      'chat.announce',
      'reports.view',
      'reports.resolve',
      'notifications.send',
      'design.view',
      'design.edit',
      'navigation.manage',
      'homepage.manage',
      'settings.view',
      'settings.edit',
      'analytics.view',
      'logs.view',
      'db.view',
      'db.export',
      'db.backup',
      'roles.view',
      'cache.manage',
      'email.manage',
    ],
    description: 'Runs the league day to day. No destructive system access.',
  },
  {
    id: 'role_editor',
    name: 'Editor',
    color: '#3b82f6',
    icon: '✍️',
    position: 60,
    system: false,
    permissions: [
      'admin.access',
      'admin.overview.view',
      'news.view',
      'news.create',
      'news.edit',
      'news.publish',
      'battles.view',
      'battles.create',
      'battles.edit',
      'battles.video',
      'events.view',
      'events.create',
      'events.edit',
      'mcs.view',
      'mcs.edit',
      'rankings.view',
      'pages.view',
      'pages.edit',
      'media.view',
      'media.upload',
      'taxonomy.manage',
      'analytics.view',
    ],
    description: 'Publishes content. Cannot touch users or system settings.',
  },
  {
    id: 'role_moderator',
    name: 'Moderator',
    color: '#22c55e',
    icon: '🧹',
    position: 40,
    system: false,
    permissions: [
      'admin.access',
      'admin.overview.view',
      'users.view',
      'users.mute',
      'users.ban',
      'comments.view',
      'comments.moderate',
      'comments.delete',
      'chat.view',
      'chat.moderate',
      'chat.lock',
      'reports.view',
      'reports.resolve',
      'logs.view',
    ],
    description: 'Keeps the community clean.',
  },
  {
    id: 'role_member',
    name: 'Member',
    color: '#737373',
    icon: '🎤',
    position: 10,
    system: true,
    permissions: [],
    description: 'Default role for every registered account.',
  },
];

const MCS = [
  { name: 'NIKA', wins: 12, losses: 1, draws: 0, bio: 'Reigning champion. Brutal punchlines, surgical schemes.' },
  { name: 'GIORGI', wins: 10, losses: 2, draws: 1, bio: 'Technical wizard. Multis and theatrical aggression.' },
  { name: 'SHOTA', wins: 9, losses: 4, draws: 0, bio: 'Crowd favourite. Dark humour, unpredictable cadence.' },
  { name: 'LUKA', wins: 7, losses: 5, draws: 1, bio: 'Fast-paced street lyricist with relentless delivery.' },
  { name: 'BART', wins: 6, losses: 6, draws: 0, bio: 'Veteran judge turned competitor.' },
  { name: 'D-CELL', wins: 4, losses: 8, draws: 1, bio: 'Wordplay specialist working his way back up the ladder.' },
];

export async function seedIfEmpty() {
  if (db.count('roles') === 0) DEFAULT_ROLES.forEach((r) => db.insert('roles', r));
  if (!db.find('settings', 'app')) db.insert('settings', { id: 'app', value: DEFAULT_SETTINGS });
  if (!db.find('settings', 'design_published'))
    db.insert('settings', { id: 'design_published', value: DEFAULT_DESIGN });
  if (!db.find('settings', 'design_draft'))
    db.insert('settings', { id: 'design_draft', value: DEFAULT_DESIGN });

  if (db.count('mcs') === 0) {
    MCS.forEach((m, i) =>
      db.insert('mcs', {
        ...m,
        rank: i + 1,
        streak: i % 3 === 0 ? '2W' : '1L',
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${m.name}&backgroundColor=1f1f1f`,
        active: true,
        country: 'Georgia',
        socials: {},
      }),
    );
  }

  if (db.count('categories') === 0) {
    ['Announcements', 'Interviews', 'Recaps', 'Rankings'].forEach((name, i) =>
      db.insert('categories', { name, slug: name.toLowerCase(), color: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'][i] }),
    );
  }
  if (db.count('tags') === 0) {
    ['season-5', 'title-match', 'qualifier', 'classic'].forEach((name) =>
      db.insert('tags', { name, slug: name }),
    );
  }

  if (db.count('battles') === 0) {
    const mcs = db.all('mcs');
    db.insert('battles', {
      title: 'NIKA vs SHOTA',
      slug: 'nika-vs-shota',
      event: 'Flow & Bars: Main Event 1',
      mc1: mcs[0]?.id,
      mc2: mcs[2]?.id,
      videoProvider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      views: 124000,
      date: '2026-02-10',
      winner: mcs[0]?.id,
      score: '3 - 0',
      status: 'published',
      featured: true,
      judges: ['BART', 'D-CELL', 'GIGA'],
      tags: ['title-match'],
      description:
        'The title clash that shook the Georgian underground. A high-energy three-round classic.',
    });
    db.insert('battles', {
      title: 'GIORGI vs LUKA',
      slug: 'giorgi-vs-luka',
      event: 'Underground Royale 4',
      mc1: mcs[1]?.id,
      mc2: mcs[3]?.id,
      videoProvider: 'youtube',
      videoId: 'L_LUpnjgPso',
      views: 88000,
      date: '2026-01-20',
      winner: mcs[1]?.id,
      score: '2 - 1',
      status: 'published',
      featured: true,
      judges: ['BART', 'MAX', 'NIKA'],
      tags: ['classic'],
      description: 'Scheme-heavy technical battle with deep personal jabs and heavy counters.',
    });
  }

  if (db.count('news') === 0) {
    db.insert('news', {
      title: 'Flow & Bars Season 5 announced',
      slug: 'season-5-announced',
      date: '2026-02-18',
      category: 'Announcements',
      tags: ['season-5'],
      status: 'published',
      featured: true,
      summary:
        'The biggest Georgian battle rap tournament returns with international guest judges and a 10,000 GEL prize pool.',
      body: 'Registration opens next week for qualified MCs. Sixteen competitors, four qualifying nights, one crown.',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=600&fit=crop',
    });
    db.insert('news', {
      title: 'Interview with NIKA: "I am unstoppable"',
      slug: 'interview-nika',
      date: '2026-02-12',
      category: 'Interviews',
      tags: ['season-5'],
      status: 'published',
      featured: false,
      summary: 'The #1 ranked champion talks title defence and upcoming projects.',
      body: 'Full interview lands Friday on the official channel.',
      cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=600&fit=crop',
    });
  }

  if (db.count('events') === 0) {
    db.insert('events', {
      title: 'Season 5 — Qualifier Night 1',
      date: '2026-03-14',
      time: '20:00',
      venue: 'Tbilisi Event Hall',
      city: 'Tbilisi',
      status: 'upcoming',
      capacity: 400,
      ticketUrl: '',
      description: 'Eight MCs, four battles, one qualification slot.',
    });
    db.insert('events', {
      title: 'Grand Final',
      date: '2026-05-30',
      time: '21:00',
      venue: 'Black Box Arena',
      city: 'Tbilisi',
      status: 'upcoming',
      capacity: 1200,
      ticketUrl: '',
      description: 'The Season 5 crown is decided.',
    });
  }

  if (db.count('pages') === 0) {
    db.insert('pages', {
      title: 'About',
      slug: 'about',
      status: 'published',
      body: 'Flow & Bars is an independent Georgian battle rap league founded to give MCs a professional stage, real judging and a permanent record of their work.',
    });
    db.insert('pages', {
      title: 'Rules',
      slug: 'rules',
      status: 'published',
      body: '3 rounds. 90 seconds per round. No physical contact. Judges score writing, performance and personals.',
    });
  }

  if (db.count('email_templates') === 0) {
    db.insert('email_templates', {
      name: 'Welcome',
      key: 'welcome',
      subject: 'Welcome to Flow & Bars',
      body: 'Hi {{username}}, welcome to the league.',
    });
    db.insert('email_templates', {
      name: 'Password reset',
      key: 'password_reset',
      subject: 'Reset your password',
      body: 'Use this token to reset your password: {{token}}',
    });
  }
}
