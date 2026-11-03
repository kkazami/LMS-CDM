import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { googleCallbackTicket } from '../../apps/mobile/src/lib/google-login-validation';

test('mobile Google callbacks require the expected app destination and state', () => {
  const base = 'lumina-lms://oauth/google';
  assert.equal(googleCallbackTicket(base + '?ticket=opaque&state=expected', base, 'expected'), 'opaque');
  for (const url of ['https://evil.invalid/oauth/google?ticket=x&state=expected', 'lumina-lms://other/google?ticket=x&state=expected', base + '?ticket=x&state=foreign', base + '?state=expected']) assert.throws(() => googleCallbackTicket(url, base, 'expected'));
  assert.throws(() => googleCallbackTicket(base + '?error=Cancelled&state=expected', base, 'expected'), /Cancelled/);
});

const require = createRequire(path.resolve('package.json'));
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('Google handoff binds browser identity and proof, expires, and redeems only once', async () => {
  const jar = new Map<string, string>();
  const verifier = 'a'.repeat(64), stateValue = 'b'.repeat(64);
  const user = { id: 'student', instituteId: 'ics-id', role: 'STUDENT', googleSubject: 'google-subject', credentialProvisioningState: null, isActive: true, institute: { code: 'ics' } };
  const state = { session: { id: 'browser-session', tokenHash: 'browser-token-hash', expiresAt: new Date(Date.now() + 600000), user }, consumed: false, created: 0, allowedOrigin: true };
  const stubs: Record<string, string> = {
    '@/lib/google-auth': "export const googleConfig = () => ({clientSecret:'synthetic-test-key',origin:'https://fixture.invalid'});",
    '@/lib/db': `export const db = { session: { findUnique: async () => globalThis.state.consumed ? null : globalThis.state.session, deleteMany: async () => { if (globalThis.state.consumed) return {count:0}; globalThis.state.consumed=true; return {count:1}; } } };`,
    '@/lib/auth-session': `export const getSession = async () => globalThis.state.session; export const createSession = async () => { globalThis.state.created++; return {token:'fresh-native-token'}; };`,
    '@/lib/roster/rate-limit': 'export const persistentLimit = async () => {};',
    '@/lib/rate-limit': "export const getClientIp = () => 'fixture';",
    '@/lib/request-security': 'export const mutationOriginAllowed = () => globalThis.state.allowedOrigin;',
    '@/lib/roster/policy': 'export const boundedJson = request => request.json();',
    '@/lib/super-user-v1/capabilities': 'export const mayAdmitAccount = user => user.isActive;',
    'next/headers': 'export const cookies = async () => ({get:name => globalThis.jar.has(name) ? {value:globalThis.jar.get(name)} : undefined, set:(name,value)=>globalThis.jar.set(name,value), delete:name=>globalThis.jar.delete(name)});',
  };
  const bundle = await build({ stdin: { contents: "export * from './apps/web/src/lib/google-mobile'; export {GET as complete} from './apps/web/src/app/api/auth/google/mobile/complete/route'; export {POST as exchange} from './apps/web/src/app/api/auth/google/mobile/exchange/route';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', external: ['jose', 'zod'],
    plugins: [{ name: 'oauth-boundaries', setup(builder: { onResolve: Function; onLoad: Function }) {
      builder.onResolve({ filter: /^\.\/google-auth$/ }, () => ({ path: '@/lib/google-auth', namespace: 'stub' }));
      builder.onResolve({ filter: /^(?:@\/lib\/|next\/headers)/ }, ({ path: name }: { path: string }) => stubs[name] ? { path: name, namespace: 'stub' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path: name }: { path: string }) => ({ contents: stubs[name] }));
    } }],
  });
  const module = { exports: {} as any };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: webRequire, state, jar, URL, URLSearchParams, Response, Request, Date, process: { env: { NODE_ENV: 'production' } } });
  const api = module.exports;
  for (const value of ['lumina-lms://oauth/google', 'lumina-lms:///oauth/google', 'exp://test.exp.direct/--/oauth/google', 'exp://192.168.1.2:8081/--/oauth/google']) assert.equal(api.validGoogleReturnUri(value), true);
  for (const value of ['https://evil.invalid', 'javascript:alert(1)', 'lumina-lms://oauth/foreign', 'exp://evil.invalid/--/oauth/google', 'exp://test.exp.direct/foreign', 'lumina-lms://oauth/google?ticket=foreign']) assert.equal(api.validGoogleReturnUri(value), false);
  const flow = { instituteCode: 'ics', challenge: createHash('sha256').update(verifier).digest('hex'), state: stateValue, returnUri: 'lumina-lms://oauth/google' };
  await api.saveGoogleMobileFlow(flow);
  // An existing browser cookie alone is insufficient: Google must have verified this session.
  let response = await api.complete(new Request('https://fixture.invalid/api/auth/google/mobile/complete'));
  assert.ok(new URL(response.headers.get('location')!).searchParams.has('error'));
  await api.saveGoogleMobileFlow(flow);
  await api.prepareGoogleMobile(state.session.id, user.googleSubject);
  response = await api.complete(new Request('https://fixture.invalid/api/auth/google/mobile/complete'));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  const ticket = googleCallbackTicket(response.headers.get('location')!, flow.returnUri, stateValue);
  assert.ok(!ticket.includes(user.googleSubject));
  assert.equal(jar.size, 0);
  const exchange = (proof = verifier, handoff = ticket) => api.exchange(new Request('https://fixture.invalid/api/auth/google/mobile/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket: handoff, verifier: proof }) }));
  assert.equal((await exchange('c'.repeat(64))).status, 400);
  assert.equal(state.consumed, false);
  const expired = await api.sealGoogleMobile({ challenge: flow.challenge, sessionId: state.session.id, tokenHash: state.session.tokenHash }, 'mobile-exchange', '0s');
  assert.equal((await exchange(verifier, expired)).status, 400);
  state.allowedOrigin = false;
  assert.equal((await exchange()).status, 403);
  state.allowedOrigin = true;
  const pair = await Promise.all([exchange(), exchange()]);
  assert.deepEqual(pair.map(item => item.status).sort(), [200, 400]);
  assert.equal(state.created, 1);
  assert.equal((await pair.find(item => item.status === 200)!.json()).token, 'fresh-native-token');
  assert.equal((await exchange()).status, 400);
  state.consumed = false; user.isActive = false;
  assert.equal((await exchange()).status, 400);
  user.isActive = true; user.institute.code = 'ibe';
  assert.equal((await exchange()).status, 400);
});
