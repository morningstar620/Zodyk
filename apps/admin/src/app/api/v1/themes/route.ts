import {
  activateThemeHandler,
  getActiveThemeHandler,
  getApiSession,
  getThemeHealthHandler,
  handleApiError,
  listThemeTemplates,
  listThemesHandler,
  scaffoldTemplateHandler,
  updateThemeSettings,
} from '@zodyk/api';

export async function GET(request: Request) {
  try {
    const session = await getApiSession(request);
    const result = await listThemesHandler(session);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
