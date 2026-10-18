"use client";

import { useState, useRef, useEffect } from "react";
import { useServerRackStore } from "../stores/server-rack-store";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import { Terminal, Network, Settings2, Play } from "lucide-react";

export interface TerminalUIProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
}

export default function TerminalUI({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
}: TerminalUIProps) {
  const { 
    deviceConfigs, 
    setConfig, 
    terminalLogs, 
    runPing,
    cables,
    equipment
  } = useServerRackStore();
  
  const { setScore, updateStateCheck, markComplete } = useActivityStore();
  
  const [activeTab, setActiveTab] = useState<"CONFIG" | "TERMINAL">("CONFIG");
  const [pingTarget, setPingTarget] = useState("");
  const [pingSource, setPingSource] = useState("server1");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // IP Assignment Form State
  const [ipForm, setIpForm] = useState<Record<string, { ip: string, mask: string }>>({
    server1: { ip: "192.168.1.10", mask: "255.255.255.0" },
    server2: { ip: "192.168.1.11", mask: "255.255.255.0" },
  });

  const handleSaveConfig = (deviceId: string) => {
    setConfig(deviceId, ipForm[deviceId].ip, ipForm[deviceId].mask);
  };

  const handlePing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingTarget) return;
    runPing(pingSource, pingTarget);
    
    // Evaluate grading
    // Did they mount the equipment?
    const allMounted = Object.values(equipment).every(e => e.ruSlot !== null);
    
    // Check if the ping was successful by looking at the latest logs asynchronously or checking state.
    // In a real app, evaluatePing might return the result and we grade immediately here.
    // Let's just do a naive check: if the last logs contain "0% packet loss".
    // Wait, state update is synchronous.
    setTimeout(() => {
      const logs = useServerRackStore.getState().terminalLogs;
      const success = logs.length > 0 && logs[logs.length - 1].includes("0% packet loss");
      
      updateStateCheck("equipmentMounted", allMounted);
      updateStateCheck("cabledProperly", cables.length >= 2);
      updateStateCheck("pingSuccess", success);
      
      if (allMounted && success) {
        setScore(100);
        markComplete(true);
      }
    }, 100);
  };

  return (
    <>
      <div className="absolute top-0 right-0 h-full w-[400px] bg-slate-900 flex flex-col z-40 border-l border-slate-700 shadow-2xl text-slate-300">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-950">
          <button 
            onClick={() => setActiveTab("CONFIG")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === "CONFIG" ? "bg-slate-800 text-white border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Settings2 className="w-4 h-4" /> IP Config
          </button>
          <button 
            onClick={() => setActiveTab("TERMINAL")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === "TERMINAL" ? "bg-slate-800 text-white border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Terminal className="w-4 h-4" /> Terminal
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {activeTab === "CONFIG" && (
            <div className="space-y-6">
              {["server1", "server2"].map(dev => (
                <div key={dev} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-400" /> {dev.toUpperCase()}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">IPv4 Address</label>
                      <input 
                        type="text" 
                        value={ipForm[dev].ip}
                        onChange={(e) => setIpForm(s => ({ ...s, [dev]: { ...s[dev], ip: e.target.value } }))}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Subnet Mask</label>
                      <input 
                        type="text" 
                        value={ipForm[dev].mask}
                        onChange={(e) => setIpForm(s => ({ ...s, [dev]: { ...s[dev], mask: e.target.value } }))}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none text-white font-mono"
                      />
                    </div>
                    <button 
                      onClick={() => handleSaveConfig(dev)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded text-sm transition-colors"
                    >
                      Apply Configuration
                    </button>
                    {deviceConfigs[dev] && (
                      <div className="text-xs text-green-400 font-medium text-center mt-1">Applied.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "TERMINAL" && (
            <div className="flex flex-col h-full">
              
              <form onSubmit={handlePing} className="flex gap-2 mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
                <select 
                  value={pingSource}
                  onChange={(e) => setPingSource(e.target.value)}
                  className="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 outline-none"
                >
                  <option value="server1">S1</option>
                  <option value="server2">S2</option>
                </select>
                <span className="text-slate-400 self-center text-sm font-mono">&gt; ping</span>
                <input 
                  type="text" 
                  placeholder="Destination IP" 
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none text-white font-mono"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded">
                  <Play className="w-4 h-4" />
                </button>
              </form>

              <div ref={scrollRef} className="flex-1 bg-black rounded-lg border border-slate-700 p-3 font-mono text-xs overflow-y-auto">
                <div className="text-slate-500 mb-2">CDM OS Terminal Emulator v1.0</div>
                {terminalLogs.map((log, i) => (
                  <div key={i} className={log.includes("timeout") || log.includes("[Diagnostic]") ? "text-red-400" : "text-green-400"}>
                    {log}
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </div>

      <div className="mr-[400px]">
        <SubmitBar 
          activityType="server-rack"
          assignmentId={assignmentId}
          studentId={studentId}
          variantSeed={variantSeed}
          startedAt={startedAt}
          maxScore={100}
          manualGrading={true}
        />
      </div>
    </>
  );
}
