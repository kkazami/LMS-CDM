import React from "react";
import type { Metadata } from "next";
import { requireMatatagPageActor } from "@/lib/matatag/guard";
import { getMatatagData } from "@/lib/matatag/data";
import MatatagHubClient from "@/components/matatag/MatatagHubClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MATATAG Curriculum Reference Hub | CDM LMS",
  description:
    "Official DepEd MATATAG curriculum guides, competencies, and teaching references for Elementary Education.",
};

interface MatatagPageProps {
  params: Promise<{ institute: string }>;
}

export default async function MatatagPage({ params }: MatatagPageProps) {
  const { institute } = await params;
  const actor = await requireMatatagPageActor(institute);
  const data = getMatatagData();

  return (
    <MatatagHubClient
      institute={institute}
      studentName={actor.name}
      programCode={actor.programCode}
      programName={actor.programName}
      initialData={data}
    />
  );
}

