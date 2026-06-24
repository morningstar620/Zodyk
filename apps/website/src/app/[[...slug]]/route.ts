import { renderSitePage } from '@/lib/render';
import { NextResponse } from 'next/server';

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

  const { html, status } = await renderSitePage(pathname, {
    previewThemeId,
    previewToken,
    designMode,
  });

  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
