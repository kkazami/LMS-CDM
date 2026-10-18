import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";
import { slugify } from "@/features/knowledge-exchange/utils";
import KxTagBrowser from "@/features/knowledge-exchange/components/KxTagBrowser";
import type { KxTagSummary } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function KnowledgeExchangeTagsPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  const rawRole = session?.user?.role || "STUDENT";
  const normalized = normalizeRole(rawRole);
  const canCreateTag = normalized === "INSTRUCTOR" || normalized === "ADMIN";

  const tags = await db.kxTag.findMany({
    orderBy: [{ postCount: "desc" }, { name: "asc" }],
  });

  const formattedTags: KxTagSummary[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: slugify(t.name),
    category: t.category as any,
    postCount: t.postCount,
    description: t.description || "",
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

      <KxTagBrowser
        tags={formattedTags}
        instituteCode={institute}
        canCreateTag={canCreateTag}
        userRole={rawRole}
      />
    </div>
  );
}
