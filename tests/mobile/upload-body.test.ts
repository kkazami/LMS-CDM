import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createApiClient } from '../../packages/api-client/src';

const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }));

test('Expo multipart uploads contain the selected bytes, image MIME and filename', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const result = await build({ entryPoints: ['apps/mobile/src/lib/upload-body.ts'], bundle: true, write: false, format: 'cjs', platform: 'node', plugins: [{ name: 'native-file-boundary', setup(builder: any) {
    builder.onResolve({ filter: /^(react-native|expo-file-system)$/ }, ({ path }: any) => ({ path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }: any) => ({ contents: path === 'react-native' ? `export const Platform={OS:'android'};` : `export class File extends Blob { constructor(uri) { if(uri!=='file:///selected.png') throw Error('Wrong file'); super([bytes]); } }` }));
  } }] });
  const module = { exports: {} as any };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, Blob, FormData, bytes });
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal((options!.headers as Record<string, string>).Authorization, 'Bearer current-user');
      assert.equal((options!.headers as Record<string, string>)['Content-Type'], undefined);
      const parsed = await new Response(options!.body).formData();
      const file = parsed.get('file') as File;
      assert.equal(file.name, 'class-cover.png'); assert.equal(file.type, 'image/png');
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
      return Response.json({ url: '/api/assets/selected', fileName: file.name, fileSize: file.size });
    };
    const client = createApiClient({ baseUrl: 'https://synthetic.invalid', getToken: async () => 'current-user', createUploadBody: module.exports.createUploadBody });
    assert.equal((await client.upload.file('file:///selected.png', 'class-cover.png', 'image/png')).url, '/api/assets/selected');
  } finally { globalThis.fetch = originalFetch; }
});

test('a sign-in change during file preparation prevents the upload request', async () => {
  let token = 'previous-user', requests = 0;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { requests++; return Response.json({}); };
    const client = createApiClient({ baseUrl: 'https://synthetic.invalid', getToken: async () => token, createUploadBody: async () => { token = 'next-user'; return new FormData(); } });
    await assert.rejects(client.upload.file('file:///photo.png', 'cover.png', 'image/png'), /Sign-in changed/);
    assert.equal(requests, 0);
    let reads = 0;
    const dispatchRace = createApiClient({ baseUrl: 'https://synthetic.invalid', getToken: async () => ++reads < 3 ? 'previous-user' : 'next-user', createUploadBody: async () => new FormData() });
    await assert.rejects(dispatchRace.upload.file('file:///photo.png', 'cover.png', 'image/png'), /Sign-in changed/);
    assert.equal(requests, 0, 'dispatch must recheck the original upload identity');
  } finally { globalThis.fetch = originalFetch; }
});
