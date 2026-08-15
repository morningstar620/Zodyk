import { createServer } from 'node:http';
import { createApp, bootstrapDatabase } from './app';
import { env } from './config';

async function main() {
  await bootstrapDatabase();

  const app = createApp();
  const server = createServer(app);

  // Keep-alive helps Vercel rewrite / reverse-proxy reuse connections.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = env.requestTimeoutMs;

  server.listen(env.port, () => {
    console.log(
      `[api] listening on :${env.port} (public ${env.apiUrl}) cors=${env.corsOrigins.join(',') || '*'}`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[api] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
