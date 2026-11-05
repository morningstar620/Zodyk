import { NextResponse } from 'next/server';

export interface ThemeAsset {
  content: string;
  contentType: string;
  isPreview: boolean;
}

/**
 * Theme assets are only safe for shared caches when they came from the live
 * theme. A preview render can be triggered by cookies as well as query params,
 * so the caller must pass whether a preview theme was actually selected.
 */
export function themeAssetCacheControl(isPreview: boolean): string {
  return isPreview ? 'private, no-store' : 'public, max-age=3600';
}

export function themeAssetResponse(asset: ThemeAsset | null): NextResponse {
  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(asset.content, {
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': themeAssetCacheControl(asset.isPreview),
    },
  });
}
