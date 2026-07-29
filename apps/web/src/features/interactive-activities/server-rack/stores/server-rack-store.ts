import { create } from "zustand";
import { evaluatePing } from "../utils/network-solver";
import { ServerRackFaultType } from "../utils/fault-engine";

export type EquipmentType = "SWITCH" | "SERVER" | "PATCH_PANEL";

export interface Equipment {
  id: string;
  type: EquipmentType;
  ruSlot: number | null; // 1 to N
  ports: string[];
}

export interface NetworkCable {
  id: string;
  fromPort: string;
  toPort: string;
  isT568B: boolean;
}

export interface DeviceConfig {
  ip: string;
  mask: string;
}

interface ActiveCableJob {
  active: boolean;
  sourcePort: string | null;
  destPort: string | null;
}

export type RackSnapshot = {
  equipment: Record<string, Equipment>;
  cables: NetworkCable[];
  deviceConfigs: Record<string, DeviceConfig>;
};

interface ServerRackState {
  equipment: Record<string, Equipment>;
  cables: NetworkCable[];
  deviceConfigs: Record<string, DeviceConfig>;
  
  terminalLogs: string[];
  activeCableJob: ActiveCableJob;
  activeFaults: ServerRackFaultType[];

  // Session & History
  sessionSignature: string | null;
  past: RackSnapshot[];
  future: RackSnapshot[];

  // Actions
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;
  initialize: (faults?: ServerRackFaultType[]) => void;
  mountEquipment: (id: string, ruSlot: number) => void;
  
  startCableJob: (portId: string) => void;
  finishCableJob: (portId: string, isT568B: boolean) => void;
  cancelCableJob: () => void;
  removeCable: (id: string) => void;
  
  setConfig: (deviceId: string, ip: string, mask: string) => void;
  logTerminal: (msg: string) => void;
  clearTerminal: () => void;
  runPing: (sourceId: string, destIp: string) => void;
}

export const useServerRackStore = create<ServerRackState>((set, get) => ({
  equipment: {},
  cables: [],
  deviceConfigs: {},
  terminalLogs: [],
  activeCableJob: { active: false, sourcePort: null, destPort: null },
  activeFaults: [],
  sessionSignature: null,
  past: [],
  future: [],

  initialize: (faults = []) => {
    // Scaffold initial unmounted devices for Sprint 4
    set({
      activeFaults: faults,
      cables: [],
      deviceConfigs: {},
      terminalLogs: [],
      activeCableJob: { active: false, sourcePort: null, destPort: null },
      equipment: {
        "patch1": { id: "patch1", type: "PATCH_PANEL", ruSlot: null, ports: Array.from({length: 24}, (_,i) => `patch1-p${i+1}`) },
        "switch1": { id: "switch1", type: "SWITCH", ruSlot: null, ports: Array.from({length: 24}, (_,i) => `switch1-p${i+1}`) },
        "server1": { id: "server1", type: "SERVER", ruSlot: null, ports: ["server1-eth0"] },
        "server2": { id: "server2", type: "SERVER", ruSlot: null, ports: ["server2-eth0"] },
      },
      sessionSignature: faults.join(","),
      past: [],
      future: [],
    });
  },

  pushSnapshot: () => {
    const state = get();
    const snapshot: RackSnapshot = {
      equipment: JSON.parse(JSON.stringify(state.equipment)),
      cables: JSON.parse(JSON.stringify(state.cables)),
      deviceConfigs: JSON.parse(JSON.stringify(state.deviceConfigs)),
    };
    set((s) => ({
      past: [...s.past, snapshot],
      future: [],
    }));
  },

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    
    const currentSnapshot: RackSnapshot = {
      equipment: JSON.parse(JSON.stringify(state.equipment)),
      cables: JSON.parse(JSON.stringify(state.cables)),
      deviceConfigs: JSON.parse(JSON.stringify(state.deviceConfigs)),
    };

    return {
      equipment: previous.equipment,
      cables: previous.cables,
      deviceConfigs: previous.deviceConfigs,
      past: newPast,
      future: [currentSnapshot, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    
    const currentSnapshot: RackSnapshot = {
      equipment: JSON.parse(JSON.stringify(state.equipment)),
      cables: JSON.parse(JSON.stringify(state.cables)),
      deviceConfigs: JSON.parse(JSON.stringify(state.deviceConfigs)),
    };

    return {
      equipment: next.equipment,
      cables: next.cables,
      deviceConfigs: next.deviceConfigs,
      past: [...state.past, currentSnapshot],
      future: newFuture
    };
  }),

  mountEquipment: (id, ruSlot) => {
    get().pushSnapshot();
    set((s) => ({
      equipment: {
        ...s.equipment,
        [id]: { ...s.equipment[id], ruSlot }
      }
    }));
  },

  startCableJob: (portId) => set((s) => {
    // If we're already wiring and click a different port, try to finish it
    if (s.activeCableJob.active && s.activeCableJob.sourcePort && s.activeCableJob.sourcePort !== portId) {
      return { activeCableJob: { ...s.activeCableJob, destPort: portId } }; // This triggers the UI minigame
    }
    return { activeCableJob: { active: true, sourcePort: portId, destPort: null } };
  }),

  finishCableJob: (portId, isT568B) => {
    const { activeCableJob, cables } = get();
    if (!activeCableJob.sourcePort) return;

    const newCable: NetworkCable = {
      id: `cab-${Date.now()}`,
      fromPort: activeCableJob.sourcePort,
      toPort: portId,
      isT568B
    };

    get().pushSnapshot();

    set((s) => ({
      cables: [...s.cables, newCable],
      activeCableJob: { active: false, sourcePort: null, destPort: null }
    }));
  },

  cancelCableJob: () => set({ activeCableJob: { active: false, sourcePort: null, destPort: null } }),

  removeCable: (id) => {
    get().pushSnapshot();
    set((s) => ({
      cables: s.cables.filter(c => c.id !== id)
    }));
  },

  setConfig: (deviceId, ip, mask) => {
    get().pushSnapshot();
    set((s) => ({
      deviceConfigs: {
        ...s.deviceConfigs,
        [deviceId]: { ip, mask }
      }
    }));
  },

  logTerminal: (msg) => set((s) => ({
    terminalLogs: [...s.terminalLogs, msg]
  })),

  clearTerminal: () => set({ terminalLogs: [] }),

  runPing: (sourceId, destIp) => {
    const state = get();
    state.logTerminal(`\nPING ${destIp} 56(84) bytes of data.`);
    
    const result = evaluatePing(sourceId, destIp, state);
    
    if (result.success) {
      state.logTerminal(`64 bytes from ${destIp}: icmp_seq=1 ttl=64 time=0.2 ms`);
      state.logTerminal(`64 bytes from ${destIp}: icmp_seq=2 ttl=64 time=0.3 ms`);
      state.logTerminal(`--- ${destIp} ping statistics ---`);
      state.logTerminal(`2 packets transmitted, 2 received, 0% packet loss`);
    } else {
      state.logTerminal(`Request timeout for icmp_seq 1`);
      state.logTerminal(`Request timeout for icmp_seq 2`);
      state.logTerminal(`--- ${destIp} ping statistics ---`);
      state.logTerminal(`2 packets transmitted, 0 received, 100% packet loss`);
      if (result.reason) {
        state.logTerminal(`[Diagnostic] ${result.reason}`);
      }
    }
  }
}));
