// Granular, Discord-style permission catalogue.
// Every admin action in the app is gated by one of these keys.

export type PermissionDef = { key: string; group: string; label: string; danger?: boolean };

export const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { key: 'admin.access', group: 'Dashboard', label: 'Access admin dashboard' },
  { key: 'admin.overview.view', group: 'Dashboard', label: 'View overview & platform stats' },
  { key: 'admin.health.view', group: 'Dashboard', label: 'View system health' },

  // News
  { key: 'news.view', group: 'News', label: 'View news items' },
  { key: 'news.create', group: 'News', label: 'Create news' },
  { key: 'news.edit', group: 'News', label: 'Edit news' },
  { key: 'news.publish', group: 'News', label: 'Publish / unpublish news' },
  { key: 'news.delete', group: 'News', label: 'Delete news', danger: true },
  { key: 'news.feature', group: 'News', label: 'Feature news on homepage' },

  // Battles
  { key: 'battles.view', group: 'Battles', label: 'View battles' },
  { key: 'battles.create', group: 'Battles', label: 'Create battles' },
  { key: 'battles.edit', group: 'Battles', label: 'Edit battles' },
  { key: 'battles.delete', group: 'Battles', label: 'Delete battles', danger: true },
  { key: 'battles.publish', group: 'Battles', label: 'Publish battles' },
  { key: 'battles.score', group: 'Battles', label: 'Set scores & winners' },
  { key: 'battles.video', group: 'Battles', label: 'Attach video sources' },
  { key: 'battles.judges', group: 'Battles', label: 'Manage judge panels' },

  // Events
  { key: 'events.view', group: 'Events', label: 'View events' },
  { key: 'events.create', group: 'Events', label: 'Create events' },
  { key: 'events.edit', group: 'Events', label: 'Edit events' },
  { key: 'events.delete', group: 'Events', label: 'Delete events', danger: true },

  // MCs & rankings
  { key: 'mcs.view', group: 'Roster', label: 'View MC roster' },
  { key: 'mcs.create', group: 'Roster', label: 'Create MCs' },
  { key: 'mcs.edit', group: 'Roster', label: 'Edit MCs' },
  { key: 'mcs.delete', group: 'Roster', label: 'Delete MCs', danger: true },
  { key: 'rankings.view', group: 'Roster', label: 'View rankings' },
  { key: 'rankings.manage', group: 'Roster', label: 'Reorder & recompute rankings' },
  { key: 'rankings.history', group: 'Roster', label: 'View ranking history' },

  // Pages / taxonomy / media
  { key: 'pages.view', group: 'Content', label: 'View pages' },
  { key: 'pages.create', group: 'Content', label: 'Create pages' },
  { key: 'pages.edit', group: 'Content', label: 'Edit pages' },
  { key: 'pages.delete', group: 'Content', label: 'Delete pages', danger: true },
  { key: 'taxonomy.manage', group: 'Content', label: 'Manage categories & tags' },
  { key: 'media.view', group: 'Content', label: 'View media library' },
  { key: 'media.upload', group: 'Content', label: 'Upload media' },
  { key: 'media.delete', group: 'Content', label: 'Delete media', danger: true },

  // Users
  { key: 'users.view', group: 'Users', label: 'View users' },
  { key: 'users.create', group: 'Users', label: 'Create users' },
  { key: 'users.edit', group: 'Users', label: 'Edit user profiles' },
  { key: 'users.roles', group: 'Users', label: 'Assign roles to users' },
  { key: 'users.ban', group: 'Users', label: 'Ban / unban users', danger: true },
  { key: 'users.mute', group: 'Users', label: 'Mute users' },
  { key: 'users.delete', group: 'Users', label: 'Delete users', danger: true },
  { key: 'users.password.reset', group: 'Users', label: 'Force password reset', danger: true },
  { key: 'users.sessions.revoke', group: 'Users', label: 'Revoke user sessions' },
  { key: 'users.impersonate', group: 'Users', label: 'Impersonate users', danger: true },

  // Community
  { key: 'comments.view', group: 'Community', label: 'View comments' },
  { key: 'comments.moderate', group: 'Community', label: 'Approve / hide comments' },
  { key: 'comments.delete', group: 'Community', label: 'Delete comments', danger: true },
  { key: 'chat.view', group: 'Community', label: 'View chat log' },
  { key: 'chat.moderate', group: 'Community', label: 'Delete chat messages' },
  { key: 'chat.lock', group: 'Community', label: 'Lock / slow-mode the chat' },
  { key: 'chat.announce', group: 'Community', label: 'Post system announcements' },
  { key: 'reports.view', group: 'Community', label: 'View reports' },
  { key: 'reports.resolve', group: 'Community', label: 'Resolve reports' },
  { key: 'notifications.send', group: 'Community', label: 'Send notifications' },

  // Appearance
  { key: 'design.view', group: 'Appearance', label: 'Open Design Mode' },
  { key: 'design.edit', group: 'Appearance', label: 'Edit design draft' },
  { key: 'design.publish', group: 'Appearance', label: 'Publish design to live site', danger: true },
  { key: 'design.revert', group: 'Appearance', label: 'Revert to a revision', danger: true },
  { key: 'navigation.manage', group: 'Appearance', label: 'Manage navigation & footer' },
  { key: 'homepage.manage', group: 'Appearance', label: 'Manage homepage sections' },

  // System
  { key: 'roles.view', group: 'System', label: 'View roles' },
  { key: 'roles.create', group: 'System', label: 'Create roles' },
  { key: 'roles.edit', group: 'System', label: 'Edit roles & permissions' },
  { key: 'roles.delete', group: 'System', label: 'Delete roles', danger: true },
  { key: 'roles.hierarchy', group: 'System', label: 'Change role hierarchy' },
  { key: 'db.view', group: 'System', label: 'Browse database records' },
  { key: 'db.edit', group: 'System', label: 'Edit database records', danger: true },
  { key: 'db.delete', group: 'System', label: 'Delete database records', danger: true },
  { key: 'db.export', group: 'System', label: 'Export data' },
  { key: 'db.import', group: 'System', label: 'Import data', danger: true },
  { key: 'db.backup', group: 'System', label: 'Create backups' },
  { key: 'db.restore', group: 'System', label: 'Restore backups', danger: true },
  { key: 'db.truncate', group: 'System', label: 'Truncate tables', danger: true },
  { key: 'settings.view', group: 'System', label: 'View settings' },
  { key: 'settings.edit', group: 'System', label: 'Edit settings' },
  { key: 'integrations.manage', group: 'System', label: 'Manage integrations & API keys' },
  { key: 'security.manage', group: 'System', label: 'Manage security settings', danger: true },
  { key: 'security.adminpath', group: 'System', label: 'Change secret admin URL', danger: true },
  { key: 'cache.manage', group: 'System', label: 'Purge caches' },
  { key: 'email.manage', group: 'System', label: 'Manage email templates' },

  // Analytics & logs
  { key: 'analytics.view', group: 'Insights', label: 'View analytics' },
  { key: 'logs.view', group: 'Insights', label: 'View audit & system logs' },
  { key: 'logs.purge', group: 'Insights', label: 'Purge logs', danger: true },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const PERMISSION_GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

export function permsInGroup(group: string) {
  return PERMISSIONS.filter((p) => p.group === group);
}

/** Wildcard-aware permission match. '*' = god mode, 'news.*' = whole group. */
export function matches(granted: string[], required: string): boolean {
  if (granted.includes('*')) return true;
  if (granted.includes(required)) return true;
  const prefix = required.split('.')[0];
  return granted.includes(prefix + '.*');
}
