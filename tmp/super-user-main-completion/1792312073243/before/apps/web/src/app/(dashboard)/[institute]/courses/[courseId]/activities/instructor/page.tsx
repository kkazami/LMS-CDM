import { db } from "@/lib/db";
import Link from "next/link";
import { FileEdit, BarChart3, Users, PlusCircle } from "lucide-react";

export default async function InstructorDashboardPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string }>;
}) {
  const { institute, courseId } = await params;

  // Fetch all templates for this course
  const templates = await db.activityTemplate.findMany({
    where: { courseId },
    include: {
      _count: {
        select: { submissions: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Activity Templates</h2>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">Manage interactive scenarios for this course.</p>
        </div>
        <Link 
          href={`/${institute}/courses/${courseId}/activities/instructor/templates/new`}
          className="bg-[#F97316] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <PlusCircle className="w-4 h-4" /> New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-[#141721] p-12 text-center rounded-2xl border border-slate-200/80 dark:border-white/5 border-dashed shadow-xs">
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mb-4">No activity templates found for this course.</p>
          <Link 
            href={`/${institute}/courses/${courseId}/activities/instructor/templates/new`}
            className="text-[#F97316] text-xs font-semibold hover:underline"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-[#F0F2F8] truncate" title={template.title}>{template.title}</h3>
                  <span className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-slate-200/50 dark:border-white/5">
                    {template.activityType}
                  </span>
                </div>
                <div className="text-xs text-slate-400 dark:text-[#8B92A5] mb-4">
                  Difficulty: {template.difficulty} | Linked to Gradebook: {template.syllabusItemId ? "Yes" : "No"}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-[#F0F2F8] bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <strong>{template._count.submissions}</strong> submissions
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#181B26] p-3 flex gap-2">
                <Link 
                  href={`/${institute}/courses/${courseId}/activities/instructor/templates/${template.id}`}
                  className="flex-1 bg-white dark:bg-[#1E2132] border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileEdit className="w-3.5 h-3.5" /> Edit
                </Link>
                <Link 
                  href={`/${institute}/courses/${courseId}/activities/instructor/analytics/${template.id}`}
                  className="flex-1 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-[#F97316] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Analytics
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
