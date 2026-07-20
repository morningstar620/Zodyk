import { exportThemeHandler } from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const GET = apiRoute(async (_request, { params }, session) => {
  const { id } = await params;
  if (!id) return Response.json({ error: 'Theme id required' }, { status: 400 });
  const { buffer, filename } = await exportThemeHandler(session, id);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
