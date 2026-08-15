import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Activity, FileJson } from "lucide-react";

export default async function SubmissionReplayPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string; submissionId: string }>;
}) {
  const { institute, courseId, submissionId } = await params;

  const submission = await db.activitySubmission.findUnique({
    where: { id: submissionId },
    include: {
      student: { select: { name: true, email: true } },
      template: { select: { title: true, activityType: true, id: true } }
    }
  });

  if (!submission) notFound();

  let stateCheck: Record<string, unknown> = {};
  let errorLog: string[] = [];

  try { stateCheck = JSON.parse(submission.stateCheck); } catch(e) {}
  try { errorLog = JSON.parse(submission.errorLog); } catch(e) {}

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href={`/${institute}/courses/${courseId}/activities/instructor/analytics/${submission.template.id}`}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Submission Review: {submission.student.name}</h2>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">Activity: {submission.template.title} ({submission.template.activityType})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Meta Stats */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-[#141721] p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <div className="text-xs text-slate-400 dark:text-[#8B92A5] uppercase font-bold tracking-wider mb-1">Final Score</div>
            <div className={`text-4xl font-extrabold ${submission.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {submission.score} <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/ {submission.maxScore}</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              {submission.passed ? "Status: Passed" : "Status: Failed"}
            </div>
          </div>

          <div className="bg-white dark:bg-[#141721] p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
            <div>
              <div className="text-xs text-slate-400 dark:text-[#8B92A5] uppercase font-bold flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> Time Spent
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-[#F0F2F8]">
                {Math.floor(submission.completionTimeSeconds / 60)}m {submission.completionTimeSeconds % 60}s
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 dark:text-[#8B92A5] uppercase font-bold flex items-center gap-1 mb-1">
                <Activity className="w-3.5 h-3.5" /> Attempts
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-[#F0F2F8]">{submission.attempts}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 dark:text-[#8B92A5] uppercase font-bold flex items-center gap-1 mb-1">
                <FileJson className="w-3.5 h-3.5" /> Seed Variant
              </div>
              <div className="font-mono text-xs text-slate-900 dark:text-[#F0F2F8] bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-2 py-0.5 rounded-md inline-block">
                {submission.variantSeed}
              </div>
            </div>
          </div>
        </div>

        {/* State Replay & Logs */}
        <div className="md:col-span-3 space-y-6">
          
          <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/50 dark:bg-[#181B26] border-b border-slate-100 dark:border-white/5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F0F2F8]">Final State (Reconstructed)</h3>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-0.5">
                The exact state snapshot submitted by the student's activity module.
              </p>
            </div>
            <div className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#181B26] text-slate-500 dark:text-[#8B92A5] uppercase font-bold border-b border-slate-100 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-3">State Key</th>
                    <th className="px-6 py-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {Object.entries(stateCheck).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-mono text-slate-700 dark:text-[#8B92A5]">{key}</td>
                      <td className="px-6 py-3">
                        {typeof val === 'boolean' ? (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${val ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                            {val ? "TRUE (PASS)" : "FALSE (FAIL)"}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-900 dark:text-[#F0F2F8] font-semibold">{String(val)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(stateCheck).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-slate-400 dark:text-slate-500">No state payload recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400">
              <h3 className="font-bold text-sm flex items-center gap-2">
                Student-Facing Error Logs
              </h3>
            </div>
            <div className="p-4">
              {errorLog.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-xs italic">No errors logged during this session.</p>
              ) : (
                <ul className="list-disc ml-5 space-y-2 text-xs text-slate-800 dark:text-[#F0F2F8] font-mono">
                  {errorLog.map((log, i) => (
                    <li key={i}>{log}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
