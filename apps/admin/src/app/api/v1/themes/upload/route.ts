import { getApiSession, handleApiError, uploadThemeHandler } from '@zodyk/api';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const formData = await request.formData();
    const result = await uploadThemeHandler(session, formData);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
