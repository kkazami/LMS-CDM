const { test } = require('node:test');
const assert = require('node:assert/strict');
const { googleCallbackTicket } = require('../../apps/mobile/src/lib/google-login-validation.ts');
const { studentReturnRoute, studentNotificationRoute } = require('../../apps/mobile/src/lib/student-navigation.ts');
const { resolveApiUrl } = require('../../apps/mobile/src/lib/api-url.ts');

test('mobile Google sign-in callback accepts its ordinary bound ticket response', () => {
  assert.equal(googleCallbackTicket('cdmlms://auth/google?state=dummy-state&ticket=dummy-ticket',
    'cdmlms://auth/google', 'dummy-state'), 'dummy-ticket');
});
test('supported course and CodeLab navigation remains stable', () => {
  assert.equal(studentReturnRoute('/student/courses/dummy-course', { tab: 'CLASSWORK' }), '/student/courses/dummy-course?tab=CLASSWORK');
  assert.equal(studentNotificationRoute('/ics/activities/codelab', 'ics'), '/student/codelab');
  assert.equal(studentReturnRoute('/student/grades'), '/student/grades');
});
test('API URL configuration retains synthetic staging and Android local development', () => {
  assert.equal(resolveApiUrl({ override: 'https://staging.example.invalid/api', development: false, platform: 'android' }), 'https://staging.example.invalid');
  assert.equal(resolveApiUrl({ override: 'auto', development: true, platform: 'android', scriptUrl: 'http://localhost:8081/index.bundle' }), 'http://10.0.2.2:3000');
});

test('ordinary authenticated course reads and Google ticket exchange retain API contracts', async t => {
  const { createApiClient } = require('../../packages/api-client/src/index.ts');
  const previous = globalThis.fetch, calls = [];
  t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/exchange') ? { token: 'dummy-issued-token' } : { courses: [{ id: 'dummy-course', title: 'Dummy course' }] });
  };
  const client = createApiClient({ baseUrl: 'https://staging.example.invalid', getToken: async () => 'dummy-token' });
  assert.equal((await client.courses.list('ics')).courses[0].id, 'dummy-course');
  assert.equal((await client.auth.exchangeGoogle('dummy-ticket', 'dummy-verifier')).token, 'dummy-issued-token');
  assert.equal(calls[0].url, 'https://staging.example.invalid/api/courses?institute=ics');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer dummy-token');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.deepEqual(JSON.parse(calls[1].options.body), { ticket: 'dummy-ticket', verifier: 'dummy-verifier' });
});
