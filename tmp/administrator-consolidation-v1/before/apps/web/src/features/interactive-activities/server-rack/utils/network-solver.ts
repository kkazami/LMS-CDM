/**
 * network-solver.ts
 *
 * Evaluates physical cabling paths and Layer-3 subnet math to determine ping reachability.
 */

// Helper to convert IPv4 string to 32-bit integer
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Helper to check if two IPs are on the same subnet
function isSameSubnet(ip1: string, ip2: string, mask: string): boolean {
  try {
    const intIp1 = ipToInt(ip1);
    const intIp2 = ipToInt(ip2);
    const intMask = ipToInt(mask);
    return (intIp1 & intMask) === (intIp2 & intMask);
  } catch (e) {
    return false;
  }
}

// Helper to extract device ID from port ID (e.g., "server1-eth0" -> "server1")
function getDeviceIdFromPort(portId: string): string {
  return portId.split('-')[0];
}

export function evaluatePing(sourceId: string, destIp: string, state: any): { success: boolean; reason?: string } {
  const { equipment, cables, deviceConfigs, activeFaults } = state;
  
  const sourceConfig = deviceConfigs[sourceId];
  if (!sourceConfig || !sourceConfig.ip || !sourceConfig.mask) {
    return { success: false, reason: "Source interface is not configured (No IP/Mask)." };
  }

  // 1. Find Destination Device by IP
  let destId: string | null = null;
  for (const [id, config] of Object.entries(deviceConfigs) as [string, any][]) {
    if (config.ip === destIp) {
      destId = id;
      break;
    }
  }

  if (!destId) {
    return { success: false, reason: "Destination IP not found on the local network." };
  }

  // 2. Layer 3 Subnet Check (Are they in the same subnet?)
  // For Sprint 4, we only support same-subnet pinging (no routers).
  if (!isSameSubnet(sourceConfig.ip, destIp, sourceConfig.mask)) {
    return { success: false, reason: "Destination is in a different subnet and no Default Gateway is configured." };
  }

  // Check destination mask too (it must agree on the subnet size for a proper return route)
  const destConfig = deviceConfigs[destId];
  if (!isSameSubnet(sourceConfig.ip, destIp, destConfig.mask)) {
    return { success: false, reason: "Destination subnet mask mismatch (no return route)." };
  }

  // 3. Layer 1/2 Physical Path Check
  // We treat every device as an internally connected hub/switch for the sake of pathfinding.
  // We build an adjacency list of DEVICE IDs.
  const graph: Record<string, Set<string>> = {};
  
  const addEdge = (d1: string, d2: string) => {
    if (!graph[d1]) graph[d1] = new Set();
    if (!graph[d2]) graph[d2] = new Set();
    graph[d1].add(d2);
    graph[d2].add(d1);
  };

  // Populate graph from cables
  for (const cable of cables) {
    // If a fault mandates T568A and they used T568B (or vice versa), the link is "down".
    // For this sim, we require T568B everywhere unless a specific fault says otherwise.
    // If MISWIRED_T568A fault is active, it means we *wanted* them to wire it wrong to fail, 
    // or maybe the fault is that a cable they didn't touch is bad. 
    // Wait, the T568B validation happens in the UI minigame before the cable is even created.
    // If they create it, it's valid. Unless we specifically inject a "bad" cable.
    
    // For now, assume any cable in the store is physically bridging.
    const dev1 = getDeviceIdFromPort(cable.fromPort);
    const dev2 = getDeviceIdFromPort(cable.toPort);
    addEdge(dev1, dev2);
  }

  // BFS to find path from sourceId to destId
  const queue = [sourceId];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === destId) {
      return { success: true };
    }
    
    if (graph[curr]) {
      for (const neighbor of graph[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return { success: false, reason: "No physical path found. Check cables and switch ports." };
}
