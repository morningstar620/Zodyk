import {
  getApiSession,
  getCustomizerBootstrapHandler,
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
    const pathname = searchParams.get('pathname') ?? undefined;
    const result = await getCustomizerBootstrapHandler(session, id, { pathname });
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
