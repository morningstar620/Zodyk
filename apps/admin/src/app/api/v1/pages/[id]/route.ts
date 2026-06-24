import {
  deletePage,
  getApiSession,
  getClientIp,
  getPage,
  handleApiError,
  publishPage,
  updatePage,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getPage(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await updatePage(session, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await deletePage(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
