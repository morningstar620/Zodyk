import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import { authConfig } from './config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export function sessionToAuthSession(session: Session | null) {
  if (!session?.userId) return null;
  return {
    userId: session.userId,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    tenantId: session.tenantId,
    roleIds: session.roleIds,
    permissions: session.permissions,
  };
}
