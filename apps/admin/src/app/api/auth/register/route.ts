export async function POST(request: Request) {
  try {
    const apiOrigin =
      process.env.API_UPSTREAM_URL?.trim() || 'http://127.0.0.1:5002';

    const response = await fetch(
      `${apiOrigin.replace(/\/$/, '')}/api/v1/auth/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(await request.json()),
        cache: 'no-store',
      },
    );

    const data = await response.json();

    return Response.json(data, { status: response.status });
  } catch {
    return Response.json(
      { error: 'Authentication service unavailable' },
      { status: 503 },
    );
  }
}