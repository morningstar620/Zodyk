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
        // Live HTML: CDN may cache; route handler overrides for preview/designMode.
        source: '/((?!assets/|zodyk-nav\\.js|zodyk-design-mode\\.js|api/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
