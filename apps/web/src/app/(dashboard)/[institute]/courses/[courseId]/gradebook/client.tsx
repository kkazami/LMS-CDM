"use client";

import { useState, useTransition, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Star, Settings, Smartphone, Eye, Edit3, FileText, ExternalLink } from "lucide-react";
import { updateGrade, upsertGrade, clearGrade, saveGradingPolicy, type GradebookData } from "./actions";

function useIsMobileView(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.innerWidth < 768;
    },
    () => false
  );
}

export function getGradingScaleEquivalent(pct: number): string {
  const p = Math.round(pct);
  if (p >= 98) return "1.00";
  if (p >= 96) return "1.25";
  if (p >= 93) return "1.50";
  if (p >= 90) return "1.75";
  if (p >= 87) return "2.00";
  if (p >= 84) return "2.25";
  if (p >= 81) return "2.50";
  if (p >= 78) return "2.75";
  if (p >= 75) return "3.00";
  if (p >= 70) return "INC";
  return "F";
}
import GradingPolicyModal from "@/components/courses/GradingPolicyModal";
import GradeEvaluationModal from "@/components/courses/GradeEvaluationModal";
import type { InstituteTheme } from "@/lib/theme";

interface GradebookClientProps {
  data: GradebookData;
  courseId: string;
  courseTitle: string;
  instituteCode: string;
  theme?: InstituteTheme;
}

function gradeColor(grade: number | null, maxPoints: number | null): string {
  if (grade === null) return "text-gray-400 dark:text-[#64748B] bg-transparent";
  if (!maxPoints) return "text-gray-700 dark:text-[#F0F2F8] font-mono tabular-nums";
  const pct = (grade / maxPoints) * 100;
  if (pct >= 80) return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-semibold font-mono tabular-nums";
  if (pct >= 50) return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 font-semibold font-mono tabular-nums";
  return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 font-semibold font-mono tabular-nums";
}

export default function GradebookClient({ data, courseId, courseTitle, instituteCode, theme }: GradebookClientProps) {
  const isMobileView = useIsMobileView();
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [gradingSubmission, setGradingSubmission] = useState<{
    submission: {
      id: string;
      status: string;
      grade: number | null;
      isReturned: boolean;
      submittedAt: Date | null;
      student: { id: string; name: string; email: string };
      attachments: Array<{ id: string; type: string; url: string; fileName: string }>;
    };
    maxPoints: number | null;
    itemId: string;
    studentId: string;
  } | null>(null);

  function handleModalGraded(submissionId: string, grade: number) {
    if (gradingSubmission) {
      const { studentId, itemId } = gradingSubmission;
      setLocalGrades((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] ?? {}), [itemId]: grade.toString() },
      }));
      if (data.grades[studentId]?.[itemId]) {
        data.grades[studentId][itemId].grade = grade;
        data.grades[studentId][itemId].status = "RETURNED";
        data.grades[studentId][itemId].isReturned = true;
      }
    }
  }

  // Ensure editing cell is cleared if mobile view is detected
  useEffect(() => {
    if (isMobileView && editingCell) {
      setEditingCell(null);
    }
  }, [isMobileView, editingCell]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (isMobileView) return;
      if (editingCell) return;
      if (!selectedCell) return;

      const sIdx = data.students.findIndex(s => s.id === selectedCell.studentId);
      const aIdx = data.assignments.findIndex(a => a.id === selectedCell.assignmentId);
      if (sIdx === -1 || aIdx === -1) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (sIdx > 0) setSelectedCell({ studentId: data.students[sIdx - 1].id, assignmentId: selectedCell.assignmentId });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (sIdx < data.students.length - 1) setSelectedCell({ studentId: data.students[sIdx + 1].id, assignmentId: selectedCell.assignmentId });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (aIdx > 0) setSelectedCell({ studentId: selectedCell.studentId, assignmentId: data.assignments[aIdx - 1].id });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (aIdx < data.assignments.length - 1) setSelectedCell({ studentId: selectedCell.studentId, assignmentId: data.assignments[aIdx + 1].id });
      } else if (e.key === "Enter") {
        e.preventDefault();
        setEditingCell(selectedCell);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedCell, editingCell, data.students, data.assignments]);

  // Determine active categories
  const activeCategories = Array.from(new Set(data.assignments.map(a => a.type)));
  
  // Valid policy check
  const policyWeights = data.gradingPolicy?.weights ?? [];
  const totalWeight = policyWeights.reduce((sum, w) => sum + w.weightPercentage, 0);
  const hasValidPolicy = policyWeights.length > 0 && Math.abs(totalWeight - 100) < 0.01;

  async function handleSavePolicy(weights: { category: string; weightPercentage: number }[]) {
    startTransition(async () => {
      const res = await saveGradingPolicy(courseId, weights);
      if (res.success) {
        // Refresh page to get updated policy
        window.location.reload();
      } else {
        throw new Error(res.error || "Failed to save");
      }
    });
  }

  function computeFinalGrade(studentId: string): number | null {
    if (!hasValidPolicy) return null;
    
    let totalScore = 0;
    let computedWeight = 0; // Track how much weight was actually computable

    for (const weight of policyWeights) {
      const categoryAssignments = data.assignments.filter(a => a.type === weight.category);
      if (categoryAssignments.length === 0) continue;

      let categoryEarned = 0;
      let categoryMax = 0;

      for (const a of categoryAssignments) {
        if (!a.maxPoints) continue;
        const cell = data.grades[studentId]?.[a.id];
        const localVal = localGrades[studentId]?.[a.id];
        const displayGrade = localVal !== undefined ? parseFloat(localVal) : cell?.grade;

        if (displayGrade !== null && displayGrade !== undefined && !isNaN(displayGrade)) {
          categoryEarned += displayGrade;
          categoryMax += a.maxPoints;
        }
      }

      if (categoryMax > 0) {
        const categoryPercentage = categoryEarned / categoryMax;
        totalScore += categoryPercentage * weight.weightPercentage;
        computedWeight += weight.weightPercentage;
      }
    }
    
    // Scale the score if the student hasn't completed assignments in all weighted categories yet
    // This provides a running average rather than punishing them for future categories
    if (computedWeight > 0) {
      return (totalScore / computedWeight) * 100;
    }

    return null;
  }

  function handleCellEdit(studentId: string, assignmentId: string, value: string, maxPoints: number | null = null) {
    let val = value;
    if (maxPoints !== null && value !== "") {
      const num = parseFloat(value);
      if (!isNaN(num) && num > maxPoints) {
        val = maxPoints.toString();
      }
    }
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [assignmentId]: val },
    }));
  }

  function handleCellBlur(studentId: string, assignmentId: string, maxPoints: number | null = null) {
    const rawValue = localGrades[studentId]?.[assignmentId];
    if (rawValue === undefined) {
      setEditingCell(null);
      return;
    }

    // When cleared, delete/clear the grade from the database
    if (rawValue.trim() === "") {
      startTransition(async () => {
        await clearGrade(assignmentId, studentId);
      });
      setLocalGrades((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] ?? {}), [assignmentId]: "" },
      }));
      if (data.grades[studentId]?.[assignmentId]) {
        data.grades[studentId][assignmentId].grade = null;
        if (
          (!data.grades[studentId][assignmentId].attachments || data.grades[studentId][assignmentId].attachments!.length === 0) &&
          !data.grades[studentId][assignmentId].submittedAt
        ) {
          data.grades[studentId][assignmentId].submissionId = null;
          data.grades[studentId][assignmentId].status = null;
          data.grades[studentId][assignmentId].isReturned = false;
        }
      }
      setEditingCell(null);
      return;
    }

    let gradeNum = parseFloat(rawValue);
    if (!isNaN(gradeNum)) {
      if (maxPoints !== null && gradeNum > maxPoints) {
        gradeNum = maxPoints;
      }
      if (gradeNum < 0) {
        gradeNum = 0;
      }
      setLocalGrades((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] ?? {}), [assignmentId]: gradeNum.toString() },
      }));
      if (data.grades[studentId]?.[assignmentId]) {
        data.grades[studentId][assignmentId].grade = gradeNum;
        data.grades[studentId][assignmentId].status = "RETURNED";
        data.grades[studentId][assignmentId].isReturned = true;
      }
      startTransition(async () => {
        await upsertGrade(assignmentId, studentId, gradeNum);
      });
    }
    setEditingCell(null);
  }

  if (data.assignments.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] flex flex-col items-center justify-center text-center p-12 shadow-xs">
        <Star className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-[#F0F2F8]">No gradable items yet</h2>
        <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">Create assignments or quizzes with point values to see the gradebook.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-[#141721] border-b border-slate-200/80 dark:border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Link
              href={`/${instituteCode}/courses/${courseId}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[220px]">{courseTitle}</span>
            </Link>
            <span className="text-slate-300 dark:text-white/10">/</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Gradebook</span>
            {isMobileView ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                <Eye className="w-3 h-3" />
                View Mode
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <Edit3 className="w-3 h-3" />
                Edit Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#1C2030] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all shadow-xs cursor-pointer"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Grading Policy</span>
              <span className="sm:hidden">Policy</span>
              {hasValidPolicy && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ml-1"></span>
              )}
            </button>
            <a
              href={`/api/courses/${courseId}/gradebook/export`}
              className="flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all shadow-xs hover:brightness-110 min-h-[40px] sm:min-h-[44px]"
              style={{ backgroundColor: theme?.colors.primary ?? "#EA580C" }}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile View-Only Mode Banner Note */}
      {isMobileView && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/25 flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              It is only in View Mode
            </p>
            <p className="text-amber-700 dark:text-amber-300/90 mt-0.5">
              Gradebook entries are view-only in Mobile Web View. You can only enter Edit Mode in PC and Tablet Web View.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-[#181B26] border-b border-slate-200/80 dark:border-white/5 sticky top-0 z-10">
              <th className="sticky left-0 bg-slate-50/90 dark:bg-[#181B26] z-20 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wide border-r border-slate-200/80 dark:border-white/5 min-w-[200px]">
                Student
              </th>
              {data.assignments.map((a) => (
                <th
                  key={a.id}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-[#8B92A5] uppercase tracking-wide border-r border-slate-200/80 dark:border-white/5 min-w-[140px]"
                >
                  <div className="truncate max-w-[130px] text-slate-900 dark:text-[#F0F2F8]" title={a.title}>{a.title}</div>
                  {a.maxPoints && (
                    <div className="text-slate-400 dark:text-slate-500 font-normal normal-case">{a.maxPoints} pts</div>
                  )}
                </th>
              ))}
              {hasValidPolicy && (
                <th className="sticky right-0 bg-orange-50/50 dark:bg-orange-950/20 z-20 px-5 py-3 text-right text-xs font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wide border-l border-orange-200/50 dark:border-orange-900/30 min-w-[120px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  Final Grade
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {data.students.map((student, idx) => (
              <tr
                key={student.id}
                className={idx % 2 === 0 ? "bg-white dark:bg-[#141721]" : "bg-slate-50/40 dark:bg-[#181B26]/50"}
              >
                <td className="sticky left-0 bg-inherit z-10 px-5 py-3 border-r border-slate-200/80 dark:border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{student.name}</p>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5]">{student.email}</p>
                  </div>
                </td>
                {data.assignments.map((assignment) => {
                  const cell = data.grades[student.id]?.[assignment.id];
                  const localVal = localGrades[student.id]?.[assignment.id];
                  const parsedLocal = localVal !== undefined ? parseFloat(localVal) : undefined;
                  const displayGrade = localVal !== undefined ? (isNaN(parsedLocal!) ? "" : parsedLocal) : cell?.grade;
                  const isEditing = editingCell?.studentId === student.id && editingCell?.assignmentId === assignment.id;

                  const isSelected = selectedCell?.studentId === student.id && selectedCell?.assignmentId === assignment.id;

                  const hasSubmission = Boolean(cell?.submissionId);
                  const hasWork = Boolean(
                    hasSubmission && (
                      (cell?.attachments && cell.attachments.length > 0) ||
                      (cell?.submittedAt && (cell.status === "SUBMITTED" || cell.status === "RETURNED"))
                    )
                  );
                  const hasGrade = displayGrade !== null && displayGrade !== undefined && displayGrade !== "";
                  const isNeedsGrading = hasWork && !hasGrade;

                  return (
                    <td
                      key={assignment.id}
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 border-r border-slate-200/80 dark:border-white/5 cursor-pointer transition-colors ${
                        isNeedsGrading
                          ? "bg-amber-500/[0.08] dark:bg-amber-500/[0.14] border-amber-300/80 dark:border-amber-500/30 hover:bg-amber-500/[0.14] dark:hover:bg-amber-500/[0.22] ring-1 ring-inset ring-amber-500/30 dark:ring-amber-500/40"
                          : isSelected 
                          ? "bg-slate-500/10 dark:bg-white/10 outline outline-2 -outline-offset-2 relative z-10" 
                          : "hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                      }`}
                      style={isSelected ? { outlineColor: theme?.colors.primary ?? "#3B82F6" } : undefined}
                      onClick={() => {
                        setSelectedCell({ studentId: student.id, assignmentId: assignment.id });
                        if (!isMobileView) {
                          setEditingCell({ studentId: student.id, assignmentId: assignment.id });
                        }
                      }}
                    >
                      {isEditing && !isMobileView ? (
                        <div className="flex items-center justify-between gap-1.5 min-w-[75px]">
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            max={assignment.maxPoints ?? undefined}
                            step={0.5}
                            defaultValue={displayGrade ?? ""}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (assignment.maxPoints !== null && val !== "") {
                                const num = parseFloat(val);
                                if (!isNaN(num) && num > assignment.maxPoints) {
                                  val = assignment.maxPoints.toString();
                                  e.target.value = val;
                                }
                              }
                              handleCellEdit(student.id, assignment.id, val, assignment.maxPoints);
                            }}
                            onBlur={() => handleCellBlur(student.id, assignment.id, assignment.maxPoints)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                                const sIdx = data.students.findIndex(s => s.id === student.id);
                                if (sIdx < data.students.length - 1) {
                                  const nextCell = { studentId: data.students[sIdx + 1].id, assignmentId: assignment.id };
                                  setTimeout(() => {
                                    setSelectedCell(nextCell);
                                    setEditingCell(nextCell);
                                  }, 50);
                                }
                              } else if (e.key === "Escape") {
                                setEditingCell(null);
                              } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                                e.currentTarget.blur();
                                const sIdx = data.students.findIndex(s => s.id === student.id);
                                const nextIdx = e.key === "ArrowUp" ? sIdx - 1 : sIdx + 1;
                                if (nextIdx >= 0 && nextIdx < data.students.length) {
                                  const nextCell = { studentId: data.students[nextIdx].id, assignmentId: assignment.id };
                                  setTimeout(() => {
                                    setSelectedCell(nextCell);
                                    setEditingCell(nextCell);
                                  }, 50);
                                }
                              }
                            }}
                            className="w-16 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1E2132] px-1.5 py-0.5 text-sm text-slate-900 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 font-mono tabular-nums"
                            style={{ borderColor: theme?.colors.primary }}
                          />
                          {hasWork && (
                            <button
                              type="button"
                              title={
                                cell?.attachments && cell.attachments.length > 0
                                  ? `View submitted work (${cell.attachments.length} attachment${cell.attachments.length > 1 ? "s" : ""})`
                                  : "View student submission"
                              }
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setGradingSubmission({
                                  submission: {
                                    id: cell.submissionId!,
                                    status: cell.status || "SUBMITTED",
                                    grade: typeof displayGrade === "number" ? displayGrade : cell.grade,
                                    isReturned: Boolean(cell.isReturned),
                                    submittedAt: cell.submittedAt ? new Date(cell.submittedAt) : null,
                                    student: {
                                      id: student.id,
                                      name: student.name,
                                      email: student.email,
                                    },
                                    attachments: cell.attachments || [],
                                  },
                                  maxPoints: assignment.maxPoints,
                                  itemId: assignment.id,
                                  studentId: student.id,
                                });
                              }}
                              className="hidden md:inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-slate-200/50 dark:border-white/10 shrink-0 cursor-pointer"
                            >
                              {cell?.attachments && cell.attachments.length > 0 ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1.5 min-w-[75px]">
                          {isNeedsGrading ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              <span>To Grade</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-block rounded-lg px-2.5 py-1 text-sm transition-colors ${
                                displayGrade !== null && displayGrade !== undefined && displayGrade !== ""
                                  ? gradeColor(displayGrade as number | null, assignment.maxPoints)
                                  : cell?.submissionId
                                  ? "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"
                                  : "text-slate-300 dark:text-slate-600"
                              }`}
                            >
                              {displayGrade !== null && displayGrade !== undefined && displayGrade !== ""
                                ? `${displayGrade}${assignment.maxPoints ? `/${assignment.maxPoints}` : ""}`
                                : cell?.submissionId
                                ? "—"
                                : "·"}
                            </span>
                          )}

                          {/* Submission Work Modal Link / Button: Hidden in Mobile Web View, Available in Tablet and Desktop */}
                          {!isMobileView && hasWork && (
                            <button
                              type="button"
                              title={
                                cell?.attachments && cell.attachments.length > 0
                                  ? `View submitted work (${cell.attachments.length} attachment${cell.attachments.length > 1 ? "s" : ""})`
                                  : "View student submission"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setGradingSubmission({
                                  submission: {
                                    id: cell.submissionId!,
                                    status: cell.status || "SUBMITTED",
                                    grade: typeof displayGrade === "number" ? displayGrade : cell.grade,
                                    isReturned: Boolean(cell.isReturned),
                                    submittedAt: cell.submittedAt ? new Date(cell.submittedAt) : null,
                                    student: {
                                      id: student.id,
                                      name: student.name,
                                      email: student.email,
                                    },
                                    attachments: cell.attachments || [],
                                  },
                                  maxPoints: assignment.maxPoints,
                                  itemId: assignment.id,
                                  studentId: student.id,
                                });
                              }}
                              className={`hidden md:inline-flex items-center justify-center p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                                isNeedsGrading
                                  ? "text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30"
                                  : "text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-slate-200/50 dark:border-white/10"
                              }`}
                            >
                              {cell?.attachments && cell.attachments.length > 0 ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                {hasValidPolicy && (
                  <td className="sticky right-0 bg-orange-50/30 dark:bg-orange-950/10 z-10 px-5 py-3 border-l border-orange-200/40 dark:border-orange-900/30 text-right shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    {(() => {
                      const final = computeFinalGrade(student.id);
                      if (final === null) return <span className="text-slate-400 dark:text-slate-600">—</span>;
                      const eq = getGradingScaleEquivalent(final);
                      return (
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-lg font-mono tabular-nums ${final >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {eq}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-mono tabular-nums">{final.toFixed(1)}%</span>
                        </div>
                      );
                    })()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="sticky bottom-0 bg-white dark:bg-[#141721] border-t border-slate-200/80 dark:border-white/5 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#8B92A5]">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-[#F0F2F8]">Legend:</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" /> ≥ 80%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500/40" /> ≥ 50%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/40" /> &lt; 50%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500/30 border border-amber-500/60 ring-1 ring-amber-500/30" /> Needs grade (work submitted)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20" /> Not graded</span>
        </div>
        <div>
          {isMobileView ? (
            <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              View Mode Active (Enter Edit Mode in PC & Tablet Web View)
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              Click a cell to edit grade inline
            </span>
          )}
        </div>
      </div>
    </div>

      <GradingPolicyModal
        open={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onSave={handleSavePolicy}
        activeCategories={activeCategories}
        initialWeights={policyWeights}
        readOnly={isMobileView}
        theme={theme || {
          code: "ics",
          name: "Default",
          colors: {
            primary: "#4f46e5",
            primaryHover: "#4338ca",
            sidebar: "#ffffff",
            sidebarMuted: "#f3f4f6",
            background: "#f9fafb",
            card: "#ffffff",
            text: "#111827",
            border: "#e5e7eb",
            ring: "#a5b4fc",
          }
        }}
      />

      {gradingSubmission && (
        <GradeEvaluationModal
          submission={gradingSubmission.submission}
          maxPoints={gradingSubmission.maxPoints}
          instituteCode={instituteCode}
          courseId={courseId}
          itemId={gradingSubmission.itemId}
          onClose={() => setGradingSubmission(null)}
          onGraded={handleModalGraded}
        />
      )}
    </>
  );
}
