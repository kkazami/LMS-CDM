import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireIbeConsultationPageActor } from "@/lib/ibe-consultation/access";
import {
  getStudentConsultationStats,
  getStudentEnrolledSubjectsWithInstructors,
  listAppointmentsForActor,
} from "@/lib/ibe-consultation/service";
import StudentConsultationClient from "@/components/ibe-consultation/StudentConsultationClient";

export const dynamic = "force-dynamic";

interface ConsultationPageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function IbeStudentConsultationPage({
  params,
}: ConsultationPageProps) {
  const { institute } = await params;
  const actor = await requireIbeConsultationPageActor(institute, [
    "STUDENT",
    "INSTRUCTOR",
  ]);

  if (actor.role === "INSTRUCTOR") {
    redirect(`/${institute}/consultation-management`);
  }

  const [stats, subjects, paginated] = await Promise.all([
    getStudentConsultationStats(actor.userId),
    getStudentEnrolledSubjectsWithInstructors(actor),
    listAppointmentsForActor(actor, { page: 1, pageSize: 10 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-4">
      <Suspense
        fallback={
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading IBE Consultation &amp; Scheduling...
          </div>
        }
      >
        <StudentConsultationClient
          studentName={actor.name}
          studentProgram={actor.programCode ?? null}
          initialStats={stats}
          initialSubjects={subjects}
          initialAppointments={paginated.appointments}
          initialTotal={paginated.total}
        />
      </Suspense>
    </div>
  );
}
