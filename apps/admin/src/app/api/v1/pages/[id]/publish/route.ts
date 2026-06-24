import { getApiSession, getClientIp, handleApiError, publishPage } from '@zodyk/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await publishPage(session, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
