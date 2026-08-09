import type { NextConfig } from 'next';
import { execSync } from 'child_process';
import path from 'path';

try {
  const schemaPath = path.resolve(process.cwd(), '../../prisma/schema.prisma');
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
} catch (e) {
  console.error("Failed to generate Prisma client in next.config.ts:", e);
}

const nextConfig: NextConfig = {};
export default nextConfig;
