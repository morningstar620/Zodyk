import {
  getApiSession,
  getClientIp,
  handleApiError,
  publishMetaEntry,
} from '@zodyk/api';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug, id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await publishMetaEntry(session, slug, id, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
