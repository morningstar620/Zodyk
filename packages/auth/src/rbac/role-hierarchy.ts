import { ROLE_SLUGS } from '@zodyk/core';

export interface AssignableRole {
  slug: string;
  permissions?: readonly string[];
}

/** Super admin, or any role that grants the same wildcard permission. */
export function isPrivilegedRole(role: AssignableRole): boolean {
  if (role.slug === ROLE_SLUGS.SUPER_ADMIN) return true;
  return (role.permissions ?? []).includes('*');
}

/**
 * Editors and admins may assign ordinary roles.
 * Only a user who holds the super-admin role may assign that role (or a wildcard role).
 */
export function canAssignRoles(
  actorRoleSlugs: readonly string[],
  targetRoles: readonly AssignableRole[],
): boolean {
  if (!targetRoles.some((role) => isPrivilegedRole(role))) return true;
  return actorRoleSlugs.includes(ROLE_SLUGS.SUPER_ADMIN);
}
