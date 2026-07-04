import {
  createSystemRecord,
  getApiSession,
  getClientIp,
  handleApiError,
  listSystemRecords,
} from '@zodyk/api';

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const result = await listSystemRecords(session, slug, queryParams);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getApiSession(request);
    const { slug } = await params;
    const body = await request.json();
    const result = await createSystemRecord(session, slug, body, getClientIp(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
