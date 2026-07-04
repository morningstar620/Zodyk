import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { bulkRestoreMediaAssets } from '@zodyk/api/media';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await bulkRestoreMediaAssets(session, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
