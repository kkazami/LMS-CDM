"use client";

import { useEffect } from "react";
import Workbench3D from "../../shared/components/Workbench3D";
import { PCCase, Motherboard, CPU, Cooler, RAM, GPU, PSU } from "./PCComponents";
import { usePCBuildStore, PCMode } from "../stores/pc-build-store";
import { useActivityStore } from "../../shared/stores/activity-store";
import { PCFaultType } from "../utils/fault-engine";

interface PCBuilderSceneProps {
  mode: PCMode;
  injectedFaults?: PCFaultType[];
}

export default function PCBuilderScene({ mode, injectedFaults = [] }: PCBuilderSceneProps) {
  const { initialize } = usePCBuildStore();
  const { startTimer, stopTimer, resetActivity } = useActivityStore();

  useEffect(() => {
    const signature = mode + ":" + injectedFaults.join(",");
    const isNew = usePCBuildStore.getState().sessionSignature !== signature;

    if (isNew) {
      resetActivity();
      initialize(mode, injectedFaults);
    }
    
    startTimer();

    // Stop timer on unmount, but DON'T reset the activity state to preserve it across navigation
    return () => stopTimer();
  }, [mode, injectedFaults, initialize, startTimer, resetActivity, stopTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        usePCBuildStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        usePCBuildStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Workbench3D backgroundColor="#f8fafc" cameraPosition={[0, 4, 8]} fov={55}>
      {/* 
        In Assembly mode, the components are scattered around.
        In Troubleshooting mode, initialize() automatically places them inside the case
        (except for components removed by faults).
      */}
      <PCCase />
      <PSU />
      <Motherboard />
      <CPU />
      <Cooler />
      <GPU />
      
      {/* 4 RAM Sticks */}
      <RAM id="ram1" initialPos={[3, 0.1, 1]} />
      <RAM id="ram2" initialPos={[3.5, 0.1, 1]} />
      <RAM id="ram3" initialPos={[4, 0.1, 1]} />
      <RAM id="ram4" initialPos={[4.5, 0.1, 1]} />
    </Workbench3D>
  );
}
