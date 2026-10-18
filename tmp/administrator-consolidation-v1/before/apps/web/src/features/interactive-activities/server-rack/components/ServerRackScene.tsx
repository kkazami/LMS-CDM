"use client";

import { useEffect } from "react";
import Workbench3D from "../../shared/components/Workbench3D";
import { RackFrame, PatchPanel, ManagedSwitch, RackServer } from "./RackComponents";
import { CableRenderer } from "./CableRenderer";
import { useServerRackStore } from "../stores/server-rack-store";
import { ServerRackFaultType } from "../utils/fault-engine";
import { useActivityStore } from "../../shared/stores/activity-store";

export default function ServerRackScene({ faults = [] }: { faults?: ServerRackFaultType[] }) {
  const initialize = useServerRackStore((s) => s.initialize);
  const { startTimer, stopTimer, resetActivity } = useActivityStore();
  
  useEffect(() => {
    const signature = faults.join(",");
    const isNew = useServerRackStore.getState().sessionSignature !== signature;

    if (isNew) {
      resetActivity();
      initialize(faults);
    }
    
    startTimer();
    return () => stopTimer();
  }, [faults, initialize, startTimer, stopTimer, resetActivity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useServerRackStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useServerRackStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Workbench3D backgroundColor="#0f172a" cameraPosition={[0, 4, 8]} fov={45}>
      
      {/* Structural Framework */}
      <RackFrame />
      
      {/* Unmounted Equipment waiting to be racked */}
      <PatchPanel />
      <ManagedSwitch />
      <RackServer id="server1" initialPos={[4, 0.5, 0]} />
      <RackServer id="server2" initialPos={[4, 1.5, 0]} />

      {/* Dynamic Cabling */}
      <CableRenderer />
      
    </Workbench3D>
  );
}
