import type {
  FeedbackDecision,
  PlacementSummary,
  SubmissionStatus,
  SubmissionType,
} from "./rules";

/** Serialisable shapes shared by the API routes, server pages and client components. */

export interface PlacementDTO {
  id: string;
  studentId: string;
  studentName: string;
  supervisorId: string;
  supervisorName: string;
  schoolName: string;
  subject: string;
  gradeLevel: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
  summary: PlacementSummary;
  pendingReview: number;
}

export interface FeedbackDTO {
  id: string;
  authorId: string;
  authorName: string;
  comment: string;
  decision: FeedbackDecision;
  score: number | null;
  createdAt: string;
}

export interface SubmissionDTO {
  id: string;
  placementId: string;
  type: SubmissionType;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  videoLink: string | null;
  status: SubmissionStatus;
  version: number;
  submittedAt: string;
  updatedAt: string;
  feedback: FeedbackDTO[];
}

export interface StudentPickerOption {
  id: string;
  name: string;
}
