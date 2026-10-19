import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { serializeAuthor, slugify } from "@/features/knowledge-exchange/utils";
import KxEditForm from "@/features/knowledge-exchange/components/KxEditForm";
import type { KxPostItem, KxTagSummary } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
    postId: string;
  }>;
}

export default async function KnowledgeExchangeEditPostPage({ params }: PageProps) {
  const { institute, postId } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const [rawPost, tags] = await Promise.all([
    db.kxPost.findUnique({
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
      },
    }),
    db.kxTag.findMany({
      orderBy: { postCount: "desc" },
    }),
  ]);

  if (!rawPost || rawPost.isDeleted) {
    notFound();
  }

  const isAuthor = rawPost.authorId === session.user.id;

  if (!isAuthor) {
    redirect(`/${institute}/knowledge-exchange/post/${postId}`);
  }

  const role = (session.user.role as string) || "STUDENT";

  const viewer = {
    id: session.user.id,
    role,
  };

  const post: KxPostItem = {
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
    isAnonymous: rawPost.isAnonymous,
    authorId: rawPost.isAnonymous ? null : rawPost.authorId,
    author: serializeAuthor(rawPost.author, rawPost.isAnonymous, viewer),
    course: rawPost.course,
    tags: rawPost.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      slug: t.tag.slug || slugify(t.tag.name),
      category: t.tag.category,
      postCount: t.tag.postCount,
      description: t.tag.description,
    })),
    voteCount: rawPost.voteCount,
    answerCount: rawPost.answerCount,
    viewCount: rawPost.viewCount,
    createdAt: rawPost.createdAt.toISOString(),
    updatedAt: rawPost.updatedAt.toISOString(),
  };

  const availableTags: KxTagSummary[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug || slugify(t.name),
    category: t.category,
    postCount: t.postCount,
    description: t.description,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange/post/${postId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discussion</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Question</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revise your question details, description, or tags. An edit summary will be recorded in revision history.
        </p>
      </div>
      <KxEditForm
        post={post}
        instituteCode={institute}
        availableTags={availableTags}
      />
    </div>
  );
}
