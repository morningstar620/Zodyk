import {
  getApiSession,
  handleApiError,
  publishThemeHandler,
} from '@zodyk/api';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await publishThemeHandler(session, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
