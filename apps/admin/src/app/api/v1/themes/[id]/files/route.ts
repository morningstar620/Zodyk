import {
  createThemeFileHandler,
  deleteThemeFileHandler,
  getThemeFileHandler,
  putThemeFileHandler,
} from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const GET = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) {
    return Response.json({ error: 'path query required' }, { status: 400 });
  }
  return getThemeFileHandler(session, id, path);
});

export const PUT = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const body = await request.json();
  return putThemeFileHandler(session, id, body);
});

export const POST = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const body = await request.json();
  const result = await createThemeFileHandler(session, id, body);
  return { result, status: 201 };
});

export const DELETE = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) {
    return Response.json({ error: 'path query required' }, { status: 400 });
  }
  return deleteThemeFileHandler(session, id, path);
});
