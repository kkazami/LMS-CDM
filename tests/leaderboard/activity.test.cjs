const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

async function load(fixture) {
  globalThis.__leaderboardTest = fixture;
  const result = await build({
    stdin: { contents: `
      export { GET } from './apps/web/src/app/api/leaderboard/activity/route';
      export { PATCH } from './apps/web/src/app/api/leaderboard/manage/route';
      export { default as page } from './apps/web/src/app/(dashboard)/[institute]/leaderboards/page';
      export { default as managePage } from './apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/page';
    `, resolveDir: process.cwd() },
    bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
    tsconfig: "apps/web/tsconfig.json", nodePaths: [path.resolve("apps/web/node_modules")],
    plugins: [{ name: "service-boundaries", setup(b) {
      b.onResolve({ filter: /^next\/(server|navigation)$|^@\/lib\/(db|auth-session|api-auth|get-institute-theme|super-user-v1\/legacy-entry-guard)$|^\.\/client$/ }, ({ path: name }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }) => ({ contents:
        name === "next/server" ? "export const NextResponse=Response;" :
        name === "next/navigation" ? "export function redirect(url){throw new Error('redirect:'+url)}" :
        name.endsWith("/db") ? "export const db=globalThis.__leaderboardTest.db;" :
        /auth-session|api-auth/.test(name) ? "export async function getSession(){return globalThis.__leaderboardTest.session} export const getSessionFromRequest=getSession;" :
        name.endsWith("legacy-entry-guard") ? "export async function denyLegacyApi(){return null} export async function requireLegacyActor(){return globalThis.__leaderboardTest.session?.user}" :
        name.endsWith("get-institute-theme") ? "export function getInstituteTheme(){return {colors:{primary:'#ff6600'}}}" :
        "export default function Client(){return null;}" }));
    } }],
  });
  const compiled = new Module(path.resolve("tmp/leaderboard-tests.cjs"), module);
  compiled.filename = path.resolve("tmp/leaderboard-tests.cjs"); compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}

// Evaluate the Prisma filters against fixtures, including enrollment and group relations.
function matches(row, where = {}) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some(condition => matches(row, condition));
    const value = row?.[key];
    if (expected === null || typeof expected !== "object") return value === expected;
    if ("not" in expected && value === expected.not) return false;
    if ("in" in expected && !expected.in.includes(value)) return false;
    if ("some" in expected) return value?.some(item => matches(item, expected.some));
    if ("none" in expected) return !value?.some(item => matches(item, expected.none));
    return Object.keys(expected).every(k => ["not", "in"].includes(k)) || matches(value, expected);
  });
}

function fixture(role = "STUDENT", id = "alice") {
  const enroll = (studentId, courseId, status = "APPROVED") => ({ studentId, courseId, status });
  const students = ["alice", "bob", "zero", "hidden", "dropped", "inactive"].map((id, index) => ({
    id, name: id, avatarUrl: "/avatar", department: "ICS", instituteId: "ics", role: "STUDENT", isActive: id !== "inactive",
    enrollments: [enroll(id, "class-a", id === "dropped" ? "PENDING" : "APPROVED")],
    gamificationProfile: { exp: index * 1000, level: 1, levelTier: "newcomer", currentStreak: 0, badges: [], isLeaderboardAnonymized: id === "bob" },
  }));
  const courses = [
    { id: "class-a", code: "CS101", title: "Algorithms", instructorId: "teacher", instituteId: "ics", isArchived: false },
    { id: "class-b", code: "CS102", title: "Programming", instructorId: "teacher", instituteId: "ics", isArchived: false },
    { id: "foreign", code: "ITE101", title: "Foreign", instructorId: "outsider", instituteId: "ite", isArchived: false },
  ].map(c => ({ ...c, enrollments: students.flatMap(s => s.enrollments).filter(e => e.courseId === c.id) }));
  const items = [
    { id: "quiz", courseId: "class-a", type: "QUIZ", form: { id: "form" }, maxPoints: 20 },
    { id: "assignment", courseId: "class-a", type: "ASSIGNMENT", form: null, maxPoints: 20 },
    { id: "other", courseId: "class-b", type: "QUIZ", form: null, maxPoints: 100 },
    { id: "foreign-item", courseId: "foreign", type: "QUIZ", form: null, maxPoints: 100 },
  ].map(item => ({ ...item, title: item.id, course: courses.find(c => c.id === item.courseId), leaderboardEnabled: true, leaderboardRewards: [], targetGroups: [] }));
  const submission = (studentId, grade, status, isReturned, syllabusItemId = "quiz") => ({
    id: syllabusItemId + studentId, studentId, syllabusItemId, grade, status, isReturned, student: students.find(s => s.id === studentId),
  });
  const submissions = [
    submission("alice", 80, "SUBMITTED", true), submission("bob", 16, "RETURNED", true), submission("zero", 0, "SUBMITTED", true),
    submission("hidden", 100, "SUBMITTED", false), submission("dropped", 100, "RETURNED", true), submission("inactive", 100, "RETURNED", true),
    submission("alice", 99, "DRAFT", false, "assignment"), submission("bob", 18, "GRADED", false, "assignment"),
    submission("alice", 100, "RETURNED", true, "other"),
  ];
  const f = { session: { user: { id, role, instituteId: "ics" } }, courses, items, submissions, writes: [] };
  f.db = {
    course: { findMany: async ({ where }) => courses.filter(c => matches(c, where)) },
    syllabusItem: {
      findFirst: async ({ where }) => items.find(i => matches(i, where)) ?? null,
      findMany: async ({ where, include }) => items.filter(i => matches(i, where)).map(i => ({ ...i,
        submissions: submissions.filter(s => s.syllabusItemId === i.id && matches(s, include?.submissions?.where)).map(s => ({ ...s,
          student: { ...s.student, enrollments: s.student.enrollments.filter(e => matches(e, include?.submissions?.select?.student?.select?.enrollments?.where)) },
        })),
      })),
      update: async args => { f.writes.push(args); const item = items.find(i => i.id === args.where.id);
        return { ...item, leaderboardEnabled: args.data.leaderboardEnabled ?? item.leaderboardEnabled, leaderboardRewards: args.data.leaderboardRewards?.create ?? item.leaderboardRewards }; },
    },
    studentSubmission: { findMany: async ({ where }) => submissions.filter(s => matches(s, where)) },
    gamificationProfile: { findMany: async () => [] },
    enrollment: { findMany: async ({ where }) => students.flatMap(student => student.enrollments.map(e => ({ ...e, student, course: courses.find(c => c.id === e.courseId) }))).filter(e => matches(e, where)) },
    gradeIncentiveRule: { findMany: async () => [] }, expTransaction: { findMany: async () => [] },
  };
  return f;
}
const request = id => new Request(`http://localhost/api/leaderboard/activity?syllabusItemId=${id}`);
const patch = body => new Request("http://localhost/api/leaderboard/manage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ institute: "ics" }), searchParams: Promise.resolve({ syllabusItemId: "quiz", courseId: "class-a" }) };

test("quiz scores include released auto-grades and zero, use points, and share ranks on ties", async () => {
  const f = fixture(), api = await load(f);
  const response = await api.GET(request("quiz")); assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json();
  assert.equal(data.item.courseId, "class-a"); assert.equal(data.item.maxPoints, 20);
  assert.deepEqual(data.rankings.map(r => [r.studentId, r.rank, r.score]), [["alice", 1, 16], ["bob", 1, 16], ["zero", 3, 0]]);
  assert.match(data.rankings[1].name, /^Student #/); assert.equal(data.rankings[1].avatarUrl, null);
  const assignment = await (await api.GET(request("assignment"))).json();
  assert.deepEqual(assignment.rankings.map(r => [r.studentId, r.score]), [["bob", 18]]);
});

test("only approved classmates, the course instructor, and same-institute administrators can read a board", async () => {
  const f = fixture(), api = await load(f);
  for (const [role, id, item, status] of [
    ["STUDENT", "alice", "other", 404], ["STUDENT", "dropped", "quiz", 404], ["PROFESSOR", "teacher", "quiz", 200],
    ["INSTRUCTOR", "outsider", "quiz", 404], ["ADMIN", "admin", "foreign-item", 404], ["ADMIN", "admin", "quiz", 200],
    ["UNKNOWN", "alice", "quiz", 404],
  ]) {
    f.session.user = { role, id, instituteId: "ics" };
    assert.equal((await api.GET(request(item))).status, status, `${role}:${id}:${item}`);
  }
  f.session = null; assert.equal((await api.GET(request("quiz"))).status, 401);
});

test("disabled boards and quizzes assigned to another group are not exposed", async () => {
  const f = fixture(), api = await load(f);
  f.items[0].leaderboardEnabled = false; assert.equal((await api.GET(request("quiz"))).status, 404);
  f.items[0].leaderboardEnabled = true;
  f.items[0].targetGroups = [{ group: { members: [{ studentId: "bob" }] } }];
  assert.equal((await api.GET(request("quiz"))).status, 404);
  const page = await api.page(params); assert.ok(!page.props.leaderboardActivities.some(a => a.id === "quiz"));
});

test("student and instructor pages keep the selected board, and management counts the same students", async () => {
  const f = fixture(), api = await load(f);
  const student = await api.page(params);
  assert.deepEqual(student.props.enrolledCourses.map(c => c.id), ["class-a"]);
  assert.equal(student.props.initialActivityId, "quiz"); assert.equal(student.props.initialCourseId, "class-a");
  f.session.user = { id: "teacher", role: "TEACHER", instituteId: "ics" };
  const teacher = await api.page(params);
  assert.deepEqual(teacher.props.enrolledCourses.map(c => c.id), ["class-a", "class-b"]);
  const manage = await api.managePage(params);
  assert.equal(manage.props.initialActivities.find(a => a.id === "quiz").participantCount, 3);
  assert.equal(manage.props.initialActivities.find(a => a.id === "assignment").participantCount, 1);
});

test("management validates rewards and saves settings and rewards together within the owned class", async () => {
  const f = fixture("INSTRUCTOR", "teacher"), api = await load(f);
  const settings = { syllabusItemId: "quiz", leaderboardEnabled: true, rewardTiers: [{ placement: 1, rewardLabel: "Winner", bonusExp: 10 }] };
  const saved = await api.PATCH(patch(settings)); assert.equal(saved.status, 200);
  assert.equal(f.writes.length, 1); assert.deepEqual(f.writes[0].data.leaderboardRewards, { deleteMany: {}, create: settings.rewardTiers });
  for (const rewardTiers of [[{ placement: -1, rewardLabel: "", bonusExp: 0 }], [...settings.rewardTiers, ...settings.rewardTiers]]) {
    assert.equal((await api.PATCH(patch({ ...settings, rewardTiers }))).status, 400);
  }
  f.session.user.role = "ADMIN";
  assert.equal((await api.PATCH(patch({ ...settings, syllabusItemId: "foreign-item" }))).status, 404);
  f.session.user.role = "STUDENT"; assert.equal((await api.PATCH(patch(settings))).status, 403);
  assert.equal(f.writes.length, 1);
});
