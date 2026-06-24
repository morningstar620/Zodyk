import {
  createUserSchema,
  DEFAULT_TENANT_ID,
  paginationSchema,
  updateUserSchema,
} from '@zodyk/core';
import {
  AuthError,
  hashPassword,
  logAuditEvent,
  requirePermission,
  type AuthSession,
} from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export async function listUsers(
  session: AuthSession | null,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'users:read');
  const { page, limit, search } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User, Role } = getModels();

  const filter: Record<string, unknown> = {
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const allRoleIds = [...new Set(users.flatMap((u) => u.roleIds.map((id) => id.toString())))];
  const roles = await Role.find({ _id: { $in: allRoleIds } }).lean();
  const roleMap = new Map(roles.map((r) => [r._id.toString(), r]));

  return {
    data: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      status: u.status,
      roleIds: u.roleIds.map((id) => id.toString()),
      roles: u.roleIds.map((id) => {
        const role = roleMap.get(id.toString());
        return role ? { id: role._id.toString(), name: role.name, slug: role.slug } : null;
      }).filter(Boolean),
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getUser(session: AuthSession | null, id: string) {
  requirePermission(session, 'users:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User, Role } = getModels();

  const user = await User.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  }).lean();
  if (!user) throw new AuthError('User not found', 404);

  const roles = await Role.find({ _id: { $in: user.roleIds } }).lean();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    status: user.status,
    roleIds: user.roleIds.map((rid) => rid.toString()),
    roles: roles.map((r) => ({ id: r._id.toString(), name: r.name, slug: r.slug })),
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function createUser(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'users:create');
  const input = createUserSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User } = getModels();

  const existing = await User.findOne({
    email: input.email.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
  });
  if (existing) throw new AuthError('Email already exists', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    roleIds: input.roleIds,
    status: input.status,
    tenantId: DEFAULT_TENANT_ID,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'user.create',
    resource: 'users',
    resourceId: user._id.toString(),
    metadata: { email: user.email },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    status: user.status,
    roleIds: user.roleIds.map((id) => id.toString()),
  };
}

export async function updateUser(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'users:update');
  const input = updateUserSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User } = getModels();

  const user = await User.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!user) throw new AuthError('User not found', 404);

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({
      email: input.email.toLowerCase(),
      tenantId: DEFAULT_TENANT_ID,
      _id: { $ne: id },
    });
    if (existing) throw new AuthError('Email already exists', 409);
    user.email = input.email.toLowerCase();
  }

  if (input.name) user.name = input.name;
  if (input.status) user.status = input.status;
  if (input.roleIds) user.roleIds = input.roleIds as unknown as typeof user.roleIds;
  await user.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'user.update',
    resource: 'users',
    resourceId: id,
    metadata: input,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    status: user.status,
    roleIds: user.roleIds.map((rid) => rid.toString()),
  };
}

export async function deleteUser(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'users:delete');

  if (session?.userId === id) {
    throw new AuthError('Cannot delete your own account', 400);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User } = getModels();

  const user = await User.findOneAndUpdate(
    { _id: id, tenantId: DEFAULT_TENANT_ID, deletedAt: { $exists: false } },
    { status: 'suspended', deletedAt: new Date() },
    { new: true },
  );
  if (!user) throw new AuthError('User not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'user.delete',
    resource: 'users',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

export async function adminResetPassword(
  session: AuthSession | null,
  id: string,
  ip?: string,
) {
  requirePermission(session, 'users:update');
  const { requestPasswordReset } = await import('@zodyk/auth');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { User } = getModels();

  const user = await User.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!user) throw new AuthError('User not found', 404);

  await requestPasswordReset(user.email);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'user.reset_password',
    resource: 'users',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}
