import {
  getApiSession,
  handleApiError,
  updateThemeSettingsById,
} from '@zodyk/api';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await updateThemeSettingsById(session, id, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
