"use client";

import { useState } from "react";
import { useServerRackStore } from "../stores/server-rack-store";
import { Check, X, ArrowRight } from "lucide-react";

const WIRE_COLORS = [
  { id: "ow", label: "Orange-White", bg: "bg-orange-200" },
  { id: "o", label: "Orange", bg: "bg-orange-500" },
  { id: "gw", label: "Green-White", bg: "bg-green-200" },
  { id: "b", label: "Blue", bg: "bg-blue-600" },
  { id: "bw", label: "Blue-White", bg: "bg-blue-200" },
  { id: "g", label: "Green", bg: "bg-green-600" },
  { id: "brw", label: "Brown-White", bg: "bg-yellow-800 opacity-70" }, // Hack for brown-white
  { id: "br", label: "Brown", bg: "bg-yellow-900" },
];

const CORRECT_T568B = ["ow", "o", "gw", "b", "bw", "g", "brw", "br"];

export default function CableTerminationUI() {
  const { activeCableJob, finishCableJob, cancelCableJob } = useServerRackStore();
  const [placedWires, setPlacedWires] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!activeCableJob.active || !activeCableJob.destPort) return null;

  const availableWires = WIRE_COLORS.filter(w => !placedWires.includes(w.id));

  const handleSelect = (id: string) => {
    setPlacedWires([...placedWires, id]);
  };

  const handleUndo = () => {
    setPlacedWires(placedWires.slice(0, -1));
    setError(null);
  };

  const handleSubmit = () => {
    // Check if correct
    const isCorrect = JSON.stringify(placedWires) === JSON.stringify(CORRECT_T568B);
    if (isCorrect) {
      finishCableJob(activeCableJob.destPort!, true);
    } else {
      setError("Incorrect T568B order. The cable failed validation.");
      // In a real troubleshooting mode, we might allow them to create a bad cable (isT568B = false)
      // but for this standard mini-game, we force them to try again or we can let them submit a bad one.
      // Let's let them submit a bad one so troubleshooting mode can inject bad ones later if needed.
      // But the prompt says: "An incorrect T568 wiring order is caught and reflected in feedback, not silently accepted".
      // We will prevent submission and show an error until they fix it.
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full border border-slate-200 animate-in zoom-in-95">
        
        <h2 className="text-xl font-bold text-slate-800 mb-1">Terminate Cat6 Cable</h2>
        <p className="text-sm text-slate-500 mb-6">
          You are connecting <span className="font-mono bg-slate-100 px-1">{activeCableJob.sourcePort}</span> to <span className="font-mono bg-slate-100 px-1">{activeCableJob.destPort}</span>. 
          Arrange the 8 wires into the T568B standard before crimping.
        </p>

        {/* Crimp tool / RJ45 visual */}
        <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-between mb-6 h-32 border-2 border-slate-200 border-dashed">
          <div className="flex gap-2 items-end h-full">
            {Array.from({ length: 8 }).map((_, i) => {
              const wireId = placedWires[i];
              const wireObj = WIRE_COLORS.find(w => w.id === wireId);
              return (
                <div key={i} className={`w-8 h-full rounded-t-sm flex items-end justify-center pb-2 ${wireObj ? wireObj.bg : 'bg-slate-200'}`}>
                  <span className="text-[10px] font-bold text-black/50">{i + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="text-slate-400 font-bold text-lg px-4 border-l-2 border-slate-200">
            RJ45<br/>JACK
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
            <X className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Wire Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Available Wires:</h3>
          <div className="flex flex-wrap gap-2">
            {availableWires.map(wire => (
              <button
                key={wire.id}
                onClick={() => handleSelect(wire.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:ring-2 ring-offset-1 transition-all ${wire.bg} ${wire.bg.includes('200') ? 'text-slate-800' : 'text-white'}`}
              >
                {wire.label}
              </button>
            ))}
            {availableWires.length === 0 && (
              <span className="text-sm text-slate-400 italic">All wires placed.</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button 
            onClick={cancelCableJob}
            className="text-slate-500 hover:text-slate-700 font-medium px-4 py-2"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={handleUndo}
              disabled={placedWires.length === 0}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium"
            >
              Undo Last
            </button>
            <button 
              onClick={handleSubmit}
              disabled={placedWires.length < 8}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-md flex items-center gap-2 transition-all"
            >
              Crimp & Connect <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
