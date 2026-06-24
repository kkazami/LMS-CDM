export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  courseId: string | null;
  courseTitle?: string | null;
  completed: boolean;
  archived: boolean;
  orderIndex: number;
  creatorId: string;
  instituteId: string;
  createdAt: string;
  updatedAt: string;
}