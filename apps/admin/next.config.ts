import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Load monorepo root .env (Next.js only reads .env from apps/admin by default)
loadEnv({ path: resolve(process.cwd(), '../../.env') });

function apiUpstream(): string {
  const configured = process.env.API_UPSTREAM_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  // After the Express split, /api/v1 lives on the API server. Default in local dev.
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:5002';
  }
  throw new Error(
    'API_UPSTREAM_URL is required when NODE_ENV is production. Set API_UPSTREAM_URL to the API origin (for example https://api.example.com) so admin /api/v1 rewrites are not dropped.',
  );
}

// Evaluated while Next loads this file (build and start), before rewrites can be omitted.
const apiUpstreamOrigin = apiUpstream();

const nextConfig: NextConfig = {
  transpilePackages: [
    '@zodyk/core',
    '@zodyk/shared-ui',
    '@zodyk/auth',
    '@zodyk/api',
    '@zodyk/database',
    '@zodyk/builder',
    '@zodyk/theme-engine',
    '@zodyk/theme-language',
    '@zodyk/theme-lsp',
    '@zodyk/liquid',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.conditionNames = ['browser', 'import', 'require', 'default'];
    }
    config.output = {
      ...config.output,
      globalObject: 'self',
    };

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
  experimental: {
    optimizePackageImports: ['@zodyk/builder'],
  },
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'sharp',
    '@aws-sdk/client-s3',
    '@img/sharp-darwin-arm64',
  ],
  async redirects() {
    return [
      {
        source: '/auth/login',
        destination: '/login',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUpstreamOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
