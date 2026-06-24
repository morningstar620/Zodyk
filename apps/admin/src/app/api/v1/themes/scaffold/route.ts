import { getApiSession, handleApiError, scaffoldTemplateHandler } from '@zodyk/api';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await scaffoldTemplateHandler(session, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
