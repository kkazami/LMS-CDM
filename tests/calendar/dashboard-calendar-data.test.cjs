const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));

test("dashboard calendars use taught or approved enrolled courses and keep personal events private", async () => {
  const date = new Date("2026-10-01T00:00:00Z");
  const base = { title: "Programming", code: "ITELECT3", room: "302", scheduleDays: [2, 5], scheduleStart: "12:00", scheduleEnd: "13:30", scheduleStartDate: date, scheduleEndDate: new Date("2026-10-31T00:00:00Z"), createdAt: date, instructor: { name: "Instructor" }, instituteId: "ics", isArchived: false };
  const courses = [
    { ...base, id: "taught", instructorId: "teacher", enrollments: [] },
    { ...base, id: "enrolled", instructorId: "other-teacher", enrollments: [{ studentId: "student", status: "APPROVED" }] },
    { ...base, id: "pending", instructorId: "other-teacher", enrollments: [{ studentId: "student", status: "PENDING" }] },
    { ...base, id: "archived", instructorId: "teacher", isArchived: true, enrollments: [] },
    { ...base, id: "other-institute", instructorId: "teacher", instituteId: "ite", enrollments: [] },
  ];
  function matches(row, where) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR") return value.some((condition) => matches(row, condition));
      if (key === "AND") return value.every((condition) => matches(row, condition));
      if (value === null || typeof value !== "object") return row[key] === value;
      if ("not" in value) return row[key] !== value.not;
      if ("in" in value) return value.in.includes(row[key]);
      if ("notIn" in value) return !value.notIn.includes(row[key]);
      if ("some" in value) return (row[key] ?? []).some((item) => matches(item, value.some));
      return !!row[key] && matches(row[key], value);
    });
  }
  const queries = [];
  const eventBase = { creatorId: "teacher", instituteId: "ics", courseId: null, creator: { role: "PROFESSOR" }, eventDate: date, createdAt: date, updatedAt: date };
  const savedEvents = ["personal", "event", "assignment", "exam", "quiz", "submission"].map((eventType) => ({ ...eventBase, id: eventType, title: eventType, eventType }));
  globalThis.__calendarDb = {
    calendarEvent: { findMany: async ({ where }) => savedEvents.filter((event) => matches(event, where)) },
    syllabusItem: { findMany: async (query) => { queries.push(query.where); return [{ id: "quiz", title: "QUIZ1", type: "QUIZ", courseId: "enrolled", dueDate: date, createdAt: date, updatedAt: date, course: courses[1] }]; } },
    course: { findMany: async ({ where }) => courses.filter((course) => matches(course, where)).map(({ instituteId, isArchived, instructorId, enrollments, ...course }) => course) },
  };
  try {
    const result = await build({
      entryPoints: ["apps/web/src/lib/student-calendar-data.ts"], bundle: true, write: false,
      platform: "node", format: "cjs", tsconfig: "apps/web/tsconfig.json",
      plugins: [{ name: "calendar-database", setup(build) {
        build.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ path: "db", namespace: "test" }));
        build.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "export const db = globalThis.__calendarDb;" }));
      } }],
    });
    const compiled = new Module(path.resolve("tmp/dashboard-calendar-data-test.cjs"), module);
    compiled.filename = path.resolve("tmp/dashboard-calendar-data-test.cjs"); compiled.paths = module.paths;
    compiled._compile(result.outputFiles[0].text, compiled.filename);
    const { getDashboardCalendar, visibleCalendarEvents } = compiled.exports;
    for (const role of ["PROFESSOR", "TEACHER"]) {
      const calendar = await getDashboardCalendar({ id: "teacher", role, instituteId: "ics" }, "ics");
      assert.deepEqual(calendar.schedules.map((course) => course.id), ["taught"]);
      assert.equal(calendar.schedules[0].scheduleStartDate, "2026-10-01");
      assert.equal(calendar.schedules[0].scheduleEndDate, "2026-10-31");
      assert.deepEqual(calendar.events.map((event) => event.id), ["personal", "event"]);
      assert.equal(queries.length, 0, "instructors should not load coursework deadlines");
    }
    const student = { id: "student", role: "STUDENT", instituteId: "ics" };
    const calendar = await getDashboardCalendar(student, "ics");
    assert.deepEqual(calendar.schedules.map((course) => course.id), ["enrolled"]);
    assert.ok(JSON.stringify(queries.at(-1)).includes("targetGroups"));
    assert.deepEqual(calendar.events.map((event) => event.id), ["event", "assignment", "exam", "quiz", "submission", "syllabus_quiz"]);
    const personal = { creatorId: "teacher", instituteId: "ics", courseId: null, creator: { role: "PROFESSOR" }, eventType: "personal" };
    assert.equal(matches(personal, visibleCalendarEvents(student)), false);
    assert.equal(matches(personal, visibleCalendarEvents({ id: "teacher", role: "PROFESSOR", instituteId: "ics" })), true);
    assert.equal(matches({ ...personal, eventType: "event" }, visibleCalendarEvents(student)), true);
  } finally { delete globalThis.__calendarDb; }
});
