const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

test("event API checks authentication, ownership, course access, and validation", async () => {
  // Bundle the real handlers with an in-memory database and session boundary.
  // This test never connects to the configured database.
  const result = await build({
    entryPoints: ["apps/web/src/app/api/workspace/events/route.ts"], bundle: true, write: false,
    platform: "node", format: "cjs", tsconfig: "apps/web/tsconfig.json",
    plugins: [{ name: "calendar-boundaries", setup(build) {
      build.onResolve({ filter: /^next\/server$|^@\/lib\/db$|^\.\.\/_shared$|^@\/lib\/super-user-v1\/legacy-entry-guard$/ }, ({ path: name }) => ({ path: name, namespace: "calendar-test" }));
      build.onLoad({ filter: /.*/, namespace: "calendar-test" }, ({ path: name }) => ({ contents:
        name === "next/server" ? "export const NextResponse = Response;"
          : name === "@/lib/db" ? "export const db = globalThis.__calendarDb;"
          : name === "@/lib/super-user-v1/legacy-entry-guard" ? "export async function denyLegacyApi() { return null; }"
            : `export async function requireWorkspaceSession() { return globalThis.__calendarSession ? { session: globalThis.__calendarSession, response: null } : { session: null, response: Response.json({message:'Unauthorized'}, {status:401}) }; } export function getQueryId(request) { return new URL(request.url).searchParams.get('id'); }`,
      }));
    } }],
  });
  const user = { id: "student-a", instituteId: "ics", role: "STUDENT" };
  const rows = [
    { id: "own", creatorId: "student-a", instituteId: "ics" },
    { id: "other-student", creatorId: "student-b", instituteId: "ics" },
    { id: "teacher", creatorId: "instructor", instituteId: "ics" },
    { id: "other-institute", creatorId: "student-a", instituteId: "ibe" },
  ];
  const mutations = [];
  globalThis.__calendarDb = {
    course: { findFirst: async () => null },
    calendarEvent: {
      findFirst: async ({ where }) => rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)),
      create: async ({ data }) => { mutations.push(data); return { id: "new", ...data }; },
      update: async ({ where, data }) => { mutations.push(where); return { id: where.id, ...data }; },
      delete: async ({ where }) => { mutations.push(where); return where; },
    },
  };
  const compiled = new Module(path.resolve("tmp/calendar-api-test.cjs"), module);
  compiled.filename = path.resolve("tmp/calendar-api-test.cjs");
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  const api = compiled.exports;
  const payload = { title: "Study group", eventDate: "2026-10-17T04:00:00Z", endDate: "2026-10-17T05:00:00Z" };
  const request = (method, body, id) => new Request(`http://localhost/api/workspace/events${id ? `?id=${id}` : ""}`, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  try {
    globalThis.__calendarSession = null;
    assert.equal((await api.POST(request("POST", payload))).status, 401);
    globalThis.__calendarSession = { user };
    for (const id of ["other-student", "teacher", "other-institute", "class_course_date", "syllabus_quiz"]) {
      assert.equal((await api.PATCH(request("PATCH", { ...payload, id }))).status, 404);
      assert.equal((await api.DELETE(request("DELETE", null, id))).status, 404);
    }
    assert.equal(mutations.length, 0);
    assert.equal((await api.POST(request("POST", { ...payload, courseId: "not-enrolled" }))).status, 403);
    assert.equal((await api.POST(request("POST", { ...payload, endDate: "2026-10-17T03:00:00Z" }))).status, 400);
    assert.equal((await api.POST(request("POST", { ...payload, deepLink: "javascript:alert(1)" }))).status, 400);
    assert.equal((await api.POST(request("POST", { ...payload, creatorId: "instructor", instituteId: "ibe" }))).status, 201);
    assert.equal(mutations[0].creatorId, user.id);
    assert.equal(mutations[0].instituteId, user.instituteId);
    assert.equal((await api.PATCH(request("PATCH", { ...payload, id: "own" }))).status, 200);
    assert.equal((await api.DELETE(request("DELETE", null, "own"))).status, 200);
  } finally {
    delete globalThis.__calendarDb;
    delete globalThis.__calendarSession;
  }
});
