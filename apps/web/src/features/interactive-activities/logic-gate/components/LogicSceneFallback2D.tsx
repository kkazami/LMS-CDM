"use client";

import { useEffect, useState } from "react";
import { useLogicStore, LogicFaultType, TargetTruthTable } from "../stores/logic-store";

export default function LogicSceneFallback2D({ faults = [], targetTable = null }: { faults?: LogicFaultType[], targetTable?: TargetTruthTable | null }) {
  const { initialize, gates, toggleGateInput, connectWire } = useLogicStore();
  const [wireSource, setWireSource] = useState<{gateId: string, outputIdx: number} | null>(null);

  useEffect(() => {
    initialize(faults, targetTable);
  }, [faults, targetTable, initialize]);

  const handlePinClick = (gateId: string, type: 'in' | 'out', idx: number) => {
    if (type === 'out') {
      setWireSource({ gateId, outputIdx: idx });
    } else if (type === 'in' && wireSource) {
      connectWire(wireSource.gateId, wireSource.outputIdx, gateId, idx);
      setWireSource(null);
    }
  };

  return (
    <div className="w-full h-full bg-[#0f172a] p-8 relative overflow-auto touch-none">
      <div className="text-slate-400 mb-4 font-mono">2D Schematic Mode</div>
      
      <div className="flex gap-8 flex-wrap">
        {Object.entries(gates).map(([id, gate]) => (
          <div key={id} className="bg-slate-800 p-4 rounded-xl border-2 border-slate-600 shadow-xl min-w-[120px] text-center">
            
            {/* Inputs */}
            <div className="flex justify-around mb-2">
              {gate.inputs.map((val, i) => (
                <button 
                  key={`in-${i}`}
                  onClick={() => gate.type === 'INPUT' ? toggleGateInput(id) : handlePinClick(id, 'in', i)}
                  className={`w-6 h-6 rounded-full border-2 ${val ? 'bg-green-500 border-green-300' : 'bg-slate-900 border-slate-500'} ${wireSource ? 'ring-2 ring-indigo-500 animate-pulse cursor-crosshair' : 'cursor-pointer'}`}
                  aria-label={`Input ${i} for ${gate.type}`}
                >
                  {gate.type === 'INPUT' && <span className="text-[10px] text-white font-bold">{val ? '1' : '0'}</span>}
                </button>
              ))}
            </div>

            <div className="text-white font-bold uppercase py-2 bg-slate-900 rounded my-2 tracking-widest text-sm">
              {gate.type}
            </div>

            {/* Outputs */}
            <div className="flex justify-around mt-2">
              <button 
                onClick={() => handlePinClick(id, 'out', 0)}
                className={`w-6 h-6 rounded-full border-2 ${gate.output ? 'bg-green-500 border-green-300' : 'bg-slate-900 border-slate-500'} cursor-pointer hover:scale-110 transition-transform`}
                aria-label={`Output for ${gate.type}`}
              >
                {wireSource?.gateId === id && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1 animate-ping" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {wireSource && (
        <div className="fixed bottom-6 left-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce pointer-events-none">
          Wiring from {gates[wireSource.gateId].type}... Click an input pin!
        </div>
      )}
    </div>
  );
}
