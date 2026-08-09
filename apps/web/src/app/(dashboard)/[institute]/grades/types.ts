// Shared types for the Grades feature.
// GradeRow represents a single graded submission that is shown to the student.
// All fields are non-nullable at this point — the page.tsx query ensures grade and
// maxPoints are present before constructing this shape.

export interface GradeRow {
  id: string;              // StudentSubmission.id
  syllabusItemId: string;  // SyllabusItem.id
  itemTitle: string;       // SyllabusItem.title
  itemType: "ASSIGNMENT" | "QUIZ";
  courseId: string;
  courseTitle: string;
  courseCode: string;
  grade: number;           // raw score awarded by instructor
  maxPoints: number;       // max possible for this item
  gradedAt: string;        // ISO string of StudentSubmission.updatedAt
}

export interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
}
