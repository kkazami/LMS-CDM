'use client';

import React, { useState } from 'react';
import { MessageSquare, Check, CornerDownRight, Loader2, Send } from 'lucide-react';

export interface InlineCommentItem {
  id: string;
  authorId: string;
  filePath: string;
  lineNumber: number;
  body: string;
  resolved: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role: string;
  };
  replies?: InlineCommentItem[];
}

interface InlineCommentThreadProps {
  repoLinkId: string;
  filePath: string;
  lineNumber: number;
  comments: InlineCommentItem[];
  currentUserId?: string;
  onCommentAdded?: (newComment: InlineCommentItem) => void;
  onResolved?: (commentId: string) => void;
}

export function InlineCommentThread({
  repoLinkId,
  filePath,
  lineNumber,
  comments,
  currentUserId,
  onCommentAdded,
  onResolved,
}: InlineCommentThreadProps) {
  const [replyBody, setReplyBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);

  const rootComment = comments[0];

  const handleResolve = async (commentId: string) => {
    try {
      const res = await fetch(`/api/github/comments/${commentId}/resolve`, {
        method: 'PATCH',
      });
      if (res.ok && onResolved) {
        onResolved(commentId);
      }
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/github/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoLinkId,
          filePath,
          lineNumber,
          body: replyBody.trim(),
          parentId: rootComment?.id,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setReplyBody('');
        setShowReplyBox(false);
        if (onCommentAdded) onCommentAdded(created);
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-2 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs text-xs space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {comment.author.avatarUrl ? (
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center font-bold text-[10px]">
                  {comment.author.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {comment.author.name}
              </span>
              {comment.author.role === 'PROFESSOR' && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-sm font-medium">
                  Instructor
                </span>
              )}
              <span className="text-[10px] text-neutral-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>

            {!comment.resolved ? (
              <button
                onClick={() => handleResolve(comment.id)}
                className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-emerald-600 transition-colors"
                title="Mark as resolved"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Resolve</span>
              </button>
            ) : (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Resolved
              </span>
            )}
          </div>

          <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap pl-7">
            {comment.body}
          </p>

          {/* Render nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="pl-7 pt-2 space-y-2 border-l border-neutral-200 dark:border-neutral-800 ml-2">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="w-3 h-3 text-neutral-400" />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {reply.author.name}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap pl-5">
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {showReplyBox ? (
        <form onSubmit={handleAddReply} className="pt-2 pl-7 space-y-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply to this line comment..."
            rows={2}
            className="w-full p-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReplyBox(false)}
              className="px-2.5 py-1 text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !replyBody.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 text-white rounded-md text-xs font-medium hover:bg-orange-500 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Reply</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="pl-7 pt-1">
          <button
            onClick={() => setShowReplyBox(true)}
            className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-medium"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Reply to thread</span>
          </button>
        </div>
      )}
    </div>
  );
}
