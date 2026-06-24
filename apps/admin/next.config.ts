import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Load monorepo root .env (Next.js only reads .env from apps/admin by default)
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: [
    '@zodyk/core',
    '@zodyk/shared-ui',
    '@zodyk/auth',
    '@zodyk/api',
    '@zodyk/database',
    '@zodyk/builder',
    '@zodyk/theme-engine',
  ],
  experimental: {
    optimizePackageImports: ['@zodyk/shared-ui', '@zodyk/builder'],
  },
  serverExternalPackages: ['sharp', '@aws-sdk/client-s3', '@img/sharp-darwin-arm64'],
  async redirects() {
    return [
      {
        source: '/auth/login',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
