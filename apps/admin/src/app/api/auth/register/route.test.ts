import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

describe('POST /api/auth/register', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('API_UPSTREAM_URL', 'http://localhost:5002');
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards registration requests to the API server', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: 'test-user' }, { status: 201 }),
    );

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPass123!',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5002/api/v1/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('preserves API error status and response', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'Too many requests' }, { status: 429 }),
    );

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ action: 'register' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: 'Too many requests',
    });
  });

  it('returns 503 when the API server is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('Connection refused'));

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ action: 'register' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
  });
});