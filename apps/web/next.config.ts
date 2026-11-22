import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function repairBrokenTurbopackJunctions() {
  if (process.platform !== 'win32') return;
  try {
    const devNodeModules = path.join(process.cwd(), '.next', 'dev', 'node_modules');
    if (fs.existsSync(devNodeModules)) {
      fs.rmSync(devNodeModules, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors in read-only or concurrent environments
  }
}

repairBrokenTurbopackJunctions();

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
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
      {
        source: '/codelab-sandbox',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        source: '/codelab-runtime/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/api/assets/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
