import { getToken } from 'next-auth/jwt';
import { loadActiveUserSession } from './session-user';

function useSecureCookies(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '';
  return authUrl.startsWith('https://');
}

/**
 * Read the signed-in user during an OAuth callback so linking is explicit.
 * Fails closed when the cookie is missing or the account is no longer active.
 */
export async function readExplicitLinkSession(): Promise<{ userId: string; email: string } | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    if (!cookieHeader) return null;

    const token = await getToken({
      req: { headers: new Headers({ cookie: cookieHeader }) },
      secret,
      secureCookie: useSecureCookies(),
    });
    if (!token?.userId || typeof token.userId !== 'string') return null;

    const active = await loadActiveUserSession(token.userId);
    if (!active) return null;
    return { userId: active.userId, email: active.email };
  } catch {
    return null;
  }
}
