import { MATATAG_DATA } from "./data";
import type {
  CompetencyItem,
  CompetencySearchResult,
  GradeOption,
  MatatagData,
  MatatagDocument,
  SubjectOption,
} from "./types";

/**
 * Elementary grades selectable in the BEEd Reference Hub.
 * BEEd is strictly an elementary education program. Grades 7 to 10 are never selectable.
 */
export const SELECTABLE_ELEMENTARY_GRADES = [
  { key: "Kindergarten", label: "Kindergarten", numeric: 0 },
  { key: "1", label: "Grade 1", numeric: 1 },
  { key: "2", label: "Grade 2", numeric: 2 },
  { key: "3", label: "Grade 3", numeric: 3 },
  { key: "4", label: "Grade 4", numeric: 4 },
  { key: "5", label: "Grade 5", numeric: 5 },
  { key: "6", label: "Grade 6", numeric: 6 },
] as const;

export type SelectableGradeKey =
  (typeof SELECTABLE_ELEMENTARY_GRADES)[number]["key"];

/**
 * Fixed subject priority ordering for the BEEd curriculum.
 */
export const FIXED_BEED_SUBJECT_ORDER = [
  "English",
  "Filipino",
  "Mathematics",
  "Science",
  "Araling Panlipunan",
  "MAPEH",
  "EPP",
  "Edukasyon sa Pagpapakatao",
] as const;

export function normalizeGradeKey(raw?: string | number | null): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "all") return null;
  if (
    s.toLowerCase() === "k" ||
    s.toLowerCase() === "kindergarten" ||
    s === "0"
  ) {
    return "Kindergarten";
  }
  return s;
}

export function documentCoversGrade(
  doc: MatatagDocument,
  gradeKey: string
): boolean {
  if (gradeKey === "Kindergarten") {
    return doc.grades.some((g) => g === 0);
  }
  const n = parseInt(gradeKey, 10);
  if (Number.isNaN(n)) return false;
  return doc.grades.includes(n);
}

export function competencyCoversGrade(
  comp: CompetencyItem,
  gradeKey: string
): boolean {
  const gStr = String(comp.grade).trim().toLowerCase();
  if (gradeKey === "Kindergarten") {
    return gStr === "0" || gStr === "k" || gStr === "kindergarten";
  }
  const n = parseInt(gradeKey, 10);
  if (Number.isNaN(n)) return false;
  return gStr === String(n);
}

/**
 * Returns the selectable elementary grade options (K, 1..6).
 * An option is marked enabled if at least one document covers that grade.
 */
export function getGradeOptions(data?: MatatagData): GradeOption[] {
  const docs = data?.documents ?? MATATAG_DATA.documents;
  return SELECTABLE_ELEMENTARY_GRADES.map((g) => ({
    key: g.key,
    label: g.label,
    numeric: g.numeric,
    enabled: docs.some((doc) => documentCoversGrade(doc, g.key)),
  }));
}

/**
 * Returns subjects sorted according to the fixed BEEd priority list,
 * followed by any additional subjects present in the data.
 * Subjects with no matching document for the current grade filter are marked enabled: false ("Not added yet").
 */
export function getSubjectOptions(
  grade?: string | number | null,
  data?: MatatagData
): SubjectOption[] {
  const docs = data?.documents ?? MATATAG_DATA.documents;
  const gradeKey = normalizeGradeKey(grade);
  const relevantDocs = gradeKey
    ? docs.filter((d) => documentCoversGrade(d, gradeKey))
    : docs;

  const activeSubjects = new Set(
    relevantDocs.map((d) => d.subject.trim().toLowerCase())
  );

  const subjectList: string[] = [...FIXED_BEED_SUBJECT_ORDER];
  for (const doc of docs) {
    const trimmed = doc.subject.trim();
    if (!subjectList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      subjectList.push(trimmed);
    }
  }

  return subjectList.map((name) => ({
    name,
    enabled: activeSubjects.has(name.toLowerCase()),
  }));
}

/**
 * Formats informational text when a document covers secondary grades (7+).
 * E.g., "This PDF also covers Grade 7"
 */
export function formatSecondaryGradesNote(grades: number[]): string | null {
  const secondary = grades.filter((g) => g >= 7).sort((a, b) => a - b);
  if (secondary.length === 0) return null;
  if (secondary.length === 1) {
    return `This PDF also covers Grade ${secondary[0]}`;
  }
  return `This PDF also covers Grades ${secondary.join(", ")}`;
}

/**
 * Filters documents by grade, subject, and text query.
 */
export function filterGuides(
  guides: MatatagDocument[],
  grade?: string | number | null,
  subject?: string | null,
  query?: string | null
): MatatagDocument[] {
  const gradeKey = normalizeGradeKey(grade);
  const normalizedSubject = subject?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();

  return guides.filter((doc) => {
    if (gradeKey && !documentCoversGrade(doc, gradeKey)) {
      return false;
    }
    if (
      normalizedSubject &&
      normalizedSubject !== "all" &&
      doc.subject.toLowerCase() !== normalizedSubject
    ) {
      return false;
    }
    if (normalizedQuery) {
      const titleMatch = doc.title.toLowerCase().includes(normalizedQuery);
      const subjectMatch = doc.subject.toLowerCase().includes(normalizedQuery);
      const courseMatch = doc.supportsCourses.some((c) =>
        c.toLowerCase().includes(normalizedQuery)
      );
      const sourceMatch = doc.source.toLowerCase().includes(normalizedQuery);
      if (!titleMatch && !subjectMatch && !courseMatch && !sourceMatch) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Searches competencies across documents matching the grade, subject, and text query.
 * Case-insensitive over learningCompetency, domain, contentStandard, performanceStandard, and code.
 */
export function searchCompetencies(
  guides: MatatagDocument[],
  grade?: string | number | null,
  subject?: string | null,
  query?: string | null
): CompetencySearchResult[] {
  const gradeKey = normalizeGradeKey(grade);
  const normalizedSubject = subject?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();

  const results: CompetencySearchResult[] = [];

  for (const doc of guides) {
    if (gradeKey && !documentCoversGrade(doc, gradeKey)) {
      continue;
    }
    if (
      normalizedSubject &&
      normalizedSubject !== "all" &&
      doc.subject.toLowerCase() !== normalizedSubject
    ) {
      continue;
    }

    for (const comp of doc.competencies ?? []) {
      if (gradeKey && !competencyCoversGrade(comp, gradeKey)) {
        continue;
      }

      if (normalizedQuery) {
        const text = (comp.learningCompetency ?? "").toLowerCase();
        const domain = (comp.domain ?? "").toLowerCase();
        const contentStd = (comp.contentStandard ?? "").toLowerCase();
        const perfStd = (comp.performanceStandard ?? "").toLowerCase();
        const code = (comp.code ?? "").toLowerCase();

        const matches =
          text.includes(normalizedQuery) ||
          domain.includes(normalizedQuery) ||
          contentStd.includes(normalizedQuery) ||
          perfStd.includes(normalizedQuery) ||
          code.includes(normalizedQuery);

        if (!matches) continue;
      }

      results.push({
        competency: comp,
        documentId: doc.id,
        documentTitle: doc.title,
        documentSubject: doc.subject,
      });
    }
  }

  return results;
}

/**
 * Strict DepEd URL validator.
 * Accepts ONLY https URLs whose hostname is exactly www.deped.gov.ph.
 * Rejects http, other hosts, javascript:, data:, look-alikes, URLs with credentials, and non-standard ports.
 */
export function isOfficialDepedUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "www.deped.gov.ph") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== "443") return false;
    return true;
  } catch {
    return false;
  }
}

