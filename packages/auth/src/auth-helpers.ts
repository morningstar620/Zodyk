import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import { hashPassword } from './security/password';
import { hashToken } from './security/encryption';
import { sendPasswordResetEmail } from './providers/email';
import crypto from 'crypto';

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

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordResetToken.create({ userId: user._id, tokenHash, expires });

  const baseUrl = process.env.AUTH_URL ?? process.env.ADMIN_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User, PasswordResetToken } = getModels();

  const tokenHash = hashToken(token);
  const resetToken = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: { $exists: false },
    expires: { $gt: new Date() },
  });

  if (!resetToken) throw new Error('Invalid or expired reset token');

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(resetToken.userId, { passwordHash });
  resetToken.usedAt = new Date();
  await resetToken.save();
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
