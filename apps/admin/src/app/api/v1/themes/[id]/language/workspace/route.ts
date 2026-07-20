import {
  getThemeLanguageWorkspaceMetadataHandler,
} from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const GET = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const includeHealth = new URL(request.url).searchParams.get('includeHealth') === 'true';
  return getThemeLanguageWorkspaceMetadataHandler(session, id, { includeHealth });
});
