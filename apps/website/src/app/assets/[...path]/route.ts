import { themeAssetResponse } from '@/lib/asset-cache';
import { getThemeAsset } from '@/lib/render';

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
  return themeAssetResponse(asset);
}
