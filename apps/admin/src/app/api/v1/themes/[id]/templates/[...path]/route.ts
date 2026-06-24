import {
  getApiSession,
  getThemeTemplateHandler,
  handleApiError,
  putThemeTemplateHandler,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    const session = await getApiSession(request);
    const { id, path } = await params;
    const templatePath = `templates/${path.join('/')}`;
    const result = await getThemeTemplateHandler(session, id, templatePath);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    const session = await getApiSession(request);
    const { id, path } = await params;
    const templatePath = `templates/${path.join('/')}`;
    const body = await request.json();
    const result = await putThemeTemplateHandler(session, id, templatePath, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
