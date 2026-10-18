"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import { useArduinoStore } from "../stores/arduino-store";

// Hardcoded coordinates for the sockets to render wires correctly.
// In a full production app with movable parts, this would be computed dynamically
// via worldPosition lookups on the meshes themselves.
const PIN_COORDS: Record<string, [number, number, number]> = {
  // Arduino (Parent pos [-2, 0, 0])
  "uno-13": [-2.65, 0.1, -0.9],
  "uno-12": [-2.55, 0.1, -0.9],
  "uno-GND1": [-1.25, 0.1, -0.9],
  
  "uno-5V": [-2.7, 0.1, 0.9],
  "uno-GND2": [-2.5, 0.1, 0.9],

  // Breadboard (Parent pos [1.5, 0, 0])
  // Left Power Rails (-0.8 and -0.7 xOffset)
  // Rows 1-30 (-1.45 to +1.45 zOffset)
  "bb-PWR-left-+-10": [0.7, 0.1, -0.55],
  "bb-GND-left---11": [0.8, 0.1, -0.45],
  
  // LED Anode (A10)
  "bb-A10": [1.1, 0.1, -0.55],
  // LED Cathode (A11)
  "bb-A11": [1.1, 0.1, -0.45],
  
  // Resistor (B11 to GND-11)
  "bb-B11": [1.2, 0.1, -0.45],
};

// Fallback generator for unmapped pins (approximates based on string parsing)
function getCoords(pinId: string): [number, number, number] {
  if (PIN_COORDS[pinId]) return PIN_COORDS[pinId];
  
  // Very rough approximation for breadboard pins not hardcoded
  if (pinId.startsWith("bb-")) {
    const parts = pinId.split("-");
    const hole = parts[1]; // e.g. A10
    if (["A","B","C","D","E","F","G","H","I","J"].includes(hole.charAt(0))) {
      const row = parseInt(hole.slice(1), 10);
      return [1.3, 0.1, -1.45 + (row - 1) * 0.1];
    }
  }
  return [0, 0, 0]; // Default fallback
}

export function WireRenderer() {
  const wires = useArduinoStore(s => s.wires);
  const wiringState = useArduinoStore(s => s.wiringState);
  const removeWire = useArduinoStore(s => s.removeWire);

  return (
    <>
      {wires.map(w => {
        const start = getCoords(w.fromPin);
        const end = getCoords(w.toPin);
        
        // Midpoint calculation to give the wire a nice "loop/droop"
        const midX = (start[0] + end[0]) / 2;
        const midZ = (start[2] + end[2]) / 2;
        const midY = Math.max(start[1], end[1]) + 1.5; // Arc height

        return (
          <group key={w.id} onPointerDown={(e) => { e.stopPropagation(); removeWire(w.id); }}>
            <QuadraticBezierLine
              start={start}
              end={end}
              mid={[midX, midY, midZ]}
              color={w.color}
              lineWidth={4}
            />
            {/* Invisible thicker line for easier clicking to delete */}
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

      {/* Active wiring indicator (draws from source pin to mouse cursor) */}
      {wiringState.active && wiringState.sourcePin && (
        <ActiveWire sourcePin={wiringState.sourcePin} color={wiringState.color} />
      )}
    </>
  );
}

// Separate component for the active wire to isolate useFrame
function ActiveWire({ sourcePin, color }: { sourcePin: string, color: string }) {
  const lineRef = useRef<any>(null);
  const startCoords = useMemo(() => getCoords(sourcePin), [sourcePin]);
  
  useFrame(({ pointer, camera }) => {
    if (!lineRef.current) return;
    
    // Raycast from camera to a conceptual ground plane (Y=0.1)
    const vec = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = (0.1 - camera.position.y) / vec.y;
    const endPos = camera.position.clone().add(vec.multiplyScalar(distance));
    
    const midX = (startCoords[0] + endPos.x) / 2;
    const midZ = (startCoords[2] + endPos.z) / 2;
    const midY = 0.8; // shorter arc while dragging

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
      color={color}
      lineWidth={3}
      dashed
      dashScale={2}
    />
  );
}
