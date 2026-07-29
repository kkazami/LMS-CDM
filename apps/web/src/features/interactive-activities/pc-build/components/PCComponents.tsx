"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { Box, Sphere, Cylinder, Html } from "@react-three/drei";
import { useDraggable3D } from "../../shared/hooks/useDraggable3D";
import { useSnapZone } from "../../shared/hooks/useSnapZone";
import { useSnapStore } from "../../shared/stores/snap-store";
import { usePCBuildStore } from "../stores/pc-build-store";

// Helper for snap zones
function SnapSocket({ id, position, radius = 0.5, label, size = [0.4, 0.1, 0.4] }: { id: string, position: [number, number, number], radius?: number, label: string, size?: [number, number, number] }) {
  useSnapZone({ id, position, radius });
  return (
    <Box position={position} args={size}>
      <meshBasicMaterial color="#334155" wireframe transparent opacity={0.3} />
      <Html center position={[0, size[1]/2 + 0.1, 0]} className="pointer-events-none">
        <span className="text-[8px] bg-black/50 text-white px-1 rounded">{label}</span>
      </Html>
    </Box>
  );
}

// ─── PC Case ───
export function PCCase() {
  return (
    <group position={[0, 0, 0]}>
      {/* Case Body (Wireframe so we can see inside) */}
      <Box args={[3, 4, 1.5]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#1e293b" wireframe />
      </Box>
      <Html position={[0, 4.2, 0]} center><span className="text-xs font-bold text-gray-500">ATX Case</span></Html>
      
      {/* Snap Zones inside Case */}
      <SnapSocket id="case-mobo-socket" position={[-0.5, 2, -0.6]} radius={0.8} label="Mobo Standoffs" size={[2, 3, 0.1]} />
      <SnapSocket id="case-psu-socket" position={[0, 0.4, 0]} radius={0.8} label="PSU Bay" size={[1, 0.8, 1]} />
    </group>
  );
}

// ─── Motherboard ───
export function Motherboard() {
  const { mobo, placeComponent, removeComponent } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(3, 0.1, -2));

  // If we are initialized as placed (e.g. troubleshooting mode), update position
  // But doing this dynamically might be tricky if we don't know the exact socket coords here.
  // For simplicity, we just use the fixed coords.
  const socketPos = new THREE.Vector3(-0.5, 2, -0.6);

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1], // Drag on XY plane
    disabled: mobo.placed,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 2.0);
      if (closest?.id === "case-mobo-socket") {
        setPos(closest.position.clone());
        placeComponent("mobo", closest.id);
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  // Keep mesh in sync
  if (!isDragging && ref.current) {
    ref.current.position.copy(mobo.placed ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={mobo.placed ? socketPos : pos} {...handlers}>
      <Box args={[1.8, 2.8, 0.1]}>
        <meshStandardMaterial color={mobo.placed ? "#15803d" : (isDragging ? "#fbbf24" : "#166534")} />
      </Box>
      <Html center position={[0, 1.5, 0]}><span className="text-xs font-bold bg-green-900 text-white px-1">Mobo</span></Html>

      {/* Mobo Sockets (only active if mobo is placed) */}
      {mobo.placed && (
        <>
          <SnapSocket id="mobo-cpu-socket" position={[0, 0.8, 0.1]} radius={0.4} label="CPU Socket" />
          <SnapSocket id="dimm-A1" position={[0.4, 0.8, 0.1]} radius={0.3} label="A1" size={[0.1, 0.8, 0.2]} />
          <SnapSocket id="dimm-A2" position={[0.55, 0.8, 0.1]} radius={0.3} label="A2" size={[0.1, 0.8, 0.2]} />
          <SnapSocket id="dimm-B1" position={[0.7, 0.8, 0.1]} radius={0.3} label="B1" size={[0.1, 0.8, 0.2]} />
          <SnapSocket id="dimm-B2" position={[0.85, 0.8, 0.1]} radius={0.3} label="B2" size={[0.1, 0.8, 0.2]} />
          <SnapSocket id="mobo-gpu-socket" position={[0, -0.2, 0.1]} radius={0.5} label="PCIe x16" size={[1.2, 0.2, 0.2]} />
          
          <SnapSocket id="mobo-24pin-socket" position={[0.7, 0, 0.1]} radius={0.4} label="24-Pin ATX" size={[0.2, 0.6, 0.2]} />
          <SnapSocket id="mobo-8pin-socket" position={[-0.7, 1.2, 0.1]} radius={0.4} label="8-Pin EPS" size={[0.2, 0.2, 0.2]} />
        </>
      )}
    </group>
  );
}

// ─── CPU & Paste ───
export function CPU() {
  const { cpu, mobo, thermalPasteApplied, placeComponent, applyThermalPaste } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(3, 0.1, -1));
  const socketPos = new THREE.Vector3(-0.5, 2.8, -0.5); // Derived from Mobo offset

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: cpu.placed,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 1.5);
      if (closest?.id === "mobo-cpu-socket") {
        placeComponent("cpu", closest.id);
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(cpu.placed ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={cpu.placed ? socketPos : pos} {...handlers}>
      <Box args={[0.3, 0.3, 0.05]}>
        <meshStandardMaterial color={cpu.placed ? "#94a3b8" : (isDragging ? "#fbbf24" : "#cbd5e1")} />
      </Box>
      <Html center position={[0, 0.25, 0]}><span className="text-[10px] bg-slate-200 px-1 rounded text-slate-800 font-bold">CPU</span></Html>
      
      {/* Thermal Paste hit area (click to apply if CPU is placed) */}
      {cpu.placed && (
        <mesh position={[0, 0, 0.03]} onClick={(e) => { e.stopPropagation(); applyThermalPaste(); }}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial color="#e2e8f0" transparent opacity={thermalPasteApplied ? 0.8 : 0.0} />
          {!thermalPasteApplied && (
            <Html center position={[0, 0, 0.05]} className="pointer-events-none">
              <span className="text-[10px] text-blue-600 font-bold animate-pulse">Click to paste</span>
            </Html>
          )}
        </mesh>
      )}
    </group>
  );
}

// ─── CPU Cooler ───
export function Cooler() {
  const { cooler, placeComponent } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(4, 0.1, -1));
  const socketPos = new THREE.Vector3(-0.5, 2.8, -0.4); 

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: cooler.placed,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 1.5);
      if (closest?.id === "mobo-cpu-socket") { // Snaps over same socket
        placeComponent("cooler", "mobo-cooler-socket");
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(cooler.placed ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={cooler.placed ? socketPos : pos} {...handlers}>
      <Cylinder args={[0.3, 0.3, 0.2, 16]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color={cooler.placed ? "#1e293b" : (isDragging ? "#fbbf24" : "#334155")} />
      </Cylinder>
      <Html center position={[0, 0.3, 0]}><span className="text-[10px] bg-slate-700 text-white px-1 rounded">Cooler</span></Html>
    </group>
  );
}

// ─── RAM Stick ───
export function RAM({ id, initialPos }: { id: "ram1" | "ram2" | "ram3" | "ram4", initialPos: [number, number, number] }) {
  const { ramSticks, placeComponent } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(...initialPos));
  const isPlaced = ramSticks[id].placed;
  const socketId = ramSticks[id].socketId;

  // Derive fixed coordinates for the sockets so the mesh renders correctly
  const socketMap: Record<string, THREE.Vector3> = {
    "dimm-A1": new THREE.Vector3(-0.1, 2.8, -0.5),
    "dimm-A2": new THREE.Vector3(0.05, 2.8, -0.5),
    "dimm-B1": new THREE.Vector3(0.2, 2.8, -0.5),
    "dimm-B2": new THREE.Vector3(0.35, 2.8, -0.5),
  };

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: isPlaced,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 1.0);
      if (closest && closest.id.startsWith("dimm-")) {
        placeComponent(id, closest.id);
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(isPlaced && socketId ? socketMap[socketId] : pos);
  }

  return (
    <group ref={ref as any} position={isPlaced && socketId ? socketMap[socketId] : pos} {...handlers}>
      <Box args={[0.08, 0.7, 0.15]}>
        <meshStandardMaterial color={isPlaced ? "#4ade80" : (isDragging ? "#fbbf24" : "#22c55e")} />
      </Box>
      <Html center position={[0, 0.5, 0]}><span className="text-[10px] bg-green-600 text-white px-1 rounded">RAM</span></Html>
    </group>
  );
}

// ─── GPU ───
export function GPU() {
  const { gpu, placeComponent } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(3, 0.1, 0));
  const socketPos = new THREE.Vector3(-0.5, 1.8, -0.4); 

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: gpu.placed,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 2.0);
      if (closest?.id === "mobo-gpu-socket") {
        placeComponent("gpu", "mobo-gpu-socket");
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(gpu.placed ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={gpu.placed ? socketPos : pos} {...handlers}>
      <Box args={[1.2, 0.4, 0.5]}>
        <meshStandardMaterial color={gpu.placed ? "#991b1b" : (isDragging ? "#fbbf24" : "#b91c1c")} />
      </Box>
      <Html center position={[0, 0.3, 0]}><span className="text-[10px] bg-red-700 text-white px-1 rounded">GPU</span></Html>
    </group>
  );
}

// ─── PSU ───
export function PSU() {
  const { psu, placeComponent } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(4, 0.1, 1));
  const socketPos = new THREE.Vector3(0, 0.4, 0); 

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: psu.placed,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 2.0);
      if (closest?.id === "case-psu-socket") {
        placeComponent("psu", "case-psu-socket");
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(psu.placed ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={psu.placed ? socketPos : pos} {...handlers}>
      <Box args={[0.8, 0.8, 1.2]}>
        <meshStandardMaterial color={psu.placed ? "#334155" : (isDragging ? "#fbbf24" : "#475569")} />
      </Box>
      <Html center position={[0, 0.6, 0]}><span className="text-[10px] bg-slate-600 text-white px-1 rounded">PSU</span></Html>
    </group>
  );
}

// ─── Cables (Abstracted as draggable plugs from PSU to Sockets) ───
export function Cables() {
  const { psu, mobo, cable24PinConnected, cable8PinConnected, connectCable } = usePCBuildStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  
  const [pos24, setPos24] = useState<THREE.Vector3>(new THREE.Vector3(0.5, 0.4, 0));
  const [pos8, setPos8] = useState<THREE.Vector3>(new THREE.Vector3(0.5, 0.4, 0.3));

  const socket24Pos = new THREE.Vector3(0.2, 2, -0.5); // Approx over mobo 24pin
  const socket8Pos = new THREE.Vector3(-1.2, 3.2, -0.5); // Approx over mobo 8pin

  const { ref: ref24, isDragging: drag24, handlers: h24 } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: !psu.placed || cable24PinConnected,
    onDragEnd: (p) => {
      const closest = getClosestZone(p, 1.5);
      if (closest?.id === "mobo-24pin-socket") connectCable("24pin");
      else setPos24(p.clone());
    }
  });

  const { ref: ref8, isDragging: drag8, handlers: h8 } = useDraggable3D({
    planeNormal: [0, 0, 1],
    disabled: !psu.placed || cable8PinConnected,
    onDragEnd: (p) => {
      const closest = getClosestZone(p, 1.5);
      if (closest?.id === "mobo-8pin-socket") connectCable("8pin");
      else setPos8(p.clone());
    }
  });

  if (!drag24 && ref24.current) ref24.current.position.copy(cable24PinConnected ? socket24Pos : pos24);
  if (!drag8 && ref8.current) ref8.current.position.copy(cable8PinConnected ? socket8Pos : pos8);

  if (!psu.placed) return null;

  return (
    <>
      <group ref={ref24 as any} position={cable24PinConnected ? socket24Pos : pos24} {...h24}>
        <Box args={[0.2, 0.2, 0.2]}>
          <meshStandardMaterial color={cable24PinConnected ? "#eab308" : (drag24 ? "#fef08a" : "#ca8a04")} />
        </Box>
        <Html center position={[0, 0.2, 0]}><span className="text-[10px] text-yellow-900 bg-yellow-400 px-1 font-bold">24-Pin</span></Html>
      </group>
      
      <group ref={ref8 as any} position={cable8PinConnected ? socket8Pos : pos8} {...h8}>
        <Box args={[0.15, 0.15, 0.15]}>
          <meshStandardMaterial color={cable8PinConnected ? "#eab308" : (drag8 ? "#fef08a" : "#ca8a04")} />
        </Box>
        <Html center position={[0, 0.2, 0]}><span className="text-[10px] text-yellow-900 bg-yellow-400 px-1 font-bold">8-Pin</span></Html>
      </group>
    </>
  );
}
