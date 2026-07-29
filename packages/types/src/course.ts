export interface Course {
  id: string;
  code: string;
  courseCode: string;
  title: string;
  section: string | null;
  subject: string | null;
  room: string | null;
  isArchived: boolean;
  instructorName: string | null;
  enrolledCount?: number;
  displayOrderIndex?: number;
}

export interface CourseDetail extends Course {
  description: string | null;
  instructorId: string | null;
  instituteId: string;
  createdAt: string;
}
