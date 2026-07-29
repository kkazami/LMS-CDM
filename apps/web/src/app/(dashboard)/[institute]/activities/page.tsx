/**
 * Interactive Activities — Landing Page (Placeholder)
 *
 * This is what the sidebar "Interactive Labs" link points to.
 * Sprint 0 scope: just a placeholder page confirming the user is eligible.
 * Actual activity selection UI comes in later sprints.
 */

import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { FlaskConical, Cpu, Server, CircuitBoard, Code2, Play, Settings } from "lucide-react";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();
  const theme = getInstituteTheme(institute);

  const templates = await db.activityTemplate.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { course: true }
  });

  const iconMap: Record<string, any> = {
    "pc-build": Cpu,
    "arduino": CircuitBoard,
    "server-rack": Server,
    "logic-gate": FlaskConical,
    "codelab": Code2
  };

  const isProfessor = session?.user?.role === "PROFESSOR" || session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";
  
  let taughtCourses = [];
  if (isProfessor) {
    taughtCourses = await db.course.findMany({
      where: { instructorId: session?.user?.id },
      select: { id: true, title: true }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Interactive Labs Catalog
        </h1>
        <p className="mt-2 text-gray-500">
          Explore hands-on learning activities for Computer Studies — BSIT & BSCpE. 
          Select an activity below to launch a demonstration instance.
        </p>
      </div>

      {isProfessor && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-indigo-900">
            <Settings className="w-5 h-5" />
            <h2 className="font-bold text-lg">Instructor Tools</h2>
          </div>
          <p className="text-sm text-indigo-700 mb-4">Select a course to open the Activity Editor and Analytics Dashboard.</p>
          <div className="flex flex-wrap gap-3">
            {taughtCourses.length === 0 ? (
              <span className="text-sm text-indigo-500 italic">You don't have any assigned courses yet.</span>
            ) : (
              taughtCourses.map(course => (
                <Link 
                  key={course.id}
                  href={`/${institute}/courses/${course.id}/activities/instructor`}
                  className="bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
                >
                  {course.title}
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <p className="text-gray-500">No activity templates found. Create one from the Instructor Dashboard first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const Icon = iconMap[template.activityType] || Code2;
            return (
              <Link
                href={`/${institute}/activities/${template.activityType}/${template.id}/demo_seed`}
                key={template.id}
                className="group rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4 hover:shadow-lg transition-all hover:border-indigo-300"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Play className="w-3 h-3" /> Launch
                  </span>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {template.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    Course: {template.course.title}
                  </p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-medium text-gray-400">
                  <span className="uppercase">{template.activityType}</span>
                  <span>Level {template.difficulty}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
