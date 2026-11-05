export const BEED_ALLOWED_COURSE_CODES = [
  "ELEMATP",
  "ELEMATI",
  "ELETCUL",
  "ELETHIS",
] as const;

export type BeedCourseCode = (typeof BEED_ALLOWED_COURSE_CODES)[number];

export const BEED_COURSE_DESCRIPTIONS: Record<BeedCourseCode, string> = {
  ELEMATP: "Teaching Math in the Primary Grades",
  ELEMATI: "Teaching Math in the Intermediate Grades",
  ELETCUL: "Teaching Social Studies: Culture and Basic Geography",
  ELETHIS: "Teaching Social Studies: Philippine History and Government",
};

export interface CompetencyItem {
  id: string;
  grade: number | string;
  quarter?: number | string;
  domain?: string;
  contentStandard?: string;
  performanceStandard?: string;
  learningCompetency: string;
  code?: string;
}

export interface MatatagDocument {
  id: string;
  title: string;
  subject: string;
  grades: number[];
  url: string;
  localPath: string | null;
  source: string;
  supportsCourses: string[];
  competencies: CompetencyItem[];
}

export interface MatatagSourcePage {
  title: string;
  url: string;
}

export interface MatatagData {
  sourcePages: MatatagSourcePage[];
  documents: MatatagDocument[];
}

export interface GradeOption {
  key: string;
  label: string;
  numeric: number;
  enabled: boolean;
}

export interface SubjectOption {
  name: string;
  enabled: boolean;
}

export interface CompetencySearchResult {
  competency: CompetencyItem;
  documentId: string;
  documentTitle: string;
  documentSubject: string;
}

