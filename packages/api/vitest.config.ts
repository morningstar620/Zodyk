import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The Admin migration lives outside this package, so workspace package
 * specifiers would not resolve from its directory. Alias the two packages it
 * imports; tests can still replace them with `vi.mock`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@zodyk/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@zodyk/database': fileURLToPath(new URL('../database/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/website-cache.test.ts', '**/node_modules/**', '**/dist/**'],
    env: {
      AUTH_SECRET: 'test-secret',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/zodyk-test',
    },
  },
});
