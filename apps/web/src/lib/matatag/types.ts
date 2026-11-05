export const BEED_ALLOWED_COURSE_CODES = [
  "ELEMATP",
  "ELEMATI",
  "ELETCUL",
  "ELETHIS",
  "ELETLIT",
  "ELETLAN",
  "ELEFIL1",
  "ELEFIL2",
  "ELETBIO",
  "ELETPHY",
  "ELEMUSC",
  "ELEARTS",
  "ELEPEEG",
  "ELEGMRC",
  "ELEEPAP",
  "ELEEPPE",
  "ELEPMOT",
] as const;

export type BeedCourseCode = (typeof BEED_ALLOWED_COURSE_CODES)[number];

export const BEED_COURSE_DESCRIPTIONS: Record<BeedCourseCode, string> = {
  ELEMATP: "Teaching Math in the Primary Grades",
  ELEMATI: "Teaching Math in the Intermediate Grades",
  ELETCUL: "Teaching Social Studies: Culture and Basic Geography",
  ELETHIS: "Teaching Social Studies: Philippine History and Government",
  ELETLIT: "Teaching English in the Elementary Grades (Literature)",
  ELETLAN: "Teaching English in the Elementary Grades (Language Arts)",
  ELEFIL1: "Pagtuturo ng Filipino sa Elementarya (Istruktura at Gamit)",
  ELEFIL2: "Panitikan ng Pilipinas",
  ELETBIO: "Teaching Science in Elementary Grades (Biology and Chemistry)",
  ELETPHY: "Teaching Science in Elementary Grades (Physics, Earth and Space Science)",
  ELEMUSC: "Teaching Music in the Elementary Grades",
  ELEARTS: "Teaching Arts in the Elementary Grades",
  ELEPEEG: "Teaching Physical Education and Health in Elementary Grades",
  ELEGMRC: "Good Moral and Right Conduct (Edukasyon sa Pagpapakatao)",
  ELEEPAP: "Edukasyong Pantahanan at Pangkabuhayan (EPP) with Entrepreneurship",
  ELEEPPE: "Technology and Livelihood Education in Elementary Grades",
  ELEPMOT: "Movement Education and Motor Development",
};

export type MatatagSourceType = "official" | "mirror";

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
  sourceType: MatatagSourceType;
  supportsCourses: string[];
  competencies: CompetencyItem[];
}

export interface MatatagSourcePage {
  title: string;
  url: string;
  sourceType?: MatatagSourceType;
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

export interface DocumentSourceBadgeInfo {
  badgeText: string;
  isMirror: boolean;
  buttonLabel: string;
  disclaimer?: string;
}
