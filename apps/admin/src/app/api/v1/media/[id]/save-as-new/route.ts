import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { saveMediaAssetAsNew } from '@zodyk/api/media';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await saveMediaAssetAsNew(session, id, body, getClientIp(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
