import type { Course } from './course';
import type { CalendarEvent } from './calendar-event';

export interface ClassSchedule {
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
}

export interface MobileCourse extends Course {
  pendingCount: number;
  pendingWorkCount: number;
}

export interface MobileDashboard {
  courses: MobileCourse[];
  calendar: { events: CalendarEvent[]; schedules: ClassSchedule[] };
  overdue: number;
  dueSoon: number;
  pendingAssignments: CalendarEvent[];
}
