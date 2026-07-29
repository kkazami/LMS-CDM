"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Star, Settings } from "lucide-react";
import { updateGrade, upsertGrade, saveGradingPolicy, type GradebookData } from "./actions";

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
import type { InstituteTheme } from "@/lib/theme";

interface GradebookClientProps {
  data: GradebookData;
  courseId: string;
  courseTitle: string;
  instituteCode: string;
  theme?: InstituteTheme;
}

function gradeColor(grade: number | null, maxPoints: number | null): string {
  if (grade === null) return "text-gray-400 bg-transparent";
  if (!maxPoints) return "text-gray-700";
  const pct = (grade / maxPoints) * 100;
  if (pct >= 80) return "text-emerald-700 bg-emerald-50 font-semibold";
  if (pct >= 50) return "text-amber-700 bg-amber-50 font-semibold";
  return "text-red-700 bg-red-50 font-semibold";
}

export default function GradebookClient({ data, courseId, courseTitle, instituteCode, theme }: GradebookClientProps) {
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
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

  function handleCellEdit(studentId: string, assignmentId: string, value: string) {
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [assignmentId]: value },
    }));
  }

  function handleCellBlur(studentId: string, assignmentId: string) {
    const rawValue = localGrades[studentId]?.[assignmentId];
    if (rawValue === undefined) {
      setEditingCell(null);
      return;
    }
    const gradeNum = parseFloat(rawValue);
    if (!isNaN(gradeNum) && rawValue !== "") {
      startTransition(async () => {
        await upsertGrade(assignmentId, studentId, gradeNum);
      });
    }
    setEditingCell(null);
  }

  if (data.assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-8">
        <Star className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">No gradable items yet</h2>
        <p className="text-sm text-gray-400 mt-1">Create assignments or quizzes with point values to see the gradebook.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-6 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/${instituteCode}/courses/${courseId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {courseTitle}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800">Gradebook</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Settings className="h-4 w-4" />
              Grading Policy
              {hasValidPolicy && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ml-1"></span>
              )}
            </button>
            <a
              href={`/api/courses/${courseId}/gradebook/export`}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-300 sticky top-0 z-10">
              <th className="sticky left-0 bg-white z-20 px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-200 min-w-[200px]">
                Student
              </th>
              {data.assignments.map((a) => (
                <th
                  key={a.id}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-r border-gray-200 min-w-[140px]"
                >
                  <div className="truncate max-w-[130px]" title={a.title}>{a.title}</div>
                  {a.maxPoints && (
                    <div className="text-gray-400 font-normal normal-case">{a.maxPoints} pts</div>
                  )}
                </th>
              ))}
              {hasValidPolicy && (
                <th className="sticky right-0 bg-indigo-50 z-20 px-5 py-3 text-right text-xs font-bold text-indigo-900 uppercase tracking-wide border-l border-indigo-100 min-w-[120px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  Final Grade
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.students.map((student, idx) => (
              <tr
                key={student.id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
              >
                <td className="sticky left-0 bg-inherit z-10 px-5 py-3 border-r border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.email}</p>
                  </div>
                </td>
                {data.assignments.map((assignment) => {
                  const cell = data.grades[student.id]?.[assignment.id];
                  const localVal = localGrades[student.id]?.[assignment.id];
                  const parsedLocal = localVal !== undefined ? parseFloat(localVal) : undefined;
                  const displayGrade = localVal !== undefined ? (isNaN(parsedLocal!) ? "" : parsedLocal) : cell?.grade;
                  const isEditing = editingCell?.studentId === student.id && editingCell?.assignmentId === assignment.id;

                  const isSelected = selectedCell?.studentId === student.id && selectedCell?.assignmentId === assignment.id;

                  return (
                    <td
                      key={assignment.id}
                      className={`px-4 py-3 border-r border-gray-200 cursor-pointer transition-colors ${isSelected ? "bg-indigo-50 border-indigo-200 outline outline-2 outline-indigo-500 -outline-offset-2 relative z-10" : "hover:bg-gray-50/80"}`}
                      onClick={() => {
                        setSelectedCell({ studentId: student.id, assignmentId: assignment.id });
                        setEditingCell({ studentId: student.id, assignmentId: assignment.id });
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={assignment.maxPoints ?? undefined}
                          step={0.5}
                          defaultValue={displayGrade ?? ""}
                          onChange={(e) => handleCellEdit(student.id, assignment.id, e.target.value)}
                          onBlur={() => handleCellBlur(student.id, assignment.id)}
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
                          className="w-16 rounded border border-indigo-300 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      ) : (
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 text-sm transition-colors ${
                            displayGrade !== null && displayGrade !== undefined && displayGrade !== ""
                              ? gradeColor(displayGrade as number | null, assignment.maxPoints)
                              : cell?.submissionId
                              ? "text-gray-500 bg-gray-50"
                              : "text-gray-300"
                          }`}
                        >
                          {displayGrade !== null && displayGrade !== undefined && displayGrade !== ""
                            ? `${displayGrade}${assignment.maxPoints ? `/${assignment.maxPoints}` : ""}`
                            : cell?.submissionId
                            ? "—"
                            : "·"}
                        </span>
                      )}
                    </td>
                  );
                })}
                {hasValidPolicy && (
                  <td className="sticky right-0 bg-indigo-50/50 z-10 px-5 py-3 border-l border-indigo-100 text-right shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    {(() => {
                      const final = computeFinalGrade(student.id);
                      if (final === null) return <span className="text-gray-400">—</span>;
                      const eq = getGradingScaleEquivalent(final);
                      return (
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-lg ${final >= 75 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {eq}
                          </span>
                          <span className="text-xs text-gray-500">{final.toFixed(1)}%</span>
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
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-6 text-xs text-gray-500">
        <span className="font-semibold">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-50 border border-emerald-200" /> ≥ 80%</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-50 border border-amber-200" /> ≥ 50%</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-50 border border-red-200" /> &lt; 50%</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-gray-100 border border-gray-300" /> Not graded</span>
        <span className="ml-2 text-gray-400 italic">Click a cell to edit grade inline</span>
      </div>

      <GradingPolicyModal
        open={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onSave={handleSavePolicy}
        activeCategories={activeCategories}
        initialWeights={policyWeights}
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
    </div>
  );
}
