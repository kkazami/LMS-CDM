import type {
  CalendarEvent as CalendarEventRecord,
  Course as CourseRecord,
  Note as NoteRecord,
  TaskItem as TaskRecord,
} from "@prisma/client";
import type { CalendarEvent, Note, Task } from "@/lib/lms-types";

export type WorkspaceCourse = Pick<CourseRecord, "id" | "title" | "code">;

function toIsoString(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

export function serializeNote(note: NoteRecord): Note {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    category: note.category,
    color: note.color,
    pinned: note.pinned,
    archived: note.archived,
    orderIndex: note.orderIndex,
    creatorId: note.creatorId,
    instituteId: note.instituteId,
    createdAt: toIsoString(note.createdAt),
    updatedAt: toIsoString(note.updatedAt),
  };
}

export function serializeTask(
  task: TaskRecord & { course?: { title: string } | null }
): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority as Task["priority"],
    dueDate: task.dueDate ? toIsoString(task.dueDate) : null,
    courseId: task.courseId,
    courseTitle: task.course?.title ?? null,
    completed: task.completed,
    archived: task.archived,
    orderIndex: task.orderIndex,
    creatorId: task.creatorId,
    instituteId: task.instituteId,
    createdAt: toIsoString(task.createdAt),
    updatedAt: toIsoString(task.updatedAt),
  };
}

export function serializeCalendarEvent(
  event: CalendarEventRecord & { course?: { title: string } | null }
): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    professorName: event.professorName,
    maxPoints: event.maxPoints,
    eventDate: toIsoString(event.eventDate),
    eventType: event.eventType,
    deepLink: event.deepLink,
    courseId: event.courseId,
    courseTitle: event.course?.title ?? null,
    creatorId: event.creatorId,
    instituteId: event.instituteId,
    createdAt: toIsoString(event.createdAt),
    updatedAt: toIsoString(event.updatedAt),
  };
}

export function toLocalDateInput(date: string | Date | null | undefined) {
  if (!date) return "";

  const value = typeof date === "string" ? new Date(date) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toDateTimeValue(date: string | Date | null | undefined) {
  if (!date) return null;
  return typeof date === "string" ? new Date(date) : date;
}