import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSafePreviewParam, previewCookieOptions } from './lib/preview-cookies';

function isPreviewSubresource(pathname: string): boolean {
  return pathname.startsWith('/assets/') || pathname.startsWith('/api/');
}

function applyPreviewCookies(response: NextResponse, theme: string, token: string) {
  const options = previewCookieOptions(process.env.NODE_ENV);
  response.cookies.set('zodyk_preview_theme', theme, options);
  response.cookies.set('zodyk_preview_token', token, options);
}

export function middleware(request: NextRequest) {
  const previewTheme = request.nextUrl.searchParams.get('preview_theme');
  const previewToken = request.nextUrl.searchParams.get('preview_token');
  const safePair = Boolean(
    previewTheme &&
      previewToken &&
      isSafePreviewParam(previewTheme) &&
      isSafePreviewParam(previewToken),
  );

  // Drop long-lived preview secrets from the address bar, history, and Referer
  // after copying a valid pair into a short-lived cookie.
  const shouldStrip =
    request.method === 'GET' &&
    !isPreviewSubresource(request.nextUrl.pathname) &&
    (previewTheme !== null || previewToken !== null);

  if (shouldStrip) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('preview_theme');
    clean.searchParams.delete('preview_token');
    const response = NextResponse.redirect(clean);
    if (safePair && previewTheme && previewToken) {
      applyPreviewCookies(response, previewTheme, previewToken);
    }
    return response;
  }

  if (!safePair || !previewTheme || !previewToken) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  applyPreviewCookies(response, previewTheme, previewToken);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
