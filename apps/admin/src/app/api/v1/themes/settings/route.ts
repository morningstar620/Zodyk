import { getApiSession, handleApiError, updateThemeSettings } from '@zodyk/api';

export async function PATCH(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await updateThemeSettings(session, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
