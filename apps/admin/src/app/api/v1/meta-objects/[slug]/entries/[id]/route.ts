import {
  deleteMetaEntry,
  getApiSession,
  getClientIp,
  getMetaEntry,
  handleApiError,
  updateMetaEntry,
} from '@zodyk/api';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug, id } = await params;
    const result = await getMetaEntry(session, slug, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug, id } = await params;
    const body = await request.json();
    const result = await updateMetaEntry(session, slug, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug, id } = await params;
    const result = await deleteMetaEntry(session, slug, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
