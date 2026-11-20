import React, { Suspense } from "react";
import { requireLessonPlanPageActor } from "@/lib/lesson-plans/guard";
import LessonPlanBuilderClient from "@/components/lesson-plans/LessonPlanBuilderClient";

export const dynamic = "force-dynamic";

interface LessonPlanPageProps {
  params: Promise<{ institute: string }>;
}

export default async function LessonPlanPage({ params }: LessonPlanPageProps) {
  const { institute } = await params;
  const actor = await requireLessonPlanPageActor(institute);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
          Loading Lesson Plan Builder...
        </div>
      }
    >
      <LessonPlanBuilderClient
        studentName={actor.name}
        programCode={actor.programCode}
        programName={actor.programName}
      />
    </Suspense>
  );
}

