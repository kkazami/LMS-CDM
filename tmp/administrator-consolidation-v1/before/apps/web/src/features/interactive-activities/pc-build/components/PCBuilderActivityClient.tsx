"use client";

import dynamic from "next/dynamic";
import { FallbackToggleWrapper } from "../../shared/components/FallbackToggleWrapper";
import { PCMode } from "../stores/pc-build-store";
import { PCFaultType } from "../utils/fault-engine";

const PCBuilderScene = dynamic(() => import("./PCBuilderScene"), { ssr: false });
const PCBuilderFallback2D = dynamic(() => import("./PCBuilderFallback2D"), { ssr: false });

interface Props {
  mode: PCMode;
  injectedFaults: PCFaultType[];
}

export default function PCBuilderActivityClient({ mode, injectedFaults }: Props) {
  return (
    <FallbackToggleWrapper 
      activityName="PC Builder"
      Scene3D={<PCBuilderScene mode={mode} injectedFaults={injectedFaults} />}
      Scene2D={<PCBuilderFallback2D mode={mode} injectedFaults={injectedFaults} />}
    />
  );
}
