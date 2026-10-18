const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

async function load(db, session, hooks = {}) {
  globalThis.__codeLabTest = { db, session, eligible: true, hooks };
  const result = await build({
    stdin: { contents: `export * from './apps/web/src/lib/codelab-completion';
      export {POST as evaluate} from './apps/web/src/app/api/codelab/evaluate/route';
      export {POST as submit} from './apps/web/src/app/api/activities/submit/route';
      export {GET as progress} from './apps/web/src/app/api/codelab/progress/route';
      export {getProblemById} from './apps/web/src/features/interactive-activities/codelab/problems';
      export {evaluateVariables} from './apps/web/src/features/interactive-activities/codelab/utils/problem-engine';`, resolveDir: process.cwd() },
    bundle: true, write: false, platform: "node", format: "cjs", tsconfig: "apps/web/tsconfig.json",
    plugins: [{ name: "service-boundaries", setup(b) {
      b.onResolve({ filter: /^next\/server$|^@\/lib\/(db|auth-session|activity-eligibility|gamification\/badge-checker|super-user-v1\/legacy-entry-guard)$|gamification\/engine$|judge0-config$/ }, ({ path: name }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }) => ({ contents:
        name === "next/server" ? "export const NextResponse = Response;" :
        name === "@/lib/db" ? "export const db = globalThis.__codeLabTest.db;" :
        name.endsWith("auth-session") ? "export async function getSession(){return globalThis.__codeLabTest.session;}" :
        name.endsWith("activity-eligibility") ? "export async function checkActivityEligibility(){const t=globalThis.__codeLabTest;return t.session ? {eligible:t.eligible,session:t.session} : null;}" :
        name.endsWith("legacy-entry-guard") ? "export async function denyLegacyApi(){return null;}" :
        name.endsWith("badge-checker") ? "export async function awardBadgeIfEarned(){}" :
        name.endsWith("judge0-config") ? `export async function executeJudge0Submission(){const h=globalThis.__codeLabTest.hooks;h.judgeCalls=(h.judgeCalls||0)+1;return {stdout:h.stdout||'0',status:{id:3},time:'0'};}` :
        "export async function processGamificationEvent(){globalThis.__codeLabTest.hooks.events=(globalThis.__codeLabTest.hooks.events||0)+1;}" }));
    } }],
  });
  const compiled = new Module(path.resolve("tmp/codelab-completion-tests.cjs"), module);
  compiled.filename = path.resolve("tmp/codelab-completion-tests.cjs"); compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}

function fixture() {
  let state = { submissions: [], rewards: [], profile: { id: "profile", exp: 0, level: 1, totalPoints: 0 } };
  let tail = Promise.resolve();
  const db = {
    activitySubmission: { findFirst: async ({ where }) => state.submissions.find(s => s.studentId === where.studentId && s.templateId === where.templateId && s.score >= 60) ?? null,
      create: async ({ data }) => { const row = { ...data, id: `submission-${state.submissions.length}`, submittedAt: new Date() }; state.submissions.push(row); return row; } },
    activityTemplate: { findUnique: async () => ({ id: "python-level-1", title: "First level", activityType: "codelab", courseId: "course", syllabusItemId: null, course: { instituteId: "ics", isArchived: false, instructorId: "teacher" } }) },
    activitySession: { updateMany: async () => ({ count: 1 }) },
    enrollment: { findFirst: async () => ({ courseId: "course" }) },
    expTransaction: { findFirst: async ({ where }) => state.rewards.find(r => r.userId === where.userId && (where.OR || [where]).some(condition => r.reason.includes(condition.reason.contains))) ?? null,
      create: async ({ data }) => { if (db.failReward) throw Error("Synthetic reward failure"); const row = { ...data, id: `reward-${state.rewards.length}` }; state.rewards.push(row); return row; } },
    gamificationProfile: { findUnique: async () => state.profile, upsert: async () => state.profile,
      update: async ({ data }) => { state.profile = { ...state.profile, ...data, totalPoints: state.profile.totalPoints + data.totalPoints.increment }; return state.profile; } },
    $queryRaw: async (strings) => { assert.match(strings.join("?"), /pg_advisory_xact_lock/); return [{ value: 1 }]; },
    $transaction: async callback => {
      let release; const previous = tail; tail = new Promise(resolve => { release = resolve; }); await previous;
      const before = structuredClone(state);
      try { return await callback(db); } catch (e) { state = before; throw e; } finally { release(); }
    },
  };
  return { db, state: () => state, session: { user: { id: "student", instituteId: "ics" } } };
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
  assert.equal((await api.submit(request(payload))).status, 401);
  globalThis.__codeLabTest.session = f.session; globalThis.__codeLabTest.eligible = false;
  assert.equal((await api.evaluate(request({}))).status, 403);
  globalThis.__codeLabTest.eligible = true;
  assert.equal((await api.submit(request({ ...payload, studentId: "someone-else" }))).status, 403);
  assert.equal((await api.submit(request(payload))).status, 400); // Cannot forge a Judge0 score.
  assert.equal(f.state().submissions.length, 0);
});
