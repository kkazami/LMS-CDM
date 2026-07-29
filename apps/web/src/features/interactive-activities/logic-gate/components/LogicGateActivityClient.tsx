"use client";

import dynamic from "next/dynamic";
import { FallbackToggleWrapper } from "../../shared/components/FallbackToggleWrapper";
import { LogicFaultType, TargetTruthTable } from "../stores/logic-store";

const LogicScene = dynamic(() => import("./LogicScene"), { ssr: false });
const LogicSceneFallback2D = dynamic(() => import("./LogicSceneFallback2D"), { ssr: false });

interface Props {
  faults: LogicFaultType[];
  targetTable: TargetTruthTable | null;
}

export default function LogicGateActivityClient({ faults, targetTable }: Props) {
  return (
    <FallbackToggleWrapper 
      activityName="Logic Gates"
      Scene3D={<LogicScene faults={faults} targetTable={targetTable} />}
      Scene2D={<LogicSceneFallback2D faults={faults} targetTable={targetTable} />}
    />
  );
}
