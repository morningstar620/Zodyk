import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { getToken } from 'next-auth/jwt';
import type { AuthSession } from './rbac/middleware';
import { verifyApiToken } from './tokens/api-token';

function useSecureCookies(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '';
  return authUrl.startsWith('https://');
}

/**
 * Resolve an API session from request headers without Next.js request context.
 * Prefer Bearer API tokens; otherwise decode the Auth.js JWT session cookie.
 */
export async function resolveSessionFromHeaders(
  headers: Headers,
): Promise<AuthSession | null> {
  const authHeader = headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return verifyApiToken(authHeader.slice(7).trim());
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({
    req: { headers },
    secret,
    secureCookie: useSecureCookies(),
  });

  if (!token?.userId || typeof token.userId !== 'string') {
    return null;
  }

  return {
    userId: token.userId,
    email: typeof token.email === 'string' ? token.email : '',
    name: typeof token.name === 'string' ? token.name : '',
    tenantId: typeof token.tenantId === 'string' ? token.tenantId : DEFAULT_TENANT_ID,
    roleIds: Array.isArray(token.roleIds) ? (token.roleIds as string[]) : [],
    permissions: Array.isArray(token.permissions)
      ? (token.permissions as string[])
      : [],
  };
}
