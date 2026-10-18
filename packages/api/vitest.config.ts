import { defineConfig } from 'vitest/config';

export default defineConfig({
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
