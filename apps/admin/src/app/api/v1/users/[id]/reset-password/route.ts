import { adminResetPassword, getApiSession, getClientIp, handleApiError } from '@zodyk/api';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await adminResetPassword(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
