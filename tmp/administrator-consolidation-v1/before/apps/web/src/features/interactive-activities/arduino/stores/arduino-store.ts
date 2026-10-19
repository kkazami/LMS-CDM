import { create } from "zustand";
import { resolveCircuit } from "../utils/circuit-solver";

export type PinState = number | "HIGH" | "LOW" | null; // usually 1 or 0
export type ComponentType = "LED" | "RESISTOR" | "UNO";

export interface WireData {
  id: string;
  fromPin: string;
  toPin: string;
  color: string;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  pins: Record<string, string>; // e.g. { anode: "bb-A10", cathode: "bb-A11" }
  value?: number; // resistance for resistor
  isReversed?: boolean; // for troubleshooting
  isOn?: boolean; // dynamic state evaluated by solver
}

interface ArduinoState {
  isRunning: boolean;
  serialOutput: string[];
  
  wires: WireData[];
  wiringState: {
    active: boolean;
    sourcePin: string | null;
    color: string;
  };
  
  components: Record<string, CircuitComponent>;
  pinVoltages: Record<string, PinState>;
  
  // Session & History
  sessionSignature: string | null;
  past: WireData[][];
  future: WireData[][];
  
  // Actions
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  logSerial: (msg: string) => void;
  clearSerial: () => void;
  
  startWiring: (pinId: string) => void;
  finishWiring: (pinId: string) => void;
  cancelWiring: () => void;
  removeWire: (wireId: string) => void;
  
  setPinVoltage: (pinId: string, voltage: PinState) => void;
  evaluateCircuit: () => void;
  
  // Initialization
  initialize: (faults?: string[]) => void;
}

export const useArduinoStore = create<ArduinoState>((set, get) => ({
  isRunning: false,
  serialOutput: [],
  wires: [],
  wiringState: { active: false, sourcePin: null, color: "#ef4444" },
  components: {},
  pinVoltages: {},
  sessionSignature: null,
  past: [],
  future: [],

  startSimulation: () => {
    set({ isRunning: true });
    get().clearSerial();
  },
  
  stopSimulation: () => {
    set({ isRunning: false, pinVoltages: {} }); // reset voltages when stopped
    get().evaluateCircuit(); // turn off LED
  },
  
  logSerial: (msg) => set((s) => ({ serialOutput: [...s.serialOutput, msg] })),
  clearSerial: () => set({ serialOutput: [] }),

  startWiring: (pinId) => set((s) => ({
    wiringState: { active: true, sourcePin: pinId, color: s.wiringState.color }
  })),

  finishWiring: (pinId) => {
    const { wiringState, wires } = get();
    if (!wiringState.sourcePin || wiringState.sourcePin === pinId) {
      get().cancelWiring();
      return;
    }
    
    // Prevent duplicate wires between same pins
    const exists = wires.find(w => 
      (w.fromPin === wiringState.sourcePin && w.toPin === pinId) ||
      (w.fromPin === pinId && w.toPin === wiringState.sourcePin)
    );

    if (!exists) {
      get().pushSnapshot();
      const newWire: WireData = {
        id: `wire-${Date.now()}`,
        fromPin: wiringState.sourcePin,
        toPin: pinId,
        color: wiringState.color,
      };
      set((s) => ({
        wires: [...s.wires, newWire],
        wiringState: { active: false, sourcePin: null, color: s.wiringState.color }
      }));
      // Recalculate circuit upon wiring change (only matters if running, but good practice)
      get().evaluateCircuit();
    } else {
      get().cancelWiring();
    }
  },

  cancelWiring: () => set((s) => ({
    wiringState: { ...s.wiringState, active: false, sourcePin: null }
  })),

  removeWire: (wireId) => set((s) => {
    s.pushSnapshot();
    const newWires = s.wires.filter((w) => w.id !== wireId);
    return { wires: newWires };
  }),

  setPinVoltage: (pinId, voltage) => {
    set((s) => ({
      pinVoltages: { ...s.pinVoltages, [pinId]: voltage }
    }));
    get().evaluateCircuit(); // Re-evaluate when Arduino drives a pin
  },

  evaluateCircuit: () => {
    // We pass the current state to the pure solver function
    const state = get();
    const newComponents = resolveCircuit(state.components, state.wires, state.pinVoltages);
    set({ components: newComponents });
  },

  pushSnapshot: () => {
    const state = get();
    set((s) => ({
      past: [...s.past, JSON.parse(JSON.stringify(state.wires))],
      future: [],
    }));
  },

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    
    return {
      wires: previous,
      past: newPast,
      future: [JSON.parse(JSON.stringify(state.wires)), ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    
    return {
      wires: next,
      past: [...state.past, JSON.parse(JSON.stringify(state.wires))],
      future: newFuture
    };
  }),

  initialize: (faults = []) => {
    const signature = faults.join(",");
    if (get().sessionSignature === signature) return; // Already initialized
    
    const isLedReversed = faults.includes("REVERSED_LED");
    
    set({
      isRunning: false,
      serialOutput: [],
      wires: [], 
      wiringState: { active: false, sourcePin: null, color: "#ef4444" },
      pinVoltages: {},
      sessionSignature: signature,
      past: [],
      future: [],
      components: {
        "led1": {
          id: "led1",
          type: "LED",
          // e.g. placing LED spanning breadboard row 10 and 11
          pins: {
            anode: isLedReversed ? "bb-A11" : "bb-A10",
            cathode: isLedReversed ? "bb-A10" : "bb-A11"
          },
          isReversed: isLedReversed,
          isOn: false,
        },
        "res1": {
          id: "res1",
          type: "RESISTOR",
          value: 220,
          // Spanning row 11 to GND rail
          pins: {
            p1: "bb-B11",
            p2: "bb-GND-1"
          }
        }
      }
    });
  }
}));
