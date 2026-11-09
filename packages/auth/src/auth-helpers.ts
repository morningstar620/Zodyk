import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import { hashPassword, verifyPassword } from './security/password';
import { hashToken } from './security/encryption';
import { sendPasswordResetEmail } from './providers/email';
import { AuthError } from './rbac/middleware';
import crypto from 'crypto';

const DEFAULT_ADMIN_URL = 'http://localhost:5001';

/**
 * Resolve the origin used in password-reset links. Production must set
 * AUTH_URL explicitly; falling back to localhost would send users to a host
 * that does not exist in the deployment.
 */
function resolveResetBaseUrl(): string {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_URL is required to send password reset email');
  }

  return (process.env.ADMIN_URL?.trim() || DEFAULT_ADMIN_URL).replace(/\/+$/, '');
}

/** Invalidate every unused reset link and active API token for a user. */
async function revokePasswordArtifacts(
  userId: unknown,
  models: ReturnType<typeof getModels>,
): Promise<void> {
  const now = new Date();
  await models.PasswordResetToken.updateMany(
    { userId, usedAt: { $exists: false } },
    { $set: { usedAt: now } },
  );
  await models.ApiToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: now } },
  );
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  roleIds?: string[];
}): Promise<{ id: string; email: string; name: string }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User, Role } = getModels();

  const existing = await User.findOne({
    email: input.email.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
  });
  if (existing) throw new Error('Email already registered');

  let roleIds = input.roleIds;
  if (!roleIds?.length) {
    const viewerRole = await Role.findOne({ slug: 'viewer', tenantId: DEFAULT_TENANT_ID });
    roleIds = viewerRole ? [viewerRole._id.toString()] : [];
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    roleIds,
    status: 'active',
    tenantId: DEFAULT_TENANT_ID,
  });

  return { id: user._id.toString(), email: user.email, name: user.name };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User, PasswordResetToken } = getModels();

  const user = await User.findOne({
    email: email.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });

  if (!user) return;

  // Only the newest link should work. Resolve the origin first so a
  // misconfigured deployment does not create an unusable token.
  const baseUrl = resolveResetBaseUrl();

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: { $exists: false } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordResetToken.create({ userId: user._id, tokenHash, expires });

  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const models = getModels();
  const { User, PasswordResetToken } = models;

  const tokenHash = hashToken(token);
  const resetToken = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: { $exists: false },
    expires: { $gt: new Date() },
  });

  if (!resetToken) throw new Error('Invalid or expired reset token');

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(resetToken.userId, { passwordHash });

  // The password changed, so every older reset link is now invalid and every
  // personal API token must be re-issued.
  await revokePasswordArtifacts(resetToken.userId, models);
}

/**
 * Change a signed-in user's password after verifying the current one, then
 * revoke the reset links and API tokens that predate the change.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const models = getModels();
  const { User } = models;

  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw new AuthError('User not found', 404);
  if (!user.passwordHash) {
    throw new AuthError('This account does not use a password', 400);
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) throw new AuthError('Current password is incorrect', 400);

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await revokePasswordArtifacts(user._id, models);
}

export async function completeMfaLogin(
  mfaToken: string,
  code: string,
): Promise<{ userId: string; email: string; name: string } | null> {
  const { consumeMfaChallenge, verifyMfaCode } = await import('./mfa/verify');

  const userId = await consumeMfaChallenge(mfaToken);
  if (!userId) return null;

  const result = await verifyMfaCode(userId, code);
  if (!result.valid) return null;

  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  await connectDatabase(uri);
  const { User } = getModels();
  const user = await User.findById(userId);
  if (!user) return null;

  user.lastLoginAt = new Date();
  await user.save();

  return { userId: user._id.toString(), email: user.email, name: user.name };
}
