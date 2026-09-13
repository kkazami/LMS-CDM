"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Link2, Calendar, Star, ChevronRight, ArrowLeft, Users, Shield, Maximize2 } from "lucide-react";
import YourWorkPanel from "@/components/courses/YourWorkPanel";
import ConvertFlashcardsModal from "@/components/courses/ConvertFlashcardsModal";
import type { InstituteTheme } from "@/lib/theme";
import { useQuizIntegrityMonitor } from "@/hooks/useQuizIntegrityMonitor";
import IntegrityFeedbackToast from "@/components/courses/IntegrityFeedbackToast";
import FullscreenEnforcementModal from "@/components/courses/FullscreenEnforcementModal";

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
  enableIntegrityMonitoring?: boolean;
  requireFullscreen?: boolean;
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

// Check if a file extension supports flashcard conversion
function isConvertibleFile(fileName: string): boolean {
  const ext = fileName.toLowerCase();
  return ext.endsWith(".pdf") || ext.endsWith(".pptx") || ext.endsWith(".docx") || ext.endsWith(".txt");
}

function AttachmentChip({ 
  attachment, 
  item, 
  instituteCode, 
  isStudent,
  onConvertClick,
}: { 
  attachment: Attachment;
  item: SyllabusItem;
  instituteCode: string;
  isStudent: boolean;
  onConvertClick?: (attachmentId: string, attachmentName: string) => void;
}) {
  const isLink = attachment.type === "LINK";
  const Icon = isLink ? Link2 : FileText;

  const isMaterialFile = isStudent && item.type === "MATERIAL" && !isLink;
  const href = isMaterialFile
    ? `/${instituteCode}/learning-materials/${item.course.id}/${item.id}/read?attachmentId=${attachment.id}`
    : attachment.url;

  // Show the convert button only for MATERIAL items with supported file types
  const showConvertBtn = isStudent && item.type === "MATERIAL" && !isLink && isConvertibleFile(attachment.fileName);

  // Use Link for internal navigation, otherwise use 'a'
  const Component = isMaterialFile ? Link : "a";

  return (
    <div className="flex items-center gap-2">
      <Component
        href={href}
        target={isMaterialFile ? undefined : "_blank"}
        rel={isMaterialFile ? undefined : "noopener noreferrer"}
        download={!isMaterialFile && attachment.url.startsWith("data:") ? (attachment.fileName || "file") : undefined}
        className="flex-1 flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/4 hover:border-orange-500/30 hover:shadow-xs transition-all group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-[#F97316] transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-[#F0F2F8] truncate">
            {attachment.fileName || attachment.url}
          </p>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5]">{isLink ? "Link" : "File"}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-[#F97316] transition-colors" />
      </Component>

      {/* Convert to Flashcards button — only for MATERIAL file attachments */}
      {showConvertBtn && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConvertClick?.(attachment.id, attachment.fileName);
          }}
          title="Convert to Flashcards"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  ASSIGNMENT: { label: "Assignment", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20" },
  QUIZ: { label: "Quiz", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20" },
  MATERIAL: { label: "Material", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" },
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

  const isQuizOrActivity = item.type === "QUIZ" || item.type === "ACTIVITY";
  const isSubmissionOpen = !submission || submission.status === "DRAFT";
  const shouldMonitor = isStudent && isQuizOrActivity && Boolean(item.enableIntegrityMonitoring) && isSubmissionOpen;

  const {
    toast,
    dismissToast,
    isMonitoringActive,
    isFullscreen,
    hasEnteredFullscreenOnce,
    hasExitedFullscreen,
    enterFullscreen,
  } = useQuizIntegrityMonitor({
    syllabusItemId: item.id,
    submissionId: submission?.id,
    enabled: shouldMonitor,
    requireFullscreen: Boolean(item.requireFullscreen),
    isStudent,
  });

  return (
    <div className="min-h-screen">
      {/* Breadcrumb header */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] px-4 py-3 sm:px-6 sm:py-4 mb-6 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={`/${instituteCode}/courses/${courseId}/classwork`}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.course.title}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-300 dark:text-white/10 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-[#F0F2F8] truncate flex-1 min-w-0">

            {item.title}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Assignment details */}
          <div className="space-y-6 min-w-0">
            {/* Header card */}
            <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs p-6">
              <div className="flex items-start gap-2.5 mb-4 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
                {item.enableIntegrityMonitoring && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                    <Shield className="w-3 h-3 text-orange-500" />
                    Integrity Monitored
                  </span>
                )}
                {item.requireFullscreen && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                    <Maximize2 className="w-3 h-3 text-purple-500" />
                    Fullscreen Required
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] mb-4">{item.title}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-[#8B92A5]">
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
              <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs p-6">
                <h2 className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mb-3">Instructions</h2>
                <div className="text-slate-700 dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">{item.description}</div>
              </div>
            )}

            {/* Instructor attachments */}
            {item.attachments.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs p-6">
                <h2 className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mb-3">
                  Materials & Resources
                </h2>
                <div className="space-y-2">
                  {item.attachments.map((att) => (
                    <AttachmentChip 
                      key={att.id} 
                      attachment={att} 
                      item={item}
                      instituteCode={instituteCode}
                      isStudent={isStudent}
                      onConvertClick={(id, name) => setConvertModal({ attachmentId: id, attachmentName: name })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Instructor: view submissions link */}
            {isInstructor && (
              <Link
                href={`/${instituteCode}/courses/${courseId}/classwork/${item.id}/submissions`}
                className="flex items-center justify-between rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 p-5 hover:bg-orange-500/20 transition-all group"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-[#F0F2F8]">Student Submissions</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">View and grade submitted work</p>
                </div>
                <ChevronRight className="h-5 w-5 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
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

      {/* Non-punitive subtle on-screen integrity feedback toast & status indicator */}
      <IntegrityFeedbackToast
        toast={toast}
        onDismiss={dismissToast}
        isMonitoringActive={isMonitoringActive}
      />

      {/* Fullscreen enforcement prompt & exit warning for required assessments */}
      {shouldMonitor && item.requireFullscreen && (
        <FullscreenEnforcementModal
          isOpen={(!hasEnteredFullscreenOnce && !isFullscreen) || (hasEnteredFullscreenOnce && hasExitedFullscreen && !isFullscreen)}
          isInitialPrompt={!hasEnteredFullscreenOnce && !isFullscreen}
          onEnterFullscreen={enterFullscreen}
          quizTitle={item.title}
        />
      )}
    </div>
  );
}
