import {
  getThemeLanguageWorkspaceFilesHandler,
} from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const POST = apiRoute(async (request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const body = (await request.json()) as { paths?: string[] };
  const paths = body.paths ?? [];
  if (paths.length === 0) {
    return Response.json({ error: 'paths array required' }, { status: 400 });
  }
  return getThemeLanguageWorkspaceFilesHandler(session, id, paths);
});
