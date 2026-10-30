import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('Knowledge Exchange compresses large images and handles non-JSON upload failures', async () => {
  const state = { status: 200, compressed: 0, sent: 0 };
  const bundle = await build({ entryPoints: ['apps/web/src/features/knowledge-exchange/upload-image.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'canvas-boundary', setup(builder: { onResolve: Function; onLoad: Function }) {
      builder.onResolve({ filter: /image-compress$/ }, () => ({ path: 'canvas', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: "export async function compressImageFile() { globalThis.state.compressed++; return new File(['small'], 'image.webp', {type:'image/webp'}); }" }));
    } }],
  });
  const module = { exports: {} as { uploadKnowledgeImage: (file: File) => Promise<string> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, state, File, FormData, Error,
    fetch: async (_url: string, options: { body: FormData }) => {
      state.sent++; assert.ok((options.body.get('file') as File).size < 4 * 1024 * 1024);
      return state.status === 200 ? Response.json({ url: '/api/uploads/owned-image' }) : new Response('Request Entity Too Large', { status: state.status });
    },
  });
  const upload = module.exports.uploadKnowledgeImage;
  assert.equal(await upload(new File([new Uint8Array(5 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' })), '/api/uploads/owned-image');
  assert.equal(state.compressed, 1);
  state.status = 413;
  await assert.rejects(upload(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })), /too large/);
  state.status = 502;
  await assert.rejects(upload(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })), /could not upload/);
  const sent = state.sent;
  await assert.rejects(upload(new File(['text'], 'notes.txt', { type: 'text/plain' })), /Choose a PNG/);
  assert.equal(state.sent, sent);
});
