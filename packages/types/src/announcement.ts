export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  courseId?: string | null;
  createdAt: string;
}
