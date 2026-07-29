"use client";

import { useEffect } from "react";
import { Grid } from "@react-three/drei";
import Workbench3D from "../../shared/components/Workbench3D";
import { GateComponent } from "./GateComponents";
import { WireRenderer } from "./WireRenderer";
import { useLogicStore } from "../stores/logic-store";
import { LogicFaultType, TargetTruthTable } from "../stores/logic-store";
import { useActivityStore } from "../../shared/stores/activity-store";

export default function LogicScene({ faults = [], targetTable = null }: { faults?: LogicFaultType[], targetTable?: TargetTruthTable | null }) {
  const initialize = useLogicStore((s) => s.initialize);
  const gates = useLogicStore((s) => s.gates);
  const { startTimer, stopTimer, resetActivity } = useActivityStore();
  
  useEffect(() => {
    const signature = faults.join(",") + (targetTable ? ":table" : ":free");
    const isNew = useLogicStore.getState().sessionSignature !== signature;

    if (isNew) {
      resetActivity();
      initialize(faults, targetTable);
    }
    
    startTimer();
    return () => stopTimer();
  }, [faults, targetTable, initialize, startTimer, stopTimer, resetActivity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useLogicStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useLogicStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Workbench3D backgroundColor="#0f172a" cameraPosition={[0, 10, 0]} fov={50}>
      {/* 2.5D Orthographic-like grid */}
      <Grid infiniteGrid fadeDistance={50} sectionColor="#334155" cellColor="#1e293b" />

      {Object.keys(gates).map(id => (
        <GateComponent key={id} gateId={id} />
      ))}
      
      <WireRenderer />
    </Workbench3D>
  );
}
