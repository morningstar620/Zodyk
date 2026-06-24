import {
  duplicateThemeHandler,
  getApiSession,
  handleApiError,
} from '@zodyk/api';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await duplicateThemeHandler(session, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
