import { create } from "zustand";
import { PCFaultType } from "../utils/fault-engine";

export type PCMode = "ASSEMBLY" | "TROUBLESHOOTING";
export type BootState = "OFF" | "POST_SUCCESS" | "ERR_RAM" | "ERR_CPU_POWER" | "ERR_GPU" | "ERR_NO_POWER" | "ERR_TEMP";

interface PCComponentState {
  placed: boolean;
  socketId: string | null;
}

type HardwareSnapshot = {
  mobo: PCComponentState;
  cpu: PCComponentState;
  cooler: PCComponentState;
  gpu: PCComponentState;
  psu: PCComponentState;
  storage: PCComponentState;
  thermalPasteApplied: boolean;
  ramSticks: Record<string, PCComponentState>;
};

interface PCBuildState {
  mode: PCMode;
  bootState: BootState;
  toastMessage: string | null;
  activeFaults: PCFaultType[];

  // Hardware State
  mobo: PCComponentState;
  cpu: PCComponentState;
  cooler: PCComponentState;
  gpu: PCComponentState;
  psu: PCComponentState;
  storage: PCComponentState;
  thermalPasteApplied: boolean;
  
  // RAM is 4 sticks
  ramSticks: Record<string, PCComponentState>; // 'ram1', 'ram2', etc.

  // Cables
  cable24PinConnected: boolean;
  cable8PinConnected: boolean;
  cableSataConnected: boolean;

  // Session & History
  sessionSignature: string | null;
  past: HardwareSnapshot[];
  future: HardwareSnapshot[];

  // Actions
  initialize: (mode: PCMode, faults?: PCFaultType[]) => void;
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;
  setMode: (mode: PCMode) => void;
  setBootState: (state: BootState) => void;
  showToast: (msg: string | null) => void;
  
  placeComponent: (part: string, socketId: string) => boolean;
  removeComponent: (part: string) => void;
  applyThermalPaste: () => void;
  connectCable: (type: "24pin" | "8pin" | "sata") => void;
  disconnectCable: (type: "24pin" | "8pin" | "sata") => void;
}

export const usePCBuildStore = create<PCBuildState>((set, get) => ({
  mode: "ASSEMBLY",
  bootState: "OFF",
  toastMessage: null,
  activeFaults: [],
  sessionSignature: null,
  past: [],
  future: [],

  mobo: { placed: false, socketId: null },
  cpu: { placed: false, socketId: null },
  cooler: { placed: false, socketId: null },
  gpu: { placed: false, socketId: null },
  psu: { placed: false, socketId: null },
  storage: { placed: false, socketId: null },
  thermalPasteApplied: false,
  
  ramSticks: {
    ram1: { placed: false, socketId: null },
    ram2: { placed: false, socketId: null },
    ram3: { placed: false, socketId: null },
    ram4: { placed: false, socketId: null },
  },

  cable24PinConnected: false,
  cable8PinConnected: false,
  cableSataConnected: false,

  initialize: (mode, faults = []) => {
    const signature = mode + ":" + faults.join(",");
    if (get().sessionSignature === signature) return; // Already initialized for this session

    // If troubleshooting, pre-assemble the rig based on faults
    if (mode === "TROUBLESHOOTING") {
      set({
        mode,
        activeFaults: faults,
        bootState: "OFF",
        toastMessage: null,
        mobo: { placed: true, socketId: "case-mobo-socket" },
        cpu: { placed: true, socketId: "mobo-cpu-socket" },
        cooler: { placed: true, socketId: "mobo-cooler-socket" },
        gpu: { placed: !faults.includes("GPU_NOT_SEATED"), socketId: faults.includes("GPU_NOT_SEATED") ? null : "mobo-gpu-socket" },
        psu: { placed: true, socketId: "case-psu-socket" },
        storage: { placed: true, socketId: "case-storage-socket" },
        thermalPasteApplied: !faults.includes("NO_THERMAL_PASTE"),
        
        // Setup RAM based on fault
        ramSticks: {
          ram1: { placed: true, socketId: faults.includes("RAM_WRONG_SLOT") ? "dimm-A1" : "dimm-A2" },
          ram2: { placed: true, socketId: faults.includes("RAM_WRONG_SLOT") ? "dimm-B1" : "dimm-B2" },
          ram3: { placed: false, socketId: null },
          ram4: { placed: false, socketId: null },
        },
        
        cable24PinConnected: !faults.includes("PSU_UNPLUGGED"),
        cable8PinConnected: !faults.includes("CPU_POWER_UNPLUGGED"),
        cableSataConnected: true,
        sessionSignature: signature,
        past: [],
        future: [],
      });
    } else {
      // Clean slate for assembly
      set({
        mode,
        activeFaults: [],
        bootState: "OFF",
        toastMessage: null,
        mobo: { placed: false, socketId: null },
        cpu: { placed: false, socketId: null },
        cooler: { placed: false, socketId: null },
        gpu: { placed: false, socketId: null },
        psu: { placed: false, socketId: null },
        storage: { placed: false, socketId: null },
        thermalPasteApplied: false,
        ramSticks: {
          ram1: { placed: false, socketId: null },
          ram2: { placed: false, socketId: null },
          ram3: { placed: false, socketId: null },
          ram4: { placed: false, socketId: null },
        },
        cable24PinConnected: false,
        cable8PinConnected: false,
        cableSataConnected: false,
        sessionSignature: signature,
        past: [],
        future: [],
      });
    }
  },

  setMode: (mode) => set({ mode }),
  setBootState: (bootState) => set({ bootState }),
  
  showToast: (msg) => {
    set({ toastMessage: msg });
    if (msg) setTimeout(() => set({ toastMessage: null }), 4000);
  },

  pushSnapshot: () => {
    const state = get();
    const snapshot: HardwareSnapshot = {
      mobo: state.mobo,
      cpu: state.cpu,
      cooler: state.cooler,
      gpu: state.gpu,
      psu: state.psu,
      storage: state.storage,
      thermalPasteApplied: state.thermalPasteApplied,
      ramSticks: JSON.parse(JSON.stringify(state.ramSticks)), // deep copy to avoid reference sharing
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
    
    const currentSnapshot: HardwareSnapshot = {
      mobo: state.mobo, cpu: state.cpu, cooler: state.cooler, gpu: state.gpu,
      psu: state.psu, storage: state.storage, thermalPasteApplied: state.thermalPasteApplied,
      ramSticks: JSON.parse(JSON.stringify(state.ramSticks))
    };

    return {
      ...previous,
      past: newPast,
      future: [currentSnapshot, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    
    const currentSnapshot: HardwareSnapshot = {
      mobo: state.mobo, cpu: state.cpu, cooler: state.cooler, gpu: state.gpu,
      psu: state.psu, storage: state.storage, thermalPasteApplied: state.thermalPasteApplied,
      ramSticks: JSON.parse(JSON.stringify(state.ramSticks))
    };

    return {
      ...next,
      past: [...state.past, currentSnapshot],
      future: newFuture
    };
  }),

  placeComponent: (part, socketId) => {
    const state = get();
    
    // Validations (Non-fatal errors via toasts)
    if (part === "cpu" && !state.mobo.placed) {
      state.showToast("Warning: It's easier to install the CPU while the motherboard is outside the case!");
    }
    if (part === "cooler" && !state.thermalPasteApplied) {
      state.showToast("Warning: You forgot the thermal paste!");
    }

    state.pushSnapshot();

    if (part.startsWith("ram")) {
      // Validate A2/B2 dual channel
      const isA2orB2 = socketId === "dimm-A2" || socketId === "dimm-B2";
      if (!isA2orB2) {
         state.showToast("Notice: For dual-channel memory with 2 sticks, A2 and B2 are recommended first.");
      }
      set((s) => ({
        ramSticks: {
          ...s.ramSticks,
          [part]: { placed: true, socketId }
        }
      }));
      return true;
    }

    // @ts-ignore dynamic key access
    set({ [part]: { placed: true, socketId } });
    return true;
  },

  removeComponent: (part) => {
    get().pushSnapshot();
    if (part.startsWith("ram")) {
      set((s) => ({
        ramSticks: {
          ...s.ramSticks,
          [part]: { placed: false, socketId: null }
        }
      }));
      return;
    }
    // @ts-ignore
    set({ [part]: { placed: false, socketId: null } });
  },

  applyThermalPaste: () => {
    get().pushSnapshot();
    set({ thermalPasteApplied: true });
  },
  
  connectCable: (type) => {
    if (type === "24pin") set({ cable24PinConnected: true });
    if (type === "8pin") set({ cable8PinConnected: true });
    if (type === "sata") set({ cableSataConnected: true });
  },

  disconnectCable: (type) => {
    if (type === "24pin") set({ cable24PinConnected: false });
    if (type === "8pin") set({ cable8PinConnected: false });
    if (type === "sata") set({ cableSataConnected: false });
  }
}));
