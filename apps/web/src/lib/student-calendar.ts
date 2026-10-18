import type { CalendarEvent } from "@/lib/lms-types";

export const SCHOOL_TIME_ZONE = "Asia/Manila";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const scheduleDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export type ClassSchedule = {
  id: string;
  code: string;
  title: string;
  room: string;
  instructorName: string;
  scheduleDays: number[];
  scheduleStart: string;
  scheduleEnd: string;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  createdAt: string;
};

export function schoolDateKey(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function schoolTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: SCHOOL_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function schoolInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: SCHOOL_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  return `${schoolDateKey(value)}T${parts}`;
}

export function addCalendarDays(key: string, count: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function calendarLabel(event: CalendarEvent) {
  return event.courseCode ? `${event.courseCode} - ${event.title}` : event.title;
}

export function classOccurrences(schedules: ClassSchedule[], days: string[], institute: string): CalendarEvent[] {
  return schedules.flatMap((course) => days.filter((day) =>
    course.scheduleStart && course.scheduleEnd && course.scheduleStartDate && course.scheduleEndDate &&
    day >= course.scheduleStartDate && day <= course.scheduleEndDate &&
    course.scheduleDays.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
  ).map((day) => ({
    id: `class_${course.id}_${day}`,
    title: "Class",
    description: course.title,
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    professorName: course.instructorName,
    room: course.room,
    recurrence: `Every ${course.scheduleDays.map((index) => WEEKDAYS[index]).join(", ")} · ${scheduleDateFormat.format(new Date(`${course.scheduleStartDate}T12:00:00Z`))} – ${scheduleDateFormat.format(new Date(`${course.scheduleEndDate}T12:00:00Z`))}`,
    eventDate: new Date(`${day}T${course.scheduleStart}:00+08:00`).toISOString(),
    endDate: new Date(`${day}T${course.scheduleEnd}:00+08:00`).toISOString(),
    eventType: "class",
    source: "class" as const,
    maxPoints: null,
    creatorId: "",
    instituteId: "",
    createdAt: course.createdAt,
    updatedAt: course.createdAt,
    deepLink: `/${institute}/courses/${course.id}`,
  })));
}

export function eventMinutes(event: CalendarEvent, day: string) {
  const midnight = new Date(`${day}T00:00:00+08:00`).getTime();
  const start = Math.max(0, (new Date(event.eventDate).getTime() - midnight) / 60000);
  const end = event.endDate ? (new Date(event.endDate).getTime() - midnight) / 60000 : start + 45;
  return { start, end: Math.min(1440, Math.max(start + 30, end)) };
}

// Keep simultaneous events separately clickable, including connected overlap groups.
export function layoutDayEvents(events: CalendarEvent[], day: string) {
  const ordered = events.map((event) => ({ event, ...eventMinutes(event, day), column: 0, columns: 1 })).sort((a, b) => a.start - b.start || b.end - a.end);
  let group: typeof ordered = [];
  let groupEnd = 0;
  function finishGroup() {
    const columns = Math.max(1, ...group.map((item) => item.column + 1));
    group.forEach((item) => { item.columns = columns; });
  }
  for (const item of ordered) {
    if (item.start >= groupEnd) { finishGroup(); group = []; }
    const occupied = new Set(group.filter((other) => other.end > item.start).map((other) => other.column));
    while (occupied.has(item.column)) item.column++;
    group.push(item);
    groupEnd = Math.max(...group.map((other) => other.end));
  }
  finishGroup();
  return ordered;
}

export function eventOnDay(event: CalendarEvent, day: string) {
  const start = new Date(`${day}T00:00:00+08:00`).getTime();
  const end = new Date(event.endDate ?? event.eventDate).getTime();
  return new Date(event.eventDate).getTime() < start + 86400000 &&
    (event.endDate ? end > start : end >= start);
}
