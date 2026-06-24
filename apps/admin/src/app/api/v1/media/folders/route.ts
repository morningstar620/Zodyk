import { getApiSession, handleApiError } from '@zodyk/api';
import { listMediaFolders } from '@zodyk/api/media';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await listMediaFolders(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
