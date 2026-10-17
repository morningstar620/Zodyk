import { getToken } from 'next-auth/jwt';

/** Match Auth.js cookie naming used by the admin app. */
export function adminSessionUsesSecureCookie(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '';
  return authUrl.startsWith('https://');
}

export function adminSessionCookieName(secure = adminSessionUsesSecureCookie()): string {
  return secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

/**
 * True when the request carries a valid admin Auth.js session cookie.
 * Bearer API tokens are not an admin session.
 */
export async function hasAdminSession(headers: Headers): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  try {
    const secureCookie = adminSessionUsesSecureCookie();
    const token = await getToken({
      req: { headers },
      secret,
      secureCookie,
      salt: adminSessionCookieName(secureCookie),
    });
    return typeof token?.userId === 'string' && token.userId.length > 0;
  } catch {
    return false;
  }
}
