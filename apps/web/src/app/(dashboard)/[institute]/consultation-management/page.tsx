import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireIbeConsultationPageActor } from "@/lib/ibe-consultation/access";
import {
  getInstructorConsultationStats,
  getInstructorScheduleConfig,
  listAppointmentsForActor,
} from "@/lib/ibe-consultation/service";
import InstructorConsultationClient from "@/components/ibe-consultation/InstructorConsultationClient";

export const dynamic = "force-dynamic";

interface ConsultationManagementPageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function IbeInstructorConsultationManagementPage({
  params,
}: ConsultationManagementPageProps) {
  const { institute } = await params;
  const actor = await requireIbeConsultationPageActor(institute, [
    "INSTRUCTOR",
    "STUDENT",
  ]);

  if (actor.role === "STUDENT") {
    redirect(`/${institute}/consultation`);
  }

  const [stats, availData, paginated, assignedCourses] = await Promise.all([
    getInstructorConsultationStats(actor.userId),
    getInstructorScheduleConfig(actor.userId),
    listAppointmentsForActor(actor, { page: 1, pageSize: 12 }),
    db.course.findMany({
      where: {
        instructorId: actor.userId,
        isArchived: false,
        institute: {
          code: { equals: "IBE", mode: "insensitive" },
        },
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-4">
      <Suspense
        fallback={
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading IBE Consultation Management...
          </div>
        }
      >
        <InstructorConsultationClient
          instructorName={actor.name}
          initialStats={stats}
          initialAvailability={availData.availabilities}
          initialBlockedDates={availData.blockedDates}
          initialAppointments={paginated.appointments}
          initialTotal={paginated.total}
          instructorSubjects={assignedCourses}
        />
      </Suspense>
    </div>
  );
}
