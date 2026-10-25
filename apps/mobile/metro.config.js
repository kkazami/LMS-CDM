const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Expo configures pnpm workspace resolution and watch folders automatically.

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
  new RegExp('^' + monorepoRoot.split(/[\\/]/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\\\/]') + '[\\\\/](?:tmp|output|plans|storage|\\.orchestra|\\.agents|\\.agent|\\.codex|\\.impeccable)(?:[\\\\/]|$)'),
];

module.exports = config;

