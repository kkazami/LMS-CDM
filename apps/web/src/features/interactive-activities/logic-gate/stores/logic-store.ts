import { create } from "zustand";
import { evaluateLogicGraph } from "../utils/logic-solver";
import { LogicFaultType } from "../utils/fault-engine";
export type { LogicFaultType };

export type LogicGateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR" | "INPUT" | "OUTPUT" | "D_FF";

export interface LogicGate {
  id: string;
  type: LogicGateType;
  position: [number, number, number];
  // Internal state for INPUT toggles or D-FlipFlop
  state: boolean;
}

export interface LogicWire {
  id: string;
  fromPin: string; // e.g. "gate1-out"
  toPin: string;   // e.g. "gate2-in0"
  state: boolean;  // The live signal (0 or 1)
}

export interface TargetTruthTable {
  inputs: string[]; // labels e.g. ["A", "B"]
  outputs: string[]; // labels e.g. ["Y"]
  rows: { in: boolean[], out: boolean[] }[];
}

export type LogicSnapshot = {
  gates: Record<string, LogicGate>;
  wires: LogicWire[];
};

export interface LogicState {
  gates: Record<string, LogicGate>;
  wires: LogicWire[];
  
  wiringState: {
    active: boolean;
    sourcePin: string | null;
  };

  targetTruthTable: TargetTruthTable | null;
  activeFaults: LogicFaultType[];

  // Session & History
  sessionSignature: string | null;
  past: LogicSnapshot[];
  future: LogicSnapshot[];

  // Actions
  initialize: (faults?: LogicFaultType[], targetTable?: TargetTruthTable | null) => void;
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;
  addGate: (type: LogicGateType, position: [number, number, number]) => void;
  updateGatePosition: (id: string, position: [number, number, number]) => void;
  toggleInput: (id: string) => void;
  
  startWiring: (pinId: string) => void;
  finishWiring: (pinId: string) => void;
  cancelWiring: () => void;
  removeWire: (id: string) => void;
  
  evaluate: () => void;
}

export const useLogicStore = create<LogicState>((set, get) => ({
  gates: {},
  wires: [],
  wiringState: { active: false, sourcePin: null },
  targetTruthTable: null,
  activeFaults: [],
  sessionSignature: null,
  past: [],
  future: [],

  initialize: (faults = [], targetTable = null) => {
    const signature = faults.join(",") + (targetTable ? ":table" : ":free");
    if (get().sessionSignature === signature) return; // Already initialized

    // Scaffold initial state based on faults.
    // For Sprint 5 we'll preload a simple AND circuit if it's a troubleshooting assignment.
    
    let initialGates: Record<string, LogicGate> = {};
    let initialWires: LogicWire[] = [];

    if (faults.length > 0) {
      // Troubleshooting mode: Load a pre-built circuit with a fault
      const gateType = faults.includes("SWAPPED_GATE_OR_TO_XOR") ? "XOR" : "OR";
      
      initialGates = {
        "inA": { id: "inA", type: "INPUT", position: [-3, 0.5, -1], state: false },
        "inB": { id: "inB", type: "INPUT", position: [-3, 0.5, 1], state: false },
        "gate1": { id: "gate1", type: gateType, position: [0, 0.5, 0], state: false },
        "outY": { id: "outY", type: "OUTPUT", position: [3, 0.5, 0], state: false },
      };
      
      initialWires = [
        { id: "w1", fromPin: "inA-out", toPin: "gate1-in0", state: false },
        { id: "w2", fromPin: "inB-out", toPin: "gate1-in1", state: false },
        { id: "w3", fromPin: "gate1-out", toPin: "outY-in0", state: false },
      ];
    } else {
      // Free build mode (or target truth table mode). Just load two inputs and an output to save time.
      initialGates = {
        "inA": { id: "inA", type: "INPUT", position: [-3, 0.5, -1], state: false },
        "inB": { id: "inB", type: "INPUT", position: [-3, 0.5, 1], state: false },
        "outY": { id: "outY", type: "OUTPUT", position: [3, 0.5, 0], state: false },
      };
    }

    set({
      activeFaults: faults,
      targetTruthTable: targetTable,
      gates: initialGates,
      wires: initialWires,
      wiringState: { active: false, sourcePin: null },
      sessionSignature: signature,
      past: [],
      future: [],
    });
    get().evaluate();
  },

  pushSnapshot: () => {
    const state = get();
    const snapshot: LogicSnapshot = {
      gates: JSON.parse(JSON.stringify(state.gates)),
      wires: JSON.parse(JSON.stringify(state.wires)),
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
    
    const currentSnapshot: LogicSnapshot = {
      gates: JSON.parse(JSON.stringify(state.gates)),
      wires: JSON.parse(JSON.stringify(state.wires)),
    };

    return {
      gates: previous.gates,
      wires: previous.wires,
      past: newPast,
      future: [currentSnapshot, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    
    const currentSnapshot: LogicSnapshot = {
      gates: JSON.parse(JSON.stringify(state.gates)),
      wires: JSON.parse(JSON.stringify(state.wires)),
    };

    return {
      gates: next.gates,
      wires: next.wires,
      past: [...state.past, currentSnapshot],
      future: newFuture
    };
  }),

  addGate: (type, position) => {
    get().pushSnapshot();
    set((s) => {
    const id = `g-${Date.now()}`;
    return { gates: { ...s.gates, [id]: { id, type, position, state: false } } };
  });
  },

  updateGatePosition: (id, position) => {
    get().pushSnapshot();
    set((s) => ({
      gates: { ...s.gates, [id]: { ...s.gates[id], position } }
    }));
  },

  toggleInput: (id) => {
    get().pushSnapshot();
    set((s) => {
      const gate = s.gates[id];
      if (gate && gate.type === "INPUT") {
        return { gates: { ...s.gates, [id]: { ...gate, state: !gate.state } } };
      }
      return {};
    });
    get().evaluate();
  },

  startWiring: (pinId) => set((s) => ({
    wiringState: { active: true, sourcePin: pinId }
  })),

  finishWiring: (pinId) => {
    const { wiringState, wires } = get();
    if (!wiringState.sourcePin || wiringState.sourcePin === pinId) {
      get().cancelWiring();
      return;
    }

    // Ensure we don't wire out-to-out or in-to-in
    const srcIsOut = wiringState.sourcePin.includes("-out");
    const destIsIn = pinId.includes("-in");
    
    if (srcIsOut !== destIsIn) {
      // Invalid connection type (e.g. output to output)
      get().cancelWiring();
      return;
    }

    const fromPin = srcIsOut ? wiringState.sourcePin : pinId;
    const toPin = srcIsOut ? pinId : wiringState.sourcePin;

    // Remove any existing wire to that specific input pin (only 1 connection per input)
    const filteredWires = wires.filter(w => w.toPin !== toPin);

    const newWire: LogicWire = {
      id: `w-${Date.now()}`,
      fromPin,
      toPin,
      state: false
    };

    get().pushSnapshot();

    set({
      wires: [...filteredWires, newWire],
      wiringState: { active: false, sourcePin: null }
    });
    
    get().evaluate();
  },

  cancelWiring: () => set({ wiringState: { active: false, sourcePin: null } }),

  removeWire: (id) => {
    get().pushSnapshot();
    set((s) => ({ wires: s.wires.filter(w => w.id !== id) }));
    get().evaluate();
  },

  evaluate: () => {
    // Pure function that returns updated wire states and output gate states
    const { gates, wires } = get();
    const { newWires, updatedOutputs } = evaluateLogicGraph(gates, wires);
    
    set((s) => {
      const newGates = { ...s.gates };
      for (const [id, state] of Object.entries(updatedOutputs)) {
        if (newGates[id]) newGates[id] = { ...newGates[id], state };
      }
      return { wires: newWires, gates: newGates };
    });
  }
}));
