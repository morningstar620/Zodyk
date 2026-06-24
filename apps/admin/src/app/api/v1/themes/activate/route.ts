import { activateThemeHandler, getApiSession, getClientIp, handleApiError } from '@zodyk/api';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await activateThemeHandler(session, body);
    void getClientIp(request);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
