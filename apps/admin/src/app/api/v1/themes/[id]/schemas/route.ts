import {
  getApiSession,
  getThemeSchemasHandler,
  handleApiError,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'all' ? 'all' : undefined;
    const typesParam = searchParams.get('types');
    const sectionTypes = typesParam ? typesParam.split(',').filter(Boolean) : undefined;
    const result = await getThemeSchemasHandler(session, id, { scope, sectionTypes });
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
