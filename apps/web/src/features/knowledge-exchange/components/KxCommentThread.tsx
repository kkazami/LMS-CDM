"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Trash2,
  Flag,
  Loader2,
  Camera,
  X,
  ExternalLink,
  ThumbsUp,
  MoreHorizontal,
  User,
  UserX,
} from "lucide-react";
import { useParams } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import UserMiniCard from "@/components/common/UserMiniCard";
import KxFlagModal from "./KxFlagModal";
import KxDeleteConfirmModal from "./KxDeleteConfirmModal";
import type { KxCommentItem, KxAuthorSummary } from "../types";
import { KX_VALIDATION } from "../constants";

interface KxCommentThreadProps {
  comments: KxCommentItem[];
  postId?: string;
  answerId?: string;
  postAuthorId?: string;
  isPostAuthor?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  onCommentAdded?: (newComment: KxCommentItem) => void;
  onCommentDeleted?: (commentId: string) => void;
}

function parseCommentBody(body: string) {
  const images: { alt: string; url: string }[] = [];

  // 1. Match standard markdown ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRegex.exec(body)) !== null) {
    images.push({ alt: mdMatch[1] || "Attached image", url: mdMatch[2] });
  }
  let cleanText = body.replace(mdRegex, "");

  // 2. Match HTML <img src="...">
  const htmlImgRegex =
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']?([^"'>]*)["']?[^>]*>|<img[^>]*alt=["']?([^"'>]*)["']?[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlImgRegex.exec(cleanText)) !== null) {
    const url = htmlMatch[1] || htmlMatch[4];
    const alt = htmlMatch[2] || htmlMatch[3] || "Attached image";
    if (url) images.push({ alt, url });
  }
  cleanText = cleanText.replace(htmlImgRegex, "").trim();

  return { cleanText, images };
}

function formatFacebookTime(dateInput: string | Date | number): string {
  const d =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;
  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 60_000) return "Just now";
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w`;
  return `${Math.floor(diffWeeks / 52)}y`;
}

export default function KxCommentThread({
  comments,
  postId,
  answerId,
  postAuthorId,
  isPostAuthor = false,
  currentUserId,
  currentUserRole,
  currentUserAvatar,
  currentUserName,
  onCommentAdded,
  onCommentDeleted,
}: KxCommentThreadProps) {
  const params = useParams();
  const instituteCode = (params?.institute as string) || "ics";
  const theme = getInstituteTheme(instituteCode);

  const [commentList, setCommentList] = useState<KxCommentItem[]>(comments);
  const [commentBody, setCommentBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Attached image state
  const [attachedImage, setAttachedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Likes tracking (client-side interactive feedback)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());

  // 3-dot dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Lightbox modal state for viewing images in full size
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // Modals
  const [flaggingCommentId, setFlaggingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // UserMiniCard popup state
  const [miniCardUser, setMiniCardUser] = useState<{
    author: KxAuthorSummary;
    anchorEl: HTMLElement | null;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const roleUpper = (currentUserRole || "").toUpperCase();
  const isInstructorOrAdmin =
    roleUpper === "ADMIN" ||
    roleUpper === "PROFESSOR" ||
    roleUpper === "INSTRUCTOR" ||
    roleUpper === "TEACHER";

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };
    if (lightboxImage) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxImage]);

  const toggleCommentLike = (commentId: string) => {
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleReplyClick = (authorName: string) => {
    const mention = `@${authorName} `;
    setCommentBody((prev) =>
      prev.startsWith(mention) ? prev : `${mention}${prev}`
    );
    textareaRef.current?.focus();
  };

  const handleCommentImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Only images (PNG, JPG, GIF, WEBP) are supported.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setImageUploadError("Image must be smaller than 25 MB.");
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to upload image.");
      }

      if (data?.url) {
        setAttachedImage({
          url: data.url,
          name: file.name || "attached-image",
        });
      } else {
        throw new Error("Invalid response from upload service.");
      }
    } catch (err: any) {
      setImageUploadError(err?.message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleCommentImageUpload(file);
          break;
        }
      }
    }
  };

  const handleAddComment = async () => {
    setErrorMsg(null);
    setImageUploadError(null);

    const trimmed = commentBody.trim();
    const finalBody = attachedImage
      ? trimmed
        ? `${trimmed}\n\n![${attachedImage.name}](${attachedImage.url})`
        : `![${attachedImage.name}](${attachedImage.url})`
      : trimmed;

    if (finalBody.length < KX_VALIDATION.MIN_COMMENT_LENGTH) {
      setErrorMsg(
        `Comment must be at least ${KX_VALIDATION.MIN_COMMENT_LENGTH} characters.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/knowledge-exchange/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          answerId,
          body: finalBody,
          isAnonymous,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to post comment.");
        setIsSubmitting(false);
        return;
      }

      const created = data.comment;
      setCommentList((prev) => [...prev, created]);
      onCommentAdded?.(created);
      setCommentBody("");
      setAttachedImage(null);
    } catch {
      setErrorMsg("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Press Enter to submit (Shift+Enter for newline) like Facebook / Messenger
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && !isUploadingImage && (commentBody.trim() || attachedImage)) {
        handleAddComment();
      }
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deletingCommentId) return;

    const res = await fetch(
      `/api/knowledge-exchange/comments/${deletingCommentId}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to delete comment.");
    }

    const id = deletingCommentId;
    setCommentList((prev) => prev.filter((c) => c.id !== id));
    onCommentDeleted?.(id);
    setDeletingCommentId(null);
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
      {/* Existing Comments (Facebook Bubbles) */}
      {commentList.length > 0 && (
        <div className="space-y-3">
          {commentList.map((c) => {
            const isCommentAuthor = Boolean(
              currentUserId && (c.authorId === currentUserId || c.author?.isSelf)
            );
            const canDelete =
              isCommentAuthor ||
              isPostAuthor ||
              Boolean(currentUserId && postAuthorId && currentUserId === postAuthorId) ||
              isInstructorOrAdmin;

            const { cleanText, images } = parseCommentBody(c.body);
            const author = c.author;
            const isAnon = Boolean(author?.isAnonymous);
            const isAdminViewingAnon = isAnon && Boolean(author?.id);
            const isAuthorInstructor =
              author?.role?.toUpperCase() === "PROFESSOR" ||
              author?.role?.toUpperCase() === "INSTRUCTOR" ||
              author?.role?.toUpperCase() === "TEACHER";
            const isAuthorAdmin = author?.role?.toUpperCase() === "ADMIN";

            const displayName =
              isAnon && !isAdminViewingAnon
                ? author?.name || (isAuthorInstructor ? "Anonymous Instructor" : "Anonymous Student")
                : author?.name || "User";

            const canClickProfile = Boolean(author?.id);

            return (
              <div
                key={c.id}
                className="flex items-start gap-2.5 text-xs group/comment"
              >
                {/* Circular Avatar on Left */}
                {author?.avatarUrl && !isAnon ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!canClickProfile) return;
                      e.stopPropagation();
                      setMiniCardUser({ author, anchorEl: e.currentTarget });
                    }}
                    className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer pt-0.5"
                    title={displayName}
                  >
                    <img
                      src={author.avatarUrl}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10 hover:ring-2 hover:ring-orange-500 transition-all"
                    />
                  </button>
                ) : isAnon && !isAdminViewingAnon ? (
                  <div
                    className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5"
                    title="Anonymous User"
                  >
                    <User className="h-4 w-4" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!canClickProfile) return;
                      e.stopPropagation();
                      setMiniCardUser({ author, anchorEl: e.currentTarget });
                    }}
                    className="shrink-0 h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 hover:ring-2 hover:ring-orange-500 transition-all cursor-pointer mt-0.5 text-xs"
                    title={displayName}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </button>
                )}

                {/* Right: Bubble + Action Line */}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-start gap-1 max-w-full group/bubble">
                    {/* Facebook Speech Bubble */}
                    <div className="bg-slate-100 dark:bg-[#242526] hover:bg-slate-200/60 dark:hover:bg-[#2c2d30] rounded-2xl px-3.5 py-2 inline-block max-w-full transition-colors border border-slate-200/60 dark:border-white/5">
                      {/* Author Header */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {canClickProfile ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMiniCardUser({ author, anchorEl: e.currentTarget });
                            }}
                            className="font-semibold text-xs text-slate-900 dark:text-white hover:underline cursor-pointer text-left"
                          >
                            {displayName}
                          </button>
                        ) : (
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {displayName}
                          </span>
                        )}

                        {/* Badges */}
                        {isCommentAuthor && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                            You
                          </span>
                        )}
                        {Boolean(postAuthorId && c.authorId === postAuthorId) && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">
                            Author
                          </span>
                        )}
                        {isAuthorInstructor && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                            Instructor
                          </span>
                        )}
                        {isAuthorAdmin && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium border border-purple-500/20">
                            Admin
                          </span>
                        )}
                        {isAdminViewingAnon && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                            Anon Audit
                          </span>
                        )}
                      </div>

                      {/* Comment Body */}
                      {cleanText && (
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                          {cleanText}
                        </p>
                      )}
                    </div>

                    {/* 3-Dot More Menu (...) on hover */}
                    <div className="relative shrink-0 opacity-0 group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100 transition-opacity pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === c.id ? null : c.id);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === c.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 mt-1 w-32 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1b1e] shadow-xl py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingCommentId(c.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setFlaggingCommentId(c.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Flag className="h-3.5 w-3.5" />
                            <span>Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attached Image under bubble (Small-Medium Thumbnail with Click to Enlarge) */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5 pl-0.5">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: img.url,
                              alt: img.alt || "Attached image",
                            })
                          }
                          className="group relative block overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 hover:border-orange-500/50 hover:shadow-md transition-all cursor-zoom-in"
                          title="Click to view full size"
                        >
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                              Enlarge
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Facebook Action Row: Like · Reply · Time */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pl-3 pt-1 select-none font-medium">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(c.id)}
                      className={`hover:underline cursor-pointer flex items-center gap-1 transition-colors ${
                        likedCommentIds.has(c.id)
                          ? "text-blue-600 dark:text-blue-400 font-bold"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <ThumbsUp
                        className={`h-3 w-3 ${
                          likedCommentIds.has(c.id) ? "fill-current" : ""
                        }`}
                      />
                      <span>Like</span>
                      {likedCommentIds.has(c.id) && (
                        <span className="text-[10px] ml-0.5">1</span>
                      )}
                    </button>

                    <span>·</span>

                    {/* Reply Button */}
                    <button
                      type="button"
                      onClick={() => handleReplyClick(displayName)}
                      className="hover:underline cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Reply
                    </button>

                    <span>·</span>

                    {/* Relative Time (e.g. 2h, 3h, Just now) */}
                    <span className="text-slate-400 dark:text-slate-500">
                      {formatFacebookTime(c.createdAt)}
                    </span>

                    {/* Quick Delete */}
                    {canDelete && (
                      <>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => setDeletingCommentId(c.id)}
                          className="hover:underline text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Facebook-style Bottom Comment Composer */}
      <div className="flex items-start gap-2.5 pt-1.5">
        {/* Hidden File Input for Comments */}
        <input
          ref={commentFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleCommentImageUpload(file);
            }
            e.target.value = "";
          }}
        />

        {/* Current User Circular Avatar (Left) */}
        <div className="shrink-0 pt-0.5">
          {isAnonymous ? (
            <div
              className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center ring-2 ring-amber-500/40 transition-all"
              title="Commenting anonymously"
            >
              <UserX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          ) : currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={currentUserName || "You"}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs ring-1 ring-black/5 dark:ring-white/10">
              {currentUserName ? currentUserName.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>

        {/* Facebook-style Pill Input Container (Right) */}
        <div className="flex-1 min-w-0">
          <div
            className={`rounded-2xl bg-slate-100 dark:bg-[#242526] border transition-all ${
              isFocused
                ? "border-orange-500/70 bg-white dark:bg-[#1a1b1e] shadow-xs"
                : "border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15"
            } p-2.5 space-y-1.5`}
          >
            {/* Attached Photo Thumbnail inside input (Small-Medium with Click to Enlarge) */}
            {attachedImage && (
              <div className="relative inline-flex items-center gap-2 group pb-1">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxImage({
                      url: attachedImage.url,
                      alt: attachedImage.name,
                    })
                  }
                  className="relative block rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xs cursor-zoom-in hover:opacity-95 transition-opacity"
                  title="Click to view full size"
                >
                  <img
                    src={attachedImage.url}
                    alt={attachedImage.name}
                    className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                      Enlarge
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 rounded-full bg-slate-800/90 text-white hover:bg-red-500 transition-colors shadow-md cursor-pointer self-start"
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input Textarea (NO inner outline or border, pure seamless text) */}
            <textarea
              ref={textareaRef}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handleCommentPaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                isAnonymous
                  ? "Write an anonymous comment..."
                  : currentUserName
                  ? `Write a comment as ${currentUserName}...`
                  : "Write a comment..."
              }
              rows={isFocused || commentBody ? 2 : 1}
              style={{ outline: "none", border: "none", boxShadow: "none" }}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed border-0 p-0 m-0 focus:border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 shadow-none outline-none"
            />

            {/* Integrated Toolbar inside input bubble (No harsh divider line) */}
            <div className="flex items-center justify-between pt-0.5">
              {/* Left tools: Photo Upload & Anonymous Toggle */}
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                {/* Photo upload icon */}
                <button
                  type="button"
                  disabled={isUploadingImage || isSubmitting}
                  onClick={() => commentFileInputRef.current?.click()}
                  className="p-1.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Attach a photo"
                >
                  <Camera className="h-4 w-4" />
                </button>

                {/* Anonymous mask toggle */}
                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isAnonymous
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
                      : "hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400"
                  }`}
                  title="Toggle anonymous mode"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>{isAnonymous ? "Anonymous ON" : "Post anonymously"}</span>
                </button>
              </div>

              {/* Right tools: Enter hint & Send button */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500">
                  Press Enter to post
                </span>

                <button
                  type="button"
                  disabled={
                    (!commentBody.trim() && !attachedImage) ||
                    isSubmitting ||
                    isUploadingImage
                  }
                  onClick={handleAddComment}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    (commentBody.trim() || attachedImage) &&
                    !isSubmitting &&
                    !isUploadingImage
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-xs"
                      : "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40"
                  }`}
                  title="Post comment"
                >
                  {isSubmitting || isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {imageUploadError && (
            <p className="text-[11px] text-red-500 font-medium pt-1 pl-2">
              {imageUploadError}
            </p>
          )}
          {errorMsg && (
            <p className="text-[11px] text-red-500 font-medium pt-1 pl-2">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {/* Flag Modal */}
      {flaggingCommentId && (
        <KxFlagModal
          isOpen={Boolean(flaggingCommentId)}
          onClose={() => setFlaggingCommentId(null)}
          commentId={flaggingCommentId}
        />
      )}

      {/* Delete Comment Modal */}
      <KxDeleteConfirmModal
        isOpen={Boolean(deletingCommentId)}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleConfirmDeleteComment}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This will permanently remove it from the discussion thread."
        itemType="comment"
        itemName={commentList.find((c) => c.id === deletingCommentId)?.body}
        confirmLabel="Delete Comment"
      />

      {/* User Mini Card Popover */}
      {miniCardUser && miniCardUser.author.id && (
        <UserMiniCard
          userId={miniCardUser.author.id}
          instituteCode={instituteCode}
          anchorElement={miniCardUser.anchorEl}
          onClose={() => setMiniCardUser(null)}
          theme={theme}
        />
      )}

      {/* Lightbox Modal for Enlargeable Images */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center cursor-default"
          >
            {/* Top Bar: Title & Actions */}
            <div className="w-full flex items-center justify-between pb-2 text-white/80">
              <span className="text-xs font-medium truncate pr-4 text-slate-300">
                {lightboxImage.alt || "Attached image"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Open original in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Enlarged Image */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.alt}
              className="max-h-[80vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
