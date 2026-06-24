import { deleteApiToken, getApiSession, getClientIp, handleApiError } from '@zodyk/api';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await deleteApiToken(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
