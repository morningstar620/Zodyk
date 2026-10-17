import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      AUTH_SECRET: 'test-secret',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/zodyk-test',
    },
  },
});
