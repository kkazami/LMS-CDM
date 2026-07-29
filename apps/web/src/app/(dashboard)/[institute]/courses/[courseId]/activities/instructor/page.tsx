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
          <h2 className="text-2xl font-bold text-gray-900">Activity Templates</h2>
          <p className="text-gray-500">Manage interactive scenarios for this course.</p>
        </div>
        <Link 
          href={`/${institute}/courses/${courseId}/activities/instructor/templates/new`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200 border-dashed">
          <p className="text-gray-500 mb-4">No activity templates found for this course.</p>
          <Link 
            href={`/${institute}/courses/${courseId}/activities/instructor/templates/new`}
            className="text-indigo-600 font-medium hover:underline"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 truncate" title={template.title}>{template.title}</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">
                    {template.activityType}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Difficulty: {template.difficulty} | Linked to Gradebook: {template.syllabusItemId ? "Yes" : "No"}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  <Users className="w-4 h-4 text-gray-400" />
                  <strong>{template._count.submissions}</strong> submissions
                </div>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 p-3 flex gap-2">
                <Link 
                  href={`/${institute}/courses/${courseId}/activities/instructor/templates/${template.id}`}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <FileEdit className="w-4 h-4" /> Edit
                </Link>
                <Link 
                  href={`/${institute}/courses/${courseId}/activities/instructor/analytics/${template.id}`}
                  className="flex-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" /> Analytics
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
