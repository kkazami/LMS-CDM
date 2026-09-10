const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo, preserving Expo defaults
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// 2. Prevent Metro from watching and re-indexing Next.js build cache (.next), desktop app, and temp files
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...defaultBlockList,
  /[\\/]apps[\\/]web[\\/]\.next[\\/]/,
  /[\\/]apps[\\/]web[\\/]node_modules[\\/]/,
  /[\\/]apps[\\/]desktop[\\/]/,
  /[\\/]apps[\\/]api[\\/]/,
  /[\\/]prisma[\\/]/,
  /[\\/]docs[\\/]/,
  /[\\/]\.turbo[\\/]/,
  /[\\/]\.git[\\/]/,
];

// 3. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;

