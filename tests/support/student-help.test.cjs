const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('../web-quality/compile.cjs');

test('ICS help matches role-specific guides and sends providers only the authenticated role’s context', async (t) => {
  const student = { user: { id: 'test-student', role: 'STUDENT', institute: { code: 'ics' } } };
  const state = { session: student, db: { $queryRaw: async () => [{ count: 1 }], $executeRaw: async () => 0 } };
  const { POST, findIcsHelpGuides } = await compile(`
    export { POST } from './apps/web/src/app/api/help/ask/route';
    export { findIcsHelpGuides } from './apps/web/src/lib/ics-help-guides';
  `, state);
  const keys = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_GEMINI_BASE_URL', 'GROQ_BASE_URL'];
  const original = keys.map((key) => process.env[key]);
  t.after(() => keys.forEach((key, i) => {
    if (original[i] === undefined) delete process.env[key];
    else process.env[key] = original[i];
  }));
  keys.forEach((key) => delete process.env[key]);

  const question = 'I turned in my assignment but can’t see my feedback.';
  const ask = (value = question, headers) => POST(new Request('https://lms.test/api/help/ask', {
    method: 'POST', body: JSON.stringify({ question: value }), headers,
  }));

  assert.equal((await ask(question, { origin: 'https://elsewhere.test' })).status, 403);
  state.session = null;
  assert.equal((await ask()).status, 401);
  state.session = { user: { ...student.user, institute: { code: 'ibe' } } };
  assert.equal((await ask()).status, 403);
  state.session = { user: { ...student.user, role: 'ADMIN' } };
  assert.equal((await ask()).status, 403);
  state.session = student;
  assert.equal((await ask('  ')).status, 400);
  assert.equal((await ask('x'.repeat(601))).status, 400);
  assert.equal((await ask('x'.repeat(9000))).status, 413);
  assert.deepEqual(await (await ask()).json(), { answer: null, available: false });
  assert.ok(findIcsHelpGuides(question).some((guide) => guide.href === '/ics/grades'));
  assert.deepEqual(findIcsHelpGuides('how to submit an attendance').map(({ title }) => title), ['Mark your attendance']);
  assert.equal(findIcsHelpGuides('The attendance QR expired, what now?')[0]?.title, 'Fix a missed or incorrect attendance mark');
  assert.equal(findIcsHelpGuides('I uploaded the wrong file for my assignment')[0]?.title, 'Replace work you already turned in');
  assert.equal(findIcsHelpGuides('How can I retake my quiz?')[0]?.title, 'Take an online quiz or assessment');
  assert.deepEqual(findIcsHelpGuides('Where do I renew my passport?'), []);
  for (const [role, query, title] of [
    ['STUDENT', 'How do I submit an attendance request?', 'Fix a missed or incorrect attendance mark'],
    ['STUDENT', 'How do I submit a GitHub repository?', 'Submit a GitHub repository for an assignment'],
    ['STUDENT', 'Can I make a circuit?', 'Learn electronics in Ohmward'],
    ['STUDENT', 'Where are my mobile notes?', 'Open saved notes, tasks, and flashcards on mobile'],
    ['INSTRUCTOR', 'How do I upload course materials?', 'Upload and organize course materials'],
    ['INSTRUCTOR', 'How do I start attendance?', 'Start and monitor an attendance session'],
    ['INSTRUCTOR', 'How do I return feedback?', 'Review submissions and return feedback'],
    ['INSTRUCTOR', 'How do I configure gradebook weights?', 'Record scores and check grade weights'],
    ['INSTRUCTOR', 'Where do I preview Ohmward?', 'Preview Ohmward and check class progress'],
    ['ADMIN', 'How do I change role?', 'Assign a role and check your permissions'],
    ['ADMIN', 'How can I see audit logs?', 'Read activity and audit records'],
    ['ADMIN', 'How can I generate a report and export CSV?', 'Export an available report'],
    ['ADMIN', 'How do I check backup status?', 'Create a snapshot and check its status'],
    ['ADMIN', 'Can I restore from backup?', 'Restore supported fields on existing records'],
  ]) {
    assert.equal(findIcsHelpGuides(query, role)[0]?.title, title, `${role}: ${query}`);
  }
  assert.deepEqual(findIcsHelpGuides('How do I restore from backup?', 'STUDENT'), []);
  assert.deepEqual(findIcsHelpGuides('How do I take an online quiz?', 'ADMIN'), []);

  let reply = 'Open the submitted assignment in Classwork to check for feedback.';
  let failGemini = false;
  let failGroq = false;
  const providers = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const host = new URL(String(input instanceof Request ? input.url : input)).hostname;
    providers.push(host);
    const requestBody = JSON.stringify(init?.body ? JSON.parse(init.body) : await input.json());
    assert.ok(requestBody.includes(question));
    assert.ok(requestBody.includes('only source for LMS steps'));
    const isProfessor = state.session.user.role === 'PROFESSOR';
    assert.equal(requestBody.includes('Scan QR code'), !isProfessor);
    assert.equal(requestBody.includes('Start and monitor an attendance session'), isProfessor);
    assert.ok(!requestBody.includes('Create Snapshot Now'));
    assert.ok(!requestBody.includes(student.user.id));
    if (host === 'gemini.test') {
      if (failGemini) return Response.json({ error: { message: 'Unavailable' } }, { status: 400 });
      return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: reply }] } }] });
    }
    assert.equal(host, 'groq.test');
    if (failGroq) return Response.json({ error: { message: 'Unavailable' } }, { status: 503 });
    return Response.json({ choices: [{ message: { content: reply } }] });
  });
  process.env.GEMINI_API_KEY = 'fake-gemini-key-for-test';
  process.env.GROQ_API_KEY = 'fake-groq-key-for-test';
  process.env.GOOGLE_GEMINI_BASE_URL = 'https://gemini.test';
  process.env.GROQ_BASE_URL = 'https://groq.test';

  const answer = await ask();
  assert.equal(answer.status, 200);
  assert.equal(answer.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await answer.json(), { answer: reply, available: true });
  assert.deepEqual(providers, ['gemini.test']);
  reply = 'NO_ANSWER';
  assert.deepEqual(await (await ask()).json(), { answer: null, available: true });
  failGemini = true;
  reply = 'Check Grades or open your assignment to see feedback.';
  assert.deepEqual(await (await ask()).json(), { answer: reply, available: true });
  assert.deepEqual(providers.slice(-2), ['gemini.test', 'groq.test']);

  failGroq = true;
  assert.deepEqual(await (await ask()).json(), { answer: null, available: false });

  state.session = { user: { ...student.user, role: 'PROFESSOR' } };
  failGemini = false;
  reply = 'Open Student Submissions in Classwork to review the status.';
  assert.deepEqual(await (await ask()).json(), { answer: reply, available: true });

  state.db.$queryRaw = async () => [{ count: 11 }];
  assert.equal((await ask()).status, 429);
  assert.equal(providers.length, 7);
});
