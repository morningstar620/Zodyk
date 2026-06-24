import {
  getApiSession,
  handleApiError,
  renderThemeSectionHandler,
} from '@zodyk/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await renderThemeSectionHandler(session, id, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
