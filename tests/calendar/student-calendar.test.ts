import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { addCalendarDays, calendarLabel, classOccurrences, eventOnDay, layoutDayEvents, schoolDateKey, schoolInput, type ClassSchedule } from "../../apps/web/src/lib/student-calendar";
import { calendarEventSchema, classScheduleSchema } from "../../apps/web/src/lib/calendar-validation";
import type { CalendarEvent } from "../../packages/types/src/calendar-event";

const course: ClassSchedule = { id: "course", code: "ITELECT3", title: "Advanced Programming", room: "302", instructorName: "Professor Smith", scheduleDays: [2, 5], scheduleStart: "12:00", scheduleEnd: "13:30", scheduleStartDate: "2026-10-01", scheduleEndDate: "2026-10-31", createdAt: "2026-10-01T00:00:00Z" };
function event(id: string, start: string, end?: string): CalendarEvent {
  return { id, title: "QUIZ1", courseCode: "ITELECT3", eventDate: new Date(`2026-10-16T${start}:00+08:00`).toISOString(), endDate: end ? new Date(`2026-10-16T${end}:00+08:00`).toISOString() : null, description: "", professorName: "", eventType: "exam", maxPoints: 30, courseId: "course", creatorId: "teacher", instituteId: "ics", createdAt: "", updatedAt: "", deepLink: "/ics/courses/course/classwork/quiz" };
}

test("dashboard renders the calendar before enrolled classes and Tasks no longer renders a calendar", () => {
  const dashboard = readFileSync(path.resolve("apps/web/src/app/(dashboard)/[institute]/students/client.tsx"), "utf8");
  const workspace = readFileSync(path.resolve("apps/web/src/components/workspace/WorkspaceDashboard.tsx"), "utf8");
  assert.ok(dashboard.indexOf("<StudentCalendar ") > 0);
  assert.ok(dashboard.indexOf("My Enrolled Classes") > 0);
  assert.ok(dashboard.indexOf("<StudentCalendar ") < dashboard.indexOf("My Enrolled Classes"));
  assert.ok(!workspace.includes("Monthly Calendar"));
  assert.ok(!workspace.includes("Assignment Details"));
});

test("instructor dashboard renders the shared calendar before My Classes", () => {
  const dashboard = readFileSync(path.resolve("apps/web/src/app/(dashboard)/[institute]/teachers/client.tsx"), "utf8");
  const page = readFileSync(path.resolve("apps/web/src/app/(dashboard)/[institute]/teachers/page.tsx"), "utf8");
  assert.ok(dashboard.indexOf("<DashboardCalendar ") > 0);
  assert.ok(dashboard.indexOf("<DashboardCalendar ") < dashboard.indexOf(">My Classes</h2>"));
  assert.ok(page.includes("getDashboardCalendar"));
  assert.ok(page.includes("calendar={calendar}"));
});

test("recurring classes appear only on the scheduled days within the class dates at school time", () => {
  const classes = classOccurrences([course], ["2026-09-29", "2026-10-12", "2026-10-13", "2026-10-16"], "ics");
  assert.equal(classes.length, 2);
  assert.equal(classes[0].eventDate, "2026-10-13T04:00:00.000Z");
  assert.equal(classes[0].endDate, "2026-10-13T05:30:00.000Z");
  assert.equal(classes[0].source, "class");
  assert.equal(classes[0].creatorId, "");
  assert.equal(classes[0].recurrence, "Every Tuesday, Friday · Oct 1, 2026 – Oct 31, 2026");
  assert.equal(calendarLabel(event("quiz", "12:00")), "ITELECT3 - QUIZ1");
});

test("school dates handle midnight, month/year navigation, and leap years", () => {
  assert.equal(schoolDateKey("2026-10-16T16:30:00Z"), "2026-10-17");
  assert.equal(schoolInput("2026-10-16T16:00:00Z"), "2026-10-17T00:00");
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
});

test("class dates include both boundaries and stop recurrence outside the semester", () => {
  const semester = { ...course, scheduleStartDate: "2026-01-06", scheduleEndDate: "2026-07-31" };
  const days = ["2026-01-02", "2026-01-06", "2026-07-31", "2026-08-04", "2027-01-05"];
  assert.deepEqual(classOccurrences([semester], days, "ics").map((event) => schoolDateKey(event.eventDate)), ["2026-01-06", "2026-07-31"]);
  assert.equal(classOccurrences([{ ...semester, scheduleStartDate: "2026-07-31" }], days, "ics").length, 1);
  assert.equal(classOccurrences([{ ...semester, scheduleStartDate: null }], days, "ics").length, 0);
  assert.equal(classOccurrences([{ ...semester, scheduleEndDate: null }], days, "ics").length, 0);
});

test("simultaneous and chained overlapping events remain independently clickable", () => {
  const placed = layoutDayEvents([event("a", "12:00", "13:00"), event("b", "12:30", "14:00"), event("c", "13:30", "14:30"), event("d", "15:00", "16:00")], "2026-10-16");
  assert.deepEqual(placed.map(({ columns, column }) => [columns, column]), [[2, 0], [2, 1], [2, 0], [1, 0]]);
  assert.equal(placed[0].start, 720);
  assert.equal(placed[0].end, 780);
});

test("multi-day events appear on each covered day and exclude the ending midnight", () => {
  const overnight = { ...event("overnight", "23:00"), endDate: "2026-10-17T16:00:00.000Z" };
  assert.equal(eventOnDay(overnight, "2026-10-16"), true);
  assert.equal(eventOnDay(overnight, "2026-10-17"), true);
  assert.equal(eventOnDay(overnight, "2026-10-18"), false);
  assert.equal(layoutDayEvents([overnight], "2026-10-17")[0].start, 0);
});

test("class schedules require valid weekdays and an increasing time range", () => {
  assert.equal(classScheduleSchema.safeParse(course).success, true);
  for (const change of [{ scheduleDays: [] }, { scheduleDays: [7] }, { scheduleStart: "25:00" }, { scheduleEnd: "11:00" }, { scheduleEnd: "12:00" }]) {
    assert.equal(classScheduleSchema.safeParse({ ...course, ...change }).success, false);
  }
});

test("class schedules require real start/end dates and reject reversed date ranges", () => {
  for (const change of [{ scheduleStartDate: "" }, { scheduleEndDate: null }, { scheduleEndDate: "2026-09-30" }, { scheduleStartDate: "2026-02-30" }, { scheduleEndDate: "2026-13-01" }]) {
    assert.equal(classScheduleSchema.safeParse({ ...course, ...change }).success, false);
  }
  assert.equal(classScheduleSchema.safeParse({ ...course, scheduleEndDate: course.scheduleStartDate }).success, true);
});

test("personal events reject unsafe links, malformed timestamps, blank titles, and reversed durations", () => {
  const input = { title: "Study", eventDate: "2026-10-17T04:00:00Z", endDate: "2026-10-17T05:00:00Z" };
  assert.equal(calendarEventSchema.safeParse(input).success, true);
  for (const deepLink of ["javascript:alert(1)", "//example.com", "/\\example.com", "/ics\n/example"]) assert.equal(calendarEventSchema.safeParse({ ...input, deepLink }).success, false);
  for (const change of [{ title: "   " }, { eventDate: "bad" }, { endDate: "2026-10-17T03:00:00Z" }]) assert.equal(calendarEventSchema.safeParse({ ...input, ...change }).success, false);
});
