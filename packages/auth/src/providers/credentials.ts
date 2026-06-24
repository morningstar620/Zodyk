import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import Credentials from 'next-auth/providers/credentials';
import { checkRateLimit, getRateLimitKey } from '../security/rate-limit';
import { verifyPassword } from '../security/password';
import { createMfaChallenge } from '../mfa/verify';

export const credentialsProvider = Credentials({
  id: 'credentials',
  name: 'Email and Password',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    const email = credentials?.email as string | undefined;
    const password = credentials?.password as string | undefined;

    if (!email || !password) return null;

    const uri = process.env.MONGODB_URI;
    if (!uri) return null;

    await connectDatabase(uri);
    const { User } = getModels();

    if (password.startsWith('mfa:')) {
      const parts = password.split(':');
      const mfaToken = parts[1];
      const code = parts[2];
      if (!mfaToken || !code) return null;

      const { consumeMfaChallenge, verifyMfaCode } = await import('../mfa/verify');
      const userId = await consumeMfaChallenge(mfaToken);
      if (!userId) return null;

      const result = await verifyMfaCode(userId, code);
      if (!result.valid) return null;

      const user = await User.findById(userId);
      if (!user || user.status !== 'active') return null;

      user.lastLoginAt = new Date();
      await user.save();

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
      };
    }

    const rateLimit = await checkRateLimit(getRateLimitKey('login', email.toLowerCase()));
    if (!rateLimit.success) return null;

    const user = await User.findOne({
      email: email.toLowerCase(),
      tenantId: DEFAULT_TENANT_ID,
      deletedAt: { $exists: false },
    });

    if (!user || user.status !== 'active' || !user.passwordHash) return null;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;

    if (user.mfaEnabled) {
      const mfaToken = await createMfaChallenge(user._id.toString());
      throw new Error(`MFA_REQUIRED:${mfaToken}`);
    }

    user.lastLoginAt = new Date();
    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});
