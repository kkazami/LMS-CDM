import React from "react";
import type { Metadata } from "next";
import { requireNurseryLibraryPageActor } from "@/lib/nursery-library/guard";
import { getNurseryLibraryData } from "@/lib/nursery-library/data";
import NurseryLibraryClient from "@/components/nursery-library/NurseryLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nursery Song & Educational Media Library | CDM LMS",
  description:
    "Curated early childhood songs, action rhymes, and educational media resources for BECEd pre-service teachers.",
};

interface NurseryLibraryPageProps {
  params: Promise<{ institute: string }>;
}

export default async function NurseryLibraryPage({
  params,
}: NurseryLibraryPageProps) {
  const { institute } = await params;
  const actor = await requireNurseryLibraryPageActor(institute);
  const data = getNurseryLibraryData();

  return (
    <NurseryLibraryClient
      institute={institute}
      studentName={actor.name}
      programCode={actor.programCode}
      programName={actor.programName}
      initialData={data}
    />
  );
}

