import {
  createThemeFileHandler,
  deleteThemeFileHandler,
  getApiSession,
  getThemeFileHandler,
  handleApiError,
  putThemeFileHandler,
} from '@zodyk/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    if (!path) {
      return Response.json({ error: 'path query required' }, { status: 400 });
    }
    const result = await getThemeFileHandler(session, id, path);
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
    const result = await putThemeFileHandler(session, id, body);
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
    const body = await request.json();
    const result = await createThemeFileHandler(session, id, body);
    return Response.json(result, { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    if (!path) {
      return Response.json({ error: 'path query required' }, { status: 400 });
    }
    const result = await deleteThemeFileHandler(session, id, path);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
