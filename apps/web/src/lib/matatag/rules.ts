import { MATATAG_DATA } from "./data";
import type {
  CompetencyItem,
  CompetencySearchResult,
  DocumentSourceBadgeInfo,
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
 * followed by any other subjects appearing in the data sorted alphabetically.
 * Subjects with no matching document for the current grade filter are marked enabled: false.
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

  const fixedSet = new Set<string>(
    FIXED_BEED_SUBJECT_ORDER.map((s) => s.toLowerCase())
  );

  // Collect other subjects from documents that are not in FIXED_BEED_SUBJECT_ORDER
  const otherSubjectsSet = new Set<string>();
  for (const doc of docs) {
    const trimmed = doc.subject.trim();
    if (!fixedSet.has(trimmed.toLowerCase())) {
      otherSubjectsSet.add(trimmed);
    }
  }

  const otherSubjectsSorted = Array.from(otherSubjectsSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  const combinedSubjects: string[] = [
    ...FIXED_BEED_SUBJECT_ORDER,
    ...otherSubjectsSorted,
  ];

  return combinedSubjects.map((name) => ({
    name,
    enabled: activeSubjects.has(name.toLowerCase()),
  }));
}

/**
 * Formats informational text when a document covers secondary grades (7+).
 * E.g., "This PDF also covers Grade 7" or "This PDF also covers Grades 7, 8, 9, 10"
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
 * Determines whether two documents cover the same subject and strand (for MAPEH).
 */
export function areDocumentsSameSubjectAndStrand(
  a: MatatagDocument,
  b: MatatagDocument
): boolean {
  if (a.subject.toLowerCase() !== b.subject.toLowerCase()) {
    return false;
  }
  if (a.subject === "MAPEH") {
    const aIsPe = /pe|health/i.test(a.title);
    const bIsPe = /pe|health/i.test(b.title);
    const aIsMusic = /music|art/i.test(a.title);
    const bIsMusic = /music|art/i.test(b.title);
    if (aIsPe && bIsPe) return true;
    if (aIsMusic && bIsMusic) return true;
    return false;
  }
  return true;
}

/**
 * Filters documents by grade, subject, and text query.
 * When filtering:
 * 1. If an official and a mirror document cover the same subject and grade, show the official one and hide the mirror duplicate.
 * 2. Official documents are always ordered before mirror documents.
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

  let matched = guides.filter((doc) => {
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

  // If a grade is specified, deduplicate mirror documents where an official document covers that subject and grade
  if (gradeKey) {
    const officialDocs = matched.filter(
      (d) => (d.sourceType ?? "official") === "official"
    );
    matched = matched.filter((doc) => {
      if (doc.sourceType === "mirror") {
        const hasOfficial = officialDocs.some((off) =>
          areDocumentsSameSubjectAndStrand(off, doc)
        );
        if (hasOfficial) return false;
      }
      return true;
    });
  }

  // Sort: official documents first, then mirror documents
  return [...matched].sort((a, b) => {
    const aOfficial = (a.sourceType ?? "official") === "official" ? 0 : 1;
    const bOfficial = (b.sourceType ?? "official") === "official" ? 0 : 1;
    return aOfficial - bOfficial;
  });
}

/**
 * Searches competencies across documents matching the grade, subject, and text query.
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

/**
 * Strict mirror URL validator.
 * Accepts ONLY https URLs whose hostname is exactly matatagcurriculum.com.
 * Requires:
 * - pathname starting with /wp-content/uploads/2024/11/ and ending with .pdf (case-insensitive)
 * OR
 * - exact page URL https://matatagcurriculum.com/matatag-curriculum-guide/ (or without trailing slash)
 * Rejects look-alikes, credentials, non-standard ports, http, javascript:, and other paths.
 */
export function isAllowedMirrorUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "matatagcurriculum.com") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== "443") return false;

    // Exact guide page URL
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    if (normalizedPath === "/matatag-curriculum-guide") {
      return true;
    }

    // PDF files inside /wp-content/uploads/2024/11/
    const lowerPath = parsed.pathname.toLowerCase();
    if (
      lowerPath.startsWith("/wp-content/uploads/2024/11/") &&
      lowerPath.endsWith(".pdf")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates a document's URL based on its source type.
 * Official documents must pass isOfficialDepedUrl.
 * Mirror documents must pass isAllowedMirrorUrl.
 */
export function isAllowedGuideUrl(doc: MatatagDocument): boolean {
  if (doc.sourceType === "mirror") {
    return isAllowedMirrorUrl(doc.url);
  }
  return isOfficialDepedUrl(doc.url);
}

/**
 * Pure helper determining badge text, disclaimer, and action button label.
 */
export function getDocumentSourceBadgeInfo(
  doc: MatatagDocument
): DocumentSourceBadgeInfo {
  const isMirror = doc.sourceType === "mirror";
  if (isMirror) {
    return {
      isMirror: true,
      badgeText:
        "Unofficial copy: matatagcurriculum.com, not affiliated with DepEd",
      buttonLabel: "Open unofficial copy",
      disclaimer: "Check the official DepEd page for the latest version.",
    };
  }
  return {
    isMirror: false,
    badgeText: `Source: ${doc.source || "DepEd"}`,
    buttonLabel: "Open official PDF",
  };
}
