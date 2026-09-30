import type { NextConfig } from 'next';
import path from 'path';

// Generate Prisma client in local dev if not present
if (process.env.NODE_ENV !== 'production') {
  try {
    const { execSync } = require('child_process');
    const schemaPath = path.resolve(process.cwd(), '../../prisma/schema.prisma');
    execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'ignore' });
  } catch (e) {
    // Non-fatal warning in development
    console.warn("Prisma generation notice in next.config.ts:", (e as Error).message);
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["officeparser", "pg", "@prisma/adapter-pg"],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
