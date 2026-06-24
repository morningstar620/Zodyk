import { connectDatabase, getModels } from '@zodyk/database';
import crypto from 'crypto';
import { hashToken } from '../security/encryption';
import { resolveUserPermissions } from '../rbac/check';
import type { AuthSession } from '../rbac/middleware';

const TOKEN_PREFIX = 'zodyk_live_';

export interface GeneratedToken {
  id: string;
  token: string;
  prefix: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

export async function generateApiToken(
  userId: string,
  name: string,
  scopes: string[],
  expiresAt?: Date,
): Promise<GeneratedToken> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { ApiToken, Role, User } = getModels();

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const roleIds = user.roleIds.map((id) => id.toString());
  const permissions = await resolveUserPermissions(roleIds, async (ids) => {
    const roles = await Role.find({ _id: { $in: ids } });
    return roles.map((r) => ({ permissions: r.permissions }));
  });

  for (const scope of scopes) {
    const allowed = permissions.some((p) => {
      if (p === '*') return true;
      if (p === scope) return true;
      if (p.endsWith(':*')) return scope.startsWith(p.slice(0, -1));
      return false;
    });
    if (!allowed) {
      throw new Error(`Scope not permitted: ${scope}`);
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const token = `${TOKEN_PREFIX}${rawToken}`;
  const prefix = token.slice(0, 16);
  const tokenHash = hashToken(token);

  const doc = await ApiToken.create({
    userId,
    name,
    tokenHash,
    prefix,
    scopes,
    expiresAt,
  });

  return {
    id: doc._id.toString(),
    token,
    prefix,
    name,
    scopes,
    expiresAt,
  };
}

export async function verifyApiToken(token: string): Promise<AuthSession | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  await connectDatabase(uri);
  const { ApiToken, Role, User } = getModels();

  const tokenHash = hashToken(token);
  const apiToken = await ApiToken.findOne({
    tokenHash,
    revokedAt: { $exists: false },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  });

  if (!apiToken) return null;

  const user = await User.findById(apiToken.userId);
  if (!user || user.status !== 'active' || user.deletedAt) return null;

  apiToken.lastUsedAt = new Date();
  await apiToken.save();

  const roleIds = user.roleIds.map((id) => id.toString());
  const rolePermissions = await resolveUserPermissions(roleIds, async (ids) => {
    const roles = await Role.find({ _id: { $in: ids } });
    return roles.map((r) => ({ permissions: r.permissions }));
  });

  const permissions = new Set([...rolePermissions, ...apiToken.scopes]);

  return {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    roleIds,
    permissions: Array.from(permissions),
  };
}

export async function revokeApiToken(tokenId: string, userId: string): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { ApiToken } = getModels();

  await ApiToken.findOneAndUpdate(
    { _id: tokenId, userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
}
