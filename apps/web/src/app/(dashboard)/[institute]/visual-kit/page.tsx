import React from "react";
import type { Metadata } from "next";
import { requireVisualKitPageActor } from "@/lib/visual-kit/guard";
import { VISUAL_KIT_DIAGRAMS } from "@/lib/visual-kit/data";
import VisualKitClient from "@/components/visual-kit/VisualKitClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interactive Visual Learning Kit | CDM LMS",
  description:
    "Interactive 2D anatomical models, biological systems, and physical processes for BSEd Science pre-service educators.",
};

interface VisualKitPageProps {
  params: Promise<{ institute: string }>;
}

export default async function VisualKitPage({
  params,
}: VisualKitPageProps) {
  const { institute } = await params;
  const actor = await requireVisualKitPageActor(institute);

  return (
    <VisualKitClient
      institute={institute}
      studentName={actor.name}
      programCode={actor.programCode}
      programName={actor.programName}
      initialDiagrams={VISUAL_KIT_DIAGRAMS}
    />
  );
}

