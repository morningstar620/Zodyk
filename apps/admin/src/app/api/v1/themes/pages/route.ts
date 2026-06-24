import {
  getApiSession,
  handleApiError,
  listThemePagesHandler,
} from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await listThemePagesHandler(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
