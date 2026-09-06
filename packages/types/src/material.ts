export interface CourseMaterialAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
}

export interface CourseMaterialItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  description: string;
  orderIndex: number;
  createdAt: string;
  attachments: CourseMaterialAttachment[];
}

export interface CourseMaterialsGroup {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  moduleCount: number;
  materials: CourseMaterialItem[];
}
