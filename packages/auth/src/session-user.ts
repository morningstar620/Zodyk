import { connectDatabase, getModels } from '@zodyk/database';
import type { JWT } from 'next-auth/jwt';
import { resolveUserPermissions } from './rbac/check';
import type { AuthSession } from './rbac/middleware';

export function isActiveAccount(
  user: { status?: string | null; deletedAt?: Date | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.deletedAt) return false;
  return user.status === 'active';
}

/** Load a user for a cookie session. Inactive, missing, and deleted users are rejected. */
export async function loadActiveUserSession(userId: string): Promise<AuthSession | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri || !userId) return null;

  try {
    await connectDatabase(uri);
    const { User, Role } = getModels();
    const user = await User.findById(userId);
    if (!user || !isActiveAccount(user)) return null;

    const roleIds = user.roleIds.map((id) => id.toString());
    const permissions = await resolveUserPermissions(roleIds, async (ids) => {
      const roles = await Role.find({ _id: { $in: ids } });
      return roles.map((role) => ({ permissions: role.permissions }));
    });

    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      roleIds,
      permissions,
    };
  } catch {
    return null;
  }
}

/** Replace embedded JWT claims with the current database user. Null ends the session. */
export async function refreshJwtToken(token: JWT): Promise<JWT | null> {
  const userId = typeof token.userId === 'string' ? token.userId : undefined;
  if (!userId) return token;

  const active = await loadActiveUserSession(userId);
  if (!active) return null;

  token.userId = active.userId;
  token.email = active.email;
  token.name = active.name;
  token.roleIds = active.roleIds;
  token.permissions = active.permissions;
  token.tenantId = active.tenantId;
  return token;
}
