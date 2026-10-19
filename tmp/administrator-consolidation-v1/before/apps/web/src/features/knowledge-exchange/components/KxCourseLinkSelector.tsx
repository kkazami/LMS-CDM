"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, GraduationCap, AlertTriangle } from "lucide-react";

export interface CourseOption {
  id: string;
  code: string;
  title: string;
}

export interface SyllabusItemOption {
  id: string;
  title: string;
  type: string;
  enableIntegrityMonitoring?: boolean;
}

interface KxCourseLinkSelectorProps {
  courses: CourseOption[];
  selectedCourseId?: string | null;
  selectedSyllabusItemId?: string | null;
  onSelectCourse: (courseId: string | null) => void;
  onSelectSyllabusItem: (itemId: string | null) => void;
  disabled?: boolean;
}

export default function KxCourseLinkSelector({
  courses,
  selectedCourseId,
  selectedSyllabusItemId,
  onSelectCourse,
  onSelectSyllabusItem,
  disabled = false,
}: KxCourseLinkSelectorProps) {
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch syllabus items when course selection changes
  useEffect(() => {
    if (!selectedCourseId) {
      setSyllabusItems([]);
      return;
    }

    let isMounted = true;
    setLoadingItems(true);

    fetch(`/api/courses/${selectedCourseId}/syllabus-items`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) {
          setSyllabusItems(Array.isArray(data) ? data : data.items || []);
        }
      })
      .catch(() => {
        if (isMounted) setSyllabusItems([]);
      })
      .finally(() => {
        if (isMounted) setLoadingItems(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  const selectedItem = syllabusItems.find(
    (item) => item.id === selectedSyllabusItemId
  );

  const isAssessmentLinked =
    selectedItem?.type === "QUIZ" ||
    selectedItem?.type === "EXAM" ||
    Boolean(selectedItem?.enableIntegrityMonitoring);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Course Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Link Course (Optional)
          </label>
          <div className="relative">
            <select
              value={selectedCourseId || ""}
              disabled={disabled}
              onChange={(e) => {
                const val = e.target.value || null;
                onSelectCourse(val);
                onSelectSyllabusItem(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer"
            >
              <option value="">-- No specific course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Syllabus Item Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Link Syllabus / Assessment (Optional)
          </label>
          <div className="relative">
            <select
              value={selectedSyllabusItemId || ""}
              disabled={disabled || !selectedCourseId || loadingItems}
              onChange={(e) => onSelectSyllabusItem(e.target.value || null)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="">
                {loadingItems
                  ? "Loading syllabus items..."
                  : !selectedCourseId
                  ? "Select a course first"
                  : "-- General course question --"}
              </option>
              {syllabusItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.type}] {item.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assessment Integrity Notice */}
      {isAssessmentLinked && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">
              Academic Integrity Notice: Linked to Assessment
            </span>
            <span>
              This post is tied to an active quiz or graded assessment. Posting
              direct answers or exam content violates the CDM Student Code of
              Conduct and will be escalated to instructors.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
