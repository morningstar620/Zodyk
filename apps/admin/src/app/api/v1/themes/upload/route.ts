import { uploadThemeHandler } from '@zodyk/api';
import { apiRoute } from '@/lib/api-route';

export const POST = apiRoute(async (request, _context, session) => {
  const formData = await request.formData();
  const result = await uploadThemeHandler(session, formData);
  return { result, status: 201 };
});
