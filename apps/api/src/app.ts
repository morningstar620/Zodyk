import { handleApiError } from '@zodyk/api';
import { connectDatabase } from '@zodyk/database';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import type { NextFunction, Request, Response } from 'express';
import { env } from './config';
import { createV1Router } from './routes/v1';

export function createApp() {
  const app = express();

  // Behind Traefik/nginx/cloud LB — needed for correct req.ip / protocol.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // API is consumed cross-origin by tokens and optionally direct admin upload clients.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (no Origin) and configured admin/website origins.
        if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(compression());

  // Preserve raw body so Web Request adapters can call .json() / .formData() / .text().
  app.use(
    express.raw({
      type: () => true,
      limit: env.bodyLimit,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/readyz', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({
      ok: ready,
      mongo: ready ? 'connected' : 'disconnected',
    });
  });

  app.use('/api/v1', createV1Router());

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const response = handleApiError(error);
    void response.arrayBuffer().then((buf) => {
      res.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
      });
      res.send(Buffer.from(buf));
    });
  });

  return app;
}

async function connectWithRetry(uri: string, attempt = 1): Promise<void> {
  try {
    await connectDatabase(uri);
    console.log('[api] mongodb connected');
  } catch (error) {
    const delayMs = Math.min(30_000, 1000 * attempt);
    console.error(
      `[api] mongodb connect failed (attempt ${attempt}):`,
      error instanceof Error ? error.message : error,
    );
    setTimeout(() => {
      void connectWithRetry(uri, attempt + 1);
    }, delayMs).unref();
  }
}

/** Establish a single shared Mongoose connection (retries in background if down). */
export async function bootstrapDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is required');
  }
  if (!env.authSecret) {
    console.warn('[api] AUTH_SECRET is not set — cookie sessions will not resolve');
  }
  await connectWithRetry(env.mongodbUri);
}
