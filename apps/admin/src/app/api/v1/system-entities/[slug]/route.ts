import {
  deleteSystemEntity,
  getApiSession,
  getClientIp,
  getSystemEntity,
  handleApiError,
  updateSystemEntity,
} from '@zodyk/api';

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const result = await getSystemEntity(session, slug);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const body = await request.json();
    const result = await updateSystemEntity(session, slug, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const result = await deleteSystemEntity(session, slug, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
