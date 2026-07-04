export const PERMISSIONS = {
  ALL: '*',
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  PAGES_READ: 'pages:read',
  PAGES_CREATE: 'pages:create',
  PAGES_UPDATE: 'pages:update',
  PAGES_UPDATE_OWN: 'pages:update:own',
  PAGES_DELETE: 'pages:delete',
  MEDIA_READ: 'media:read',
  MEDIA_UPLOAD: 'media:upload',
  MEDIA_DELETE: 'media:delete',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  API_TOKENS_READ: 'api_tokens:read',
  API_TOKENS_CREATE: 'api_tokens:create',
  API_TOKENS_DELETE: 'api_tokens:delete',
  AUDIT_READ: 'audit:read',
  META_OBJECTS_READ: 'meta_objects:read',
  META_OBJECTS_CREATE: 'meta_objects:create',
  META_OBJECTS_UPDATE: 'meta_objects:update',
  META_OBJECTS_DELETE: 'meta_objects:delete',
  META_ENTRIES_READ: 'meta_entries:read',
  META_ENTRIES_CREATE: 'meta_entries:create',
  META_ENTRIES_UPDATE: 'meta_entries:update',
  META_ENTRIES_DELETE: 'meta_entries:delete',
  META_ENTRIES_PUBLISH: 'meta_entries:publish',
  SYSTEM_ENTITIES_READ: 'system_entities:read',
  SYSTEM_ENTITIES_CREATE: 'system_entities:create',
  SYSTEM_ENTITIES_UPDATE: 'system_entities:update',
  SYSTEM_ENTITIES_DELETE: 'system_entities:delete',
  SYSTEM_RECORDS_READ: 'system_records:read',
  SYSTEM_RECORDS_CREATE: 'system_records:create',
  SYSTEM_RECORDS_UPDATE: 'system_records:update',
  SYSTEM_RECORDS_DELETE: 'system_records:delete',
  SYSTEM_RECORDS_EXPORT: 'system_records:export',
  SYSTEM_RECORDS_IMPORT: 'system_records:import',
  THEMES_READ: 'themes:read',
  THEMES_INSTALL: 'themes:install',
  THEMES_ACTIVATE: 'themes:activate',
  THEMES_UPDATE: 'themes:update',
  THEMES_PUBLISH: 'themes:publish',
  THEMES_DELETE: 'themes:delete',
  MENUS_READ: 'menus:read',
  MENUS_CREATE: 'menus:create',
  MENUS_UPDATE: 'menus:update',
  MENUS_DELETE: 'menus:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

export interface SystemEntityPermissionSet {
  create: string;
  read: string;
  update: string;
  delete: string;
  export: string;
  import: string;
}

/** Generates per-entity permission strings. Field-level and record-level permissions are future extension points. */
export function systemEntityPermissions(slug: string): SystemEntityPermissionSet {
  const base = slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return {
    create: `system_records:${base}:create`,
    read: `system_records:${base}:read`,
    update: `system_records:${base}:update`,
    delete: `system_records:${base}:delete`,
    export: `system_records:${base}:export`,
    import: `system_records:${base}:import`,
  };
}

export function systemEntityPermissionKeys(slug: string): string[] {
  return Object.values(systemEntityPermissions(slug));
}

export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  VIEWER: 'viewer',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleSlug, string[]> = {
  [ROLE_SLUGS.SUPER_ADMIN]: [PERMISSIONS.ALL],
  [ROLE_SLUGS.ADMIN]: [
    'users:*',
    PERMISSIONS.ROLES_READ,
    'pages:*',
    'meta_objects:*',
    'meta_entries:*',
    'system_entities:*',
    'system_records:*',
    'themes:*',
    'menus:*',
    'settings:*',
    'api_tokens:*',
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLE_SLUGS.EDITOR]: [
    'pages:*',
    'menus:*',
    'media:*',
    'meta_objects:read',
    'meta_entries:*',
    'system_entities:read',
    'system_records:*',
    'themes:read',
    'themes:update',
  ],
  [ROLE_SLUGS.AUTHOR]: [
    PERMISSIONS.PAGES_CREATE,
    PERMISSIONS.PAGES_UPDATE_OWN,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.META_OBJECTS_READ,
    PERMISSIONS.META_ENTRIES_CREATE,
    PERMISSIONS.META_ENTRIES_UPDATE,
    PERMISSIONS.SYSTEM_ENTITIES_READ,
    PERMISSIONS.SYSTEM_RECORDS_READ,
    PERMISSIONS.SYSTEM_RECORDS_CREATE,
    PERMISSIONS.SYSTEM_RECORDS_UPDATE,
  ],
  [ROLE_SLUGS.VIEWER]: [
    PERMISSIONS.PAGES_READ,
    PERMISSIONS.MENUS_READ,
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.META_OBJECTS_READ,
    PERMISSIONS.META_ENTRIES_READ,
    PERMISSIONS.SYSTEM_ENTITIES_READ,
    PERMISSIONS.SYSTEM_RECORDS_READ,
  ],
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS).filter((p) => p !== '*');
