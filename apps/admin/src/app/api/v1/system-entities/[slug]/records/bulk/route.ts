import {
  bulkSystemRecordsAction,
  getApiSession,
  getClientIp,
  handleApiError,
} from '@zodyk/api';

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const body = await request.json();
    const result = await bulkSystemRecordsAction(session, slug, body, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
