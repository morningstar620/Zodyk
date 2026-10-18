import { hasAdminSession } from '@/lib/admin-session';
import { resolveStorefrontAccess } from '@/lib/design-preview';
import { lookupStorefrontRedirect } from '@/lib/redirects';
import { renderSitePage } from '@/lib/render';
import { formatServerTiming } from '@/lib/request-timing';
import { robotsResponse, sitemapResponse } from '@/lib/seo-routes';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function cacheControlForRequest(isPreview: boolean): string {
  if (isPreview) {
    return 'no-store, must-revalidate';
  }
  return 'public, s-maxage=60, stale-while-revalidate=600';
}

export async function GET(request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const pathname = slug?.length ? `/${slug.join('/')}` : '/';

  if (pathname === '/sitemap.xml') {
    try {
      return await sitemapResponse();
    } catch (error) {
      console.error('[website] sitemap failed:', error);
      return new NextResponse('Sitemap unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  }

  if (pathname === '/robots.txt') {
    try {
      return await robotsResponse();
    } catch (error) {
      console.error('[website] robots.txt failed:', error);
      return new NextResponse('Robots.txt unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  }

  const url = new URL(request.url);
  const previewParam = url.searchParams.get('preview');
  const cookieStore = await cookies();
  const access = resolveStorefrontAccess({
    previewParam,
    previewSignature: url.searchParams.get('preview_sig'),
    previewThemeId: url.searchParams.get('preview_theme'),
    previewToken: url.searchParams.get('preview_token'),
    cookieTheme: cookieStore.get('zodyk_preview_theme')?.value ?? null,
    cookieToken: cookieStore.get('zodyk_preview_token')?.value ?? null,
    adminSession: previewParam === '1' ? await hasAdminSession(request.headers) : false,
    signingSecret: process.env.AUTH_SECRET,
  });
  const { designMode, isPreview } = access;
  const previewThemeId = access.previewThemeId;
  const previewToken = access.previewToken;

  if (!isPreview) {
    try {
      const redirect = await lookupStorefrontRedirect(pathname, request.url);
      if (redirect) return redirect;
    } catch (error) {
      console.error('[website] redirect lookup failed:', error);
    }
  }

  try {
    const { html, status, timings } = await renderSitePage(pathname, {
      previewThemeId,
      previewToken,
      designMode,
    });

    return new NextResponse(html, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheControlForRequest(isPreview),
        'Server-Timing': formatServerTiming(timings),
      },
    });
  } catch (error) {
    console.error('[website] render failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error while rendering page';
    return new NextResponse(`<h1>Site temporarily unavailable</h1><p>${message}</p>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
