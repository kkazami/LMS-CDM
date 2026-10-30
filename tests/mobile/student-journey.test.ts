import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { studentNotificationRoute, restoreStudentReturn } from '../../apps/mobile/src/lib/student-navigation';

const require = createRequire(path.resolve('package.json'));
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
async function load(contents: string, mocks: Record<string, string> = {}, fixture: any = {}, extra: object = {}) {
  const result = await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs',
    tsconfig: 'apps/web/tsconfig.json', external: ['next/server'], plugins: [{ name: 'synthetic-boundaries', setup(builder: any) {
      builder.onResolve({ filter: /.*/ }, ({ path: name }: { path: string }) => {
        if (Object.hasOwn(mocks, name)) return { path: name, namespace: 'fixture' };
        if (/(^|\/)db$/.test(name)) throw new Error(`Unmocked database boundary: ${name}`);
        return undefined;
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }: { path: string }) => ({ contents: mocks[name], loader: 'ts' }));
    } }],
  });
  const module = { exports: {} as any };
  const context = { module, exports: module.exports, require: webRequire, fixture, Request, Response, Headers, URL, URLSearchParams, AbortController, FormData, setTimeout, clearTimeout, console, ...extra };
  vm.runInNewContext(result.outputFiles[0].text, context);
  return module.exports;
}

const zustandMock = `export function create(factory) { let state; const set = update => { state = { ...state, ...(typeof update === 'function' ? update(state) : update) }; }; const get = () => state; state = factory(set, get); return Object.assign(selector => selector(state), { getState: get, setState: set }); }`;
const fileMock = `export const documentDirectory = 'device/'; export async function getInfoAsync(path) { return { exists: fixture.files.has(path) }; } export async function makeDirectoryAsync() {} export async function writeAsStringAsync(path, value) { fixture.files.set(path, value); } export async function readAsStringAsync(path) { if (!fixture.files.has(path)) throw new Error('Missing'); return fixture.files.get(path); } export async function deleteAsync(path) { fixture.files.delete(path); }`;
const userA = { id: 'student-a', name: 'Synthetic A', instituteId: 'institute-ics', role: 'STUDENT', institute: { code: 'ics', name: 'ICS' } };
const userB = { ...userA, id: 'student-b', name: 'Synthetic B' };

test('account switching partitions disk data, clears memory and locks rather than erases drafts', async () => {
  const fixture = { files: new Map(), storage: new Map(), nextUser: userA, unauthorized: false, clears: 0, unread: 4 };
  const app = await load(`export * from './apps/mobile/src/stores/auth-store'; export * from './apps/mobile/src/lib/offline-storage'; export * from './apps/mobile/src/lib/student-drafts';`, {
    zustand: zustandMock,
    'expo-file-system/legacy': fileMock,
    'react-native': `export const Platform = { OS: 'android' };`,
    '../lib/storage': `export const storage = { getItem: async k => fixture.storage.get(k) ?? null, setItem: async (k,v) => fixture.storage.set(k,v), deleteItem: async k => fixture.storage.delete(k) };`,
    '../lib/constants': `export const API_BASE_URL = 'https://fixture.invalid';`,
    '../lib/query-client': `export const queryClient = { cancelQueries() {}, clear() { fixture.clears++; } };`,
    './alerts-store': `export const useAlertsStore = { setState(value) { fixture.unread = value.unreadCount; } };`,
    '@lms/api-client': `export class ApiClientError extends Error { constructor(status) { super('Synthetic rejection'); this.status = status; } } export function createApiClient(config) { return { auth: { login: async () => ({ token: fixture.nextUser.id + '-token', user: fixture.nextUser }), register: async () => ({ token: 'registered', user: fixture.nextUser }), me: async () => { if (fixture.unauthorized) throw new ApiClientError(401); return { user: fixture.nextUser }; }, logout: async () => ({}) } }; }`,
  }, fixture);
  await app.useAuthStore.getState().login('fixture', 'fixture', 'ics', true);
  await app.setCachedData('courses', [{ owner: 'a' }]);
  await app.writeStudentDraft('assignment', { answer: 'A draft' });
  assert.equal((await app.getCachedData('courses'))[0].owner, 'a');
  fixture.unauthorized = true;
  await app.useAuthStore.getState().validateSession();
  assert.equal(app.useAuthStore.getState().isAuthenticated, false);
  assert.equal(await app.getCachedData('courses'), null);
  await assert.rejects(app.readStudentDraft('assignment'), /sign-in/);
  fixture.nextUser = userB; fixture.unauthorized = false;
  await app.useAuthStore.getState().login('fixture', 'fixture', 'ics', true);
  assert.equal(await app.getCachedData('courses'), null);
  assert.equal(await app.readStudentDraft('assignment'), null);
  assert.equal(fixture.unread, 0);
  fixture.nextUser = userA;
  await app.useAuthStore.getState().login('fixture', 'fixture', 'ics', true);
  assert.equal((await app.readStudentDraft('assignment')).answer, 'A draft');
  const saved = JSON.parse(fixture.storage.get('lumina_auth_session_v2'));
  assert.equal(saved.token, 'student-a-token');
  assert.equal(saved.user.id, 'student-a');
  assert.ok(fixture.clears >= 4);
});

test('interrupted draft writes recover the previous complete version', async () => {
  const fixture = { files: new Map(), verified: true };
  const app = await load(`export * from './apps/mobile/src/lib/student-drafts'; export * from './apps/mobile/src/lib/student-scope';`, {
    'expo-file-system/legacy': fileMock,
    'react-native': `export const Platform = { OS: 'android' };`,
    '../stores/auth-store': `export const useAuthStore = { getState: () => ({ isSessionVerified: fixture.verified }) };`,
  }, fixture);
  app.setStudentScope('ics:student-a');
  await app.writeStudentDraft('work', { text: 'first complete copy' });
  await app.writeStudentDraft('work', { text: 'second complete copy' });
  const newest = [...fixture.files.keys()].find(value => value.endsWith('.1'));
  fixture.files.set(newest, '{interrupted');
  assert.equal((await app.readStudentDraft('work')).text, 'first complete copy');
  fixture.verified = false;
  await assert.rejects(app.readStudentDraft('work'), /verify/);
  assert.equal(fixture.files.size, 2);
});

test('late API responses cannot update another sign-in, and 403 does not expire a session', async () => {
  let token = 'a', release!: (value: Response) => void;
  const rejected: string[] = [];
  const sdk = await load(`export * from './packages/api-client/src/index';`, {}, {}, { fetch: () => new Promise(resolve => { release = resolve; }) });
  const client = sdk.createApiClient({ baseUrl: 'https://fixture.invalid', getToken: async () => token, onUnauthorized: (value: string) => rejected.push(value) });
  const old = client.courses.list('ics');
  await new Promise(resolve => setTimeout(resolve, 0));
  token = 'b'; release(Response.json({ courses: [{ id: 'private-a' }] }));
  await assert.rejects(old, /previous sign-in/);
  assert.deepEqual(rejected, []);
  for (const status of [403, 401]) {
    const pending = client.courses.list('ics');
    await new Promise(resolve => setTimeout(resolve, 0));
    release(Response.json({ message: 'Synthetic denial' }, { status }));
    await assert.rejects(pending);
  }
  assert.deepEqual(rejected, ['b']);
});

test('SDK sends server flashcard contracts, maps real reward amounts and wraps raw workspace arrays', async () => {
  const calls: Array<{ path: string; body: any; headers: any }> = [];
  const sdk = await load(`export * from './packages/api-client/src/index';`, {}, {}, { fetch: async (url: string, options: RequestInit) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body as string) : null;
    calls.push({ path, body, headers: options.headers });
    if (path.endsWith('/complete-session')) return Response.json({ success: true, grantedExp: 7 });
    if (path.endsWith('/tasks')) return Response.json(options.method ? { id: 'task', ...body } : [{ id: 'task', completed: false }]);
    if (path.endsWith('/events')) return Response.json([{ id: 'event' }]);
    return Response.json({ correct: true, correctAnswer: 'synthetic' });
  } });
  const client = sdk.createApiClient({ baseUrl: 'https://fixture.invalid' });
  await client.flashcards.recordProgress('card', 'knew_it', 'stable-key');
  assert.deepEqual(calls[0].body, { cardId: 'card', selfRating: 'knew_it' });
  assert.equal(calls[0].headers['Idempotency-Key'], 'stable-key');
  assert.equal((await client.flashcards.completeSession('deck', { cardsReviewed: 3, durationSeconds: 12, idempotencyKey: 'receipt' })).expEarned, 7);
  assert.equal((await client.workspace.getTasks('ics')).tasks[0].id, 'task');
  await client.workspace.createTask({ title: 'Study', priority: 'HIGH' });
  assert.equal(calls.at(-1)!.body.priority, 'high');
  await client.workspace.updateTask('task', { completed: true });
  assert.deepEqual(calls.at(-1)!.body, { id: 'task', completed: true });
  assert.equal((await client.workspace.getEvents('ics')).events[0].id, 'event');
  await assert.rejects(client.workspace.getAgenda(), (error: any) => error.status === 426);
});

test('actual task PATCH preserves omitted fields and enforces the current owner', async () => {
  const fixture = { where: null as any, data: null as any, task: { id: 'task', title: 'Keep title', description: 'Keep description', priority: 'high', completed: false } };
  const route = await load(`export * from './apps/web/src/app/api/workspace/tasks/route';`, {
    '@/lib/super-user-v1/legacy-entry-guard': `export const denyLegacyApi = async () => null;`,
    '@/lib/course-access': `export const requireCourseAccess = async (_actor, id) => { if (id === 'foreign') throw Object.assign(new Error('Forbidden course'), { status: 403 }); };`,
    '@/lib/super-user-v1/actor': `export const accountErrorResponse = error => Response.json({ message: error.message }, { status: error.status ?? 500 });`,
    '../_shared': `export const requireWorkspaceSession = async () => ({ session: { user: { id: 'student-a', instituteId: 'ics' } }, response: null }); export const getQueryId = () => null;`,
    '@/lib/db': `export const db = { taskItem: { findFirst: async input => { fixture.where = input.where; return fixture.task; }, update: async input => { fixture.data = input.data; return { ...fixture.task, ...input.data }; } } };`,
  }, fixture);
  const response = await route.PATCH(new Request('https://fixture.invalid/api/workspace/tasks', { method: 'PATCH', body: JSON.stringify({ id: 'task', completed: true }) }));
  assert.equal(response.status, 200);
  const task = await response.json();
  assert.equal(task.title, 'Keep title'); assert.equal(task.description, 'Keep description'); assert.equal(task.priority, 'high'); assert.equal(task.completed, true);
  assert.equal(fixture.where.creatorId, 'student-a'); assert.equal(fixture.where.instituteId, 'ics');
  assert.deepEqual(Object.keys(fixture.data), ['completed']);
  const denied = await route.PATCH(new Request('https://fixture.invalid/api/workspace/tasks', { method: 'PATCH', body: JSON.stringify({ id: 'task', courseId: 'foreign' }) }));
  assert.equal(denied.status, 403);
});

test('receipt replay performs one mutation, rejects a changed payload and separates students', async () => {
  const records = new Map();
  const fixture = { db: { $transaction: async (work: any) => work({ $queryRaw: async () => [], submissionRequest: { findUnique: async ({ where }: any) => records.get(where.id), create: async ({ data }: any) => records.set(data.id, data) } }) } };
  const app = await load(`export * from './apps/web/src/lib/student-mutation-receipt';`, {
    './db': `export const db = fixture.db;`,
    './super-user-v1/actor': `export class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }`,
  }, fixture);
  let writes = 0;
  const work = async () => ({ id: ++writes });
  assert.equal((await app.studentMutationReceipt('a', 'review', 'key', { answer: 1 }, work)).id, 1);
  assert.equal((await app.studentMutationReceipt('a', 'review', 'key', { answer: 1 }, work)).id, 1);
  await assert.rejects(app.studentMutationReceipt('a', 'review', 'key', { answer: 2 }, work), /different work/);
  assert.equal((await app.studentMutationReceipt('b', 'review', 'key', { answer: 1 }, work)).id, 2);
  assert.equal(writes, 2);
});

test('notification routes accept only known student destinations in the current institute', () => {
  assert.equal(studentNotificationRoute('/ics/courses/course/classwork/forms/form', 'ics'), '/student/assessment?courseId=course&formId=form');
  assert.equal(studentNotificationRoute('/ics/knowledge-exchange/post/question', 'ics'), '/student/knowledge-exchange?postId=question');
  assert.equal(studentNotificationRoute('/ics/courses/course/labs/lab', 'ics'), '/student/practical-labs?courseId=course&assignmentId=lab');
  for (const link of ['https://evil.invalid/ics', '/ibe/courses/course', '/ics/admin', '/ics/courses/../admin', '/ics/courses/%2e%2e/admin', '//evil.invalid']) assert.equal(studentNotificationRoute(link, 'ics'), null);
  assert.equal(restoreStudentReturn('/student/assessment?courseId=course&formId=form'), '/student/assessment?courseId=course&formId=form');
  assert.equal(restoreStudentReturn('https://evil.invalid/student/dashboard'), null);
  assert.equal(restoreStudentReturn('/student/../../teacher/dashboard'), null);
});

test('CodeLab buffers restore per student and problem rather than leaking across problems', async () => {
  const files = new Map();
  const window = { __LMS_NATIVE_OWNER__: 'ics:a' };
  const store = await load(`export * from './apps/web/src/features/interactive-activities/codelab/stores/codelab-store';`, { zustand: zustandMock }, {}, {
    window, localStorage: { getItem: (key: string) => files.get(key) ?? null, setItem: (key: string, value: string) => files.set(key, value) },
  });
  store.useCodeLabStore.getState().initialize('python', null, [], 'problem-a');
  store.useCodeLabStore.getState().updateCode('private solution A');
  store.useCodeLabStore.getState().initialize('python', null, [], 'problem-b');
  assert.notEqual(store.useCodeLabStore.getState().codeByLanguage.python, 'private solution A');
  store.useCodeLabStore.getState().initialize('python', null, [], 'problem-a');
  assert.equal(store.useCodeLabStore.getState().codeByLanguage.python, 'private solution A');
  window.__LMS_NATIVE_OWNER__ = 'ics:b';
  store.useCodeLabStore.getState().initialize('python', null, [], 'problem-a');
  assert.notEqual(store.useCodeLabStore.getState().codeByLanguage.python, 'private solution A');
});

test('offline review retries keep their operation key and never replay under another student', async () => {
  const keys: string[] = [], applied = new Set();
  const fixture = { files: new Map(), capabilities: 1, fail: true, api: { flashcards: {
    recordProgress: async (_id: string, _rating: string, key: string) => { keys.push(key); applied.add(key); if (fixture.fail) throw new Error('Lost acknowledgement'); },
    completeSession: async () => ({ expEarned: 0 }),
  } } };
  const app = await load(`export * from './apps/mobile/src/lib/flashcard-queue'; export * from './apps/mobile/src/lib/student-scope';`, {
    'expo-file-system/legacy': fileMock, 'react-native': `export const Platform = { OS: 'android' };`,
    '../stores/auth-store': `export const useAuthStore = { getState: () => ({ isSessionVerified: true, mobileCapabilities: { studentReceipts: fixture.capabilities }, api: fixture.api }) };`,
  }, fixture);
  app.setStudentScope('ics:a');
  await app.queueCardReview('card', 'knew_it');
  fixture.capabilities = 0;
  await assert.rejects(app.syncCardQueue(), /Update the web backend/); assert.equal(keys.length, 0);
  fixture.capabilities = 1;
  await assert.rejects(app.syncCardQueue(), /Lost acknowledgement/);
  app.setStudentScope('ics:b');
  await app.syncCardQueue(); assert.equal(keys.length, 1);
  app.setStudentScope('ics:a'); fixture.fail = false;
  await app.syncCardQueue();
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]); assert.equal(applied.size, 1);
  await app.queueCardCompletion({ deckId: 'deck', cardsReviewed: 2, durationSeconds: 10, idempotencyKey: 'completion-one' });
  await app.queueCardCompletion({ deckId: 'deck', cardsReviewed: 2, durationSeconds: 10, idempotencyKey: 'completion-two' });
  const completions: string[] = [];
  fixture.api.flashcards.completeSession = async (_deck?: string, completion?: any) => {
    completions.push(completion.idempotencyKey); app.setStudentScope('ics:b'); return { expEarned: 0 };
  };
  await assert.rejects(app.syncCardQueue(), /Sign-in changed/);
  assert.deepEqual(completions, ['completion-one']);
  await app.syncCardQueue(); assert.equal(completions.length, 1);
  app.setStudentScope('ics:a');
  fixture.api.flashcards.completeSession = async (_deck?: string, completion?: any) => { completions.push(completion.idempotencyKey); return { expEarned: 0 }; };
  await app.syncCardQueue();
  assert.deepEqual(completions, ['completion-one', 'completion-one', 'completion-two']);
});

test('a delayed file picker or draft save cannot upload the previous student file under the next account', async () => {
  const fixture = { copies: 0, uploads: 0, alerts: [] as string[], pick: null as any };
  const app = await load(`export * from './apps/mobile/src/hooks/useAssignmentUploads'; export * from './apps/mobile/src/lib/student-scope';`, {
    react: `export const useRef = value => ({ current: value }); export const useState = value => [value, () => {}]; export const useEffect = () => {};`,
    'react-native': `export const Alert = { alert: (_title, message) => fixture.alerts.push(message) };`,
    'expo-file-system/legacy': `export const documentDirectory = 'device/'; export const makeDirectoryAsync = async () => {}; export const copyAsync = async () => { fixture.copies++; };`,
    'expo-document-picker': `export const getDocumentAsync = () => fixture.pick;`,
    'expo-image-picker': `export const launchImageLibraryAsync = () => fixture.pick;`,
    '../lib/student-drafts': `export const newOperationKey = () => 'fixture-operation';`,
    '../lib/student-upload': `export const uploadStudentFile = async () => { fixture.uploads++; return { url: '/api/assets/file', fileName: 'work.pdf' }; };`,
  }, fixture);
  app.setStudentScope('ics:a');
  let resolvePick: (value: unknown) => void = () => {};
  fixture.pick = new Promise(resolve => { resolvePick = resolve; });
  const hook = app.useAssignmentUploads(async () => true);
  const pending = hook.pickDocument();
  app.setStudentScope('ics:b');
  resolvePick({ canceled: false, assets: [{ uri: 'picker/work.pdf', name: 'work.pdf' }] });
  await pending;
  assert.equal(fixture.copies, 0); assert.equal(fixture.uploads, 0);
  app.setStudentScope('ics:a');
  fixture.pick = Promise.resolve({ canceled: false, assets: [{ uri: 'picker/work.pdf', name: 'work.pdf' }] });
  const staged = app.useAssignmentUploads(async () => { app.setStudentScope('ics:b'); return true; });
  await staged.pickDocument();
  assert.equal(fixture.copies, 1); assert.equal(fixture.uploads, 0);
});

test('unified Inbox counts the whole inbox and scopes community updates to the authenticated student', async () => {
  const fixture = { session: { user: userA } as any, where: null as any };
  const when = new Date('2026-10-28T00:00:00Z');
  const notice = { id: 'general', type: 'GRADE', title: 'Feedback', message: 'Synthetic', link: '/ics/grades', isRead: false, createdAt: when };
  const route = await load(`export * from './apps/web/src/app/api/notifications/route';`, {
    '@/lib/super-user-v1/legacy-entry-guard': `export const denyLegacyApi = async () => null;`,
    '@/lib/auth-session': `export const getSession = async () => fixture.session;`,
    '@/lib/api-auth': `export const getSessionFromRequest = async () => fixture.session;`,
    '@/lib/db': `export const db = { notification: { findMany: async () => fixture.notices, count: async () => 80 }, kxNotification: { findMany: async () => fixture.community, count: async () => 7, updateMany: async input => { fixture.where = input.where; return { count: 1 }; } } };`,
  }, Object.assign(fixture, { notices: [notice], community: [{ ...notice, id: 'reply', type: 'ANSWER' }] }));
  const response = await route.GET(new Request('https://fixture.invalid/api/notifications?includeCommunity=1'));
  const body = await response.json(); assert.equal(body.unreadCount, 87); assert.ok(body.notifications.some((row: any) => row.id === 'kx:reply'));
  await route.PATCH(new Request('https://fixture.invalid/api/notifications?includeCommunity=1', { method: 'PATCH', body: JSON.stringify({ id: 'kx:reply' }) }));
  assert.equal(fixture.where.id, 'reply'); assert.equal(fixture.where.userId, userA.id);
  fixture.session = null;
  assert.equal((await route.GET(new Request('https://fixture.invalid/api/notifications'))).status, 401);
});

test('monitoring removes student content from errors and disables replay', async () => {
  const fixture = { config: null as any };
  const monitor = await load(`export * from './apps/mobile/src/lib/sentry';`, {
    '@sentry/react-native': `export const reactNavigationIntegration = () => ({}); export const init = config => { fixture.config = config; };`,
    expo: `export const isRunningInExpoGo = () => true;`,
  }, fixture, { process: { env: {} }, __DEV__: false });
  const event = monitor.sanitizeMonitoringEvent({ user: { email: 'private' }, request: { data: 'answer' }, extra: { grade: 99 }, breadcrumbs: [{ message: 'code' }], message: 'private body', exception: { values: [{ value: 'student answer', stacktrace: { frames: [{ filename: 'app.js', lineno: 4 }] } }] } });
  for (const key of ['user', 'request', 'extra', 'breadcrumbs', 'message']) assert.equal(event[key], undefined);
  assert.equal(event.exception.values[0].value, 'Mobile application error');
  assert.equal(event.exception.values[0].stacktrace.frames[0].lineno, 4);
  assert.equal(fixture.config.replaysSessionSampleRate, 0); assert.equal(fixture.config.replaysOnErrorSampleRate, 0);
  assert.equal(fixture.config.enabled, false);
});

test('native uploads expose progress, cancel cleanly and reject a previous account response', async () => {
  const fixture = { xhr: null as any, expired: false };
  class UploadRequest {
    upload: { onprogress?: (event: any) => void } = {};
    onload?: () => void; onabort?: () => void;
    status = 200; responseText = JSON.stringify({ url: '/api/assets/fixture-file', fileName: 'work.pdf' });
    headers: Record<string, string> = {};
    open() {} setRequestHeader(name: string, value: string) { this.headers[name] = value; }
    send() { fixture.xhr = this; } abort() { this.onabort?.(); }
  }
  const app = await load(`export * from './apps/mobile/src/lib/student-upload'; export * from './apps/mobile/src/lib/student-scope';`, {
    './constants': `export const API_BASE_URL = 'https://fixture.invalid';`,
    '../stores/auth-store': `export const useAuthStore = { getState: () => ({ token: 'fixture-token', isSessionVerified: true, expireSession() { fixture.expired = true; } }) };`,
  }, fixture, { XMLHttpRequest: UploadRequest });
  app.setStudentScope('ics:a');
  const progress: number[] = [];
  const first = app.uploadStudentFile('file:///work.pdf', 'work.pdf', 'application/pdf', new AbortController().signal, (value: number) => progress.push(value));
  fixture.xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
  fixture.xhr.onload();
  assert.equal((await first).fileName, 'work.pdf'); assert.deepEqual(progress, [50]);
  assert.equal(fixture.xhr.headers.Authorization, 'Bearer fixture-token');
  const controller = new AbortController();
  const cancelled = app.uploadStudentFile('file:///work.pdf', 'work.pdf', 'application/pdf', controller.signal, () => {});
  controller.abort(); await assert.rejects(cancelled, /paused/);
  const old = app.uploadStudentFile('file:///work.pdf', 'work.pdf', 'application/pdf', new AbortController().signal, () => {});
  app.setStudentScope('ics:b'); fixture.xhr.onload();
  await assert.rejects(old, /Sign-in changed/);
});

test('attachment replacement is explicit and validates ownership before replacing the student submission links', async () => {
  const events: string[] = [];
  const fixture = { events, returned: false };
  const app = await load(`export * from './apps/web/src/lib/academic-records';`, {
    '@/lib/labs/readiness': `export const academicProvenance = async () => ({});`,
    '@/lib/academic-task': `export const assertOrdinaryClasswork = async () => {}; export const markAcademicWorkStarted = async () => {};`,
    './course-access': `export const requireCourseAccess = async () => {};`,
    './super-user-v1/capabilities': `export const canonicalRole = value => value;`,
    './super-user-v1/actor': `export class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }`,
    './private-upload': `export const requireOwnedUpload = async () => { fixture.events.push('authorize'); };`,
    './gamification/grant-exp': `export const grantExp = async () => ({});`,
    './gamification/badge-checker': `export const awardBadgeIfEarned = async () => {};`,
    '@/lib/db': `const tx = { $queryRaw: async () => [], syllabusItem: { findFirst: async () => ({ id: 'work', type: 'ASSIGNMENT', form: null }) }, studentSubmission: { findUnique: async () => ({ id: 'submission-a', grade: null, isReturned: fixture.returned }), upsert: async () => ({ id: 'submission-a' }), findUniqueOrThrow: async () => ({ id: 'submission-a', status: 'DRAFT', attachments: [] }) }, submissionAttachment: { deleteMany: async ({ where }) => { fixture.events.push('replace:' + where.submissionId); }, findFirst: async () => null, create: async () => { fixture.events.push('attach'); } } }; export const db = { $transaction: async work => work(tx) };`,
  }, fixture);
  const input = { syllabusItemId: 'work', status: 'DRAFT', attachments: [{ url: '/api/assets/owned-file', type: 'FILE' }] };
  await app.saveSubmission({ id: 'student-a', role: 'STUDENT', instituteId: 'ics' }, 'course', input);
  assert.deepEqual(events, ['authorize', 'attach']);
  events.length = 0;
  await app.saveSubmission({ id: 'student-a', role: 'STUDENT', instituteId: 'ics' }, 'course', { ...input, replaceAttachments: true });
  assert.deepEqual(events, ['authorize', 'replace:submission-a', 'attach']);
  fixture.returned = true; events.length = 0;
  await assert.rejects(app.saveSubmission({ id: 'student-a', role: 'STUDENT', instituteId: 'ics' }, 'course', { ...input, replaceAttachments: true }), /graded or returned/);
  assert.deepEqual(events, []);
});
