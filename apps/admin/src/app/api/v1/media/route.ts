import { getApiSession, handleApiError } from '@zodyk/api';
import { listMedia } from '@zodyk/api/media';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const result = await listMedia(session, query);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
