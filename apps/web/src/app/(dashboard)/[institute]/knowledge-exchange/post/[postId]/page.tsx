import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { serializeAuthor, slugify } from "@/features/knowledge-exchange/utils";
import KxPostDetailClient from "@/features/knowledge-exchange/components/KxPostDetailClient";
import type { KxPostItem } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
    postId: string;
  }>;
}

export default async function KnowledgeExchangePostDetailPage({ params }: PageProps) {
  const { institute, postId } = await params;
  const session = await getSession();

  let post: KxPostItem | null = null;

  if (session?.user?.id) {
    // Increment viewCount non-blockingly
    await db.kxPost
      .update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    try {
      const rawPost = await db.kxPost.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              studentNumber: true,
              avatarUrl: true,
            },
          },
          tags: {
            include: { tag: true },
          },
          course: {
            select: { id: true, code: true, title: true },
          },
          syllabusItem: {
            select: { id: true, title: true, type: true, enableIntegrityMonitoring: true },
          },
          votes: {
            where: { userId: session.user.id },
            select: { value: true },
          },
          bookmarks: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          comments: {
            where: { isDeleted: false, answerId: null },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  email: true,
                  studentNumber: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          answers: {
            where: { isDeleted: false },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  email: true,
                  studentNumber: true,
                  avatarUrl: true,
                },
              },
              verifiedBy: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
              votes: {
                where: { userId: session.user.id },
                select: { value: true },
              },
              comments: {
                where: { isDeleted: false },
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      role: true,
                      email: true,
                      studentNumber: true,
                      avatarUrl: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [{ isAccepted: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
          },
        },
      });

      if (rawPost && !rawPost.isDeleted) {
        const viewer = {
          id: session.user.id,
          role: (session.user.role as string) || "STUDENT",
        };
        const isViewerAdmin = viewer.role?.toUpperCase() === "ADMIN";

        const serializedAnswers = rawPost.answers.map((a) => {
          const userVote = a.votes[0]?.value || 0;
          return {
            id: a.id,
            postId: a.postId,
            authorId: a.isAnonymous && !isViewerAdmin ? null : a.authorId,
            body: a.body,
            isAccepted: a.isAccepted,
            isVerified: a.isVerified,
            verifiedAt: null,
            verifiedBy: a.verifiedBy,
            voteCount: a.voteCount,
            userVote,
            isAnonymous: a.isAnonymous,
            isDeleted: a.isDeleted,
            author: serializeAuthor(a.author, a.isAnonymous, viewer),
            comments: a.comments.map((c) => ({
              id: c.id,
              postId: c.postId,
              answerId: c.answerId,
              authorId: c.isAnonymous && !isViewerAdmin ? null : c.authorId,
              body: c.body,
              isAnonymous: c.isAnonymous,
              isDeleted: c.isDeleted,
              createdAt: c.createdAt.toISOString(),
              updatedAt: c.updatedAt.toISOString(),
              author: serializeAuthor(c.author, c.isAnonymous, viewer),
            })),
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
          };
        });

        const serializedComments = rawPost.comments.map((c) => ({
          id: c.id,
          postId: c.postId,
          answerId: c.answerId,
          authorId: c.isAnonymous && !isViewerAdmin ? null : c.authorId,
          body: c.body,
          isAnonymous: c.isAnonymous,
          isDeleted: c.isDeleted,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          author: serializeAuthor(c.author, c.isAnonymous, viewer),
        }));

        const userVote = rawPost.votes[0]?.value || 0;

        post = {
          id: rawPost.id,
          instituteId: rawPost.instituteId,
          courseId: rawPost.courseId,
          syllabusItemId: rawPost.syllabusItemId,
          title: rawPost.title,
          body: rawPost.body,
          postType: rawPost.postType as any,
          status: rawPost.status as any,
          isPinned: rawPost.isPinned,
          isLocked: rawPost.status === "LOCKED",
          isDeleted: rawPost.isDeleted,
          isAnonymous: rawPost.isAnonymous,
          authorId: rawPost.isAnonymous && !isViewerAdmin ? null : rawPost.authorId,
          author: serializeAuthor(rawPost.author, rawPost.isAnonymous, viewer),
          course: rawPost.course,
          syllabusItem: rawPost.syllabusItem,
          tags: rawPost.tags.map((t) => ({
            id: t.tag.id,
            name: t.tag.name,
            slug: slugify(t.tag.name),
            category: t.tag.category as any,
            postCount: t.tag.postCount,
            description: t.tag.description,
          })),
          voteCount: rawPost.voteCount,
          answerCount: rawPost.answerCount,
          viewCount: rawPost.viewCount,
          userVote,
          isBookmarked: rawPost.bookmarks.length > 0,
          answers: serializedAnswers,
          comments: serializedComments,
          createdAt: rawPost.createdAt.toISOString(),
          updatedAt: rawPost.updatedAt.toISOString(),
        };
      }
    } catch {
      // Ignore DB fetch errors, fallback to client fetch
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <KxPostDetailClient
        postId={postId}
        instituteCode={institute}
        currentUserId={session?.user?.id}
        currentUserRole={session?.user?.role}
        currentUserAvatar={session?.user?.avatarUrl}
        currentUserName={session?.user?.name}
        initialPost={post}
      />
    </div>
  );
}
