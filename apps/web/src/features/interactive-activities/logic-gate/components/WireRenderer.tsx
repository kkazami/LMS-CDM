"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import { useLogicStore, LogicState } from "../stores/logic-store";

function getPinPosition(pinId: string, state: LogicState): [number, number, number] {
  const { gates } = state;
  const [gateId, pinName] = pinId.split('-');
  const gate = gates[gateId];
  
  if (!gate) return [0, 0, 0];

  const pos = gate.position;
  
  if (pinName === "out") {
    return [pos[0] + 0.6, pos[1], pos[2]];
  }
  
  if (pinName.startsWith("in")) {
    const idx = parseInt(pinName.replace("in", ""), 10);
    // If it's a 1-input gate (NOT, OUTPUT), it's centered
    if (gate.type === "NOT" || gate.type === "OUTPUT") {
      return [pos[0] - 0.6, pos[1], pos[2]];
    }
    // For 2-input gates
    const zOffset = -0.25 + (idx * 0.5);
    return [pos[0] - 0.6, pos[1], pos[2] + zOffset];
  }
  
  return pos;
}

export function WireRenderer() {
  const wires = useLogicStore(s => s.wires);
  const wiringState = useLogicStore(s => s.wiringState);
  const removeWire = useLogicStore(s => s.removeWire);
  const state = useLogicStore();

  return (
    <>
      {wires.map(w => {
        const start = getPinPosition(w.fromPin, state);
        const end = getPinPosition(w.toPin, state);
        
        // Orthogonal-ish bezier routing
        const midX = (start[0] + end[0]) / 2;
        const midY = 0.5; 
        const midZ = (start[2] + end[2]) / 2;

        return (
          <group key={w.id} onPointerDown={(e) => { e.stopPropagation(); removeWire(w.id); }}>
            <QuadraticBezierLine
              start={start}
              end={end}
              mid={[midX, midY, midZ]}
              color={w.state ? "#22c55e" : "#475569"} // Green if signal is high, gray if low
              lineWidth={3}
            />
            {/* Hit area for deletion */}
            <QuadraticBezierLine
              start={start}
              end={end}
              mid={[midX, midY, midZ]}
              color="transparent"
              lineWidth={12}
            />
          </group>
        );
      })}

      {wiringState.active && wiringState.sourcePin && (
        <ActiveWire sourcePin={wiringState.sourcePin} state={state} />
      )}
    </>
  );
}

function ActiveWire({ sourcePin, state }: { sourcePin: string, state: LogicState }) {
  // Justified: drei's QuadraticBezierLine ref type is not explicitly exported, but it exposes setPoints
  const lineRef = useRef<any>(null);
  const startCoords = useMemo(() => getPinPosition(sourcePin, state), [sourcePin, state]);
  
  useFrame(({ pointer, camera }) => {
    if (!lineRef.current) return;
    
    // Raycast to the XZ plane at Y=0.5
    const vec = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = (0.5 - camera.position.y) / vec.y;
    const endPos = camera.position.clone().add(vec.multiplyScalar(distance));
    
    const midX = (startCoords[0] + endPos.x) / 2;
    const midZ = (startCoords[2] + endPos.z) / 2;

    lineRef.current.setPoints(
      startCoords,
      endPos.toArray(),
      [midX, 0.5, midZ]
    );
  });

  return (
    <QuadraticBezierLine
      ref={lineRef}
      start={startCoords}
      end={startCoords}
      color="#9ca3af"
      lineWidth={3}
      dashed
      dashScale={2}
    />
  );
}
