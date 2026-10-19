import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { serializeAuthor, slugify } from "@/features/knowledge-exchange/utils";
import KxPostCard from "@/features/knowledge-exchange/components/KxPostCard";
import type { KxPostItem } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function KnowledgeExchangeBookmarksPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const bookmarks = await db.kxBookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
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
        },
      },
    },
  });

  const viewer = {
    id: session.user.id,
    role: (session.user.role as string) || "STUDENT",
  };
  const isViewerAdmin = viewer.role?.toUpperCase() === "ADMIN";

  const savedPosts: KxPostItem[] = bookmarks
    .filter((b) => b.post && !b.post.isDeleted)
    .map((b) => {
      const p = b.post;
      return {
        id: p.id,
        instituteId: p.instituteId,
        courseId: p.courseId,
        syllabusItemId: p.syllabusItemId,
        title: p.title,
        body: p.body,
        postType: p.postType as any,
        status: p.status as any,
        isPinned: p.isPinned,
        isLocked: p.status === "LOCKED",
        isAnonymous: p.isAnonymous,
        authorId: p.isAnonymous && !isViewerAdmin ? null : p.authorId,
        author: serializeAuthor(p.author, p.isAnonymous, viewer),
        course: p.course,
        tags: p.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          slug: slugify(t.tag.name),
          category: t.tag.category as any,
          postCount: t.tag.postCount,
          description: t.tag.description,
        })),
        voteCount: p.voteCount,
        answerCount: p.answerCount,
        viewCount: p.viewCount,
        isBookmarked: true,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
        <div className="flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-primary fill-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Saved Bookmarks
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Questions and discussions you have saved for future reference.
        </p>
      </div>

      {savedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-muted/10">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
          <h3 className="font-semibold text-base text-foreground">No bookmarks saved yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Click the bookmark icon on any discussion or question to save it here.
          </p>
          <Link
            href={`/${institute}/knowledge-exchange`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
          >
            Explore Questions
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedPosts.map((post) => (
            <KxPostCard
              key={post.id}
              post={post}
              instituteCode={institute}
              currentUserId={session.user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
