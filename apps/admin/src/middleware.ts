import { auth } from '@zodyk/auth/edge';
import { NextResponse } from 'next/server';

const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/login/mfa',
  '/auth/login',
  '/pay',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/api/auth') ||
    // REST is authenticated in handlers (cookie JWT, Bearer tokens, webhooks).
    pathname.startsWith('/api/v1');

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
