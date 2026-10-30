import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { toWebRequest } from './http';
import { getClientIp } from '../../../../packages/api/src/request-context';

describe('Trusted client IP adapter', () => {
  it('uses Express req.ip instead of the X-Forwarded-For header', async () => {
    const app = express();
    app.set('trust proxy', 0);

    app.get('/test', (req, res) => {
      const webRequest = toWebRequest(req);
      res.json({ ip: getClientIp(webRequest) });
    });

    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address() as AddressInfo;

      const response = await fetch(
        `http://127.0.0.1:${address.port}/test`,
        {
          headers: {
            'X-Forwarded-For': '203.0.113.50',
          },
        },
      );

      const data = await response.json() as { ip: string };

      expect(data.ip).not.toBe('203.0.113.50');
      expect(data.ip).toBeTruthy();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });
});