import { getThemeLanguageHealthHandler } from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const GET = apiRoute(async (_request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  return getThemeLanguageHealthHandler(session, id);
});
