export type FrameworkId = "ilaw" | "4as" | "5es" | "6es";

export interface FrameworkItem {
  id: string;
  label: string;
  description: string;
}

export interface StageGuide {
  id: string;
  name: string;
  purpose: string;
  teacherDoes: string[];
  learnersDo: string[];
  writingTip: string;
  guideQuestions: [string, string];
}

export interface SamplePlanSection {
  stageId: string;
  stageName: string;
  content: string;
  annotation: string;
}

export interface SamplePlan {
  title: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  learningCompetency: string;
  learningObjectives: string;
  materials: string;
  sections: SamplePlanSection[];
}

export interface LessonPlanFramework {
  id: FrameworkId;
  name: string;
  unitLabel: "Elements" | "Stages";
  count: number;
  items: FrameworkItem[];
  shortDescription: string;
  originNote: string;
  sourceCitation: string;
  sourceUrl?: string;
  sourceNote?: string;
  aiAssistanceNote?: string;
  stages: StageGuide[];
  samplePlan: SamplePlan;
}

export interface LessonPlanHeaderFields {
  subject: string;
  gradeLevel: string;
  topic: string;
  learningCompetency: string;
  learningObjectives: string;
  materials: string;
  date: string;
  preparedBy: string;
}

export interface LessonPlanFormValues {
  frameworkId: FrameworkId;
  headers: LessonPlanHeaderFields;
  stages: Record<string, string>;
}

export interface StoredLessonPlanDraft {
  version: 1;
  updatedAt: string;
  formValues: LessonPlanFormValues;
}
