import {
  createPage,
  getApiSession,
  getClientIp,
  handleApiError,
  listPages,
} from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = await listPages(session, params);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const result = await createPage(session, body, getClientIp(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
