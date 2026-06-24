import {
  deleteThemeHandler,
  getApiSession,
  getThemeHandler,
  handleApiError,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getThemeHandler(session, id);
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
    const result = await deleteThemeHandler(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
