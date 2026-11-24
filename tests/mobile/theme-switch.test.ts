import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(path.resolve('apps/mobile/package.json'));
const ts = require('typescript');

type ThemeModule = typeof import('../../apps/mobile/src/stores/theme-store');

function loadThemeStore(setItem: (key: string, value: string) => Promise<void>) {
  const module = { exports: {} as ThemeModule };
  const source = ts.transpileModule(readFileSync('apps/mobile/src/stores/theme-store.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name: string) => {
    if (name === 'zustand') return { create: require('zustand/vanilla').createStore };
    if (name === 'react-native') return { Appearance: { getColorScheme: () => 'light' } };
    if (name === '../lib/storage') return { storage: { setItem } };
    throw new Error(name);
  } });
  return module.exports;
}

test('theme paints before slow storage finishes, accepts rapid toggles, and persists the last choice', async () => {
  const writes: string[] = [], release: (() => void)[] = [];
  const { useThemeStore: store } = loadThemeStore((_key, value) => new Promise<void>(resolve => {
    writes.push(value);
    release.push(resolve);
  }));
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

test('the native transition receives the tap origin and can commit a pair of queued toggles in order', async () => {
  const writes: string[] = [];
  const { useThemeStore: store, registerThemeTransition } = loadThemeStore(async (_key, value) => { writes.push(value); });
  const pending: (() => Promise<void>)[] = [];
  const origins: unknown[] = [];
  const unregister = registerThemeTransition((origin, apply) => {
    origins.push(origin);
    pending.push(apply);
    return Promise.resolve();
  });
  const origin = { x: 300, y: 42 };
  await store.getState().toggleTheme(origin);
  await store.getState().toggleTheme(origin);
  assert.deepEqual(origins, [origin, origin]);
  assert.equal(store.getState().isDark, false);
  await pending[0]();
  await pending[1]();
  assert.deepEqual(writes, ['dark', 'light']);
  unregister();
  await store.getState().toggleTheme(origin);
  assert.equal(store.getState().isDark, true);
});
