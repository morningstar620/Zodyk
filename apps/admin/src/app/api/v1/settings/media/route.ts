import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { getMediaSettings, updateMediaSettings } from '@zodyk/api/settings';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await getMediaSettings(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await updateMediaSettings(session, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
