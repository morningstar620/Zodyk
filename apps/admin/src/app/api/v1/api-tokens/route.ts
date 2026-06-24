import {
  createApiTokenHandler,
  getApiSession,
  getClientIp,
  handleApiError,
  listApiTokens,
} from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await listApiTokens(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await createApiTokenHandler(session, body, getClientIp(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
