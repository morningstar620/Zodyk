import { themeAssetHeaders } from '@/lib/asset-policy';
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
  const body = typeof asset.content === 'string' ? asset.content : new Uint8Array(asset.content);
  return new NextResponse(body, {
    headers: themeAssetHeaders(asset.contentType, {
      // PR #73 will pass the preview-aware value from themeAssetCacheControl.
      cacheControl: 'public, max-age=3600',
      dest: request.headers.get('sec-fetch-dest'),
      filename: assetPath,
    }),
  });
}
