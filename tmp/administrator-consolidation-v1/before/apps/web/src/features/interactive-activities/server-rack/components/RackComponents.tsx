"use client";

import { useState } from "react";
import * as THREE from "three";
import { Box, Html } from "@react-three/drei";
import { useDraggable3D } from "../../shared/hooks/useDraggable3D";
import { useSnapZone } from "../../shared/hooks/useSnapZone";
import { useSnapStore } from "../../shared/stores/snap-store";
import { useServerRackStore, Equipment } from "../stores/server-rack-store";

// Helper for Rack Unit Sockets
function RUSocket({ id, position }: { id: string, position: [number, number, number] }) {
  useSnapZone({ id, position, radius: 0.6 });
  return (
    <Box position={position} args={[2.5, 0.4, 2]}>
      <meshBasicMaterial color="#334155" wireframe transparent opacity={0.1} />
    </Box>
  );
}

// ─── Rack Frame (10 RU) ───
export function RackFrame() {
  return (
    <group position={[0, 0, 0]}>
      {/* Posts */}
      <Box args={[0.1, 5, 2]} position={[-1.3, 2.5, 0]}><meshStandardMaterial color="#1e293b" /></Box>
      <Box args={[0.1, 5, 2]} position={[1.3, 2.5, 0]}><meshStandardMaterial color="#1e293b" /></Box>
      
      {/* 10 RU Slots (from bottom up) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <RUSocket key={i} id={`ru-${i+1}`} position={[0, 0.5 + i * 0.45, 0]} />
      ))}
    </group>
  );
}

// Helper to render interactive network ports
export function NetworkPort({ id, position }: { id: string, position: [number, number, number] }) {
  const { startCableJob, activeCableJob } = useServerRackStore();
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    startCableJob(id);
  };

  return (
    <group position={position}>
      <mesh onClick={handleClick} onPointerOver={() => document.body.style.cursor = "pointer"} onPointerOut={() => document.body.style.cursor = "auto"}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color={activeCableJob.sourcePort === id ? "#facc15" : "#0f172a"} />
      </mesh>
      {/* Invisible hit area */}
      <mesh visible={false} onClick={handleClick}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
      </mesh>
    </group>
  );
}

// ─── Generic Draggable Rack Equipment ───
interface DraggableEquipmentProps {
  item: Equipment;
  initialPos: [number, number, number];
  heightRU: number; // 1 or 2
  color: string;
  label: string;
  children?: React.ReactNode;
}

function DraggableEquipment({ item, initialPos, heightRU, color, label, children }: DraggableEquipmentProps) {
  const { mountEquipment } = useServerRackStore();
  const getClosestZone = useSnapStore((s) => s.getClosestZone);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(...initialPos));
  const height = heightRU * 0.4;
  
  // Compute target position if mounted
  const socketPos = item.ruSlot ? new THREE.Vector3(0, 0.5 + (item.ruSlot - 1) * 0.45, 0) : pos;

  const { ref, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 0, 1], // Drag on XY plane
    disabled: item.ruSlot !== null,
    onDragEnd: (finalPos) => {
      const closest = getClosestZone(finalPos, 1.0);
      if (closest?.id.startsWith("ru-")) {
        const ru = parseInt(closest.id.split("-")[1], 10);
        mountEquipment(item.id, ru);
      } else {
        setPos(finalPos.clone());
      }
    }
  });

  if (!isDragging && ref.current) {
    ref.current.position.copy(item.ruSlot !== null ? socketPos : pos);
  }

  return (
    <group ref={ref as any} position={item.ruSlot !== null ? socketPos : pos} {...handlers}>
      <Box args={[2.4, height, 1.8]}>
        <meshStandardMaterial color={isDragging ? "#fbbf24" : color} />
      </Box>
      <Html center position={[-1, 0, 0.91]} className="pointer-events-none">
        <span className="text-[10px] text-slate-300 font-bold tracking-widest">{label}</span>
      </Html>
      {children}
    </group>
  );
}

// ─── Patch Panel ───
export function PatchPanel() {
  const item = useServerRackStore(s => s.equipment["patch1"]);
  if (!item) return null;

  return (
    <DraggableEquipment item={item} initialPos={[-4, 0.5, 0]} heightRU={1} color="#334155" label="PATCH PANEL">
      {/* Render 24 ports on the front */}
      {Array.from({ length: 24 }).map((_, i) => (
        <NetworkPort key={i} id={`patch1-p${i+1}`} position={[-0.8 + (i % 12) * 0.15, i < 12 ? 0.08 : -0.08, 0.91]} />
      ))}
    </DraggableEquipment>
  );
}

// ─── Switch ───
export function ManagedSwitch() {
  const item = useServerRackStore(s => s.equipment["switch1"]);
  if (!item) return null;

  return (
    <DraggableEquipment item={item} initialPos={[-4, 1.5, 0]} heightRU={1} color="#0f172a" label="SWITCH">
      {Array.from({ length: 24 }).map((_, i) => (
        <NetworkPort key={i} id={`switch1-p${i+1}`} position={[-0.8 + (i % 12) * 0.15, i < 12 ? 0.08 : -0.08, 0.91]} />
      ))}
    </DraggableEquipment>
  );
}

// ─── Server ───
export function RackServer({ id, initialPos }: { id: string, initialPos: [number, number, number] }) {
  const item = useServerRackStore(s => s.equipment[id]);
  if (!item) return null;

  return (
    <DraggableEquipment item={item} initialPos={initialPos} heightRU={2} color="#475569" label={`SERVER ${id.replace("server", "")}`}>
      {/* 1 NIC port on the front for simplicity, though usually on back */}
      <NetworkPort id={`${id}-eth0`} position={[1, 0, 0.91]} />
    </DraggableEquipment>
  );
}
