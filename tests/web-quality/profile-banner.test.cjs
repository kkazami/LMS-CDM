const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
async function load(state) {
  globalThis.__bannerTest = state;
  const output = await build({ stdin: { contents: "export { PUT } from './apps/web/src/app/api/profile/route'; export * from './apps/web/src/lib/profile-banner'; export * from './apps/web/src/lib/banner-crop';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json', plugins: [{ name: 'test-boundaries', setup(b) {
    b.onResolve({ filter: /^@lms\/types$/ }, () => ({ path: path.resolve('packages/types/src/index.ts') }));
    b.onResolve({ filter: /^@\/lib\/(db|api-auth|super-user-v1\/legacy-entry-guard)$/ }, ({ path }) => ({ path, namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({ contents: path.endsWith('/db') ? 'export const db=globalThis.__bannerTest.db;' : path.endsWith('/api-auth') ? 'export async function getSessionFromRequest(){ return globalThis.__bannerTest.session; }' : 'export async function denyLegacyApi(){return null;}' }));
  } }] });
  const mod = new Module(path.resolve('apps/web/__banner_test.cjs'), module);
  mod.filename = path.resolve('apps/web/__banner_test.cjs'); mod.paths = [path.resolve('apps/web/node_modules'), ...module.paths]; mod._compile(output.outputFiles[0].text, mod.filename); return mod.exports;
}
const request = bannerImageUrl => new Request('https://lms.test/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bannerImageUrl }) });
test('banner save retains preferences, checks ownership and returns the persisted image; removal restores empty banner', async () => {
  let preferences = JSON.stringify({ theme: 'dark' }), query, writes = 0;
  const user = { id: 'student', instituteId: 'ics', institute: { code: 'ics', name: 'ICS' } };
  const db = { privateAsset: { findFirst: async input => { query = input.where; return { id: 'image' }; } }, user: { findUniqueOrThrow: async () => ({ preferences }), update: async input => { assert.equal(input.where.id, 'student'); assert.equal(input.where.preferences, preferences); preferences = input.data.preferences; writes++; return { ...user, preferences }; } } };
  const api = await load({ session: { user }, db });
  const saved = await api.PUT(request('/api/assets/image')); assert.equal(saved.status, 200);
  assert.equal((await saved.json()).user.bannerImageUrl, '/api/assets/image');
  assert.equal(query.ownerId, 'student'); assert.equal(query.instituteId, 'ics'); assert.equal(query.size.lte, 5 * 1024 * 1024);
  assert.deepEqual(query.mimeType.in, ['image/png', 'image/jpeg', 'image/webp']);
  assert.equal(JSON.parse(preferences).theme, 'dark'); assert.equal(api.profileBanner(preferences), '/api/assets/image');
  assert.equal((await api.PUT(request(''))).status, 200); assert.equal(api.profileBanner(preferences), ''); assert.equal(writes, 2);
});
test('invalid URLs, foreign or rejected assets and unauthenticated users cannot save banners', async () => {
  let writes = 0;
  const state = { session: { user: { id: 'student', instituteId: 'ics' } }, db: { privateAsset: { findFirst: async () => null }, user: { update: async () => { writes++; } } } };
  const api = await load(state);
  for (const value of ['https://other.test/image.png', 'data:image/png;base64,AA', null, 123, '/api/assets/foreign']) assert.equal((await api.PUT(request(value))).status, 400);
  assert.equal(writes, 0); state.session = null; assert.equal((await api.PUT(request(''))).status, 401);
  for (const raw of ['invalid', '[]', 'null', '{"bannerImageUrl":"https://other.test"}']) assert.equal(api.profileBanner(raw), '');
});

test('banner crop always covers a 4:1 frame and remains inside landscape and portrait images', async () => {
  const { bannerCrop } = await load({});
  for (const [width, height] of [[2400, 600], [600, 2400], [500, 500], [6000, 1000]]) {
    for (const zoom of [1, 2, 3]) for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
      const crop = bannerCrop(width, height, zoom, x, y);
      assert.equal(crop.width / crop.height, 4);
      assert.ok(crop.x >= 0 && crop.y >= 0);
      assert.ok(crop.x + crop.width <= width + 0.0001);
      assert.ok(crop.y + crop.height <= height + 0.0001);
    }
  }
  assert.deepEqual(bannerCrop(2400, 600, 1, 0.5, 0.5), { x: 0, y: 0, width: 2400, height: 600 });
});

test('dragging the banner follows the pointer and clamps at image boundaries', async () => {
  const { moveBannerCrop } = await load({});
  assert.deepEqual(moveBannerCrop(1200, 600, 1, 0.5, 0.5, 0, 75, 600), { x: 0.5, y: 0 });
  assert.deepEqual(moveBannerCrop(1200, 600, 1, 0.5, 0.5, 0, -1000, 600), { x: 0.5, y: 1 });
  assert.deepEqual(moveBannerCrop(1200, 600, 2, 0.5, 0.5, 10000, -10000, 600), { x: 0, y: 1 });
});
