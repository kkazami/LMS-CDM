"use client";

import { useState } from "react";
import * as THREE from "three";
import { Box, Sphere, Html } from "@react-three/drei";
import { useDraggable3D } from "../../shared/hooks/useDraggable3D";
import { useLogicStore, LogicGate } from "../stores/logic-store";

// ─── Pin Component ───
export function Pin({ id, position, isInput }: { id: string, position: [number, number, number], isInput: boolean }) {
  const { startWiring, finishWiring, wiringState } = useLogicStore();

  const handlePointerDown = (e: React.PointerEvent | import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!wiringState.active) {
      startWiring(id);
    } else {
      finishWiring(id);
    }
  };

  return (
    <group position={position}>
      <mesh onPointerDown={handlePointerDown} onPointerOver={() => document.body.style.cursor = "pointer"} onPointerOut={() => document.body.style.cursor = "auto"}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color={wiringState.sourcePin === id ? "#facc15" : (isInput ? "#3b82f6" : "#ef4444")} />
      </mesh>
      <mesh visible={false} onPointerDown={handlePointerDown}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}

// ─── Generic Draggable Gate ───
interface DraggableGateProps {
  gate: LogicGate;
  color: string;
  label: string;
  inputsCount: number;
  hasOutput: boolean;
  children?: React.ReactNode;
}

function DraggableGate({ gate, color, label, inputsCount, hasOutput, children }: DraggableGateProps) {
  const { updateGatePosition } = useLogicStore();
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(...gate.position));

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 1, 0], // Drag on XZ plane for 2.5D top-down view
    onDragEnd: (finalPos) => {
      // Snap to a simple grid
      const snapped = new THREE.Vector3(
        Math.round(finalPos.x),
        0.5,
        Math.round(finalPos.z)
      );
      setPos(snapped);
      updateGatePosition(gate.id, [snapped.x, snapped.y, snapped.z]);
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(pos);
  }

  // Calculate pin positions dynamically based on count
  const renderInputs = () => {
    if (inputsCount === 0) return null;
    if (inputsCount === 1) {
      return <Pin id={`${gate.id}-in0`} position={[-0.6, 0, 0]} isInput={true} />;
    }
    return Array.from({ length: inputsCount }).map((_, i) => (
      <Pin key={i} id={`${gate.id}-in${i}`} position={[-0.6, 0, -0.25 + (i * 0.5)]} isInput={true} />
    ));
  };

  return (
    <group ref={ref as React.MutableRefObject<THREE.Group>} position={pos} {...handlers}>
      <Box args={[1.2, 0.2, 1]}>
        <meshStandardMaterial color={isDragging ? "#fbbf24" : color} />
      </Box>
      <Html center position={[0, 0.15, 0]} className="pointer-events-none">
        <span className="text-[12px] text-white font-bold tracking-widest pointer-events-none select-none">{label}</span>
      </Html>
      
      {/* Pins */}
      {renderInputs()}
      {hasOutput && <Pin id={`${gate.id}-out`} position={[0.6, 0, 0]} isInput={false} />}
      
      {children}
    </group>
  );
}

// ─── Specific Gates ───
export function GateComponent({ gateId }: { gateId: string }) {
  const gate = useLogicStore(s => s.gates[gateId]);
  const toggleInput = useLogicStore(s => s.toggleInput);

  if (!gate) return null;

  switch (gate.type) {
    case "AND": return <DraggableGate gate={gate} color="#0f766e" label="AND" inputsCount={2} hasOutput={true} />;
    case "OR": return <DraggableGate gate={gate} color="#b45309" label="OR" inputsCount={2} hasOutput={true} />;
    case "NOT": return <DraggableGate gate={gate} color="#be123c" label="NOT" inputsCount={1} hasOutput={true} />;
    case "XOR": return <DraggableGate gate={gate} color="#4c1d95" label="XOR" inputsCount={2} hasOutput={true} />;
    case "NAND": return <DraggableGate gate={gate} color="#1d4ed8" label="NAND" inputsCount={2} hasOutput={true} />;
    case "NOR": return <DraggableGate gate={gate} color="#c2410c" label="NOR" inputsCount={2} hasOutput={true} />;
    case "D_FF": return <DraggableGate gate={gate} color="#374151" label="D-FF" inputsCount={2} hasOutput={true} />;
    
    case "INPUT": 
      return (
        <DraggableGate gate={gate} color="#334155" label={gate.id} inputsCount={0} hasOutput={true}>
          {/* Toggle Switch */}
          <group position={[0, 0.2, 0]} onPointerDown={(e) => { e.stopPropagation(); toggleInput(gate.id); }}>
            <Box args={[0.4, 0.1, 0.4]}>
              <meshStandardMaterial color={gate.state ? "#22c55e" : "#ef4444"} />
            </Box>
            <Html center position={[0, 0.2, 0]} className="pointer-events-none">
              <span className="text-[10px] text-white font-bold">{gate.state ? "1" : "0"}</span>
            </Html>
          </group>
        </DraggableGate>
      );
      
    case "OUTPUT":
      return (
        <DraggableGate gate={gate} color="#334155" label={gate.id} inputsCount={1} hasOutput={false}>
          {/* LED Indicator */}
          <Sphere args={[0.3, 16, 16]} position={[0, 0.3, 0]}>
            <meshStandardMaterial 
              color={gate.state ? "#22c55e" : "#1e293b"} 
              emissive={gate.state ? "#22c55e" : "#000000"} 
              emissiveIntensity={gate.state ? 2 : 0}
            />
          </Sphere>
        </DraggableGate>
      );
      
    default: return null;
  }
}
