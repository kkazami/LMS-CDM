export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  courseName?: string | null;
  courseId?: string | null;
  createdAt: string;
}
