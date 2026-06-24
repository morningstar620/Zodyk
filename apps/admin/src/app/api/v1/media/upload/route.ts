import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import { uploadMediaAsset } from '@zodyk/api/media';

export async function POST(request: Request) {
  try {
    const session = await getApiSession(request);
    const formData = await request.formData();
    const result = await uploadMediaAsset(session, formData, getClientIp(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
