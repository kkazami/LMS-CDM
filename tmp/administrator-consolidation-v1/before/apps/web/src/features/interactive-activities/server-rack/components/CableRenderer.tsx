"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import { useServerRackStore } from "../stores/server-rack-store";

// To render the cables, we need the positions of the ports.
// Since the rack components are movable, we need a way to look up the world position of the ports.
// However, since we snap them to fixed RU slots, we can compute their position based on their `ruSlot`.

function getPortPosition(portId: string, state: any): [number, number, number] {
  const { equipment } = state;
  const devId = portId.split('-')[0];
  const dev = equipment[devId];
  
  if (!dev || dev.ruSlot === null) return [0,0,0]; // Not mounted

  // Base Y for the RU slot
  const ruBaseY = 0.5 + (dev.ruSlot - 1) * 0.45;

  // X offset based on port index (assuming 24 ports for switch/patch)
  let xOffset = 0;
  let yOffset = ruBaseY;
  
  if (dev.type === "PATCH_PANEL" || dev.type === "SWITCH") {
    // e.g. patch1-p1
    const portNum = parseInt(portId.split('-p')[1], 10) - 1; // 0 to 23
    xOffset = -0.8 + (portNum % 12) * 0.15;
    yOffset += (portNum < 12 ? 0.08 : -0.08);
  } else if (dev.type === "SERVER") {
    // 1 NIC on the front right
    xOffset = 1;
    yOffset += 0;
  }

  // Z offset is fixed at the front face of the equipment (0.91)
  return [xOffset, yOffset, 0.91];
}

export function CableRenderer() {
  const cables = useServerRackStore(s => s.cables);
  const wiringState = useServerRackStore(s => s.activeCableJob);
  const removeCable = useServerRackStore(s => s.removeCable);
  const state = useServerRackStore(); // To pass to getPortPosition

  return (
    <>
      {cables.map(w => {
        const start = getPortPosition(w.fromPort, state);
        const end = getPortPosition(w.toPort, state);
        
        // Midpoint calculation to give the wire a drooping "waterfall" effect down the side of the rack
        const midX = -1.5; // Droop to the left rail
        const midY = Math.min(start[1], end[1]) - 0.5; // Hang slightly below the lowest port
        const midZ = 1.0; // Slightly out from the front face

        return (
          <group key={w.id} onPointerDown={(e) => { e.stopPropagation(); removeCable(w.id); }}>
            <QuadraticBezierLine
              start={start}
              end={end}
              mid={[midX, midY, midZ]}
              color={w.isT568B ? "#3b82f6" : "#ef4444"} // Blue for good, Red for bad
              lineWidth={4}
            />
            <QuadraticBezierLine
              start={start}
              end={end}
              mid={[midX, midY, midZ]}
              color="transparent"
              lineWidth={15}
            />
          </group>
        );
      })}

      {wiringState.active && wiringState.sourcePort && !wiringState.destPort && (
        <ActiveWire sourcePort={wiringState.sourcePort} state={state} />
      )}
    </>
  );
}

function ActiveWire({ sourcePort, state }: { sourcePort: string, state: any }) {
  const lineRef = useRef<any>(null);
  const startCoords = useMemo(() => getPortPosition(sourcePort, state), [sourcePort, state]);
  
  useFrame(({ pointer, camera }) => {
    if (!lineRef.current) return;
    
    // Raycast to a plane near the front of the rack (Z=1.0)
    const vec = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = (1.0 - camera.position.z) / vec.z;
    const endPos = camera.position.clone().add(vec.multiplyScalar(distance));
    
    const midX = (startCoords[0] + endPos.x) / 2;
    const midY = Math.min(startCoords[1], endPos.y) - 0.5;
    const midZ = 1.0; 

    lineRef.current.setPoints(
      startCoords,
      endPos.toArray(),
      [midX, midY, midZ]
    );
  });

  return (
    <QuadraticBezierLine
      ref={lineRef}
      start={startCoords}
      end={startCoords}
      color="#9ca3af" // Gray while dragging
      lineWidth={3}
      dashed
      dashScale={2}
    />
  );
}
