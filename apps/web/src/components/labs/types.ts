export type LabStepType = 'INSTRUCTIONS' | 'COMMAND' | 'CHECKLIST' | 'TEXT_RESPONSE' | 'EVIDENCE_UPLOAD';
import type { LabResource } from '@/lib/labs/resources';
export interface LabStep {
  id?: string;
  key: string;
  type: LabStepType;
  title: string;
  required: boolean;
  config: {
    resources?: LabResource[];
    body?: string; command?: string; language?: string;
    items?: { id: string; label: string; required: boolean }[];
    prompt?: string; maxLength?: number;
    instructions?: string; minFiles?: number; maxFiles?: number;
  };
}
export interface LabDefinition {
  title: string; description: string; category: string; objective: string;
  prerequisites: string; requiredTools: string; estimatedMinutes: number; steps: LabStep[];
}
export interface LabVersion extends LabDefinition { id: string; status: string; revision: number; number: number }
export interface LabTemplate { id: string; title: string; description: string; category: string; versions: LabVersion[] }
export interface LabEvidence { id: string; fileName: string; mimeType: string; size: number; supersededAt?: string | null }
export interface LabResponse {
  stepId: string; revision: number; answer: { acknowledged?: boolean; checkedIds?: string[]; text?: string };
  evidence: LabEvidence[]; completed?: boolean;
}
export interface LabReview {
  id: string; decision: string; comment: string; score: number | null; createdAt: string;
  stepId?: string | null; revisionDueAt?: string | null;
}
export interface LabSubmission {
  id: string; round: number; createdAt: string; snapshot: unknown; reviews?: LabReview[];
}
export interface LabAttemptSummary {
  id: string; status: string; score: number | null; student: { id: string; name: string };
  submittedAt?: string | null;
}
export interface LabAssignment {
  id: string; status: string; opensAt: string | null; archivedAt?: string | null;
  version: LabVersion;
  syllabusItem: { id: string; title: string; type: string; maxPoints: number | null; dueDate: string | null };
  attempts?: LabAttemptSummary[];
  attemptPagination?: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface LabAttempt {
  id: string; status: string; score: number | null; revision: number;
  currentStep: number;
  revisionDueAt: string | null; evidenceToken?: string | null;
  version: LabVersion; assignment: LabAssignment; responses: LabResponse[];
  submissions: LabSubmission[]; reviews: LabReview[];
  gradebookHistory?: { id: string; action: string; reason: string; score: number | null; revisionDueAt: string | null; createdAt: string; instructor: string }[];
  student?: { id: string; name: string };
}
export const labStatusLabel: Record<string, string> = {
  IN_PROGRESS: 'In progress', SUBMITTED: 'Awaiting review', NEEDS_REVISION: 'Needs correction', GRADED: 'Graded',
  DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived', REOPENED: 'Reopened',
};
export async function labRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: {
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers,
  } });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : 'The request failed. Try again.');
  return result.data as T;
}
