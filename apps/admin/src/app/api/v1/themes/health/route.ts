import { getApiSession, getThemeHealthHandler, handleApiError } from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('themeId') ?? undefined;
    const result = await getThemeHealthHandler(session, themeId);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
