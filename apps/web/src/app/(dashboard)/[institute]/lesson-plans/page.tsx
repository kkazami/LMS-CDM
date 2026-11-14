import React from "react";
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
    <LessonPlanBuilderClient
      studentName={actor.name}
      programCode={actor.programCode}
      programName={actor.programName}
    />
  );
}

