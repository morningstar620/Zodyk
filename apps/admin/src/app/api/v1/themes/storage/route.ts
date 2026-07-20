import { getApiSession, getThemeStorageStatusHandler, handleApiError } from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await getThemeStorageStatusHandler(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
