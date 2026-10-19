/**
 * logic-solver.ts
 *
 * Implements a topological directed graph evaluator for combinational logic circuits.
 */

import { LogicGate, LogicWire, TargetTruthTable } from "../stores/logic-store";

// Helper to evaluate a specific gate type given an array of boolean inputs
function evaluateGateLogic(type: string, inputs: boolean[], currentState: boolean): boolean {
  switch (type) {
    case "AND": return inputs.length > 0 && inputs.every(i => i === true);
    case "OR": return inputs.some(i => i === true);
    case "NOT": return inputs.length > 0 ? !inputs[0] : false;
    case "XOR": return inputs.reduce((acc, curr) => acc !== curr, false);
    case "NAND": return !(inputs.length > 0 && inputs.every(i => i === true));
    case "NOR": return !(inputs.some(i => i === true));
    case "INPUT": return currentState; // Input state is dictated by the UI toggle
    case "OUTPUT": return inputs.length > 0 ? inputs[0] : false; // Output just passes its input
    case "D_FF": 
      // Simplified D-FlipFlop for Sprint 5: we just pass D to Q if Clock is high.
      // (in0 = D, in1 = Clock). Not fully edge-triggered in this static solver.
      if (inputs.length === 2) {
        const [d, clk] = inputs;
        if (clk) return d;
      }
      return currentState; // Hold previous state
    default: return false;
  }
}

export function evaluateLogicGraph(
  gates: Record<string, LogicGate>,
  wires: LogicWire[]
): { newWires: LogicWire[]; updatedOutputs: Record<string, boolean> } {
  
  // 1. Build adjacency lists for the graph
  // Map of gateId -> array of source wires feeding into it
  const incomingWires: Record<string, LogicWire[]> = {};
  // Map of gateId -> array of outgoing wires
  const outgoingWires: Record<string, LogicWire[]> = {};
  
  Object.keys(gates).forEach(id => {
    incomingWires[id] = [];
    outgoingWires[id] = [];
  });

  wires.forEach(w => {
    const srcGate = w.fromPin.split('-')[0];
    const destGate = w.toPin.split('-')[0];
    if (outgoingWires[srcGate]) outgoingWires[srcGate].push(w);
    if (incomingWires[destGate]) incomingWires[destGate].push(w);
  });

  // 2. Topological Sort (Kahn's Algorithm)
  const inDegree: Record<string, number> = {};
  const queue: string[] = [];
  const sorted: string[] = [];

  Object.keys(gates).forEach(id => {
    inDegree[id] = incomingWires[id].length;
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    sorted.push(curr);
    
    outgoingWires[curr].forEach(w => {
      const neighbor = w.toPin.split('-')[0];
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // If sorted length < gates length, we have a cycle. We'll still evaluate what we can.

  // 3. Evaluate in topological order
  const newWires = [...wires];
  const updatedOutputs: Record<string, boolean> = {};
  
  // Initialize state map with current states
  const nodeStates: Record<string, boolean> = {};
  Object.values(gates).forEach(g => nodeStates[g.id] = g.state);

  sorted.forEach(gateId => {
    const gate = gates[gateId];
    if (!gate) return;

    // Collect inputs for this gate based on incoming wires
    // Sort incoming wires by their pin index (e.g. "in0", "in1")
    const sortedIncoming = incomingWires[gateId].sort((a, b) => a.toPin.localeCompare(b.toPin));
    const inputValues = sortedIncoming.map(w => w.state);
    
    // Evaluate the gate
    const result = evaluateGateLogic(gate.type, inputValues, nodeStates[gateId]);
    nodeStates[gateId] = result;
    updatedOutputs[gateId] = result;

    // Update the state of all outgoing wires from this gate
    outgoingWires[gateId].forEach(w => {
      const wireIdx = newWires.findIndex(nw => nw.id === w.id);
      if (wireIdx !== -1) {
        newWires[wireIdx] = { ...newWires[wireIdx], state: result };
      }
    });
  });

  return { newWires, updatedOutputs };
}

// Generates a Truth Table for the current graph by simulating all input permutations
export function generateTruthTable(gates: Record<string, LogicGate>, wires: LogicWire[]): TargetTruthTable {
  const inputs = Object.values(gates).filter(g => g.type === "INPUT").sort((a, b) => a.id.localeCompare(b.id));
  const outputs = Object.values(gates).filter(g => g.type === "OUTPUT").sort((a, b) => a.id.localeCompare(b.id));

  const table: TargetTruthTable = {
    inputs: inputs.map(i => i.id),
    outputs: outputs.map(o => o.id),
    rows: []
  };

  if (inputs.length === 0 || outputs.length === 0) return table;

  const numPermutations = Math.pow(2, inputs.length);

  for (let i = 0; i < numPermutations; i++) {
    // Generate boolean array for this permutation (e.g., 00, 01, 10, 11)
    const binString = i.toString(2).padStart(inputs.length, '0');
    const inputPerm = binString.split('').map(c => c === '1');
    
    // Create a deep copy of gates and set the inputs to this permutation
    const simGates = JSON.parse(JSON.stringify(gates)) as Record<string, LogicGate>;
    inputs.forEach((inputGate, idx) => {
      simGates[inputGate.id].state = inputPerm[idx];
    });

    // Evaluate
    const { updatedOutputs } = evaluateLogicGraph(simGates, wires);

    // Collect output results
    const outputPerm = outputs.map(o => updatedOutputs[o.id] ?? false);

    table.rows.push({
      in: inputPerm,
      out: outputPerm
    });
  }

  return table;
}

// Compare two truth tables (student vs target) and return a score 0-100
export function compareTruthTables(student: TargetTruthTable, target: TargetTruthTable): number {
  if (student.rows.length !== target.rows.length) return 0;
  if (target.rows.length === 0) return 0;

  let matches = 0;
  for (let i = 0; i < target.rows.length; i++) {
    const sOut = student.rows[i].out;
    const tOut = target.rows[i].out;
    
    if (sOut.length !== tOut.length) continue;
    
    let rowMatch = true;
    for (let j = 0; j < tOut.length; j++) {
      if (sOut[j] !== tOut[j]) {
        rowMatch = false;
        break;
      }
    }
    if (rowMatch) matches++;
  }

  return (matches / target.rows.length) * 100;
}
