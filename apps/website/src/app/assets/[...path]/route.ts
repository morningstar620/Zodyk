import { getThemeAsset } from '@/lib/render';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const assetPath = path.join('/');
  const url = new URL(request.url);
  const asset = await getThemeAsset(assetPath, {
    previewThemeId: url.searchParams.get('preview_theme') ?? undefined,
    previewToken: url.searchParams.get('preview_token') ?? undefined,
  });
  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(asset.content, {
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
