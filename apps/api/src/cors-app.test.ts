import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

const env = process.env as Record<string, string | undefined>;
env.CORS_ORIGINS = '';
env.NODE_ENV = 'production';

const { createApp } = await import('./app');

describe('production CORS with an empty allow-list', () => {
  let baseUrl = '';
  let closeServer: () => Promise<void> = async () => {};

  before(async () => {
    const app = createApp();
    const server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    closeServer = () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
  });

  after(async () => {
    await closeServer();
  });

  it('rejects an unknown Origin', async () => {
    env.NODE_ENV = 'production';
    const response = await fetch(`${baseUrl}/healthz`, {
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  });

  it('still serves non-browser requests that send no Origin', async () => {
    env.NODE_ENV = 'production';
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('allows every origin in development when the allow-list is empty', async () => {
    env.NODE_ENV = 'development';
    try {
      const response = await fetch(`${baseUrl}/healthz`, {
        headers: { Origin: 'https://dev.example' },
      });
      assert.equal(response.headers.get('access-control-allow-origin'), 'https://dev.example');
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    } finally {
      env.NODE_ENV = 'production';
    }
  });
});
