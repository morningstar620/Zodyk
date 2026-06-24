import {
  deleteUser,
  getApiSession,
  getClientIp,
  getUser,
  handleApiError,
  updateUser,
} from '@zodyk/api';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getUser(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await updateUser(session, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await deleteUser(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
