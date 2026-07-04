import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { emptyMediaTrash } from '@zodyk/api/media';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await emptyMediaTrash(session, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
