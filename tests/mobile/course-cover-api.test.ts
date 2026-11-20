import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('class cover endpoint enforces teaching ownership, image ownership/type and valid input before writing', async () => {
  const state = { actor: { id: 'professor', instituteId: 'ics', role: 'PROFESSOR' } as any, assetAllowed: true, mime: 'image/jpeg', writes: [] as any[], checkedUpload: [] as string[] };
  const bundle = await build({ entryPoints: ['apps/web/src/app/api/courses/[courseId]/route.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    plugins: [{ name: 'boundary-adapters', setup(b: any) {
      b.onResolve({ filter: /^next\/|^@\/lib\/(db|api-auth|private-upload|forms\/visibility|super-user-v1\/(actor|legacy-entry-guard))$/ }, ({ path: name }: any) => ({ path: name, namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }: any) => ({ contents:
        name === 'next/server' ? 'export const NextResponse = {json: (body, options) => Response.json(body,options)};' :
        name === 'next/cache' ? 'export function revalidatePath() {}' :
        name.endsWith('/db') ? `export const db = { course: { findUnique: async ({where}) => where.id === 'course' ? {id:'course', instituteId:'ics', instructorId:'professor', institute:{code:'ics'}} : null, update: async input => { globalThis.state.writes.push(input); } }, privateAsset: {findUnique: async()=>({mimeType:globalThis.state.mime})} };` :
        name.endsWith('/api-auth') ? 'export async function getSessionFromRequest(){return globalThis.state.actor ? {user:globalThis.state.actor}:null;}' :
        name.endsWith('/actor') ? 'export class AccessError extends Error {constructor(status,message){super(message);this.status=status}} export const accountErrorResponse = error => Response.json({message:error.message},{status:error.status});' :
        name.endsWith('/legacy-entry-guard') ? 'export async function denyLegacyApi(request){return request.headers.get("x-deny") ? Response.json({}, {status:403}) : null;}' :
        name.endsWith('/private-upload') ? `import {AccessError} from '@/lib/super-user-v1/actor'; export async function requireOwnedUpload(db,actor,url){globalThis.state.checkedUpload.push(url);if(!globalThis.state.assetAllowed)throw new AccessError(403,'Foreign upload');}` :
        'export async function visibleSyllabusForms(){return {}}' }));
    } }],
  });
  const module = { exports: {} as { PATCH: (request: Request, context: unknown) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, state, Response, Request, URL, console });
  const patch = (body: unknown, courseId = 'course', headers = {}) => module.exports.PATCH(new Request('https://lms.example.invalid/api/courses/' + courseId, { method: 'PATCH', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), { params: Promise.resolve({ courseId }) });
  assert.equal((await patch({ coverImage: '/course-banners/webdev.svg' })).status, 200);
  assert.equal(state.writes[0].data.coverImage, '/course-banners/webdev.svg');
  assert.equal((await patch({ coverImage: '/api/assets/photo-123' })).status, 200);
  assert.deepEqual(state.checkedUpload, ['/api/assets/photo-123']);
  assert.equal((await patch({ coverImage: null })).status, 200);
  assert.equal(state.writes.at(-1).data.coverImage, '');
  assert.equal((await patch({ mobileCoverImage: '/api/assets/mobile-square' })).status, 200);
  assert.equal(state.writes.at(-1).data.mobileCoverImage, '/api/assets/mobile-square');
  assert.equal(state.writes.at(-1).data.coverImage, undefined, 'Mobile edits must not replace the web cover');
  for (const id of ['programming', 'database', 'networking', 'webdev', 'cybersecurity']) {
    assert.equal((await patch({ mobileCoverImage: `/course-banners/mobile/${id}.svg` })).status, 200);
    assert.equal(state.writes.at(-1).data.mobileCoverImage, `/course-banners/mobile/${id}.svg`);
    assert.equal(state.writes.at(-1).data.coverImage, undefined);
  }
  assert.equal((await patch({ mobileCoverImage: null })).status, 200);
  assert.equal(state.writes.at(-1).data.mobileCoverImage, null);
  assert.equal(state.writes.at(-1).data.coverImage, undefined);
  assert.equal((await patch({ coverImage: '/course-banners/database.svg', mobileCoverImage: '/api/assets/mobile-square' })).status, 200);
  assert.equal(state.writes.at(-1).data.coverImage, '/course-banners/database.svg');
  assert.equal(state.writes.at(-1).data.mobileCoverImage, '/api/assets/mobile-square');
  const successfulWrites = state.writes.length;
  for (const actor of [null, { ...state.actor, role: 'STUDENT' }, { ...state.actor, id: 'other-professor' }, { ...state.actor, instituteId: 'ibe' }, { ...state.actor, role: 'SUPER_USER' }]) {
    const original = state.actor; state.actor = actor;
    assert.ok([401, 403, 404].includes((await patch({ coverImage: '/course-banners/webdev.svg' })).status));
    assert.ok([401, 403, 404].includes((await patch({ mobileCoverImage: '/api/assets/mobile-square' })).status));
    state.actor = original;
  }
  for (const coverImage of [undefined, {}, 'https://external.invalid/photo.png', '/course-banners/../../private.svg', 'javascript:alert(1)']) assert.equal((await patch({ coverImage })).status, 400);
  assert.equal((await patch('invalid-json')).status, 400);
  for (const mobileCoverImage of ['', false, {}, '/course-banners/webdev.svg', '/course-banners/mobile/unknown.svg', '/course-banners/mobile/../webdev.svg', 'https://external.invalid/photo.png']) assert.equal((await patch({ mobileCoverImage })).status, 400);
  assert.equal((await patch({ coverImage: '/course-banners/mobile/webdev.svg' })).status, 400);
  assert.equal((await patch({ coverImage: null, instructorId: 'other' })).status, 400);
  assert.equal((await patch({ coverImage: null }, 'foreign-course')).status, 404);
  state.assetAllowed = false;
  assert.equal((await patch({ coverImage: '/api/assets/foreign' })).status, 403);
  assert.equal((await patch({ coverImage: '/course-banners/programming.svg', mobileCoverImage: '/api/assets/foreign' })).status, 403, 'Reject the whole change before writing either image');
  state.assetAllowed = true; state.mime = 'application/pdf';
  assert.equal((await patch({ coverImage: '/api/assets/document' })).status, 400);
  assert.equal((await patch({ mobileCoverImage: '/api/assets/document' })).status, 400);
  assert.equal((await patch({ coverImage: null }, 'course', { 'x-deny': '1' })).status, 403);
  assert.equal(state.writes.length, successfulWrites);
});
