/**
 * Granular RBAC catalogue (Discord-style).
 *
 * Permissions are `domain.action` strings. Roles hold an array of granted
 * permission keys plus optional denies. Enforcement happens in the data
 * layer (src/lib/backend.ts → guard()) on EVERY mutation, and the same
 * model is compiled into Firestore Security Rules in
 * Admin → System → Security so it is also enforced on the server.
 */

export type PermissionKey = string;

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
}
export interface PermissionDomain {
  domain: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    domain: "admin",
    label: "Control Center",
    permissions: [
      { key: "admin.access", label: "Open control center", description: "Required to load the private admin route at all." },
      { key: "admin.impersonate", label: "Impersonate accounts", description: "View the platform as another user." },
      { key: "admin.broadcast", label: "Platform broadcast", description: "Send a sitewide announcement banner." },
      { key: "admin.maintenance", label: "Maintenance mode", description: "Take the public site offline for visitors." },
    ],
  },
  {
    domain: "dashboard",
    label: "Overview",
    permissions: [
      { key: "dashboard.view", label: "View overview", description: "Read platform statistics." },
      { key: "dashboard.export", label: "Export overview", description: "Download the overview snapshot." },
    ],
  },
  {
    domain: "news",
    label: "News",
    permissions: [
      { key: "news.view", label: "Read news", description: "List and open news records." },
      { key: "news.create", label: "Create news", description: "Publish new announcements." },
      { key: "news.edit", label: "Edit news", description: "Modify existing announcements." },
      { key: "news.delete", label: "Delete news", description: "Remove announcements permanently." },
      { key: "news.publish", label: "Toggle publish state", description: "Switch drafts live and back." },
      { key: "news.feature", label: "Feature news", description: "Pin items to the homepage." },
    ],
  },
  {
    domain: "battles",
    label: "Battles",
    permissions: [
      { key: "battles.view", label: "Read battles", description: "List and open battle records." },
      { key: "battles.create", label: "Create battles", description: "Add a new official matchup." },
      { key: "battles.edit", label: "Edit battles", description: "Change battle metadata." },
      { key: "battles.delete", label: "Delete battles", description: "Remove a battle record." },
      { key: "battles.video", label: "Attach video", description: "Bind the YouTube source id." },
      { key: "battles.score", label: "Set decision", description: "Enter judges, score and winner." },
      { key: "battles.publish", label: "Publish battle", description: "Make a battle visible publicly." },
    ],
  },
  {
    domain: "events",
    label: "Events",
    permissions: [
      { key: "events.view", label: "Read events", description: "List events." },
      { key: "events.create", label: "Create events", description: "Schedule shows and tournaments." },
      { key: "events.edit", label: "Edit events", description: "Modify scheduled events." },
      { key: "events.delete", label: "Delete events", description: "Cancel events." },
    ],
  },
  {
    domain: "mcs",
    label: "MC roster",
    permissions: [
      { key: "mcs.view", label: "Read roster", description: "List MC profiles." },
      { key: "mcs.create", label: "Add MC", description: "Register a competitor." },
      { key: "mcs.edit", label: "Edit MC", description: "Update bio, avatar and record." },
      { key: "mcs.delete", label: "Remove MC", description: "Delete a competitor." },
    ],
  },
  {
    domain: "rankings",
    label: "Rankings",
    permissions: [
      { key: "rankings.view", label: "Read rankings", description: "View ladder." },
      { key: "rankings.manage", label: "Manage rankings", description: "Edit ladder positions and records." },
      { key: "rankings.recalc", label: "Recalculate", description: "Recompute ladder from battle results." },
      { key: "rankings.freeze", label: "Freeze ladder", description: "Lock the ladder between seasons." },
    ],
  },
  {
    domain: "pages",
    label: "Pages & taxonomy",
    permissions: [
      { key: "pages.view", label: "Read pages", description: "List custom pages." },
      { key: "pages.create", label: "Create pages", description: "Add static pages." },
      { key: "pages.edit", label: "Edit pages", description: "Change page content." },
      { key: "pages.delete", label: "Delete pages", description: "Remove pages." },
      { key: "categories.manage", label: "Manage categories", description: "Full control of categories." },
      { key: "tags.manage", label: "Manage tags", description: "Full control of tags." },
    ],
  },
  {
    domain: "media",
    label: "Media library",
    permissions: [
      { key: "media.view", label: "View media", description: "Browse the library." },
      { key: "media.upload", label: "Upload media", description: "Add assets by URL or data-uri." },
      { key: "media.edit", label: "Edit media", description: "Rename and re-tag assets." },
      { key: "media.delete", label: "Delete media", description: "Remove assets." },
    ],
  },
  {
    domain: "users",
    label: "Users",
    permissions: [
      { key: "users.view", label: "View users", description: "List accounts." },
      { key: "users.edit", label: "Edit users", description: "Change account fields." },
      { key: "users.roles", label: "Assign roles", description: "Attach or detach roles." },
      { key: "users.ban", label: "Ban / unban", description: "Suspend sign-in." },
      { key: "users.mute", label: "Mute", description: "Block posting in chat and comments." },
      { key: "users.delete", label: "Delete users", description: "Erase an account record." },
      { key: "users.reset", label: "Force password reset", description: "Trigger recovery mail." },
    ],
  },
  {
    domain: "community",
    label: "Community",
    permissions: [
      { key: "comments.view", label: "Read comments", description: "Moderation queue read." },
      { key: "comments.delete", label: "Delete comments", description: "Remove comments." },
      { key: "comments.edit", label: "Edit comments", description: "Redact comment text." },
      { key: "chat.view", label: "Read chat", description: "Open the live room." },
      { key: "chat.post", label: "Post in chat", description: "Member-level right to send messages." },
      { key: "chat.moderate", label: "Moderate chat", description: "Delete messages and mute users." },
      { key: "chat.purge", label: "Purge chat", description: "Wipe the whole room." },
      { key: "comments.create", label: "Post comments", description: "Member-level right to comment on battles." },
      { key: "reports.create", label: "Report content", description: "Member-level right to flag content." },
      { key: "reports.view", label: "Read reports", description: "See flagged content." },
      { key: "reports.resolve", label: "Resolve reports", description: "Action or dismiss reports." },
      { key: "notifications.send", label: "Send notifications", description: "Notify users." },
      { key: "notifications.manage", label: "Manage notifications", description: "Edit or retract notifications." },
      { key: "profile.edit", label: "Edit own profile", description: "Member-level right to update their own public profile." },
    ],
  },
  {
    domain: "design",
    label: "Appearance & Design Mode",
    permissions: [
      { key: "design.view", label: "Open Design Mode", description: "Load the visual editor." },
      { key: "design.edit", label: "Edit draft", description: "Modify the unpublished draft." },
      { key: "design.publish", label: "Publish", description: "Push the draft to the live site." },
      { key: "design.revert", label: "Revert", description: "Roll back to a previous version." },
      { key: "theme.edit", label: "Theme tokens", description: "Colours, radius, spacing, shadows." },
      { key: "typography.edit", label: "Typography", description: "Font families and scales." },
      { key: "sections.edit", label: "Homepage sections", description: "Order, visibility and content." },
      { key: "navigation.edit", label: "Navigation", description: "Primary and footer menus." },
      { key: "footer.edit", label: "Footer", description: "Footer content and columns." },
      { key: "components.edit", label: "Components", description: "Card, button and badge styling." },
    ],
  },
  {
    domain: "roles",
    label: "Roles & permissions",
    permissions: [
      { key: "roles.view", label: "View roles", description: "Read the role list." },
      { key: "roles.create", label: "Create roles", description: "Add new roles." },
      { key: "roles.edit", label: "Edit roles", description: "Rename, recolour, re-order." },
      { key: "roles.delete", label: "Delete roles", description: "Remove a role." },
      { key: "roles.duplicate", label: "Duplicate roles", description: "Clone a role." },
      { key: "roles.assign", label: "Assign roles", description: "Give roles to accounts." },
      { key: "permissions.grant", label: "Grant permissions", description: "Toggle individual permission keys." },
    ],
  },
  {
    domain: "system",
    label: "System",
    permissions: [
      { key: "settings.view", label: "Read settings", description: "Open general settings." },
      { key: "settings.edit", label: "Write settings", description: "Change platform settings." },
      { key: "security.view", label: "Read security", description: "Security posture and rules." },
      { key: "security.edit", label: "Write security", description: "Admin URL, lockout, sessions." },
      { key: "integrations.view", label: "Read integrations", description: "Provider + env status." },
      { key: "integrations.edit", label: "Write integrations", description: "Change integration settings." },
      { key: "api.keys", label: "Manage API keys", description: "Issue and revoke public API keys." },
      { key: "storage.view", label: "Read storage", description: "Storage usage report." },
      { key: "storage.purge", label: "Purge storage", description: "Delete orphaned assets." },
      { key: "cache.clear", label: "Clear cache", description: "Flush client caches." },
      { key: "email.edit", label: "Email settings", description: "SMTP / template config." },
      { key: "email.test", label: "Send test email", description: "Dispatch a test message." },
    ],
  },
  {
    domain: "database",
    label: "Database",
    permissions: [
      { key: "database.view", label: "Browse schema", description: "List entities and records." },
      { key: "database.read", label: "Read records", description: "Open raw records." },
      { key: "database.write", label: "Write records", description: "Create and update records." },
      { key: "database.delete", label: "Delete records", description: "Remove records." },
      { key: "database.bulk", label: "Bulk actions", description: "Multi-record operations." },
      { key: "database.import", label: "Import", description: "Load a JSON payload." },
      { key: "database.export", label: "Export", description: "Download entity JSON." },
      { key: "database.backup", label: "Backup", description: "Snapshot the whole database." },
      { key: "database.restore", label: "Restore", description: "Overwrite from a snapshot. Destructive." },
    ],
  },
  {
    domain: "analytics",
    label: "Analytics",
    permissions: [
      { key: "analytics.view", label: "View analytics", description: "Read traffic and engagement." },
      { key: "analytics.export", label: "Export analytics", description: "Download event data." },
    ],
  },
  {
    domain: "logs",
    label: "Logs",
    permissions: [
      { key: "logs.view", label: "View logs", description: "Read all log streams." },
      { key: "logs.audit", label: "Audit trail", description: "Admin action history." },
      { key: "logs.logins", label: "Login history", description: "Authentication events." },
      { key: "logs.security", label: "Security events", description: "Violations and lockouts." },
      { key: "logs.errors", label: "System errors", description: "Runtime error capture." },
      { key: "logs.purge", label: "Purge logs", description: "Delete log records." },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_DOMAINS.flatMap((d) => d.permissions);
export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

export interface Role {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  rank: number; // hierarchy — higher wins
  description: string;
  permissions: PermissionKey[];
  system?: boolean; // system roles cannot be deleted
  createdAt: number;
}

export function domainOf(key: PermissionKey) {
  return key.split(".")[0];
}

/** Owner holds every permission, always. */
export function roleHasPermission(role: Role | undefined, key: PermissionKey): boolean {
  if (!role) return false;
  if (role.slug === "owner") return true;
  return role.permissions.includes(key) || role.permissions.includes(`${domainOf(key)}.*`);
}

/** Resolve a set of role ids against the role table → effective permission set. */
export function effectivePermissions(roleIds: string[] = [], roles: Role[] = []): Set<PermissionKey> {
  const out = new Set<PermissionKey>();
  for (const id of roleIds) {
    const role = roles.find((r) => r.id === id);
    if (!role) continue;
    if (role.slug === "owner") {
      ALL_PERMISSION_KEYS.forEach((k) => out.add(k));
      return out;
    }
    role.permissions.forEach((p) => {
      if (p.endsWith(".*")) {
        const d = p.slice(0, -2);
        ALL_PERMISSION_KEYS.filter((k) => k.startsWith(d + ".")).forEach((k) => out.add(k));
      } else out.add(p);
    });
  }
  return out;
}

export function highestRole(roleIds: string[] = [], roles: Role[] = []): Role | undefined {
  return roleIds
    .map((id) => roles.find((r) => r.id === id))
    .filter(Boolean)
    .sort((a, b) => (b as Role).rank - (a as Role).rank)[0];
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: "role_owner",
    name: "Owner",
    slug: "owner",
    color: "#e10600",
    icon: "crown",
    rank: 1000,
    description: "Theoretical maximum control. Cannot be edited or deleted.",
    permissions: ALL_PERMISSION_KEYS,
    system: true,
    createdAt: 0,
  },
  {
    id: "role_admin",
    name: "Administrator",
    slug: "admin",
    color: "#f59e0b",
    icon: "shield",
    rank: 800,
    description: "Runs the platform day to day. No role/permission or database-restore rights.",
    permissions: ALL_PERMISSION_KEYS.filter(
      (k) => !["roles.delete", "permissions.grant", "database.restore", "security.edit", "admin.impersonate"].includes(k),
    ),
    system: true,
    createdAt: 0,
  },
  {
    id: "role_mod",
    name: "Moderator",
    slug: "moderator",
    color: "#38bdf8",
    icon: "badge",
    rank: 500,
    description: "Community safety: chat, comments, reports and user mutes.",
    permissions: [
      "admin.access",
      "dashboard.view",
      "users.view",
      "users.mute",
      "comments.view",
      "comments.delete",
      "comments.edit",
      "chat.view",
      "chat.moderate",
      "reports.view",
      "reports.resolve",
      "logs.view",
      "logs.logins",
      "battles.view",
      "news.view",
      "mcs.view",
    ],
    system: true,
    createdAt: 0,
  },
  {
    id: "role_editor",
    name: "Content Editor",
    slug: "editor",
    color: "#a78bfa",
    icon: "pen",
    rank: 300,
    description: "Writes news, uploads battles and maintains the roster.",
    permissions: [
      "admin.access",
      "dashboard.view",
      "news.view",
      "news.create",
      "news.edit",
      "battles.view",
      "battles.create",
      "battles.edit",
      "battles.video",
      "mcs.view",
      "mcs.edit",
      "media.view",
      "media.upload",
      "media.edit",
      "categories.manage",
      "tags.manage",
      "analytics.view",
    ],
    system: true,
    createdAt: 0,
  },
  {
    id: "role_judge",
    name: "Judge",
    slug: "judge",
    color: "#34d399",
    icon: "gavel",
    rank: 250,
    description: "Records official decisions and keeps the ladder honest.",
    permissions: [
      "admin.access",
      "dashboard.view",
      "battles.view",
      "battles.score",
      "rankings.view",
      "rankings.manage",
      "mcs.view",
    ],
    system: true,
    createdAt: 0,
  },
  {
    id: "role_member",
    name: "Member",
    slug: "member",
    color: "#8b8b98",
    icon: "user",
    rank: 10,
    description: "Signed-in fan. Chat, comments and voting only.",
    permissions: ["chat.post", "comments.create", "reports.create", "profile.edit"],
    system: true,
    createdAt: 0,
  },
];
