import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";

export default async function InstructorActivitiesLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ institute: string; courseId: string }>;
}) {
  const { institute, courseId } = await params;
  
  // 1. Validate session & Role
  const session = await getSession();
  if (!session) {
    redirect(`/${institute}/login`);
  }

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}`);
  }

  // 2. Validate ICS Scope Eligibility (Sprint 0 guard)
  const eligibility = await checkActivityEligibility();
  if (!eligibility || !eligibility.eligible) {
    // Instructor is not teaching an ICS BSIT/BSCpE course
    redirect(`/${institute}/courses/${courseId}`);
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 min-h-screen">
      <div className="bg-indigo-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Interactive Activities <span className="text-indigo-300 font-normal">| Instructor Dashboard</span>
          </h1>
        </div>
      </div>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
