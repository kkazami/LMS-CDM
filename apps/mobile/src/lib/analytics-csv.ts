/**
 * Analytics CSV Export & Import utility for Mobile (Instructor-facing).
 * Schema and column order match apps/web/src/lib/analytics-export.ts exactly.
 */

export interface ExportStudentItem {
  id?: string;
  studentName: string;
  email: string;
  courseCode: string;
  courseTitle: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  reasons: string[];
  details: {
    gradeAverage: number | null;
    missedAssignments: Array<{ id: string; title: string; dueDate?: string | null }>;
    gradedSubmissions: Array<{ id: string; title: string; score: number; maxPoints: number }>;
    daysInactive: number | null;
    lastActiveDate: string | null;
    incompleteModules: Array<{ id: string; title: string }>;
  };
}

export interface ImportRowData {
  studentEmail?: string;
  studentNumber?: string;
  supplementaryScore: number | string;
}

/**
 * Escapes a single CSV cell value per RFC 4180 rules.
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Formats at-risk / performance analytics student records into RFC 4180 CSV string.
 * Exact column schema and order matches web analytics-export.ts:
 * 1. Student Name
 * 2. Email
 * 3. Course Code
 * 4. Course Title
 * 5. Risk Level
 * 6. Risk Score
 * 7. Identified Risk Indicators
 * 8. Academic Average
 * 9. Missed Work Count
 * 10. Missed Work Details
 * 11. Graded Submissions Count
 * 12. Graded Submissions Details
 * 13. Days Inactive
 * 14. Last Active Date
 * 15. Incomplete Materials Count
 * 16. Incomplete Materials Details
 */
export function exportAnalyticsToCsvString(students: ExportStudentItem[]): string {
  const headers = [
    'Student Name',
    'Email',
    'Course Code',
    'Course Title',
    'Risk Level',
    'Risk Score',
    'Identified Risk Indicators',
    'Academic Average',
    'Missed Work Count',
    'Missed Work Details',
    'Graded Submissions Count',
    'Graded Submissions Details',
    'Days Inactive',
    'Last Active Date',
    'Incomplete Materials Count',
    'Incomplete Materials Details',
  ];

  const headerLine = headers.map(escapeCsvCell).join(',');

  const rowLines = students.map((s) => {
    const reasonsStr = (s.reasons || []).join('; ');
    const missedAssignmentsStr = (s.details?.missedAssignments || [])
      .map((m) => (m.dueDate ? `${m.title} (due ${new Date(m.dueDate).toLocaleDateString()})` : m.title))
      .join('; ');
    const gradedSubmissionsStr = (s.details?.gradedSubmissions || [])
      .map((g) => `${g.title} (${g.score}/${g.maxPoints} pts)`)
      .join('; ');
    const incompleteModulesStr = (s.details?.incompleteModules || [])
      .map((m) => m.title)
      .join('; ');

    const cells = [
      s.studentName || 'Unknown Student',
      s.email || '',
      s.courseCode || '',
      s.courseTitle || '',
      s.riskLevel || 'LOW',
      s.riskScore ?? 0,
      reasonsStr || 'None',
      s.details?.gradeAverage !== null && s.details?.gradeAverage !== undefined
        ? `${Math.round(s.details.gradeAverage)}%`
        : 'N/A',
      s.details?.missedAssignments?.length ?? 0,
      missedAssignmentsStr || 'None',
      s.details?.gradedSubmissions?.length ?? 0,
      gradedSubmissionsStr || 'None',
      s.details?.daysInactive !== null && s.details?.daysInactive !== undefined
        ? s.details.daysInactive
        : 'N/A',
      s.details?.lastActiveDate
        ? new Date(s.details.lastActiveDate).toLocaleDateString()
        : 'Never',
      s.details?.incompleteModules?.length ?? 0,
      incompleteModulesStr || 'None',
    ];

    return cells.map(escapeCsvCell).join(',');
  });

  // Prepend UTF-8 BOM so Excel and mobile spreadsheet viewers render correctly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Parses raw CSV string into rows with RFC 4180 quote and newline handling.
 */
function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \r\n pair
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses uploaded CSV text for student analytics / supplementary import.
 * Supports standard headers:
 * - Email / Student Email
 * - Student Number / Student ID
 * - Score / Supplementary Score / Grade
 */
export function parseAnalyticsImportCsv(csvText: string): {
  rows: ImportRowData[];
  errors: string[];
} {
  const parsedRows = parseCsvRows(csvText);
  if (parsedRows.length === 0) {
    return { rows: [], errors: ['The selected CSV file is empty.'] };
  }

  const rawHeaders = parsedRows[0];
  const normalizedHeaders = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  let emailIndex = -1;
  let numberIndex = -1;
  let scoreIndex = -1;

  normalizedHeaders.forEach((h, idx) => {
    if (h === 'email' || h === 'studentemail') {
      emailIndex = idx;
    } else if (h === 'studentnumber' || h === 'studentid' || h === 'studentno') {
      numberIndex = idx;
    } else if (
      h === 'score' ||
      h === 'supplementaryscore' ||
      h === 'grade' ||
      h === 'points' ||
      h === 'academicaverage'
    ) {
      scoreIndex = idx;
    }
  });

  const errors: string[] = [];

  if (emailIndex === -1 && numberIndex === -1) {
    errors.push('Missing student identifier column. CSV must contain an "Email" or "Student Number" header.');
  }

  if (scoreIndex === -1) {
    errors.push('Missing score column. CSV must contain a "Score", "Supplementary Score", or "Grade" header.');
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const dataRows: ImportRowData[] = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (!row || row.length === 0 || row.every((c) => c === '')) {
      continue; // Skip blank rows
    }

    const email = emailIndex !== -1 ? (row[emailIndex] || '').trim() : undefined;
    const studentNumber = numberIndex !== -1 ? (row[numberIndex] || '').trim() : undefined;
    const rawScore = (row[scoreIndex] || '').replace(/%/g, '').trim();

    dataRows.push({
      studentEmail: email || undefined,
      studentNumber: studentNumber || undefined,
      supplementaryScore: rawScore,
    });
  }

  if (dataRows.length === 0) {
    errors.push('No data rows found below the header row.');
  }

  return { rows: dataRows, errors };
}
