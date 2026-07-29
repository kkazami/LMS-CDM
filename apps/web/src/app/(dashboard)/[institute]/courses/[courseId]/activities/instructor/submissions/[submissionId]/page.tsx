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

  let stateCheck = {};
  let errorLog = [];

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
          <h2 className="text-2xl font-bold text-gray-900">Submission Review: {submission.student.name}</h2>
          <p className="text-gray-500">Activity: {submission.template.title} ({submission.template.activityType})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Meta Stats */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Final Score</div>
            <div className={`text-4xl font-extrabold ${submission.passed ? 'text-green-600' : 'text-red-600'}`}>
              {submission.score} <span className="text-lg text-gray-400">/ {submission.maxScore}</span>
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">
              {submission.passed ? "Status: Passed" : "Status: Failed"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                <Clock className="w-4 h-4" /> Time Spent
              </div>
              <div className="font-medium text-gray-900">
                {Math.floor(submission.completionTimeSeconds / 60)}m {submission.completionTimeSeconds % 60}s
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                <Activity className="w-4 h-4" /> Attempts
              </div>
              <div className="font-medium text-gray-900">{submission.attempts}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                <FileJson className="w-4 h-4" /> Seed Variant
              </div>
              <div className="font-mono text-xs text-gray-900 bg-gray-100 p-1 rounded inline-block">
                {submission.variantSeed}
              </div>
            </div>
          </div>
        </div>

        {/* State Replay & Logs */}
        <div className="md:col-span-3 space-y-6">
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Final State (Reconstructed)</h3>
              <p className="text-xs text-gray-500 mt-1">
                The exact state snapshot submitted by the student's activity module.
              </p>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 border-b">State Key</th>
                    <th className="px-6 py-3 border-b">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(stateCheck).map(([key, val]) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-gray-700">{key}</td>
                      <td className="px-6 py-3">
                        {typeof val === 'boolean' ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {val ? "TRUE (PASS)" : "FALSE (FAIL)"}
                          </span>
                        ) : (
                          <span className="font-mono text-gray-900">{String(val)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(stateCheck).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-gray-500">No state payload recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-100 text-red-900">
              <h3 className="font-bold flex items-center gap-2">
                Student-Facing Error Logs
              </h3>
            </div>
            <div className="p-4">
              {errorLog.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No errors logged during this session.</p>
              ) : (
                <ul className="list-disc ml-5 space-y-2 text-sm text-gray-800 font-mono">
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
