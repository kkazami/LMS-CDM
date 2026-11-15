const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const fs = require('node:fs');
const ts = require('typescript');

async function load(db, session, hooks = {}) {
  globalThis.__codeLabTest = { db, session, eligible: true, hooks };
  const root = path.resolve('apps/web/src');
  // Each fixture gets fresh route/service modules, while hooks are restored after loading.
  for (const key of Object.keys(require.cache)) if (key.startsWith(root + path.sep)) delete require.cache[key];
  const originalLoad = Module._load, originalResolve = Module._resolveFilename;
  const originalTs = Module._extensions['.ts'], originalTsx = Module._extensions['.tsx'];
  class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  class CodeRunnerUnavailableError extends Error { constructor() { super('Code runner temporarily unavailable'); } }
  const mock = name => {
    if (name.endsWith('labs/readiness')) return { async academicProvenance() { return {}; } };
    if (name.endsWith('academic-task')) return { async assertOrdinaryClasswork() {}, async markAcademicWorkStarted() {} };
    if (name.endsWith('academic-records')) return { async lockAcademicRecord() {} };
    if (name.endsWith('super-user-v1/actor')) return { AccessError, accountErrorResponse: error => Response.json({ error: error.message }, { status: error.status }) };
    if (name.endsWith('codelab-rate-limit')) return { async limitCodeLabRuns() { return globalThis.__codeLabTest.hooks.limited ? Response.json({ error: 'limit' }, { status: 429 }) : null; } };
    if (name === 'next/server') return { NextResponse: Response };
    if (name === '@/lib/db') return { db: globalThis.__codeLabTest.db };
    if (name.endsWith('auth-session')) return { async getSession() { return globalThis.__codeLabTest.session; } };
    if (name.endsWith('activity-eligibility')) return { async checkActivityEligibility() { const t = globalThis.__codeLabTest; return t.session ? { eligible: t.eligible, session: t.session } : null; } };
    if (name.endsWith('legacy-entry-guard')) return { async denyLegacyApi() { return null; } };
    if (name.endsWith('badge-checker')) return { async awardBadgeIfEarned() {} };
    if (name.endsWith('judge0-config')) return { CodeRunnerUnavailableError, async executeJudge0Submission(code, lang, input, deadline) {
      const h = globalThis.__codeLabTest.hooks; h.judgeCalls = (h.judgeCalls || 0) + 1; (h.deadlines ||= []).push(deadline);
      if (h.unavailable || h.unavailableAfter && h.judgeCalls > h.unavailableAfter) throw new CodeRunnerUnavailableError();
      return { stdout: h.stdout || '0', status: { id: 3 }, time: '0' };
    } };
    return { async processGamificationEvent() { const h = globalThis.__codeLabTest.hooks; h.events = (h.events || 0) + 1; } };
  };
  const boundary = /^next\/server$|^@\/lib\/(db|auth-session|activity-eligibility|codelab-rate-limit|labs\/readiness|academic-task|academic-records|super-user-v1\/actor|gamification\/badge-checker|super-user-v1\/legacy-entry-guard)$|gamification\/engine$|judge0-config$/;
  const mocks = new Map();
  Module._load = function (name, parent, isMain) {
    if (boundary.test(name)) { if (!mocks.has(name)) mocks.set(name, mock(name)); return mocks.get(name); }
    return originalLoad.call(this, name, parent, isMain);
  };
  Module._resolveFilename = function (name, parent, ...args) {
    if (name.startsWith('@/')) name = path.join(root, name.slice(2));
    if (name === '@lms/types') name = path.resolve('packages/types/src/index.ts');
    return originalResolve.call(this, name, parent, ...args);
  };
  for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, file);
  try {
    const route = name => require(path.join(root, 'app/api', name, 'route.ts'));
    return {
      ...require(path.join(root, 'lib/codelab-completion.ts')),
      evaluate: route('codelab/evaluate').POST, submit: route('activities/submit').POST,
      progress: route('codelab/progress').GET, runTests: route('codelab/run-tests').POST,
      freeRun: route('codelab/run').POST, legacyRun: route('judge0/submit').POST,
      getProblemById: require(path.join(root, 'features/interactive-activities/codelab/problems')).getProblemById,
      evaluateVariables: require(path.join(root, 'features/interactive-activities/codelab/utils/problem-engine.ts')).evaluateVariables,
    };
  } finally {
    Module._load = originalLoad; Module._resolveFilename = originalResolve;
    if (originalTs) Module._extensions['.ts'] = originalTs; else delete Module._extensions['.ts'];
    if (originalTsx) Module._extensions['.tsx'] = originalTsx; else delete Module._extensions['.tsx'];
  }
}

function fixture() {
  const course = { id: 'course', instituteId: 'ics', isArchived: false, instructorId: 'teacher', institute: { code: 'ics' } };
  let state = { submissions: [], rewards: [], templates: [], courses: [course], profile: { id: "profile", exp: 0, level: 1, totalPoints: 0 } };
  let tail = Promise.resolve();
  const db = {
    activitySubmission: { findFirst: async ({ where }) => state.submissions.find(s => s.studentId === where.studentId && (where.OR || [where]).some(condition => typeof condition.templateId === 'string' ? s.templateId === condition.templateId : s.templateId.startsWith(condition.templateId.startsWith)) && s.score >= 60) ?? null,
      create: async ({ data }) => { const row = { ...data, id: `submission-${state.submissions.length}`, submittedAt: new Date() }; state.submissions.push(row); return row; } },
    activityTemplate: {
      findUnique: async ({ where }) => state.templates.find(template => template.id === where.id) ?? (where.id === 'python-level-1' ? { id: 'python-level-1', title: 'First level', activityType: 'codelab', courseId: 'course', syllabusItemId: null, course } : null),
      upsert: async ({ where, create }) => {
        let template = state.templates.find(row => row.id === where.id);
        if (!template) { template = { ...create, syllabusItemId: null, course: state.courses.find(row => row.id === create.courseId) }; state.templates.push(template); }
        return template;
      },
    },
    course: { findFirst: async () => state.courses.find(row => row.id === 'course') ?? null, findUnique: async ({ where }) => state.courses.find(row => row.id === where.id) ?? null },
    activitySession: { updateMany: async () => ({ count: 1 }) },
    enrollment: { findFirst: async () => ({ courseId: "course" }), findUnique: async ({ where }) => where.courseId_studentId.courseId === 'course' && where.courseId_studentId.studentId === 'student' ? { courseId: 'course', studentId: 'student', status: 'APPROVED' } : null },
    expTransaction: { findFirst: async ({ where }) => state.rewards.find(r => r.userId === where.userId && (where.OR || [where]).some(condition => condition.idempotencyKey ? r.idempotencyKey === condition.idempotencyKey : condition.reason?.startsWith ? r.reason.startsWith(condition.reason.startsWith) : r.reason.includes(condition.reason.contains))) ?? null,
      create: async ({ data }) => { if (db.failReward) throw Error("Synthetic reward failure"); const row = { ...data, id: `reward-${state.rewards.length}` }; state.rewards.push(row); return row; } },
    gamificationProfile: { findUnique: async () => state.profile, upsert: async () => state.profile,
      update: async ({ data }) => { state.profile = { ...state.profile, ...data, totalPoints: state.profile.totalPoints + data.totalPoints.increment }; return state.profile; } },
    $queryRaw: async (strings) => { assert.match(strings.join("?"), /pg_advisory_xact_lock|SELECT id FROM "ActivityTemplate"/); return [{ value: 1 }]; },
    $transaction: async callback => {
      let release; const previous = tail; tail = new Promise(resolve => { release = resolve; }); await previous;
      const before = structuredClone(state);
      try { return await callback(db); } catch (e) { state = before; throw e; } finally { release(); }
    },
  };
  return { db, state: () => state, session: { user: { id: "student", role: 'STUDENT', instituteId: "ics" } } };
}
const payload = { studentId: "student", assignmentId: "python-level-1", activityType: "codelab", variantSeed: "seed", startedAt: "2026-10-19T00:00:00.000Z", completionTimeSeconds: 15, attempts: 1, stateCheck: { sourceCode: "print('saved')" }, score: 60, maxScore: 100, passed: true };
const request = body => new Request("http://localhost/api/codelab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("concurrent passes and perfect retries preserve the first solution and award EXP only once", async () => {
  const f = fixture(), hooks = {}, api = await load(f.db, f.session, hooks);
  const results = await Promise.all([api.saveCodeLabCompletion(payload, "ics"), api.saveCodeLabCompletion({ ...payload, score: 100, variantSeed: "changed", stateCheck: { sourceCode: "replacement" } }, "ics")]);
  assert.deepEqual(results.map(r => r.alreadyCompleted), [false, true]);
  assert.equal(results[1].grantedExp, 0);
  assert.equal(f.state().submissions.length, 1);
  assert.equal(f.state().rewards.length, 1);
  assert.equal(f.state().submissions[0].templateId, 'static:python-level-1:course');
  assert.equal(f.state().templates[0].courseId, 'course');
  assert.equal(JSON.parse(f.state().submissions[0].stateCheck).sourceCode, "print('saved')");
  assert.equal(hooks.events, 1);
  const reloaded = await load(f.db, f.session);
  const progress = await reloaded.progress(new Request("http://localhost/api/codelab/progress?templateId=python-level-1"));
  assert.equal(progress.headers.get("cache-control"), "private, no-store");
  const saved = await progress.json();
  assert.equal(saved.completed, true); assert.equal(saved.submission.stateCheck.sourceCode, "print('saved')");
  assert.equal((await reloaded.evaluate(request({ templateId: payload.assignmentId, seed: "new-seed", sourceCode: "replacement", languageId: 71 }))).status, 409);
  assert.equal((await reloaded.submit(request(payload))).status, 409);
});

test("a failed EXP write rolls back the saved completion and permits a clean retry", async () => {
  const f = fixture(), api = await load(f.db, f.session);
  f.db.failReward = true;
  await assert.rejects(api.saveCodeLabCompletion(payload, "ics"), /Synthetic reward failure/);
  assert.equal(f.state().submissions.length, 0); assert.equal(f.state().rewards.length, 0); assert.equal(f.state().profile.exp, 0);
  f.db.failReward = false;
  assert.ok((await api.saveCodeLabCompletion(payload, "ics")).grantedExp > 0);
});

test("historical rewards still lock a level when its old background submission was lost", async () => {
  const f = fixture(); f.state().rewards.push({ userId: "student", reason: "[KEY:codelab_pass_python-level-1] Old reward" });
  const api = await load(f.db, f.session);
  await assert.rejects(api.saveCodeLabCompletion({ ...payload, score: 100 }, "ics"), error => error.status === 409);
  assert.equal(f.state().rewards.length, 1); assert.equal(f.state().submissions.length, 0);
  const progress = await api.progress(new Request("http://localhost/api/codelab/progress?templateId=python-level-1"));
  const result = await progress.json(); assert.equal(result.completed, true); assert.equal(result.submission, null);
});

test("evaluation saves source and rewards before returning success; a failed attempt remains retryable", async () => {
  const f = fixture(), hooks = {}, api = await load(f.db, f.session, hooks);
  const body = { templateId: payload.assignmentId, seed: "seed", sourceCode: "print('solution')", languageId: 71 };
  const failed = await api.evaluate(request(body));
  assert.equal((await failed.json()).score, 0); assert.equal(f.state().submissions.length, 0);
  const problem = api.getProblemById(payload.assignmentId);
  hooks.stdout = problem.computeExpectedOutput(api.evaluateVariables("seed", problem.variables), problem.testCases[0]);
  const responses = await Promise.all([api.evaluate(request(body)), api.evaluate(request(body))]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const result = await responses.find(response => response.status === 200).json();
  assert.equal(result.score, 100); assert.ok(result.grantedExp > 0);
  assert.equal(f.state().submissions.length, 1); assert.equal(f.state().rewards.length, 1);
  assert.equal(JSON.parse(f.state().submissions[0].stateCheck).sourceCode, body.sourceCode);
  const calls = hooks.judgeCalls;
  assert.equal((await api.evaluate(request({ ...body, seed: "different" }))).status, 409);
  assert.equal(hooks.judgeCalls, calls);
});

test("submission endpoints retain authentication, eligibility and student ownership checks", async () => {
  const f = fixture(), api = await load(f.db, null);
  assert.equal((await api.evaluate(request({}))).status, 401);
  for (const run of [api.freeRun, api.legacyRun, api.runTests]) assert.equal((await run(request({}))).status, 401);
  assert.equal((await api.submit(request(payload))).status, 401);
  globalThis.__codeLabTest.session = f.session; globalThis.__codeLabTest.eligible = false;
  assert.equal((await api.evaluate(request({}))).status, 403);
  for (const run of [api.freeRun, api.legacyRun, api.runTests]) assert.equal((await run(request({}))).status, 403);
  globalThis.__codeLabTest.eligible = true;
  assert.equal((await api.submit(request({ ...payload, studentId: "someone-else" }))).status, 403);
  assert.equal((await api.submit(request(payload))).status, 400); // Cannot forge a Judge0 score.
  assert.equal(f.state().submissions.length, 0);
});

test("runner outages never save a failed attempt or issue rewards", async () => {
  const f = fixture(), api = await load(f.db, f.session, { unavailable: true });
  const response = await api.evaluate(request({ templateId: payload.assignmentId, seed: "seed", sourceCode: "print('Hello')", languageId: 71 }));
  assert.equal(response.status, 503); assert.equal((await response.json()).code, "RUNNER_UNAVAILABLE");
  assert.equal(f.state().submissions.length, 0); assert.equal(f.state().rewards.length, 0);
});

test('partial grading failure preserves progress and every test shares one request deadline', async () => {
  const f = fixture(), hooks = { unavailableAfter: 1 }, api = await load(f.db, f.session, hooks);
  f.db.activityTemplate.findUnique = async () => ({ courseId: 'course', activityType: 'codelab', variables: JSON.stringify({ publicTestCases: [{input:'1',expectedOutput:'1'},{input:'2',expectedOutput:'2'}] }), hiddenTestCases: '[]' });
  const response = await api.evaluate(request({ templateId: 'custom-multiple-tests', seed: 'seed', sourceCode: 'print(0)', languageId: 71 }));
  assert.equal(response.status, 503);
  assert.ok(hooks.judgeCalls > 1);
  assert.ok(hooks.deadlines.every(deadline => Number.isFinite(deadline) && deadline === hooks.deadlines[0]));
  assert.equal(f.state().submissions.length, 0); assert.equal(f.state().rewards.length, 0);
});

test('server request rate limits reject before any grading execution', async () => {
  const f = fixture(), hooks = { limited: true }, api = await load(f.db, f.session, hooks);
  const response = await api.evaluate(request({ templateId: payload.assignmentId, seed: 'seed', sourceCode: 'print(0)', languageId: 71 }));
  assert.equal(response.status, 429);
  for (const run of [api.freeRun, api.legacyRun, api.runTests]) assert.equal((await run(request({}))).status, 429);
  assert.equal(hooks.judgeCalls, undefined);
  assert.equal(f.state().submissions.length, 0); assert.equal(f.state().rewards.length, 0);
});

test("the legacy Run Tests endpoint is practice-only and cannot award completion EXP", async () => {
  const f = fixture(), api = await load(f.db, f.session, { stdout: "Hello" });
  f.db.activityTemplate.findUnique = async () => ({ courseId: 'course', activityType: "codelab", variables: JSON.stringify({ publicTestCases: [{ input: "", expectedOutput: "Hello" }] }), hiddenTestCases: "[]" });
  const response = await api.runTests(request({ templateId: "custom", variantSeed: "seed", sourceCode: "print('Hello')", languageId: 71 }));
  const result = await response.json();
  assert.equal(response.status, 200); assert.equal(result.score, 100); assert.equal(result.grantedExp, 0);
  assert.equal(f.state().submissions.length, 0); assert.equal(f.state().rewards.length, 0);
});

test('course-owned completion, evaluation and practice reject an unenrolled course before provider or writes', async () => {
  const f = fixture(), hooks = {}, api = await load(f.db, f.session, hooks);
  const course = { id: 'unapproved', instituteId: 'ics', isArchived: false, instructorId: 'other-teacher', institute: { code: 'ics' } };
  f.state().courses.push(course);
  f.state().templates.push({ id: 'private-assessment', title: 'Private assessment', activityType: 'codelab',
    courseId: course.id, course, syllabusItemId: null,
    variables: JSON.stringify({ publicTestCases: [{ input: 'private-fixture', expectedOutput: 'secret-answer' }] }), hiddenTestCases: '[]' });
  await assert.rejects(api.saveCodeLabCompletion({ ...payload, assignmentId: 'private-assessment' }, 'ics'), error => error.status === 403);
  const evaluated = await api.evaluate(request({ templateId: 'private-assessment', seed: 'seed', sourceCode: 'print(0)', languageId: 71 }));
  assert.equal(evaluated.status, 403);
  const practice = await api.runTests(request({ templateId: 'private-assessment', variantSeed: 'seed', sourceCode: 'print(0)', languageId: 71 }));
  assert.equal(practice.status, 403);
  assert.equal(hooks.judgeCalls, undefined);
  assert.equal(f.state().submissions.length, 0);
  assert.equal(f.state().rewards.length, 0);
});
