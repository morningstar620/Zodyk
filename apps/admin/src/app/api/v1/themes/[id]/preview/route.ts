import { previewThemeHandler } from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const POST = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const body = await request.json();
  return previewThemeHandler(session, id, body);
});
