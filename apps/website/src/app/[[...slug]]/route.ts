import { renderSitePage } from '@/lib/render';
import { formatServerTiming } from '@/lib/request-timing';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function cacheControlForRequest(isPreview: boolean): string {
  if (isPreview) {
    return 'no-store, must-revalidate';
  }
  return 'public, s-maxage=60, stale-while-revalidate=600';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const pathname = slug?.length ? `/${slug.join('/')}` : '/';
  const url = new URL(request.url);
  const previewThemeId = url.searchParams.get('preview_theme') ?? undefined;
  const previewToken = url.searchParams.get('preview_token') ?? undefined;
  const designMode = url.searchParams.get('preview') === '1';

  const cookieStore = await cookies();
  const hasPreviewCookie = Boolean(
    cookieStore.get('zodyk_preview_theme')?.value &&
      cookieStore.get('zodyk_preview_token')?.value,
  );
  const isPreview = Boolean(
    designMode || (previewThemeId && previewToken) || hasPreviewCookie,
  );

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
}
