import { getApiSession, handleApiError, searchLinkTargets } from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = await searchLinkTargets(session, params);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
