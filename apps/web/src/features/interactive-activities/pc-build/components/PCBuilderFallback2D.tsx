"use client";

import { useEffect, useState } from "react";
import { usePCBuildStore, PCMode } from "../stores/pc-build-store";
import { useActivityStore } from "../../shared/stores/activity-store";
import { PCFaultType } from "../utils/fault-engine";

export default function PCBuilderFallback2D({ mode, injectedFaults = [] }: { mode: PCMode, injectedFaults?: PCFaultType[] }) {
  const { 
    initialize, 
    placeComponent, 
    removeComponent,
    mobo, cpu, cooler, gpu, psu, ramSticks
  } = usePCBuildStore();
  
  const { startTimer, resetActivity } = useActivityStore();
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  useEffect(() => {
    resetActivity();
    startTimer();
    initialize(mode, injectedFaults);
    return () => resetActivity();
  }, [mode, injectedFaults, initialize, startTimer, resetActivity]);

  const handleSlotClick = (part: string, socketId: string) => {
    if (selectedComp === part) {
      placeComponent(part, socketId);
      setSelectedComp(null);
    } else {
      // If they click an empty slot without selecting the right part, or a placed part to remove it
      const isPlaced = 
        part === 'cpu' ? cpu.placed :
        part === 'cooler' ? cooler.placed :
        part === 'gpu' ? gpu.placed :
        part === 'psu' ? psu.placed :
        part === 'mobo' ? mobo.placed :
        part.startsWith('ram') ? ramSticks[part]?.placed : false;
        
      if (isPlaced) {
        removeComponent(part);
      }
    }
  };

  const inventory = ['mobo', 'cpu', 'cooler', 'gpu', 'ram1', 'ram2', 'psu'];
  const availableInventory = inventory.filter(part => {
    if (part === 'cpu') return !cpu.placed;
    if (part === 'cooler') return !cooler.placed;
    if (part === 'gpu') return !gpu.placed;
    if (part === 'psu') return !psu.placed;
    if (part === 'mobo') return !mobo.placed;
    if (part.startsWith('ram')) return !ramSticks[part]?.placed;
    return true;
  });

  return (
    <div className="w-full h-full bg-slate-100 flex p-6 gap-6 relative touch-none">
      
      {/* 2D Case Layout */}
      <div className="flex-1 bg-slate-800 rounded-lg p-6 border-4 border-slate-700 relative">
        <h2 className="text-white font-bold mb-4">PC Case - 2D Mode</h2>
        
        <div className="grid grid-cols-4 gap-4 h-full pb-10">
          
          <button onClick={() => handleSlotClick('mobo', 'case-mobo-socket')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-4 h-24" aria-label="Motherboard Slot">
            {mobo.placed ? <div className="bg-red-900 w-full h-full text-white font-bold flex items-center justify-center rounded">Motherboard</div> : "Motherboard Slot"}
          </button>
          
          <button onClick={() => handleSlotClick('cpu', 'mobo-cpu-socket')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-1 h-32" aria-label="CPU Slot">
            {cpu.placed ? <div className="bg-indigo-500 w-full h-full text-white font-bold flex items-center justify-center rounded">CPU</div> : "CPU Slot"}
          </button>
          
          <button onClick={() => handleSlotClick('cooler', 'mobo-cooler-socket')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-1 h-32" aria-label="Cooler Slot">
            {cooler.placed ? <div className="bg-cyan-500 w-full h-full text-white font-bold flex items-center justify-center rounded">Cooler</div> : "Cooler Slot"}
          </button>

          <button onClick={() => handleSlotClick('gpu', 'mobo-gpu-socket')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-2 h-32" aria-label="GPU Slot">
            {gpu.placed ? <div className="bg-green-500 w-full h-full text-white font-bold flex items-center justify-center rounded">GPU</div> : "GPU Slot"}
          </button>

          <button onClick={() => handleSlotClick('ram1', 'dimm-A2')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-1 h-32" aria-label="RAM Slot 1">
            {ramSticks['ram1']?.placed ? <div className="bg-purple-500 w-full h-full text-white font-bold flex items-center justify-center rounded">RAM 1</div> : "RAM Slot A2"}
          </button>
          
          <button onClick={() => handleSlotClick('ram2', 'dimm-B2')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-1 h-32" aria-label="RAM Slot 2">
            {ramSticks['ram2']?.placed ? <div className="bg-purple-500 w-full h-full text-white font-bold flex items-center justify-center rounded">RAM 2</div> : "RAM Slot B2"}
          </button>

          <button onClick={() => handleSlotClick('psu', 'case-psu-socket')} className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-500 hover:bg-slate-700 col-span-2 h-32 mt-auto" aria-label="PSU Slot">
            {psu.placed ? <div className="bg-orange-500 w-full h-full text-white font-bold flex items-center justify-center rounded">PSU</div> : "PSU Slot"}
          </button>
        </div>
      </div>

      {/* Inventory Panel */}
      <div className="w-64 bg-white rounded-lg shadow-sm border p-4 overflow-y-auto">
        <h3 className="font-bold border-b pb-2 mb-4">Inventory</h3>
        <p className="text-xs text-gray-500 mb-4">Select a component, then tap its slot in the case to install it.</p>
        
        <div className="space-y-2">
          {availableInventory.map(compId => (
            <button
              key={compId}
              onClick={() => setSelectedComp(compId === selectedComp ? null : compId)}
              className={`w-full p-3 text-left rounded border font-medium ${selectedComp === compId ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-50 hover:bg-gray-100'}`}
              aria-label={`Select ${compId}`}
            >
              {compId.toUpperCase()}
            </button>
          ))}
          {availableInventory.length === 0 && <div className="text-sm text-gray-500 italic">Inventory empty</div>}
        </div>
      </div>

    </div>
  );
}
