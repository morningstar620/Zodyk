import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'node:http';

describe('Trusted proxy IP resolution', () => {
  it('ignores X-Forwarded-For when trusted proxy hops are zero', async () => {
    const app = express();
    app.set('trust proxy', 0);

    app.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const server = http.createServer(app);

    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Could not determine server port');
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/ip`,
        {
          headers: { 'X-Forwarded-For': '203.0.113.50' },
        },
      );

      const data = await response.json() as { ip: string };

      expect(data.ip).not.toBe('203.0.113.50');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve()),
      );
    }
  });

  it('resolves the client IP using the configured proxy hop count', async () => {
    const app = express();
    app.set('trust proxy', 1);

    app.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });

    const server = http.createServer(app);

    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Could not determine server port');
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/ip`,
        {
          headers: { 'X-Forwarded-For': '203.0.113.50' },
        },
      );

      const data = await response.json() as { ip: string };

      expect(data.ip).toBe('203.0.113.50');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve()),
      );
    }
  });
});