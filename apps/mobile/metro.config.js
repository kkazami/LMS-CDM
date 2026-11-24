const { getDefaultConfig } = require('expo/metro-config');
const { existsSync } = require('node:fs');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

let config;
try {
  const { getSentryExpoConfig } = require('@sentry/react-native/metro');
  config = getSentryExpoConfig(projectRoot, { getDefaultConfig, includeWebReplay: false });
} catch {
  config = getDefaultConfig(projectRoot);
}

// Expo configures pnpm workspace resolution and watch folders automatically.

// Sentry's optional route lookup still probes the store removed in Expo Router 58.
const legacyRouterStore = 'expo-router/build/global-state/router-store';
const routerRoot = path.dirname(require.resolve('expo-router/package.json'));
if (!existsSync(path.join(routerRoot, 'build/global-state/router-store.js'))) {
  const resolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === legacyRouterStore && /[\\/]@sentry[\\/]react-native[\\/].*[\\/]expoRouterStore\.js$/.test(context.originModulePath)) {
      return { type: 'empty' };
    }

    return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
  };
}

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

// Expo's serializer owns platform outputs; Sentry adds debug IDs through its
// before-asset plugin rather than wrapping the serializer's old string format.
module.exports = config;

