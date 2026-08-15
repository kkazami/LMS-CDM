"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  Lock,
  Link2,
  Trash2,
  Paperclip,
  RotateCcw,
  FileText,
  Send,
} from "lucide-react";
import {
  submitWork,
  unsubmitWork,
  addSubmissionLink,
  addSubmissionFile,
  removeSubmissionAttachment,
} from "@/app/(dashboard)/[institute]/courses/[courseId]/classwork/[itemId]/actions";
import AttachmentModal from "@/components/courses/AttachmentModal";
import type { AttachmentItem } from "@/components/courses/AttachmentModal";
import type { InstituteTheme } from "@/lib/theme";

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

interface YourWorkPanelProps {
  submission: Submission;
  isPastDeadline: boolean;
  maxPoints: number | null;
  instituteCode: string;
  courseId: string;
  itemId: string;
  theme?: InstituteTheme;
}

// Fallback theme for when theme is not passed
const DEFAULT_THEME: InstituteTheme = {
  code: "ics", // Using a valid code as fallback
  name: "Default",
  colors: {
    primary: "#6366f1",
    primaryHover: "#4f46e5",
    sidebar: "#ffffff",
    sidebarMuted: "#f3f4f6",
    background: "#eef2ff",
    card: "#ffffff",
    text: "#312e81",
    border: "#c7d2fe",
    ring: "#818cf8",
  },
};

export default function YourWorkPanel({
  submission: initialSubmission,
  isPastDeadline,
  maxPoints,
  instituteCode,
  courseId,
  itemId,
  theme = DEFAULT_THEME,
}: YourWorkPanelProps) {
  const [submission, setSubmission] = useState(initialSubmission);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLocked = isPastDeadline && submission.status === "DRAFT";
  const isSubmitted = submission.status === "SUBMITTED";
  const isReturned = submission.status === "RETURNED" || submission.isReturned;
  const canEdit = !isPastDeadline && !isSubmitted;

  const statusConfig = {
    DRAFT: { label: "Not submitted", color: "text-slate-500 dark:text-[#8B92A5]", bg: "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5", Icon: FileText },
    SUBMITTED: {
      label: submission.submittedAt
        ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : "Submitted",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border border-emerald-500/20",
      Icon: CheckCircle2,
    },
    GRADED: { label: "Graded", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10 border border-blue-500/20", Icon: CheckCircle2 },
    RETURNED: { label: "Returned with grade", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-500/10 border border-purple-500/20", Icon: CheckCircle2 },
  };

  const status = statusConfig[submission.status as keyof typeof statusConfig] ?? statusConfig.DRAFT;

  async function handleSubmit() {
    startTransition(async () => {
      const result = await submitWork(submission.id, instituteCode, courseId, itemId);
      if (!result.success) {
        setError(result.error ?? "Failed to submit.");
      } else {
        setSubmission((s) => ({ ...s, status: "SUBMITTED", submittedAt: new Date() }));
        setError("");
      }
    });
  }

  async function handleUnsubmit() {
    startTransition(async () => {
      const result = await unsubmitWork(submission.id, instituteCode, courseId, itemId);
      if (!result.success) {
        setError(result.error ?? "Failed to unsubmit.");
      } else {
        setSubmission((s) => ({ ...s, status: "DRAFT", submittedAt: null }));
        setError("");
      }
    });
  }

  async function handleRemove(attachmentId: string) {
    startTransition(async () => {
      const result = await removeSubmissionAttachment(attachmentId, submission.id, instituteCode, courseId, itemId);
      if (!result.success) {
        setError(result.error ?? "Failed to remove.");
      } else {
        setSubmission((s) => ({
          ...s,
          attachments: s.attachments.filter((a) => a.id !== attachmentId),
        }));
        setError("");
      }
    });
  }

  // Handle attachment save from modal — calls server actions for each new attachment
  async function handleAttachmentSave(saved: AttachmentItem[]) {
    setError("");

    // Determine which attachments are new (no id means newly added)
    const existingIds = new Set(submission.attachments.map((a) => a.id));
    const newAttachments = saved.filter((a) => !a.id || !existingIds.has(a.id));

    // Determine which were removed
    const savedUrls = new Set(saved.map((a) => a.url));
    const removedAttachments = submission.attachments.filter((a) => !savedUrls.has(a.url));

    startTransition(async () => {
      // Remove deleted attachments
      for (const att of removedAttachments) {
        await removeSubmissionAttachment(att.id, submission.id, instituteCode, courseId, itemId);
      }

      // Add new attachments
      const addedAttachments: SubmissionAttachment[] = [];
      for (const att of newAttachments) {
        let result;
        if (att.type === "LINK") {
          result = await addSubmissionLink(
            submission.id,
            att.url,
            att.fileName,
            instituteCode,
            courseId,
            itemId
          );
        } else {
          result = await addSubmissionFile(
            submission.id,
            att.url,
            att.fileName,
            instituteCode,
            courseId,
            itemId
          );
        }

        if (!result.success) {
          setError(result.error ?? "Failed to add attachment.");
          return;
        }

        addedAttachments.push({
          id: ("attachmentId" in result && result.attachmentId) ? result.attachmentId as string : Date.now().toString(),
          type: att.type,
          url: att.url,
          fileName: att.fileName,
        });
      }

      // Update local state
      setSubmission((s) => ({
        ...s,
        status: "DRAFT",
        attachments: [
          ...s.attachments.filter((a) => savedUrls.has(a.url)),
          ...addedAttachments,
        ],
      }));
    });
  }

  return (
    <div className="sticky top-6 space-y-4">
      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
        <status.Icon className="h-3.5 w-3.5" />
        {status.label}
      </div>

      {/* Grade display (returned) */}
      {isReturned && submission.grade !== null && (
        <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4 text-center">
          <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
            {submission.grade}
            {maxPoints && <span className="text-lg text-purple-400">/{maxPoints}</span>}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 font-medium">Grade received</p>
        </div>
      )}

      {/* Deadline-passed lock notice */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>The deadline has passed. Submission is locked.</span>
        </div>
      )}

      {/* Your work card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">Your work</h3>
          {canEdit && (
            <button
              onClick={() => setIsAttachModalOpen(true)}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add or create
            </button>
          )}
        </div>

        {/* Attachment list */}
        <div className="p-3 min-h-[80px] space-y-1.5">
          {submission.attachments.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-[#8B92A5] text-center py-6">
              {canEdit ? "Attach files or links to your work" : "No attachments"}
            </p>
          )}

          {submission.attachments.map((att) => {
            const isLink = att.type === "LINK";
            const Icon = isLink ? Link2 : FileText;
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group"
              >
                <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.url.startsWith("data:") ? (att.fileName || "file") : undefined}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 min-w-0"
                >
                  {att.fileName || att.url}
                </a>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                  {isLink ? "Link" : "File"}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleRemove(att.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="px-4 pb-2 text-xs text-red-500">{error}</p>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4 pt-1">
          {!isLocked && !isReturned && (
            isSubmitted ? (
              <button
                onClick={handleUnsubmit}
                disabled={isPending || isPastDeadline}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Unsubmit
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] py-2.5 text-xs font-semibold text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {isPending ? "Submitting..." : "Turn in"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Attachment Modal for students */}
      <AttachmentModal
        open={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onSave={handleAttachmentSave}
        existingAttachments={submission.attachments.map((a) => ({
          id: a.id,
          type: a.type as "FILE" | "LINK",
          url: a.url,
          fileName: a.fileName,
        }))}
        theme={theme}
        title="Attach Your Work"
      />
    </div>
  );
}
