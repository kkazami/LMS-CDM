export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  professorName: string;
  maxPoints: number | null;
  eventDate: string;
  eventType: "assignment" | "exam" | "submission" | string;
  deepLink: string;
  courseId: string | null;
  courseTitle?: string | null;
  creatorId: string;
  instituteId: string;
  createdAt: string;
  updatedAt: string;
}