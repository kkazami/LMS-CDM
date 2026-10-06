import Papa from "papaparse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AtRiskStudentItem } from "@/hooks/useAtRiskStudents";

export interface ExportContextInfo {
  scopeName: string;
  tabLabel: string;
  riskFilterLabel: string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/**
 * Triggers a native browser file download from a Blob.
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports currently filtered at-risk student records as a CSV file.
 */
export function exportAnalyticsToCsv(
  students: AtRiskStudentItem[],
  context: ExportContextInfo
) {
  const rows = students.map((s) => {
    const reasonsStr = s.reasons.join("; ");
    const missedAssignmentsStr = s.details.missedAssignments
      .map((m) => (m.dueDate ? `${m.title} (due ${new Date(m.dueDate).toLocaleDateString()})` : m.title))
      .join("; ");
    const gradedSubmissionsStr = s.details.gradedSubmissions
      .map((g) => `${g.title} (${g.score}/${g.maxPoints} pts)`)
      .join("; ");
    const incompleteModulesStr = s.details.incompleteModules
      .map((m) => m.title)
      .join("; ");

    return {
      "Student Name": s.studentName,
      "Email": s.email,
      "Course Code": s.courseCode,
      "Course Title": s.courseTitle,
      "Risk Level": s.riskLevel,
      "Risk Score": s.riskScore,
      "Identified Risk Indicators": reasonsStr,
      "Academic Average": s.details.gradeAverage !== null ? `${Math.round(s.details.gradeAverage)}%` : "N/A",
      "Missed Work Count": s.details.missedAssignments.length,
      "Missed Work Details": missedAssignmentsStr || "None",
      "Graded Submissions Count": s.details.gradedSubmissions.length,
      "Graded Submissions Details": gradedSubmissionsStr || "None",
      "Days Inactive": s.details.daysInactive !== null ? s.details.daysInactive : "N/A",
      "Last Active Date": s.details.lastActiveDate ? new Date(s.details.lastActiveDate).toLocaleDateString() : "Never",
      "Incomplete Materials Count": s.details.incompleteModules.length,
      "Incomplete Materials Details": incompleteModulesStr || "None",
    };
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const dateStr = new Date().toISOString().split("T")[0];
  const sanitizedScope = context.scopeName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const filename = `student-risk-report_${sanitizedScope}_${dateStr}.csv`;
  triggerFileDownload(blob, filename);
}

/**
 * Sanitizes strings for standard Helvetica in pdf-lib (Latin-1 range).
 */
function sanitizePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2014\u2013]/g, "-") // em-dash, en-dash
    .replace(/[\u2022\u25CF]/g, "*") // bullets
    .replace(/[\u201C\u201D]/g, '"') // smart quotes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ""); // strip non-Latin1
}

/**
 * Truncates text with ellipsis if it exceeds the allocated width in points.
 */
function fitText(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string {
  const sanitized = sanitizePdfText(text);
  if (font.widthOfTextAtSize(sanitized, fontSize) <= maxWidth) {
    return sanitized;
  }
  let truncated = sanitized;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + "...", fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + "..." : "";
}

/**
 * Exports currently filtered at-risk student records as a clean, professionally formatted PDF.
 */
export async function exportAnalyticsToPdf(
  students: AtRiskStudentItem[],
  context: ExportContextInfo
) {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4 dimensions: 842 x 595
  const pageWidth = 842;
  const pageHeight = 595;
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight; // 770 pt

  const colWidths = {
    student: 165,
    course: 75,
    risk: 75,
    grade: 75,
    missed: 75,
    activity: 75,
    indicators: 230,
  };

  const colX = {
    student: marginLeft,
    course: marginLeft + colWidths.student,
    risk: marginLeft + colWidths.student + colWidths.course,
    grade: marginLeft + colWidths.student + colWidths.course + colWidths.risk,
    missed: marginLeft + colWidths.student + colWidths.course + colWidths.risk + colWidths.grade,
    activity: marginLeft + colWidths.student + colWidths.course + colWidths.risk + colWidths.grade + colWidths.missed,
    indicators: marginLeft + colWidths.student + colWidths.course + colWidths.risk + colWidths.grade + colWidths.missed + colWidths.activity,
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const rowHeight = 26;
  const marginBottom = 45;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - 36;

  function drawReportHeader(page: any) {
    // Top banner
    const bannerHeight = 54;
    page.drawRectangle({
      x: marginLeft,
      y: currentY - bannerHeight,
      width: contentWidth,
      height: bannerHeight,
      color: rgb(0.09, 0.11, 0.16),
    });

    // Title: Student Risk Report — [Class Name] — [Date Exported]
    const headerTitle = `Student Risk Report - ${context.scopeName} - ${formattedDate}`;
    page.drawText(fitText(headerTitle, contentWidth - 30, fontBold, 14), {
      x: marginLeft + 14,
      y: currentY - 24,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Subtitle with filters & summary counts
    const summaryText = `View: ${context.tabLabel} (${context.riskFilterLabel})  |  Total Analyzed: ${students.length}  |  High Risk: ${context.highCount}  |  Medium Risk: ${context.mediumCount}  |  Low Risk: ${context.lowCount}`;
    page.drawText(fitText(summaryText, contentWidth - 30, fontRegular, 8.5), {
      x: marginLeft + 14,
      y: currentY - 42,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.68, 0.72, 0.8),
    });

    currentY -= bannerHeight + 12;
  }

  function drawTableHeader(page: any) {
    const tableHeaderHeight = 22;
    page.drawRectangle({
      x: marginLeft,
      y: currentY - tableHeaderHeight,
      width: contentWidth,
      height: tableHeaderHeight,
      color: rgb(0.18, 0.22, 0.31),
    });

    const headers = [
      { title: "STUDENT NAME & EMAIL", x: colX.student + 6, maxW: colWidths.student - 12 },
      { title: "CLASS", x: colX.course + 6, maxW: colWidths.course - 12 },
      { title: "RISK LEVEL", x: colX.risk + 6, maxW: colWidths.risk - 12 },
      { title: "ACADEMIC AVG", x: colX.grade + 6, maxW: colWidths.grade - 12 },
      { title: "MISSED WORK", x: colX.missed + 6, maxW: colWidths.missed - 12 },
      { title: "ACTIVITY", x: colX.activity + 6, maxW: colWidths.activity - 12 },
      { title: "IDENTIFIED RISK INDICATORS", x: colX.indicators + 6, maxW: colWidths.indicators - 12 },
    ];

    for (const h of headers) {
      page.drawText(h.title, {
        x: h.x,
        y: currentY - 15,
        size: 7.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    currentY -= tableHeaderHeight;
  }

  // Draw initial header & table header
  drawReportHeader(currentPage);
  drawTableHeader(currentPage);

  if (students.length === 0) {
    currentPage.drawText("No student records match the active view and filters.", {
      x: marginLeft + 14,
      y: currentY - 24,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.52),
    });
  } else {
    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      // Check if page break is needed
      if (currentY - rowHeight < marginBottom) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - 36;
        drawTableHeader(currentPage);
      }

      const isEven = i % 2 === 0;
      currentPage.drawRectangle({
        x: marginLeft,
        y: currentY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: isEven ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      });

      // Left accent color strip by risk level
      let riskAccentColor = rgb(0.06, 0.72, 0.38); // Low
      let riskTextColor = rgb(0.04, 0.52, 0.28);
      if (student.riskLevel === "HIGH") {
        riskAccentColor = rgb(0.93, 0.27, 0.27);
        riskTextColor = rgb(0.8, 0.12, 0.12);
      } else if (student.riskLevel === "MEDIUM") {
        riskAccentColor = rgb(0.96, 0.62, 0.08);
        riskTextColor = rgb(0.75, 0.42, 0.02);
      }

      currentPage.drawRectangle({
        x: marginLeft,
        y: currentY - rowHeight,
        width: 3.5,
        height: rowHeight,
        color: riskAccentColor,
      });

      // Bottom border line
      currentPage.drawLine({
        start: { x: marginLeft, y: currentY - rowHeight },
        end: { x: marginLeft + contentWidth, y: currentY - rowHeight },
        thickness: 0.5,
        color: rgb(0.89, 0.91, 0.94),
      });

      // 1. Student Name & Email
      const nameText = fitText(student.studentName, colWidths.student - 14, fontBold, 8.5);
      const emailText = fitText(student.email, colWidths.student - 14, fontRegular, 7);
      currentPage.drawText(nameText, {
        x: colX.student + 8,
        y: currentY - 11,
        size: 8.5,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.16),
      });
      currentPage.drawText(emailText, {
        x: colX.student + 8,
        y: currentY - 21,
        size: 7,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.58),
      });

      // 2. Class
      const courseText = fitText(student.courseCode, colWidths.course - 12, fontRegular, 8);
      currentPage.drawText(courseText, {
        x: colX.course + 6,
        y: currentY - 16,
        size: 8,
        font: fontRegular,
        color: rgb(0.2, 0.24, 0.3),
      });

      // 3. Risk Level
      const riskLabel = student.riskLevel === "HIGH" ? "HIGH RISK" : student.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW RISK";
      currentPage.drawText(riskLabel, {
        x: colX.risk + 6,
        y: currentY - 16,
        size: 8,
        font: fontBold,
        color: riskTextColor,
      });

      // 4. Academic Average
      const gradeStr = student.details.gradeAverage !== null ? `${Math.round(student.details.gradeAverage)}%` : "N/A";
      currentPage.drawText(gradeStr, {
        x: colX.grade + 6,
        y: currentY - 16,
        size: 8,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.22),
      });

      // 5. Missed Work
      const missedCount = student.details.missedAssignments.length;
      const missedStr = missedCount === 0 ? "0 missed" : `${missedCount} overdue`;
      currentPage.drawText(missedStr, {
        x: colX.missed + 6,
        y: currentY - 16,
        size: 8,
        font: missedCount > 0 ? fontBold : fontRegular,
        color: missedCount > 0 ? rgb(0.8, 0.12, 0.12) : rgb(0.35, 0.4, 0.48),
      });

      // 6. Activity Recency
      const inactiveStr = student.details.daysInactive !== null ? `${student.details.daysInactive}d ago` : "No activity";
      currentPage.drawText(inactiveStr, {
        x: colX.activity + 6,
        y: currentY - 16,
        size: 8,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.42),
      });

      // 7. Reasons / Indicators
      const reasonsList = student.reasons.join(", ");
      const indicatorText = fitText(reasonsList, colWidths.indicators - 14, fontRegular, 7.5);
      currentPage.drawText(indicatorText, {
        x: colX.indicators + 6,
        y: currentY - 16,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.25, 0.28, 0.34),
      });

      currentY -= rowHeight;
    }
  }

  // Draw footer on all pages
  const totalPages = doc.getPageCount();
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const page = doc.getPage(pIdx);
    // Footer line
    page.drawLine({
      start: { x: marginLeft, y: 32 },
      end: { x: marginLeft + contentWidth, y: 32 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText("Lumina LMS - Student Analytics & Risk Management", {
      x: marginLeft,
      y: 20,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.62),
    });

    const pageStr = `Page ${pIdx + 1} of ${totalPages}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 7.5);
    page.drawText(pageStr, {
      x: marginLeft + contentWidth - pageStrWidth,
      y: 20,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.62),
    });
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const dateStr = new Date().toISOString().split("T")[0];
  const sanitizedScope = context.scopeName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const filename = `student-risk-report_${sanitizedScope}_${dateStr}.pdf`;
  triggerFileDownload(blob, filename);
}
