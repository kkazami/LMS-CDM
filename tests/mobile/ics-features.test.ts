import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { icsFeaturePath, featureUrlIsTrusted } from '../../apps/mobile/src/lib/ics-features';
import { mobileFeaturePath } from '../../apps/web/src/lib/mobile-feature-path';

test('ICS entry points preserve the course, assignment and discussion being opened', () => {
  assert.equal(icsFeaturePath('codelab'), '/ics/activities/codelab');
  assert.equal(icsFeaturePath('knowledge-exchange', undefined, undefined, 'post_123'), '/ics/knowledge-exchange/post/post_123');
  assert.equal(icsFeaturePath('practical-labs', 'course_123'), '/ics/courses/course_123/labs');
  assert.equal(icsFeaturePath('practical-labs', 'course_123', 'lab_123'), '/ics/courses/course_123/labs/lab_123');
  for (const id of ['', '../foreign', 'course?next=foreign', ['course'] as unknown as string]) {
    assert.equal(icsFeaturePath('practical-labs', id), null);
  }
});

test('workspace navigation never trusts a lookalike host, another port or another scheme', () => {
  const base = 'https://lms.example.invalid';
  assert.equal(featureUrlIsTrusted(base + '/ics/knowledge-exchange', base), true);
  for (const value of ['https://lms.example.invalid.evil.invalid/ics', 'http://lms.example.invalid/ics', 'https://lms.example.invalid:444/ics', 'https://user:pass@lms.example.invalid/ics', 'javascript:alert(1)', 'invalid']) {
    assert.equal(featureUrlIsTrusted(value, base), false);
  }
});

test('session bootstrap only redirects into existing ICS feature routes', () => {
  for (const value of ['/ics/activities/codelab', '/ics/activities/codelab/python/1', '/ics/activities/codelab/instructor', '/ics/knowledge-exchange/ask', '/ics/knowledge-exchange/post/post_123', '/ics/courses/course_123/labs/lab_123?attemptId=attempt_123']) {
    assert.equal(mobileFeaturePath(value), value);
  }
  for (const value of [null, '//evil.invalid/ics', 'https://evil.invalid', '/ibe/knowledge-exchange', '/ics/../ibe/knowledge-exchange', '/ics/activities/codelab/../../courses', '/ics/activities/codelab%2f..', '/ics/courses/course/labs/../../../admin', '/ics/knowledge-exchange\\@evil.invalid', '/api/auth/logout', '/ics/courses/course/gradebook']) {
    assert.equal(mobileFeaturePath(value), null);
  }
});

const require = createRequire(path.resolve('package.json'));
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('bootstrap validates the explicit bearer, rejects other roles/institutes and issues a private HttpOnly cookie', async () => {
  const token = 'synthetic_mobile_session_1234567890';
  const state = {
    enrolled: true,
    role: 'STUDENT', institute: 'ics',
    seen: [] as string[],
  };
  const bundle = await build({
    entryPoints: ['apps/web/src/app/api/auth/mobile-session/route.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', external: ['next/server'],
    plugins: [{ name: 'session-boundaries', setup(builder: { onResolve: Function; onLoad: Function }) {
      builder.onResolve({ filter: /^@\/lib\/(auth-session|student-access)$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: name }: { path: string }) => ({ contents: name.endsWith('auth-session')
        ? `export const bearerToken = header => /^Bearer ([A-Za-z0-9_-]{16,512})$/i.exec(header || '')?.[1] || null;
           export async function validateSessionToken(token) { globalThis.state.seen.push(token); return token === '${token}' ? { expiresAt: new Date('2030-01-01'), user: { role: globalThis.state.role, institute: { code: globalThis.state.institute } } } : null; }`
        : 'export async function needsClassEnrollment() { return !globalThis.state.enrolled; }' }));
    } }],
  });
  const module = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: webRequire, state, Request, Response, URL, process: { env: { NODE_ENV: 'production' } } });
  const get = (target = '/ics/courses/course_123/labs/lab_123', bearer: string | null = token) => module.exports.GET(new Request(
    'https://lms.example.invalid/api/auth/mobile-session?returnTo=' + encodeURIComponent(target),
    { headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), cookie: 'lumina_session=another_account_cookie' } },
  ));
  let response = await get();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://lms.example.invalid/ics/courses/course_123/labs/lab_123');
  const cookie = response.headers.get('set-cookie')!;
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=lax', 'Path=/']) assert.ok(cookie.includes(flag));
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.deepEqual(state.seen, [token]);
  for (const bearer of [null, 'invalid_or_expired_token']) {
    response = await get(undefined, bearer);
    assert.equal(response.status, 401); assert.equal(response.headers.get('set-cookie'), null);
  }
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'UNKNOWN']) {
    state.role = role; response = await get();
    assert.equal(response.status, 403); assert.equal(response.headers.get('set-cookie'), null);
  }
  state.role = 'PROFESSOR';
  assert.equal((await get()).status, 303);
  state.institute = 'ibe';
  assert.equal((await get()).status, 403);
  state.institute = 'ics'; state.enrolled = false;
  assert.equal((await get()).status, 403);
  state.enrolled = true;
  for (const target of ['https://evil.invalid', '/ibe/knowledge-exchange', '/api/auth/logout']) {
    response = await get(target); assert.equal(response.status, 400); assert.equal(response.headers.get('set-cookie'), null);
  }
});
