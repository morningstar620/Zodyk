import {
  getApiSession,
  handleApiError,
  previewThemeHandler,
} from '@zodyk/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const { result, serverTiming } = await previewThemeHandler(session, id, body);
    return Response.json(result, { headers: serverTiming });
  } catch (error) {
    return handleApiError(error);
  }
}
