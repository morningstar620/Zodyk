import { getApiSession, handleApiError } from '@zodyk/api';
import { getMediaStats } from '@zodyk/api/media';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await getMediaStats(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
