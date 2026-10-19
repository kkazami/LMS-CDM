import { WireData, CircuitComponent, PinState } from "../stores/arduino-store";

/**
 * circuit-solver.ts
 *
 * Implements a simplified digital logic solver for the Breadboard + Arduino setup.
 * It maps physical holes to electrical nodes, builds a graph of wires/resistors,
 * and propagates HIGH (1) and LOW (0) from Arduino pins to components like LEDs.
 */

// Helper to map a physical pin ID (e.g. bb-A10, bb-GND-1, uno-13) to an electrical node ID.
export function getElectricalNode(pinId: string): string {
  if (pinId.startsWith("bb-")) {
    const parts = pinId.split("-"); // bb-A10 -> ["bb", "A10"]
    const hole = parts[1];
    
    if (hole.startsWith("GND") || hole.startsWith("PWR")) {
      // Power rails (e.g., bb-GND-left, bb-PWR-right)
      return `node-${hole}`;
    }
    
    // Rows A-E are one node, F-J are another.
    const col = hole.charAt(0);
    const row = hole.slice(1);
    
    if (["A", "B", "C", "D", "E"].includes(col)) {
      return `node-row-${row}-1`;
    }
    if (["F", "G", "H", "I", "J"].includes(col)) {
      return `node-row-${row}-2`;
    }
  }
  
  // Arduino pins are their own node (e.g., uno-13 -> node-uno-13)
  return `node-${pinId}`;
}

export function resolveCircuit(
  components: Record<string, CircuitComponent>,
  wires: WireData[],
  pinVoltages: Record<string, PinState>
): Record<string, CircuitComponent> {
  
  const graph: Record<string, Set<string>> = {};
  
  const addEdge = (n1: string, n2: string) => {
    if (!graph[n1]) graph[n1] = new Set();
    if (!graph[n2]) graph[n2] = new Set();
    graph[n1].add(n2);
    graph[n2].add(n1);
  };

  // 1. Add edges for all Wires
  wires.forEach(w => {
    addEdge(getElectricalNode(w.fromPin), getElectricalNode(w.toPin));
  });

  // 2. Add edges for Resistors (they bridge two nodes)
  Object.values(components).forEach(c => {
    if (c.type === "RESISTOR") {
      addEdge(getElectricalNode(c.pins.p1), getElectricalNode(c.pins.p2));
    }
  });

  // 3. Collect active voltage sources (Arduino pins)
  const nodeVoltages: Record<string, PinState> = {};
  
  Object.entries(pinVoltages).forEach(([pinId, state]) => {
    if (state !== null) {
      nodeVoltages[getElectricalNode(pinId)] = state;
    }
  });
  
  // Hardcoded standard pins
  nodeVoltages[getElectricalNode("uno-GND1")] = 0;
  nodeVoltages[getElectricalNode("uno-GND2")] = 0;
  nodeVoltages[getElectricalNode("uno-GND3")] = 0;
  nodeVoltages[getElectricalNode("uno-5V")] = 1;
  nodeVoltages[getElectricalNode("uno-3V3")] = 1;

  // 4. Propagate voltages through the graph using BFS
  const queue = Object.keys(nodeVoltages);
  const visited = new Set(queue);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const val = nodeVoltages[curr];
    
    if (graph[curr]) {
      for (const neighbor of graph[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nodeVoltages[neighbor] = val; // Assuming perfect conductors & no voltage drop for digital logic
          queue.push(neighbor);
        } else if (nodeVoltages[neighbor] !== val) {
          // SHORT CIRCUIT! (Connecting HIGH to GND)
          // In a real sim, we might blow up the Arduino. Here we just ignore it.
        }
      }
    }
  }

  // 5. Evaluate LEDs based on final node voltages
  const newComponents = { ...components };
  
  Object.values(newComponents).forEach(c => {
    if (c.type === "LED") {
      const anodeNode = getElectricalNode(c.pins.anode);
      const cathodeNode = getElectricalNode(c.pins.cathode);
      
      const vAnode = nodeVoltages[anodeNode];
      const vCathode = nodeVoltages[cathodeNode];
      
      // LED is ON if Anode is HIGH (1) and Cathode is LOW (0)
      if (vAnode === 1 && vCathode === 0) {
        newComponents[c.id] = { ...c, isOn: true };
      } else {
        newComponents[c.id] = { ...c, isOn: false };
      }
    }
  });

  return newComponents;
}
