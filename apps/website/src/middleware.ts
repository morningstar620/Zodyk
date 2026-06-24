import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const previewTheme = request.nextUrl.searchParams.get('preview_theme');
  const previewToken = request.nextUrl.searchParams.get('preview_token');

  if (!previewTheme || !previewToken) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set('zodyk_preview_theme', previewTheme, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
  response.cookies.set('zodyk_preview_token', previewToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
