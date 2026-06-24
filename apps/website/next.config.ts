import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: [
    '@zodyk/core',
    '@zodyk/database',
    '@zodyk/shared-ui',
    '@zodyk/liquid',
    '@zodyk/theme-engine',
  ],
  async headers() {
    return [
      {
        source: '/((?!assets/|zodyk-nav\\.js|zodyk-design-mode\\.js).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
