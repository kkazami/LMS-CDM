import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { slugify } from "@/features/knowledge-exchange/utils";
import KxAskForm from "@/features/knowledge-exchange/components/KxAskForm";
import type { KxTagSummary } from "@/features/knowledge-exchange/types";
import type { CourseOption } from "@/features/knowledge-exchange/components/KxCourseLinkSelector";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
  searchParams: Promise<{
    courseId?: string;
  }>;
}

export default async function KnowledgeExchangeAskPage({
  params,
  searchParams,
}: PageProps) {
  const { institute } = await params;
  const { courseId } = await searchParams;
  const session = await getSession();

  const [tags, courses] = await Promise.all([
    db.kxTag.findMany({
      orderBy: { postCount: "desc" },
    }),
    db.course.findMany({
      where: {
        institute: {
          code: {
            equals: institute,
            mode: "insensitive",
          },
        },
        isArchived: false,
      },
      select: {
        id: true,
        code: true,
        title: true,
        syllabusItems: {
          select: {
            id: true,
            title: true,
            type: true,
            enableIntegrityMonitoring: true,
          },
        },
      },
      take: 30,
    }),
  ]);

  const availableTags: KxTagSummary[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug || slugify(t.name),
    category: t.category,
    postCount: t.postCount,
    description: t.description,
  }));

  const enrolledCourses: CourseOption[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    syllabusItems: c.syllabusItems.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type || undefined,
      enableIntegrityMonitoring: s.enableIntegrityMonitoring || false,
    })),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
      </div>

      <KxAskForm
        instituteCode={institute}
        availableTags={availableTags}
        enrolledCourses={enrolledCourses}
        preselectedCourseId={courseId}
      />
    </div>
  );
}
