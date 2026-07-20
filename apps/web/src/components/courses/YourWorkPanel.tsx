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
    DRAFT: { label: "Not submitted", color: "text-gray-500", bg: "bg-gray-100", Icon: FileText },
    SUBMITTED: {
      label: submission.submittedAt
        ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : "Submitted",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      Icon: CheckCircle2,
    },
    GRADED: { label: "Graded", color: "text-blue-700", bg: "bg-blue-50", Icon: CheckCircle2 },
    RETURNED: { label: "Returned with grade", color: "text-purple-700", bg: "bg-purple-50", Icon: CheckCircle2 },
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
    <div className="sticky top-6">
      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${status.bg} ${status.color}`}>
        <status.Icon className="h-4 w-4" />
        {status.label}
      </div>

      {/* Grade display (returned) */}
      {isReturned && submission.grade !== null && (
        <div className="mb-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">
            {submission.grade}
            {maxPoints && <span className="text-lg text-purple-400">/{maxPoints}</span>}
          </p>
          <p className="text-xs text-purple-500 mt-0.5">Grade received</p>
        </div>
      )}

      {/* Deadline-passed lock notice */}
      {isLocked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600">
          <Lock className="h-4 w-4 shrink-0" />
          <span>The deadline has passed. Submission is locked.</span>
        </div>
      )}



      {/* Your work card */}
      <div className="rounded-2xl border border-gray-300 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Your work</h3>
          {canEdit && (
            <button
              onClick={() => setIsAttachModalOpen(true)}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add or create
            </button>
          )}
        </div>

        {/* Attachment list */}
        <div className="p-3 min-h-[80px]">
          {submission.attachments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {canEdit ? "Attach files or links to your work" : "No attachments"}
            </p>
          )}

          {submission.attachments.map((att) => {
            const isLink = att.type === "LINK";
            const Icon = isLink ? Link2 : FileText;
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group"
              >
                <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate flex-1 min-w-0"
                >
                  {att.fileName || att.url}
                </a>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {isLink ? "Link" : "File"}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleRemove(att.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0"
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
        <div className="px-4 pb-4">
          {!isLocked && !isReturned && (
            isSubmitted ? (
              <button
                onClick={handleUnsubmit}
                disabled={isPending || isPastDeadline}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Unsubmit
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                <Send className="h-4 w-4" />
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
