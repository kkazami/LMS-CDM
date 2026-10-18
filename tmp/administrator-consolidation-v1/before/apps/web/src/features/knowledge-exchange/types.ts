/**
 * apps/web/src/features/knowledge-exchange/types.ts
 *
 * Domain types for Knowledge Exchange (ICS Q&A forum).
 */

export type KxPostType = "QUESTION" | "DISCUSSION";
export type KxPostStatus = "OPEN" | "ANSWERED" | "CLOSED" | "LOCKED";
export type KxModerationActionType =
  | "CLOSE"
  | "REOPEN"
  | "LOCK"
  | "UNLOCK"
  | "PIN"
  | "UNPIN"
  | "DELETE"
  | "RESTORE"
  | "CLOSE_QUESTION"
  | "REOPEN_QUESTION"
  | "LOCK_THREAD"
  | "UNLOCK_THREAD"
  | "PIN_POST"
  | "UNPIN_POST"
  | "DISMISS_FLAGS"
  | "SOFT_DELETE";

export type KxFlagReason =
  | "SPAM"
  | "OFFENSIVE"
  | "CHEATING"
  | "OFF_TOPIC"
  | "OTHER";

export type KxFlagStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "ACTIONED";

export type KxNotificationType =
  | "ANSWER"
  | "COMMENT"
  | "ACCEPTED"
  | "VERIFIED"
  | "UPVOTE"
  | "MENTION"
  | "WEEKLY_DIGEST"
  | "ANSWER_POSTED"
  | "UPVOTE_RECEIVED"
  | "ANSWER_ACCEPTED"
  | "ANSWER_VERIFIED";

export type KxVoteType = "UP" | "DOWN";
export type KxPostSortOption = "newest" | "votes" | "active";

export interface KxAuthorSummary {
  id?: string | null;
  name: string;
  role: string;
  avatarUrl?: string | null;
  studentNumber?: string | null;
  email?: string | null;
  isAnonymous?: boolean;
  maskedName?: string;
  isSelf?: boolean;
  realName?: string | null;
}

export interface KxTagSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  postCount: number;
}

export interface KxCommentItem {
  id: string;
  postId?: string | null;
  answerId?: string | null;
  authorId?: string | null;
  body: string;
  isAnonymous?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  author: KxAuthorSummary;
}

export interface KxAnswerItem {
  id: string;
  postId: string;
  authorId?: string | null;
  body: string;
  isAnonymous?: boolean;
  isAccepted: boolean;
  isVerified: boolean;
  verifiedById?: string | null;
  verifiedBy?: KxAuthorSummary | { id: string; name: string; role: string } | null;
  verifiedAt?: string | null;
  voteCount: number;
  userVote?: number | "UP" | "DOWN" | null;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  author: KxAuthorSummary;
  comments: KxCommentItem[];
}

export interface KxCourseSummary {
  id: string;
  code: string;
  title: string;
}

export interface KxSyllabusItemSummary {
  id: string;
  title: string;
  type?: string | null;
  enableIntegrityMonitoring?: boolean;
}

export interface KxTopAnswerPreview {
  id: string;
  body: string;
  isAccepted: boolean;
  isVerified: boolean;
  voteCount: number;
  createdAt: string;
  author: KxAuthorSummary;
}

export interface KxTopCommentPreview {
  id: string;
  body: string;
  createdAt: string;
  author: KxAuthorSummary;
}

export interface KxPostItem {
  id: string;
  title: string;
  body: string;
  postType: KxPostType;
  status: KxPostStatus;
  isAnonymous: boolean;
  authorId?: string | null;
  instituteId: string;
  courseId?: string | null;
  syllabusItemId?: string | null;
  course?: KxCourseSummary | null;
  syllabusItem?: KxSyllabusItemSummary | null;
  viewCount: number;
  voteCount: number;
  answerCount: number;
  userVote?: number | "UP" | "DOWN" | null;
  isBookmarked?: boolean;
  isPinned: boolean;
  isLocked?: boolean;
  isDeleted?: boolean;
  closeReason?: string | null;
  createdAt: string;
  updatedAt: string;
  author: KxAuthorSummary;
  tags: KxTagSummary[];
  answers?: KxAnswerItem[];
  comments?: KxCommentItem[];
  topAnswer?: KxTopAnswerPreview | null;
  topComment?: KxTopCommentPreview | null;
}

export type KxPostDetailData = KxPostItem;
export type KxPostSummary = KxPostItem;

export interface KxRevisionItem {
  id: string;
  postId: string;
  editorId?: string;
  title: string;
  body: string;
  summary?: string | null;
  editSummary?: string | null;
  createdAt: string;
  editor?: KxAuthorSummary | { name: string | null; email: string | null };
  user?: { name: string | null; email: string | null };
}

export interface KxFlagItem {
  id: string;
  reporterId: string;
  postId?: string | null;
  answerId?: string | null;
  commentId?: string | null;
  reason: KxFlagReason;
  description?: string;
  details?: string | null;
  status: KxFlagStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  reporter: KxAuthorSummary;
  post?: { id: string; title: string } | null;
  answer?: { id: string; body: string; postId: string } | null;
  comment?: { id: string; body: string; postId?: string | null } | null;
}

export interface KxModerationActionItem {
  id: string;
  moderatorId: string;
  actionType?: KxModerationActionType;
  action?: string;
  targetType: "POST" | "ANSWER" | "COMMENT";
  targetId: string;
  postId?: string | null;
  reason: string;
  createdAt: string;
  moderator: {
    id: string;
    name: string | null;
    role: string;
  };
}

export interface KxDeanonymizedPostItem {
  id: string;
  title: string;
  postType: string;
  status: string;
  createdAt: string;
  isAnonymous?: boolean;
  anonymousAlias?: string;
  author: {
    id: string;
    name: string;
    email: string;
    studentNumber: string | null;
    role: string;
  };
}

export interface KxNotificationItem {
  id: string;
  userId?: string;
  type: KxNotificationType;
  title?: string;
  message: string;
  link?: string;
  targetId?: string | null;
  postId?: string | null;
  isRead: boolean;
  metadata?: string;
  createdAt: string;
}

export interface KxFeedQuery {
  tab?: "all" | "unanswered" | "answered" | "discussions" | "my-posts";
  sort?: "newest" | "votes" | "active";
  search?: string;
  tag?: string;
  courseId?: string;
  page?: number;
  limit?: number;
}
