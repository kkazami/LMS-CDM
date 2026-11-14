import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(path.resolve('apps/mobile/package.json'));
const ts = require('typescript');

test('theme paints before slow storage finishes, accepts rapid toggles, and persists the last choice', async () => {
  const writes: string[] = [], release: (() => void)[] = [];
  const module = { exports: {} as { useThemeStore: { getState: () => any } } };
  const source = ts.transpileModule(readFileSync('apps/mobile/src/stores/theme-store.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name: string) => {
    if (name === 'zustand') return require('zustand/vanilla') && { create: require('zustand/vanilla').createStore };
    if (name === 'react-native') return { Appearance: { getColorScheme: () => 'light' } };
    if (name === '../lib/storage') return { storage: { setItem: (_key: string, value: string) => new Promise<void>(resolve => { writes.push(value); release.push(resolve); }) } };
    throw new Error(name);
  } });
  const store = module.exports.useThemeStore;
  const first = store.getState().toggleTheme();
  assert.equal(store.getState().isDark, true);
  const second = store.getState().toggleTheme();
  assert.equal(store.getState().isDark, false);
  await Promise.resolve();
  assert.deepEqual(writes, ['dark']);
  release.shift()!(); await first;
  await Promise.resolve();
  assert.deepEqual(writes, ['dark', 'light']);
  release.shift()!(); await second;
  assert.equal(store.getState().themePreference, 'light');
});
