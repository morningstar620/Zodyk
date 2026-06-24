import { getApiSession, getClientIp, handleApiError } from '@zodyk/api';
import {
  deleteMediaAsset,
  getMediaAsset,
  updateMediaAsset,
} from '@zodyk/api/media';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const result = await getMediaAsset(session, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(request);
    const { id } = await params;
    const body = await request.json();
    const result = await updateMediaAsset(session, id, body, getClientIp(request));
    return Response.json(result);
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
    const result = await deleteMediaAsset(session, id, getClientIp(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
