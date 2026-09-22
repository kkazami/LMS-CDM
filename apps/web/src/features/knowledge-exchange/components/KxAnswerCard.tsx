"use client";

import React, { useState } from "react";
import { Flag, Trash2, Edit3, MessageSquare } from "lucide-react";
import { marked } from "marked";
import KxVoteButton from "./KxVoteButton";
import KxAcceptButton from "./KxAcceptButton";
import KxVerifyBadge from "./KxVerifyBadge";
import KxUserCard from "./KxUserCard";
import KxCommentThread from "./KxCommentThread";
import KxFlagModal from "./KxFlagModal";
import KxLatexRenderer from "./KxLatexRenderer";
import type { KxAnswerItem } from "../types";
import { sanitizeKxHtml } from "../utils";

interface KxAnswerCardProps {
  answer: KxAnswerItem;
  postAuthorId?: string;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  onAcceptedChanged?: (answerId: string, accepted: boolean) => void;
  onVerifiedChanged?: (answerId: string, verified: boolean) => void;
  onDeleteAnswer?: (answerId: string) => void;
}

export default function KxAnswerCard({
  answer,
  postAuthorId,
  currentUserId,
  currentUserRole,
  currentUserAvatar,
  currentUserName,
  onAcceptedChanged,
  onVerifiedChanged,
  onDeleteAnswer,
}: KxAnswerCardProps) {
  const [isFlagOpen, setIsFlagOpen] = useState(false);

  const isQuestionAuthor = Boolean(
    currentUserId && currentUserId === postAuthorId
  );
  const isAnswerAuthor = Boolean(
    currentUserId &&
      (currentUserId === answer.authorId || answer.author?.isSelf)
  );

  const roleUpper = currentUserRole?.toUpperCase() || "";
  const isInstructorOrAdmin =
    roleUpper === "ADMIN" ||
    roleUpper === "PROFESSOR" ||
    roleUpper === "INSTRUCTOR" ||
    roleUpper === "TEACHER";

  const parsedHtml = sanitizeKxHtml(marked.parse(answer.body, {
    breaks: true,
    gfm: true,
  }) as string);

  return (
    <div
      id={`answer-${answer.id}`}
      className={`rounded-2xl border p-5 md:p-6 transition-all ${
        answer.isAccepted
          ? "border-emerald-500/40 bg-emerald-500/[0.02] shadow-sm ring-1 ring-emerald-500/20"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924]"
      }`}
    >
      {/* Top badges: Accepted & Verified status */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <KxAcceptButton
            answerId={answer.id}
            isAccepted={answer.isAccepted}
            canAccept={isQuestionAuthor}
            onAcceptedChanged={(acc) => onAcceptedChanged?.(answer.id, acc)}
          />

          <KxVerifyBadge
            answerId={answer.id}
            isVerified={answer.isVerified}
            canVerify={isInstructorOrAdmin}
            verifierName={answer.verifiedBy?.name || (answer as any).verifierName}
            onVerifiedChanged={(ver) => onVerifiedChanged?.(answer.id, ver)}
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsFlagOpen(true)}
            title="Report this answer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Flag className="h-4 w-4" />
          </button>

          {(isAnswerAuthor || isInstructorOrAdmin) && (
            <button
              type="button"
              onClick={() => onDeleteAnswer?.(answer.id)}
              title="Delete answer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main body & voting column */}
      <div className="flex gap-4 items-start">
        {/* Voting */}
        <KxVoteButton
          initialVoteCount={answer.voteCount}
          initialUserVote={typeof answer.userVote === "number" ? answer.userVote : answer.userVote === "UP" ? 1 : answer.userVote === "DOWN" ? -1 : undefined}
          answerId={answer.id}
          isSelf={isAnswerAuthor}
          orientation="vertical"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed prose-img:max-h-60 sm:prose-img:max-h-72 prose-img:max-w-xs sm:prose-img:max-w-sm prose-img:w-auto prose-img:h-auto prose-img:rounded-xl prose-img:border prose-img:border-slate-200 dark:prose-img:border-white/10 prose-img:shadow-xs prose-img:my-2.5 prose-img:cursor-zoom-in">
            <KxLatexRenderer content={parsedHtml} />
          </div>

          {/* Author info card */}
          <div className="flex justify-end pt-2">
            <div className="bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 min-w-[200px]">
              <KxUserCard
                author={answer.author}
                createdAt={answer.createdAt}
                actionLabel="answered"
              />
            </div>
          </div>

          {/* Comments Section */}
          <KxCommentThread
            comments={answer.comments || []}
            answerId={answer.id}
            postAuthorId={postAuthorId}
            isPostAuthor={isQuestionAuthor}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            currentUserAvatar={currentUserAvatar}
            currentUserName={currentUserName}
          />
        </div>
      </div>

      {/* Flag Modal */}
      <KxFlagModal
        isOpen={isFlagOpen}
        onClose={() => setIsFlagOpen(false)}
        answerId={answer.id}
      />
    </div>
  );
}
