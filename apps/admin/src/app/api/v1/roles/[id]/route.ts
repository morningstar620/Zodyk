import {
  deleteRole,
  getApiSession,
  getClientIp,
  getRole,
  handleApiError,
  updateRole,
} from '@zodyk/api';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getRole(session, id);
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
    const result = await updateRole(session, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await deleteRole(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
