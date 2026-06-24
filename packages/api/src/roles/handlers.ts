import {
  createRoleSchema,
  DEFAULT_TENANT_ID,
  paginationSchema,
  updateRoleSchema,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export async function listRoles(session: AuthSession | null) {
  requirePermission(session, 'roles:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Role } = getModels();

  const roles = await Role.find({ tenantId: DEFAULT_TENANT_ID }).sort({ name: 1 }).lean();
  return roles.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    slug: r.slug,
    permissions: r.permissions,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
  }));
}

export async function getRole(session: AuthSession | null, id: string) {
  requirePermission(session, 'roles:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Role } = getModels();

  const role = await Role.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID }).lean();
  if (!role) throw new AuthError('Role not found', 404);

  return {
    id: role._id.toString(),
    name: role.name,
    slug: role.slug,
    permissions: role.permissions,
    isSystem: role.isSystem,
    createdAt: role.createdAt,
  };
}

export async function createRole(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'roles:create');
  const input = createRoleSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Role } = getModels();

  const existing = await Role.findOne({ slug: input.slug, tenantId: DEFAULT_TENANT_ID });
  if (existing) throw new AuthError('Role slug already exists', 409);

  const role = await Role.create({
    name: input.name,
    slug: input.slug,
    permissions: input.permissions,
    isSystem: false,
    tenantId: DEFAULT_TENANT_ID,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'role.create',
    resource: 'roles',
    resourceId: role._id.toString(),
    metadata: { slug: role.slug },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: role._id.toString(),
    name: role.name,
    slug: role.slug,
    permissions: role.permissions,
    isSystem: role.isSystem,
  };
}

export async function updateRole(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'roles:update');
  const input = updateRoleSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Role } = getModels();

  const role = await Role.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!role) throw new AuthError('Role not found', 404);
  if (role.isSystem && input.permissions) {
    throw new AuthError('Cannot modify system role permissions', 400);
  }

  if (input.name) role.name = input.name;
  if (input.permissions) role.permissions = input.permissions;
  await role.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'role.update',
    resource: 'roles',
    resourceId: id,
    metadata: input,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: role._id.toString(),
    name: role.name,
    slug: role.slug,
    permissions: role.permissions,
    isSystem: role.isSystem,
  };
}

export async function deleteRole(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'roles:delete');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Role, User } = getModels();

  const role = await Role.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!role) throw new AuthError('Role not found', 404);
  if (role.isSystem) throw new AuthError('Cannot delete system role', 400);

  const usersWithRole = await User.countDocuments({ roleIds: id });
  if (usersWithRole > 0) {
    throw new AuthError('Role is assigned to users', 400);
  }

  await Role.deleteOne({ _id: id });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'role.delete',
    resource: 'roles',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}
