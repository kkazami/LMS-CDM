"use client";

import { useEffect } from "react";
import Workbench3D from "../../shared/components/Workbench3D";
import { ArduinoUno, Breadboard, LEDComponent, ResistorComponent } from "./ArduinoComponents";
import { WireRenderer } from "./WireRenderer";
import { useArduinoStore } from "../stores/arduino-store";
import { useActivityStore } from "../../shared/stores/activity-store";

export default function ArduinoScene({ faults = [] }: { faults?: string[] }) {
  const initialize = useArduinoStore((s) => s.initialize);
  const { startTimer, stopTimer, resetActivity } = useActivityStore();
  
  useEffect(() => {
    const signature = faults.join(",");
    const isNew = useArduinoStore.getState().sessionSignature !== signature;

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
        useArduinoStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useArduinoStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Workbench3D backgroundColor="#1e293b" cameraPosition={[0, 5, 5]} fov={50}>
      <ArduinoUno />
      <Breadboard />
      
      {/* 
        In a full implementation, we'd render all components dynamically from the store array.
        For the constrained Sprint 3 demo, we just render the specific LED and Resistor instances.
      */}
      <LEDComponent id="led1" />
      <ResistorComponent id="res1" />
      
      <WireRenderer />
    </Workbench3D>
  );
}
