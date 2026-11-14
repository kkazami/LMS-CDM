import React from "react";
import { headers } from "next/headers";
import { requireIctLabPageActor } from "@/lib/ict-lab/guard";
import { loadHardwarePartsData, loadLanCableData } from "@/lib/ict-lab/data-loader";
import IctLabClient from "@/components/ict-lab/IctLabClient";

export const dynamic = "force-dynamic";

interface IctLabPageProps {
  params: Promise<{ institute: string }>;
}

export default async function IctLabPage({ params }: IctLabPageProps) {
  const { institute } = await params;
  const actor = await requireIctLabPageActor(institute);
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  const hardwareData = loadHardwarePartsData();
  const lanCableData = loadLanCableData();

  return (
    <IctLabClient
      studentName={actor.name}
      programCode={actor.programCode}
      hardwareData={hardwareData}
      lanCableData={lanCableData}
      nonce={nonce}
    />
  );
}
