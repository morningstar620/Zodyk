import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { transformMediaAsset } from '@zodyk/api/media';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await transformMediaAsset(session, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
