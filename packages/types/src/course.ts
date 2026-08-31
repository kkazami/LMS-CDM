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
  coverImage?: string | null;
}

export interface CourseDetail extends Course {
  description: string | null;
  instructorId: string | null;
  instituteId: string;
  createdAt: string;
}

export interface CourseAnnouncementItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
  };
}

export interface CourseBroadcastItem {
  id: string;
  message: string;
  category: string;
  createdAt: string;
  senderName: string;
  senderAvatar?: string | null;
}

export interface CourseStreamResponse {
  announcements: CourseAnnouncementItem[];
  broadcasts: CourseBroadcastItem[];
}

export interface ClassworkAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
}

export interface ClassworkSubmission {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'RETURNED' | 'MISSING';
  grade?: number | null;
  isReturned: boolean;
  submittedAt?: string | null;
  attachments?: Array<{ id: string; url: string; fileName: string }>;
  student?: {
    id: string;
    name: string;
    email: string;
    studentNumber?: string | null;
  };
}

export interface ClassworkItem {
  id: string;
  type: 'ASSIGNMENT' | 'QUIZ' | 'MATERIAL';
  title: string;
  description: string;
  maxPoints?: number | null;
  dueDate?: string | null;
  orderIndex: number;
  attachments?: ClassworkAttachment[];
  submission?: ClassworkSubmission | null;
}

export interface ClassworkCategory {
  name: string;
  count: number;
  items: ClassworkItem[];
}

export interface CourseClassworkResponse {
  categories: ClassworkCategory[];
  items?: ClassworkItem[];
}

export interface EnrolledStudent {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  avatarUrl?: string | null;
}

export interface CoursePeopleResponse {
  instructor: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  students: EnrolledStudent[];
  totalEnrolled: number;
}

export interface CourseGradeSummary {
  averagePercentage: number | null;
  letterGrade: string;
  totalEarnedPoints: number;
  totalPossiblePoints: number;
  totalItems: number;
  completedCount: number;
  gradedCount: number;
  missingCount: number;
}

export interface CourseGradeItem {
  id: string;
  title: string;
  type: string;
  maxPoints: number;
  score: number | null;
  status: 'GRADED' | 'SUBMITTED' | 'MISSING' | 'ASSIGNED';
  dueDate: string | null;
}

export interface CourseFeedbackComment {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
  createdAt: string;
}

export interface CourseGradesResponse {
  summary: CourseGradeSummary | null;
  items: CourseGradeItem[];
  feedback: CourseFeedbackComment[];
}

export interface CourseSubmissionResponse {
  success: boolean;
  submission: ClassworkSubmission;
}

export interface CreateClassworkInput {
  title: string;
  description: string;
  type: 'ASSIGNMENT' | 'QUIZ' | 'MATERIAL';
  maxPoints?: number | null;
  dueDate?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface GradeSubmissionInput {
  submissionId: string;
  grade: number;
  feedback?: string;
}

