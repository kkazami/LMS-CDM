import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { KxAnalyticsDashboard } from "@/features/knowledge-exchange/components/KxAnalyticsDashboard";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function KnowledgeExchangeAnalyticsPage({ params }: PageProps) {
  const { institute } = await params;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/${institute}/knowledge-exchange`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Knowledge Exchange Analytics
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Engagement metrics, resolution rates, and discussion activity across the ICS institute.
        </p>
      </div>

      <KxAnalyticsDashboard institute={institute} />
    </div>
  );
}
