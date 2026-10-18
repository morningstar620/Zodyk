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
    '@zodyk/media',
    '@zodyk/seo',
  ],
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'sharp',
    '@aws-sdk/client-s3',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.conditionNames = ['browser', 'import', 'require', 'default'];
    }

    // Optional native/peer deps pulled in by mongodb and sharp during static analysis.
    config.resolve.alias = {
      ...config.resolve.alias,
      aws4: false,
      '@img/sharp-libvips-dev/include': false,
      '@img/sharp-libvips-dev/cplusplus': false,
      '@img/sharp-wasm32/versions': false,
    };

    return config;
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/sitemap.xml', destination: '/seo/sitemap' },
        { source: '/robots.txt', destination: '/seo/robots' },
      ],
    };
  },
  async headers() {
    return [
      {
        // Live HTML: CDN may cache; route handler overrides for preview/designMode.
        source:
          '/((?!assets/|zodyk-nav\\.js|zodyk-design-mode\\.js|api/|sitemap\\.xml|robots\\.txt).*)',
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
