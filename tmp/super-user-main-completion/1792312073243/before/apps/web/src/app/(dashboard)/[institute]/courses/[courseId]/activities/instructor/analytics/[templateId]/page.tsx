import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BarChart3, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function AnalyticsViewPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string; templateId: string }>;
}) {
  const { institute, courseId, templateId } = await params;

  const template = await db.activityTemplate.findUnique({
    where: { id: templateId },
    include: {
      submissions: {
        include: {
          student: { select: { id: true, name: true } }
        },
        orderBy: { submittedAt: "desc" }
      }
    }
  });

  if (!template) notFound();

  const submissions = template.submissions;
  const totalSubmissions = submissions.length;

  if (totalSubmissions === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        No submissions yet for this activity. Check back later!
      </div>
    );
  }

  // 1. Aggregations
  const passedCount = submissions.filter(s => s.passed).length;
  const passRate = Math.round((passedCount / totalSubmissions) * 100);
  
  const avgScore = Math.round(submissions.reduce((acc, s) => acc + s.score, 0) / totalSubmissions);
  const avgTime = Math.round(submissions.reduce((acc, s) => acc + s.completionTimeSeconds, 0) / totalSubmissions);

  // 2. Mistake Heatmap
  // Parse stateCheck for boolean/failing flags.
  const mistakeCounts: Record<string, number> = {};
  
  for (const sub of submissions) {
    let state = {};
    try {
      state = JSON.parse(sub.stateCheck || "{}");
    } catch(e) {}

    for (const [key, val] of Object.entries(state)) {
      if (val === false || val === 0 || (typeof val === "string" && val.toLowerCase().includes("fail"))) {
        mistakeCounts[key] = (mistakeCounts[key] || 0) + 1;
      }
    }
  }

  // Sort mistakes by frequency
  const sortedMistakes = Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Analytics: {template.title}</h2>
        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">Aggregate performance and common mistakes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-orange-500/10 text-[#F97316] rounded-2xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 dark:text-[#8B92A5] text-xs font-bold uppercase tracking-wider">Pass Rate</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">{passRate}%</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 dark:text-[#8B92A5] text-xs font-bold uppercase tracking-wider">Avg Score</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">{avgScore}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 dark:text-[#8B92A5] text-xs font-bold uppercase tracking-wider">Avg Time</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">{Math.floor(avgTime / 60)}m {avgTime % 60}s</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap */}
        <div className="lg:col-span-1 bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-[#F0F2F8] border-b border-slate-100 dark:border-white/5 pb-3 mb-4">Mistake Heatmap</h3>
          {sortedMistakes.length === 0 ? (
            <p className="text-slate-400 dark:text-[#8B92A5] text-xs">No common state failures detected.</p>
          ) : (
            <div className="space-y-4">
              {sortedMistakes.map(([key, count]) => {
                const percentage = Math.round((count / totalSubmissions) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-mono text-slate-700 dark:text-[#F0F2F8] truncate max-w-[200px]" title={key}>{key}</span>
                      <span className="text-red-500 dark:text-red-400 font-bold">{count} students</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submissions List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#181B26]">
            <h3 className="font-bold text-sm text-slate-900 dark:text-[#F0F2F8]">Recent Submissions</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[400px] overflow-y-auto">
            {submissions.map(sub => (
              <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-[#F0F2F8]">{sub.student.name}</div>
                  <div className="text-[11px] text-slate-400 dark:text-[#8B92A5]">{new Date(sub.submittedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-900 dark:text-[#F0F2F8]">Score: {sub.score}</div>
                    <div className="text-[11px] text-slate-400 dark:text-[#8B92A5]">{sub.attempts} attempts</div>
                  </div>
                  <Link 
                    href={`/${institute}/courses/${courseId}/activities/instructor/submissions/${sub.id}`}
                    className="px-3 py-1.5 text-xs bg-orange-500/10 text-[#F97316] font-semibold rounded-xl hover:bg-orange-500/20 transition-colors"
                  >
                    Replay / Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
