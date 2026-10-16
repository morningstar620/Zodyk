import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { NextAuthConfig } from 'next-auth';
import { credentialsProvider } from './providers/credentials';
import { getEmailProvider } from './providers/email';
import { getOAuthProviders } from './providers/oauth';
import { completeProviderSignIn } from './providers/provider-sign-in';
import { readExplicitLinkSession } from './request-session';
import { refreshJwtToken } from './session-user';
import { authConfig as baseAuthConfig } from './auth.config';

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
    async signIn({ user, account, profile, email }) {
      if (!account || account.provider === 'credentials') return true;

      const result = await completeProviderSignIn({
        email: user.email,
        name: user.name,
        image: typeof user.image === 'string' ? user.image : undefined,
        account: {
          provider: account.provider,
          type: account.type,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state:
            typeof account.session_state === 'string' ? account.session_state : undefined,
        },
        profile,
        verificationRequest: Boolean(email?.verificationRequest),
        sessionUser: await readExplicitLinkSession(),
      });
      if (!result.ok) return false;
      if (result.userId) user.id = result.userId;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }

      return refreshJwtToken(token);
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
