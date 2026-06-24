import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import type { NextAuthConfig } from 'next-auth';
import { resolveUserPermissions } from './rbac/check';
import { credentialsProvider } from './providers/credentials';
import { getEmailProvider } from './providers/email';
import { getOAuthProviders } from './providers/oauth';
import { authConfig as baseAuthConfig } from './auth.config';

async function loadUserPermissions(userId: string): Promise<{
  roleIds: string[];
  permissions: string[];
  tenantId: string;
}> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return { roleIds: [], permissions: [], tenantId: DEFAULT_TENANT_ID };

  await connectDatabase(uri);
  const { User, Role } = getModels();

  const user = await User.findById(userId);
  if (!user) return { roleIds: [], permissions: [], tenantId: DEFAULT_TENANT_ID };

  const roleIds = user.roleIds.map((id) => id.toString());
  const permissions = await resolveUserPermissions(roleIds, async (ids) => {
    const roles = await Role.find({ _id: { $in: ids } });
    return roles.map((r) => ({ permissions: r.permissions }));
  });

  return { roleIds, permissions, tenantId: user.tenantId };
}

const emailProvider = getEmailProvider();

export const authConfig: NextAuthConfig = {
  ...baseAuthConfig,
  providers: [
    credentialsProvider,
    ...getOAuthProviders(),
    ...(emailProvider ? [emailProvider] : []),
  ],
  callbacks: {
    ...baseAuthConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;

      const uri = process.env.MONGODB_URI;
      if (!uri || !user.email) return false;

      await connectDatabase(uri);
      const { User, Role, Account } = getModels();

      let dbUser = await User.findOne({
        email: user.email.toLowerCase(),
        tenantId: DEFAULT_TENANT_ID,
        deletedAt: { $exists: false },
      });

      if (!dbUser) {
        const viewerRole = await Role.findOne({ slug: 'viewer', tenantId: DEFAULT_TENANT_ID });
        dbUser = await User.create({
          email: user.email.toLowerCase(),
          name: user.name ?? user.email.split('@')[0],
          status: 'active',
          roleIds: viewerRole ? [viewerRole._id] : [],
          tenantId: DEFAULT_TENANT_ID,
          emailVerified: new Date(),
          image: user.image,
        });
      }

      if (account) {
        await Account.findOneAndUpdate(
          { provider: account.provider, providerAccountId: account.providerAccountId },
          {
            userId: dbUser._id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | undefined,
          },
          { upsert: true },
        );
      }

      user.id = dbUser._id.toString();
      return dbUser.status === 'active';
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      if (user?.id || trigger === 'update') {
        const userId = (user?.id ?? token.userId) as string;
        const { roleIds, permissions, tenantId } = await loadUserPermissions(userId);
        token.roleIds = roleIds;
        token.permissions = permissions;
        token.tenantId = tenantId;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user = {
          ...session.user,
          id: token.userId as string,
          email: token.email as string,
          name: token.name as string,
        };
        session.userId = token.userId as string;
        session.roleIds = (token.roleIds as string[]) ?? [];
        session.permissions = (token.permissions as string[]) ?? [];
        session.tenantId = (token.tenantId as string) ?? DEFAULT_TENANT_ID;
      }
      return session;
    },
  },
};
