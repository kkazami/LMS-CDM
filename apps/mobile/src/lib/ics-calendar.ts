import type { ClassSchedule, LmsCalendarEvent } from '@lms/types';

export const schoolDateKey = (value: Date | string) => new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);
export function addDays(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function monthDays(key: string) {
  const first = key.slice(0, 7) + '-01';
  const start = addDays(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  const date = new Date(`${first}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  const cells = Math.ceil((new Date(`${first}T12:00:00Z`).getUTCDay() + date.getUTCDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => addDays(start, index));
}
export function classOccurrences(schedules: ClassSchedule[], days: string[]): LmsCalendarEvent[] {
  return schedules.flatMap(course => days.filter(day =>
    course.scheduleStart && course.scheduleEnd && course.scheduleStartDate && course.scheduleEndDate &&
    day >= course.scheduleStartDate && day <= course.scheduleEndDate &&
    course.scheduleDays.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
  ).map(day => ({
    id: `class_${course.id}_${day}`, title: 'Class', description: course.title,
    professorName: course.instructorName, maxPoints: null,
    eventDate: new Date(`${day}T${course.scheduleStart}:00+08:00`).toISOString(),
    endDate: new Date(`${day}T${course.scheduleEnd}:00+08:00`).toISOString(),
    courseCode: course.code, courseId: course.id, courseTitle: course.title, room: course.room,
    source: 'class' as const, eventType: 'class', deepLink: `/ics/courses/${course.id}`,
    creatorId: '', instituteId: '', createdAt: course.createdAt, updatedAt: course.createdAt,
  })));
}
export function eventOnDay(event: LmsCalendarEvent, day: string) {
  const start = Date.parse(`${day}T00:00:00+08:00`);
  return Date.parse(event.eventDate) < start + 86400000 &&
    (event.endDate ? Date.parse(event.endDate) > start : Date.parse(event.eventDate) >= start);
}
export const schoolTime = (value: string) => new Date(value).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
