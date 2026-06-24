export interface PermissionSubject {
  permissions: string[];
  roleIds?: string[];
}

function permissionMatches(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;

  if (granted.endsWith(':*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}:`);
  }

  return false;
}

export function hasPermission(subject: PermissionSubject, permission: string): boolean {
  return subject.permissions.some((granted) => permissionMatches(granted, permission));
}

export function hasAnyPermission(subject: PermissionSubject, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(subject, permission));
}

export function hasAllPermissions(subject: PermissionSubject, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(subject, permission));
}

export async function resolveUserPermissions(
  roleIds: string[],
  fetchRoles: (ids: string[]) => Promise<{ permissions: string[] }[]>,
): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const roles = await fetchRoles(roleIds);
  const permissions = new Set<string>();
  for (const role of roles) {
    for (const permission of role.permissions) {
      permissions.add(permission);
    }
  }
  return Array.from(permissions);
}
