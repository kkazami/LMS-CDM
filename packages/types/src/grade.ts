export interface Grade {
  id: string;
  value: number;
  maxValue: number;
  courseName: string;
  courseCode: string;
  assignmentTitle: string;
  gradedAt: string;
}

export interface GradeSummary {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  gradeCount: number;
}
