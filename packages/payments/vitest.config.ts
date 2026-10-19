import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/zodyk-payments-test',
    },
  },
});
