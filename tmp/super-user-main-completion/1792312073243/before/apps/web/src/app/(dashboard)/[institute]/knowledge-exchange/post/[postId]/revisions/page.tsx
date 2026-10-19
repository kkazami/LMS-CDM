import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { KxRevisionDiff } from "@/features/knowledge-exchange/components/KxRevisionDiff";

interface PageProps {
  params: Promise<{
    institute: string;
    postId: string;
  }>;
}

export default async function KnowledgeExchangeRevisionsPage({ params }: PageProps) {
  const { institute, postId } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const [post, revisions] = await Promise.all([
    db.kxPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        body: true,
        updatedAt: true,
        isAnonymous: true,
        authorId: true,
      },
    }),
    db.kxRevision.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      include: {
        editor: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  if (!post) {
    notFound();
  }

  const viewerRole = session.user.role ? (session.user.role as string).toUpperCase() : "";
  const isStaffOrAdmin =
    viewerRole === "ADMIN" ||
    viewerRole === "PROFESSOR" ||
    viewerRole === "INSTRUCTOR" ||
    viewerRole === "TEACHER";
  const isAuthorSelf = session.user.id === post.authorId;
  const shouldRedact = post.isAnonymous && !isStaffOrAdmin && !isAuthorSelf;

  const formattedRevisions = revisions.map((r) => ({
    id: r.id,
    postId: r.postId,
    title: r.title,
    body: r.body,
    editSummary: r.summary,
    createdAt: r.createdAt.toISOString(),
    user: shouldRedact
      ? {
          name:
            r.editor?.role === "PROFESSOR" ||
            r.editor?.role === "INSTRUCTOR" ||
            r.editor?.role === "TEACHER"
              ? "Anonymous Instructor"
              : "Anonymous Student",
          email: null,
        }
      : r.editor,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange/post/${postId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discussion</span>
        </Link>
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Revision History
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review historic changes, edits, and updates made to &quot;{post.title}&quot;.
        </p>
      </div>

      <KxRevisionDiff
        revisions={formattedRevisions}
        currentPost={{
          title: post.title,
          body: post.body,
          updatedAt: post.updatedAt.toISOString(),
        }}
      />
    </div>
  );
}
