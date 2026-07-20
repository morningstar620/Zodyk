import {
  getApiSession,
  getThemeR2SyncStatusHandler,
  handleApiError,
  syncThemeToR2Handler,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getThemeR2SyncStatusHandler(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await syncThemeToR2Handler(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
