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
        <h2 className="text-2xl font-bold text-gray-900">Analytics: {template.title}</h2>
        <p className="text-gray-500">Aggregate performance and common mistakes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-bold uppercase">Pass Rate</div>
            <div className="text-3xl font-extrabold text-gray-900">{passRate}%</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-bold uppercase">Avg Score</div>
            <div className="text-3xl font-extrabold text-gray-900">{avgScore}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-bold uppercase">Avg Time</div>
            <div className="text-3xl font-extrabold text-gray-900">{Math.floor(avgTime / 60)}m {avgTime % 60}s</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 border-b pb-3 mb-4">Mistake Heatmap</h3>
          {sortedMistakes.length === 0 ? (
            <p className="text-gray-500 text-sm">No common state failures detected.</p>
          ) : (
            <div className="space-y-4">
              {sortedMistakes.map(([key, count]) => {
                const percentage = Math.round((count / totalSubmissions) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-mono text-gray-700 truncate max-w-[200px]" title={key}>{key}</span>
                      <span className="text-red-500 font-bold">{count} students</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submissions List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Recent Submissions</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {submissions.map(sub => (
              <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-bold text-gray-900">{sub.student.name}</div>
                  <div className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-gray-900">Score: {sub.score}</div>
                    <div className="text-xs text-gray-500">{sub.attempts} attempts</div>
                  </div>
                  <Link 
                    href={`/${institute}/courses/${courseId}/activities/instructor/submissions/${sub.id}`}
                    className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 font-medium rounded hover:bg-indigo-100"
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
