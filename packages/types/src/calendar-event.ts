export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  professorName: string;
  maxPoints: number | null;
  eventDate: string;
  endDate?: string | null;
  courseCode?: string | null;
  source?: "personal" | "institution" | "classwork" | "class";
  room?: string;
  recurrence?: string;
  eventType: "assignment" | "exam" | "submission" | string;
  deepLink: string;
  courseId: string | null;
  courseTitle?: string | null;
  creatorId: string;
  instituteId: string;
  createdAt: string;
  updatedAt: string;
}

export type LmsCalendarEvent = CalendarEvent;
