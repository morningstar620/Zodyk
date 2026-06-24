import {
  getApiSession,
  getThemeCustomizationHandler,
  handleApiError,
  putThemeCustomizationHandler,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');
    if (!resourceType || !resourceId) {
      return Response.json({ error: 'resourceType and resourceId required' }, { status: 400 });
    }
    const result = await getThemeCustomizationHandler(session, id, resourceType, resourceId);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await putThemeCustomizationHandler(session, id, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
