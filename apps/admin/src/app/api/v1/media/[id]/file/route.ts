import { getApiSession, handleApiError } from '@zodyk/api';
import { getMediaAssetFile } from '@zodyk/api/media';

const VARIANTS = new Set(['original', 'webp', 'avif']);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const rawVariant = searchParams.get('variant') ?? 'webp';
    const variant = VARIANTS.has(rawVariant)
      ? (rawVariant as 'original' | 'webp' | 'avif')
      : 'webp';

    const { body, mimeType } = await getMediaAssetFile(session, id, variant);

    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
