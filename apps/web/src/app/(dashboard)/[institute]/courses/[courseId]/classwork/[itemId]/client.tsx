"use client";

import Link from "next/link";
import { FileText, Link2, Calendar, Star, ChevronRight, ArrowLeft, Users } from "lucide-react";
import YourWorkPanel from "@/components/courses/YourWorkPanel";
import type { InstituteTheme } from "@/lib/theme";

interface Attachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

interface SubmissionAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

interface Submission {
  id: string;
  status: string;
  grade: number | null;
  isReturned: boolean;
  submittedAt: Date | null;
  attachments: SubmissionAttachment[];
}

interface SyllabusItem {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: Date | null;
  maxPoints: number | null;
  attachments: Attachment[];
  course: {
    id: string;
    title: string;
    code: string;
  };
}

interface AssignmentDetailClientProps {
  item: SyllabusItem;
  submission: Submission | null;
  isStudent: boolean;
  isInstructor: boolean;
  instituteCode: string;
  courseId: string;
  enrolledCount?: number;
  theme: InstituteTheme;
}

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const isLink = attachment.type === "LINK";
  const Icon = isLink ? Link2 : FileText;

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 hover:border-indigo-200 hover:shadow-sm transition-all group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {attachment.fileName || attachment.url}
        </p>
        <p className="text-xs text-gray-400">{isLink ? "Link" : "File"}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition-colors" />
    </a>
  );
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  ASSIGNMENT: { label: "Assignment", color: "bg-blue-100 text-blue-700" },
  QUIZ: { label: "Quiz", color: "bg-amber-100 text-amber-700" },
  MATERIAL: { label: "Material", color: "bg-gray-100 text-gray-600" },
};

export default function AssignmentDetailClient({
  item,
  submission,
  isStudent,
  isInstructor,
  instituteCode,
  courseId,
  enrolledCount,
  theme,
}: AssignmentDetailClientProps) {
  const isPastDeadline = item.dueDate ? new Date() > item.dueDate : false;
  const typeMeta = TYPE_META[item.type] ?? TYPE_META.MATERIAL;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href={`/${instituteCode}/courses/${courseId}/classwork`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {item.course.title}
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <span className="text-sm font-medium text-gray-800 truncate max-w-[300px]">
            {item.title}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left: Assignment details */}
          <div className="space-y-6 min-w-0">
            {/* Header card */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {item.dueDate && (
                  <div className={`flex items-center gap-1.5 ${isPastDeadline ? "text-red-500 font-medium" : ""}`}>
                    <Calendar className="h-4 w-4" />
                    <span>Due {formatDueDate(item.dueDate)}</span>
                    {isPastDeadline && <span className="text-xs font-semibold">(Past)</span>}
                  </div>
                )}
                {item.maxPoints && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>{item.maxPoints} points</span>
                  </div>
                )}
                {isInstructor && enrolledCount !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{enrolledCount} students</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Instructions</h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</div>
              </div>
            )}

            {/* Instructor attachments */}
            {item.attachments.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Materials & Resources
                </h2>
                <div className="space-y-2">
                  {item.attachments.map((att) => (
                    <AttachmentChip key={att.id} attachment={att} />
                  ))}
                </div>
              </div>
            )}

            {/* Instructor: view submissions link */}
            {isInstructor && (
              <Link
                href={`/${instituteCode}/courses/${courseId}/classwork/${item.id}/submissions`}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4 hover:from-indigo-100 hover:to-purple-100 transition-all group"
              >
                <div>
                  <p className="font-semibold text-indigo-800">Student Submissions</p>
                  <p className="text-sm text-indigo-600 mt-0.5">View and grade submitted work</p>
                </div>
                <ChevronRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

          {/* Right: Your Work panel (students only) */}
          {isStudent && submission && item.type !== "MATERIAL" && (
            <div className="min-w-0">
              <YourWorkPanel
                submission={submission}
                isPastDeadline={isPastDeadline}
                maxPoints={item.maxPoints}
                instituteCode={instituteCode}
                courseId={courseId}
                itemId={item.id}
                theme={theme}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
