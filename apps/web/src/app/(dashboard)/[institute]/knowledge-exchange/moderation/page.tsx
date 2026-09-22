import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import KxModerationQueue from "@/features/knowledge-exchange/components/KxModerationQueue";
import type { KxFlagItem, KxModerationActionItem } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function KnowledgeExchangeModerationPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string) || "STUDENT";
  const isStaff = ["ADMIN", "PROFESSOR", "TEACHER", "INSTRUCTOR"].includes(role.toUpperCase());

  if (!isStaff) {
    redirect(`/${institute}/knowledge-exchange`);
  }

  const [rawFlags, rawActions] = await Promise.all([
    db.kxFlag.findMany({
      where: { status: "PENDING" },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        answer: {
          select: {
            id: true,
            body: true,
            postId: true,
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            postId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.kxModerationAction.findMany({
      include: {
        moderator: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const initialFlags: KxFlagItem[] = rawFlags.map((f) => ({
    id: f.id,
    targetType: f.postId ? "POST" : f.answerId ? "ANSWER" : "COMMENT",
    targetId: f.postId || f.answerId || f.commentId || "",
    reason: f.reason as any,
    details: f.description,
    description: f.description,
    status: f.status as any,
    reporterId: f.reporterId,
    reporter: f.reporter,
    reviewedById: f.reviewedById,
    post: f.post,
    answer: f.answer,
    comment: f.comment,
    createdAt: f.createdAt.toISOString(),
  }));

  const initialActions: KxModerationActionItem[] = rawActions.map((a) => ({
    id: a.id,
    moderatorId: a.moderatorId,
    moderator: a.moderator,
    targetType: a.targetType as any,
    targetId: a.targetId,
    actionType: a.actionType as any,
    action: a.actionType,
    reason: a.reason,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
      </div>

      <KxModerationQueue
        initialFlags={initialFlags}
        initialActions={initialActions}
        instituteCode={institute}
      />
    </div>
  );
}
