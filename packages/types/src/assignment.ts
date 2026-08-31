export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: 'ASSIGNMENT' | 'QUIZ' | 'MATERIAL';
  maxPoints: number | null;
  dueDate: string | null;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  courseTitle?: string;
  createdAt: string;
}

