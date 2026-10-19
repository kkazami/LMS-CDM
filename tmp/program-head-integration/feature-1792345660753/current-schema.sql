-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CredentialProvisioningState" AS ENUM ('PENDING_HANDOFF', 'COMPLETE');

-- CreateTable
CREATE TABLE "Institute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "uniqueId" TEXT NOT NULL DEFAULT '',
    "studentNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "instituteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarUrl" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "yearLevel" TEXT NOT NULL DEFAULT '',
    "coverColor" TEXT NOT NULL DEFAULT '#1E88E5',
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "credentialProvisioningState" "CredentialProvisioningState",

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "room" TEXT NOT NULL DEFAULT '',
    "scheduleDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "scheduleStart" TEXT NOT NULL DEFAULT '',
    "scheduleEnd" TEXT NOT NULL DEFAULT '',
    "scheduleStartDate" DATE,
    "scheduleEndDate" DATE,
    "description" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "instructorId" TEXT,
    "instituteId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "programId" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "displayOrderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MATERIAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "maxPoints" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enableIntegrityMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SyllabusItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGroup" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "StudentGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusTargetGroup" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "SyllabusTargetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationBroadcast" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateComment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FILE',
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubmission" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grade" DOUBLE PRECISION,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAttachment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FILE',
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "displayOrderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "courseId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "professorName" TEXT NOT NULL DEFAULT '',
    "maxPoints" INTEGER,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "eventType" TEXT NOT NULL DEFAULT 'assignment',
    "deepLink" TEXT NOT NULL DEFAULT '#',
    "courseId" TEXT,
    "creatorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingPolicy" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryWeight" (
    "id" TEXT NOT NULL,
    "gradingPolicyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weightPercentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CategoryWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpCodeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTemplate" (
    "id" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Interactive Activity',
    "courseId" TEXT NOT NULL,
    "syllabusItemId" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "faultPool" TEXT NOT NULL DEFAULT '[]',
    "hiddenTestCases" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "variantSeed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completionTimeSeconds" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "stateCheck" TEXT NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "errorLog" TEXT NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityAsset" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isDracoCompressed" BOOLEAN NOT NULL DEFAULT true,
    "activityTypes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variantSeed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "isLeaderboardAnonymized" BOOLEAN NOT NULL DEFAULT false,
    "publicLeaderboardOptIn" BOOLEAN NOT NULL DEFAULT true,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "levelTier" TEXT NOT NULL DEFAULT 'newcomer',
    "lastLoginDate" TIMESTAMP(3),
    "loginStreakCurrent" INTEGER NOT NULL DEFAULT 0,
    "loginStreakLongest" INTEGER NOT NULL DEFAULT 0,
    "totalLoginDays" INTEGER NOT NULL DEFAULT 0,
    "lastDailyRewardAt" TIMESTAMP(3),
    "gradeIncentiveBonusExp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GamificationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "badgeRuleId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeIncentiveRule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gradeMin" DOUBLE PRECISION NOT NULL,
    "bonusExp" INTEGER NOT NULL,
    "rewardDescription" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeIncentiveRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardReward" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "rewardLabel" TEXT NOT NULL,
    "bonusExp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLeaderboardCache" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "activityType" TEXT,
    "rankings" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLeaderboardCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyChallenge" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isOptIn" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WeeklyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "courseId" TEXT,
    "creatorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT NOT NULL DEFAULT '',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unseen',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnswer" TEXT NOT NULL DEFAULT '',
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "syllabusItemId" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialAnnotation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "noteContent" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "positionMetadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityEvent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "submissionId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'QUESTION',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "courseId" TEXT,
    "syllabusItemId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KxPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxAnswer" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KxAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "answerId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KxComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'TOPIC',
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxPostTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KxPostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "answerId" TEXT,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxFlag" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "postId" TEXT,
    "answerId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxModerationAction" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "postId" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KxNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "GithubToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubRepoLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "submissionId" TEXT,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "commitSha" TEXT,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'cohort',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubRepoLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubSubmission" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoLinkId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotPath" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GithubSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubInlineComment" (
    "id" TEXT NOT NULL,
    "repoLinkId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "githubCommentId" BIGINT,
    "parentId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubInlineComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubWebhookEvent" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubCiResult" (
    "id" TEXT NOT NULL,
    "repoLinkId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "workflowName" TEXT,
    "status" TEXT NOT NULL,
    "conclusion" TEXT,
    "runUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubCiResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionSimilarity" (
    "id" TEXT NOT NULL,
    "submissionAId" TEXT NOT NULL,
    "submissionBId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "timeLimitMins" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "scoreToKeep" TEXT NOT NULL DEFAULT 'HIGHEST',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "showScoreAfter" BOOLEAN NOT NULL DEFAULT true,
    "showAnswersAfter" BOOLEAN NOT NULL DEFAULT false,
    "showFeedbackAfter" BOOLEAN NOT NULL DEFAULT false,
    "isProctored" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "disableCopyPaste" BOOLEAN NOT NULL DEFAULT false,
    "detectTabSwitch" BOOLEAN NOT NULL DEFAULT false,
    "lockBrowser" BOOLEAN NOT NULL DEFAULT false,
    "totalPoints" DOUBLE PRECISION,
    "passingScore" DOUBLE PRECISION,
    "confirmationMessage" TEXT,
    "themeColor" TEXT,
    "headerImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSection" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormQuestion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "sectionId" TEXT,
    "bankItemId" TEXT,
    "questionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "partialCredit" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL DEFAULT '{}',
    "showIfQuestionId" TEXT,
    "showIfAnswer" TEXT,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBankItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "createdBy" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBankItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAttempt" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "timeSpentSecs" INTEGER,
    "deadlineAt" TIMESTAMP(3),
    "rawScore" DOUBLE PRECISION,
    "totalPoints" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "syncedToGradebook" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "copyPasteCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "FormAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerOptions" TEXT,
    "answerNumber" DOUBLE PRECISION,
    "answerDate" TIMESTAMP(3),
    "answerRanking" TEXT,
    "answerMatrix" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "isCorrect" BOOLEAN,
    "pointsAwarded" DOUBLE PRECISION,
    "autoGraded" BOOLEAN NOT NULL DEFAULT false,
    "instructorGraded" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicProgram" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "chartVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramMembership" (
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramMembership_pkey" PRIMARY KEY ("programId","userId")
);

-- CreateTable
CREATE TABLE "ProgramHeadAssignment" (
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProgramHeadAssignment_pkey" PRIMARY KEY ("programId","userId")
);

-- CreateTable
CREATE TABLE "ProgramChartNode" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "parentId" TEXT,
    "memberUserId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgramChartNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyAssetBinding" (
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "courseId" TEXT,

    CONSTRAINT "LegacyAssetBinding_pkey" PRIMARY KEY ("kind","sourceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institute_code_key" ON "Institute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_instituteId_key" ON "User"("id", "instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseCode_key" ON "Course"("courseCode");

-- CreateIndex
CREATE INDEX "Course_instituteId_idx" ON "Course"("instituteId");

-- CreateIndex
CREATE INDEX "Course_instructorId_idx" ON "Course"("instructorId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_courseId_studentId_key" ON "Enrollment"("courseId", "studentId");

-- CreateIndex
CREATE INDEX "SyllabusItem_courseId_type_idx" ON "SyllabusItem"("courseId", "type");

-- CreateIndex
CREATE INDEX "SyllabusItem_courseId_orderIndex_idx" ON "SyllabusItem"("courseId", "orderIndex");

-- CreateIndex
CREATE INDEX "StudentGroup_courseId_idx" ON "StudentGroup"("courseId");

-- CreateIndex
CREATE INDEX "StudentGroupMember_studentId_idx" ON "StudentGroupMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroupMember_groupId_studentId_key" ON "StudentGroupMember"("groupId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusTargetGroup_syllabusItemId_groupId_key" ON "SyllabusTargetGroup"("syllabusItemId", "groupId");

-- CreateIndex
CREATE INDEX "Announcement_courseId_createdAt_idx" ON "Announcement"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationBroadcast_courseId_createdAt_idx" ON "NotificationBroadcast"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationBroadcast_senderId_idx" ON "NotificationBroadcast"("senderId");

-- CreateIndex
CREATE INDEX "PrivateComment_courseId_recipientId_idx" ON "PrivateComment"("courseId", "recipientId");

-- CreateIndex
CREATE INDEX "PrivateComment_senderId_idx" ON "PrivateComment"("senderId");

-- CreateIndex
CREATE INDEX "Attachment_syllabusItemId_idx" ON "Attachment"("syllabusItemId");

-- CreateIndex
CREATE INDEX "StudentSubmission_syllabusItemId_idx" ON "StudentSubmission"("syllabusItemId");

-- CreateIndex
CREATE INDEX "StudentSubmission_studentId_idx" ON "StudentSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubmission_syllabusItemId_studentId_key" ON "StudentSubmission"("syllabusItemId", "studentId");

-- CreateIndex
CREATE INDEX "SubmissionAttachment_submissionId_idx" ON "SubmissionAttachment"("submissionId");

-- CreateIndex
CREATE INDEX "DashboardLayout_userId_idx" ON "DashboardLayout"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLayout_userId_courseId_key" ON "DashboardLayout"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Note_instituteId_creatorId_idx" ON "Note"("instituteId", "creatorId");

-- CreateIndex
CREATE INDEX "Note_instituteId_archived_pinned_orderIndex_idx" ON "Note"("instituteId", "archived", "pinned", "orderIndex");

-- CreateIndex
CREATE INDEX "TaskItem_instituteId_creatorId_idx" ON "TaskItem"("instituteId", "creatorId");

-- CreateIndex
CREATE INDEX "TaskItem_instituteId_completed_orderIndex_idx" ON "TaskItem"("instituteId", "completed", "orderIndex");

-- CreateIndex
CREATE INDEX "CalendarEvent_instituteId_eventDate_idx" ON "CalendarEvent"("instituteId", "eventDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_instituteId_creatorId_idx" ON "CalendarEvent"("instituteId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingPolicy_courseId_key" ON "GradingPolicy"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryWeight_gradingPolicyId_category_key" ON "CategoryWeight"("gradingPolicyId", "category");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_idx" ON "AuditLog"("targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetOtp_userId_idx" ON "PasswordResetOtp"("userId");

-- CreateIndex
CREATE INDEX "ActivityTemplate_courseId_activityType_idx" ON "ActivityTemplate"("courseId", "activityType");

-- CreateIndex
CREATE INDEX "ActivityTemplate_createdBy_idx" ON "ActivityTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "ActivitySubmission_studentId_activityType_idx" ON "ActivitySubmission"("studentId", "activityType");

-- CreateIndex
CREATE INDEX "ActivitySubmission_templateId_idx" ON "ActivitySubmission"("templateId");

-- CreateIndex
CREATE INDEX "ActivitySubmission_submittedAt_idx" ON "ActivitySubmission"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityAsset_path_key" ON "ActivityAsset"("path");

-- CreateIndex
CREATE INDEX "ActivitySession_studentId_status_idx" ON "ActivitySession"("studentId", "status");

-- CreateIndex
CREATE INDEX "ActivitySession_templateId_idx" ON "ActivitySession"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationProfile_studentId_key" ON "GamificationProfile"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBadge_profileId_badgeRuleId_key" ON "StudentBadge"("profileId", "badgeRuleId");

-- CreateIndex
CREATE INDEX "ExpTransaction_userId_createdAt_idx" ON "ExpTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpTransaction_source_idx" ON "ExpTransaction"("source");

-- CreateIndex
CREATE INDEX "GradeIncentiveRule_courseId_idx" ON "GradeIncentiveRule"("courseId");

-- CreateIndex
CREATE INDEX "LeaderboardReward_syllabusItemId_idx" ON "LeaderboardReward"("syllabusItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLeaderboardCache_courseId_activityType_key" ON "ActivityLeaderboardCache"("courseId", "activityType");

-- CreateIndex
CREATE INDEX "FlashcardDeck_instituteId_creatorId_idx" ON "FlashcardDeck"("instituteId", "creatorId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_courseId_idx" ON "FlashcardDeck"("courseId");

-- CreateIndex
CREATE INDEX "Flashcard_deckId_orderIndex_idx" ON "Flashcard"("deckId", "orderIndex");

-- CreateIndex
CREATE INDEX "FlashcardProgress_userId_idx" ON "FlashcardProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardProgress_cardId_userId_key" ON "FlashcardProgress"("cardId", "userId");

-- CreateIndex
CREATE INDEX "StudySessionLog_userId_idx" ON "StudySessionLog"("userId");

-- CreateIndex
CREATE INDEX "StudySessionLog_courseId_idx" ON "StudySessionLog"("courseId");

-- CreateIndex
CREATE INDEX "MaterialAnnotation_userId_attachmentId_idx" ON "MaterialAnnotation"("userId", "attachmentId");

-- CreateIndex
CREATE INDEX "IntegrityEvent_syllabusItemId_studentId_idx" ON "IntegrityEvent"("syllabusItemId", "studentId");

-- CreateIndex
CREATE INDEX "IntegrityEvent_syllabusItemId_timestamp_idx" ON "IntegrityEvent"("syllabusItemId", "timestamp");

-- CreateIndex
CREATE INDEX "IntegrityEvent_studentId_idx" ON "IntegrityEvent"("studentId");

-- CreateIndex
CREATE INDEX "KxPost_instituteId_createdAt_idx" ON "KxPost"("instituteId", "createdAt");

-- CreateIndex
CREATE INDEX "KxPost_instituteId_status_idx" ON "KxPost"("instituteId", "status");

-- CreateIndex
CREATE INDEX "KxPost_authorId_idx" ON "KxPost"("authorId");

-- CreateIndex
CREATE INDEX "KxPost_courseId_idx" ON "KxPost"("courseId");

-- CreateIndex
CREATE INDEX "KxPost_syllabusItemId_idx" ON "KxPost"("syllabusItemId");

-- CreateIndex
CREATE INDEX "KxPost_isPinned_createdAt_idx" ON "KxPost"("isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "KxAnswer_postId_createdAt_idx" ON "KxAnswer"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "KxAnswer_authorId_idx" ON "KxAnswer"("authorId");

-- CreateIndex
CREATE INDEX "KxAnswer_isAccepted_idx" ON "KxAnswer"("isAccepted");

-- CreateIndex
CREATE INDEX "KxAnswer_isVerified_idx" ON "KxAnswer"("isVerified");

-- CreateIndex
CREATE INDEX "KxComment_postId_idx" ON "KxComment"("postId");

-- CreateIndex
CREATE INDEX "KxComment_answerId_idx" ON "KxComment"("answerId");

-- CreateIndex
CREATE INDEX "KxComment_authorId_idx" ON "KxComment"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "KxTag_name_key" ON "KxTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KxTag_slug_key" ON "KxTag"("slug");

-- CreateIndex
CREATE INDEX "KxTag_category_idx" ON "KxTag"("category");

-- CreateIndex
CREATE INDEX "KxTag_postCount_idx" ON "KxTag"("postCount");

-- CreateIndex
CREATE INDEX "KxPostTag_tagId_idx" ON "KxPostTag"("tagId");

-- CreateIndex
CREATE INDEX "KxPostTag_postId_idx" ON "KxPostTag"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "KxPostTag_postId_tagId_key" ON "KxPostTag"("postId", "tagId");

-- CreateIndex
CREATE INDEX "KxVote_postId_idx" ON "KxVote"("postId");

-- CreateIndex
CREATE INDEX "KxVote_answerId_idx" ON "KxVote"("answerId");

-- CreateIndex
CREATE INDEX "KxVote_userId_idx" ON "KxVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KxVote_userId_postId_key" ON "KxVote"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "KxVote_userId_answerId_key" ON "KxVote"("userId", "answerId");

-- CreateIndex
CREATE INDEX "KxRevision_postId_createdAt_idx" ON "KxRevision"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "KxRevision_editorId_idx" ON "KxRevision"("editorId");

-- CreateIndex
CREATE INDEX "KxFlag_status_createdAt_idx" ON "KxFlag"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KxFlag_reporterId_idx" ON "KxFlag"("reporterId");

-- CreateIndex
CREATE INDEX "KxFlag_postId_idx" ON "KxFlag"("postId");

-- CreateIndex
CREATE INDEX "KxFlag_answerId_idx" ON "KxFlag"("answerId");

-- CreateIndex
CREATE INDEX "KxFlag_commentId_idx" ON "KxFlag"("commentId");

-- CreateIndex
CREATE INDEX "KxBookmark_userId_createdAt_idx" ON "KxBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KxBookmark_postId_idx" ON "KxBookmark"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "KxBookmark_userId_postId_key" ON "KxBookmark"("userId", "postId");

-- CreateIndex
CREATE INDEX "KxFollow_userId_idx" ON "KxFollow"("userId");

-- CreateIndex
CREATE INDEX "KxFollow_tagId_idx" ON "KxFollow"("tagId");

-- CreateIndex
CREATE INDEX "KxFollow_postId_idx" ON "KxFollow"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "KxFollow_userId_tagId_key" ON "KxFollow"("userId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "KxFollow_userId_postId_key" ON "KxFollow"("userId", "postId");

-- CreateIndex
CREATE INDEX "KxModerationAction_moderatorId_idx" ON "KxModerationAction"("moderatorId");

-- CreateIndex
CREATE INDEX "KxModerationAction_targetType_targetId_idx" ON "KxModerationAction"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "KxModerationAction_createdAt_idx" ON "KxModerationAction"("createdAt");

-- CreateIndex
CREATE INDEX "KxNotification_userId_isRead_idx" ON "KxNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "KxNotification_userId_createdAt_idx" ON "KxNotification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GithubToken_userId_key" ON "GithubToken"("userId");

-- CreateIndex
CREATE INDEX "GithubToken_userId_idx" ON "GithubToken"("userId");

-- CreateIndex
CREATE INDEX "GithubRepoLink_postId_idx" ON "GithubRepoLink"("postId");

-- CreateIndex
CREATE INDEX "GithubRepoLink_userId_idx" ON "GithubRepoLink"("userId");

-- CreateIndex
CREATE INDEX "GithubRepoLink_submissionId_idx" ON "GithubRepoLink"("submissionId");

-- CreateIndex
CREATE INDEX "GithubRepoLink_owner_repo_idx" ON "GithubRepoLink"("owner", "repo");

-- CreateIndex
CREATE INDEX "GithubSubmission_syllabusItemId_idx" ON "GithubSubmission"("syllabusItemId");

-- CreateIndex
CREATE INDEX "GithubSubmission_userId_idx" ON "GithubSubmission"("userId");

-- CreateIndex
CREATE INDEX "GithubSubmission_repoLinkId_idx" ON "GithubSubmission"("repoLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubSubmission_syllabusItemId_userId_attemptNumber_key" ON "GithubSubmission"("syllabusItemId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "GithubInlineComment_repoLinkId_filePath_idx" ON "GithubInlineComment"("repoLinkId", "filePath");

-- CreateIndex
CREATE INDEX "GithubInlineComment_authorId_idx" ON "GithubInlineComment"("authorId");

-- CreateIndex
CREATE INDEX "GithubInlineComment_parentId_idx" ON "GithubInlineComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubWebhookEvent_deliveryId_key" ON "GithubWebhookEvent"("deliveryId");

-- CreateIndex
CREATE INDEX "GithubWebhookEvent_deliveryId_idx" ON "GithubWebhookEvent"("deliveryId");

-- CreateIndex
CREATE INDEX "GithubWebhookEvent_repoFullName_idx" ON "GithubWebhookEvent"("repoFullName");

-- CreateIndex
CREATE INDEX "GithubWebhookEvent_processed_idx" ON "GithubWebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "GithubCiResult_repoLinkId_commitSha_idx" ON "GithubCiResult"("repoLinkId", "commitSha");

-- CreateIndex
CREATE INDEX "SubmissionSimilarity_submissionAId_idx" ON "SubmissionSimilarity"("submissionAId");

-- CreateIndex
CREATE INDEX "SubmissionSimilarity_submissionBId_idx" ON "SubmissionSimilarity"("submissionBId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_syllabusItemId_key" ON "Form"("syllabusItemId");

-- CreateIndex
CREATE INDEX "Form_courseId_status_idx" ON "Form"("courseId", "status");

-- CreateIndex
CREATE INDEX "Form_createdBy_idx" ON "Form"("createdBy");

-- CreateIndex
CREATE INDEX "FormSection_formId_position_idx" ON "FormSection"("formId", "position");

-- CreateIndex
CREATE INDEX "FormQuestion_formId_position_idx" ON "FormQuestion"("formId", "position");

-- CreateIndex
CREATE INDEX "FormQuestion_sectionId_idx" ON "FormQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "QuestionBankItem_courseId_idx" ON "QuestionBankItem"("courseId");

-- CreateIndex
CREATE INDEX "QuestionBankItem_createdBy_idx" ON "QuestionBankItem"("createdBy");

-- CreateIndex
CREATE INDEX "QuestionBankItem_questionType_idx" ON "QuestionBankItem"("questionType");

-- CreateIndex
CREATE INDEX "FormAttempt_formId_status_idx" ON "FormAttempt"("formId", "status");

-- CreateIndex
CREATE INDEX "FormAttempt_userId_idx" ON "FormAttempt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FormAttempt_formId_userId_attemptNumber_key" ON "FormAttempt"("formId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "FormAttemptAnswer_attemptId_idx" ON "FormAttemptAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "FormAttemptAnswer_questionId_idx" ON "FormAttemptAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "FormAttemptAnswer_attemptId_questionId_key" ON "FormAttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicProgram_instituteId_code_key" ON "AcademicProgram"("instituteId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicProgram_id_instituteId_key" ON "AcademicProgram"("id", "instituteId");

-- CreateIndex
CREATE INDEX "ProgramMembership_userId_isActive_idx" ON "ProgramMembership"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ProgramChartNode_programId_parentId_position_idx" ON "ProgramChartNode"("programId", "parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramChartNode_id_programId_key" ON "ProgramChartNode"("id", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramChartNode_programId_memberUserId_key" ON "ProgramChartNode"("programId", "memberUserId");

-- CreateIndex
CREATE INDEX "PrivateAsset_instituteId_ownerId_idx" ON "PrivateAsset"("instituteId", "ownerId");

-- CreateIndex
CREATE INDEX "LegacyAssetBinding_url_instituteId_idx" ON "LegacyAssetBinding"("url", "instituteId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_programId_instituteId_fkey" FOREIGN KEY ("programId", "instituteId") REFERENCES "AcademicProgram"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusItem" ADD CONSTRAINT "SyllabusItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroup" ADD CONSTRAINT "StudentGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMember" ADD CONSTRAINT "StudentGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMember" ADD CONSTRAINT "StudentGroupMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTargetGroup" ADD CONSTRAINT "SyllabusTargetGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTargetGroup" ADD CONSTRAINT "SyllabusTargetGroup_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationBroadcast" ADD CONSTRAINT "NotificationBroadcast_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationBroadcast" ADD CONSTRAINT "NotificationBroadcast_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateComment" ADD CONSTRAINT "PrivateComment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateComment" ADD CONSTRAINT "PrivateComment_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateComment" ADD CONSTRAINT "PrivateComment_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAttachment" ADD CONSTRAINT "SubmissionAttachment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "StudentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPolicy" ADD CONSTRAINT "GradingPolicy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_gradingPolicyId_fkey" FOREIGN KEY ("gradingPolicyId") REFERENCES "GradingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActivityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActivityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationProfile" ADD CONSTRAINT "GamificationProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GamificationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpTransaction" ADD CONSTRAINT "ExpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeIncentiveRule" ADD CONSTRAINT "GradeIncentiveRule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeIncentiveRule" ADD CONSTRAINT "GradeIncentiveRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardReward" ADD CONSTRAINT "LeaderboardReward_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLeaderboardCache" ADD CONSTRAINT "ActivityLeaderboardCache_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyChallenge" ADD CONSTRAINT "WeeklyChallenge_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyChallenge" ADD CONSTRAINT "WeeklyChallenge_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActivityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionLog" ADD CONSTRAINT "StudySessionLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionLog" ADD CONSTRAINT "StudySessionLog_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionLog" ADD CONSTRAINT "StudySessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAnnotation" ADD CONSTRAINT "MaterialAnnotation_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAnnotation" ADD CONSTRAINT "MaterialAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "StudentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPost" ADD CONSTRAINT "KxPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPost" ADD CONSTRAINT "KxPost_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPost" ADD CONSTRAINT "KxPost_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPost" ADD CONSTRAINT "KxPost_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxAnswer" ADD CONSTRAINT "KxAnswer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxAnswer" ADD CONSTRAINT "KxAnswer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxAnswer" ADD CONSTRAINT "KxAnswer_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxComment" ADD CONSTRAINT "KxComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxComment" ADD CONSTRAINT "KxComment_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "KxAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxComment" ADD CONSTRAINT "KxComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPostTag" ADD CONSTRAINT "KxPostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxPostTag" ADD CONSTRAINT "KxPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KxTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxVote" ADD CONSTRAINT "KxVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxVote" ADD CONSTRAINT "KxVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxVote" ADD CONSTRAINT "KxVote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "KxAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxRevision" ADD CONSTRAINT "KxRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxRevision" ADD CONSTRAINT "KxRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFlag" ADD CONSTRAINT "KxFlag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFlag" ADD CONSTRAINT "KxFlag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFlag" ADD CONSTRAINT "KxFlag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFlag" ADD CONSTRAINT "KxFlag_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "KxAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFlag" ADD CONSTRAINT "KxFlag_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "KxComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxBookmark" ADD CONSTRAINT "KxBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxBookmark" ADD CONSTRAINT "KxBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFollow" ADD CONSTRAINT "KxFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFollow" ADD CONSTRAINT "KxFollow_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KxTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxFollow" ADD CONSTRAINT "KxFollow_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxModerationAction" ADD CONSTRAINT "KxModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxModerationAction" ADD CONSTRAINT "KxModerationAction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KxNotification" ADD CONSTRAINT "KxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubToken" ADD CONSTRAINT "GithubToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRepoLink" ADD CONSTRAINT "GithubRepoLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRepoLink" ADD CONSTRAINT "GithubRepoLink_postId_fkey" FOREIGN KEY ("postId") REFERENCES "KxPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRepoLink" ADD CONSTRAINT "GithubRepoLink_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "StudentSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubSubmission" ADD CONSTRAINT "GithubSubmission_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubSubmission" ADD CONSTRAINT "GithubSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubSubmission" ADD CONSTRAINT "GithubSubmission_repoLinkId_fkey" FOREIGN KEY ("repoLinkId") REFERENCES "GithubRepoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubInlineComment" ADD CONSTRAINT "GithubInlineComment_repoLinkId_fkey" FOREIGN KEY ("repoLinkId") REFERENCES "GithubRepoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubInlineComment" ADD CONSTRAINT "GithubInlineComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubInlineComment" ADD CONSTRAINT "GithubInlineComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GithubInlineComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubCiResult" ADD CONSTRAINT "GithubCiResult_repoLinkId_fkey" FOREIGN KEY ("repoLinkId") REFERENCES "GithubRepoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionSimilarity" ADD CONSTRAINT "SubmissionSimilarity_submissionAId_fkey" FOREIGN KEY ("submissionAId") REFERENCES "GithubSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionSimilarity" ADD CONSTRAINT "SubmissionSimilarity_submissionBId_fkey" FOREIGN KEY ("submissionBId") REFERENCES "GithubSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_bankItemId_fkey" FOREIGN KEY ("bankItemId") REFERENCES "QuestionBankItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_showIfQuestionId_fkey" FOREIGN KEY ("showIfQuestionId") REFERENCES "FormQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAttempt" ADD CONSTRAINT "FormAttempt_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAttempt" ADD CONSTRAINT "FormAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAttemptAnswer" ADD CONSTRAINT "FormAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "FormAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAttemptAnswer" ADD CONSTRAINT "FormAttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FormQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicProgram" ADD CONSTRAINT "AcademicProgram_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMembership" ADD CONSTRAINT "ProgramMembership_programId_instituteId_fkey" FOREIGN KEY ("programId", "instituteId") REFERENCES "AcademicProgram"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMembership" ADD CONSTRAINT "ProgramMembership_userId_instituteId_fkey" FOREIGN KEY ("userId", "instituteId") REFERENCES "User"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramHeadAssignment" ADD CONSTRAINT "ProgramHeadAssignment_programId_userId_fkey" FOREIGN KEY ("programId", "userId") REFERENCES "ProgramMembership"("programId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramHeadAssignment" ADD CONSTRAINT "ProgramHeadAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AcademicProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_programId_memberUserId_fkey" FOREIGN KEY ("programId", "memberUserId") REFERENCES "ProgramMembership"("programId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramChartNode" ADD CONSTRAINT "ProgramChartNode_parentId_programId_fkey" FOREIGN KEY ("parentId", "programId") REFERENCES "ProgramChartNode"("id", "programId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrivateAsset" ADD CONSTRAINT "PrivateAsset_ownerId_instituteId_fkey" FOREIGN KEY ("ownerId", "instituteId") REFERENCES "User"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

