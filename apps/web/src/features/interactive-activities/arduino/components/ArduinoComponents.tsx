"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Box, Html } from "@react-three/drei";
import { useArduinoStore } from "../stores/arduino-store";

// Helper to render a clickable Socket
function Socket({ id, position, label }: { id: string, position: [number, number, number], label?: string }) {
  const { startWiring, finishWiring, wiringState } = useArduinoStore();

  const handlePointerDown = (e: any) => {
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
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Invisible larger hit area for easier clicking */}
      <mesh visible={false} onPointerDown={handlePointerDown}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
      </mesh>
      {label && (
        <Html center position={[0, -0.15, 0]} className="pointer-events-none">
          <span className="text-[6px] text-slate-400 font-mono">{label}</span>
        </Html>
      )}
    </group>
  );
}

// ─── Arduino Uno Mock ───
export function ArduinoUno() {
  return (
    <group position={[-2, 0, 0]}>
      <Box args={[2.5, 0.1, 2]}>
        <meshStandardMaterial color="#0284c7" />
      </Box>
      <Html center position={[0, 0.1, 0]} className="pointer-events-none">
        <span className="text-[10px] text-white font-bold tracking-widest opacity-80">UNO</span>
      </Html>

      {/* Digital Pins (top edge) */}
      <group position={[0, 0.1, -0.9]}>
        <Box args={[1.5, 0.15, 0.2]}>
          <meshStandardMaterial color="#0f172a" />
        </Box>
        {Array.from({ length: 14 }).map((_, i) => (
          <Socket key={`d${i}`} id={`uno-${13 - i}`} position={[-0.65 + i * 0.1, 0.1, 0]} label={`${13 - i}`} />
        ))}
        <Socket id="uno-GND1" position={[-0.65 + 14 * 0.1, 0.1, 0]} label="GND" />
      </group>

      {/* Power Pins (bottom edge) */}
      <group position={[-0.5, 0.1, 0.9]}>
        <Box args={[1.2, 0.15, 0.2]}>
          <meshStandardMaterial color="#0f172a" />
        </Box>
        <Socket id="uno-3V3" position={[-0.4, 0.1, 0]} label="3V3" />
        <Socket id="uno-5V" position={[-0.2, 0.1, 0]} label="5V" />
        <Socket id="uno-GND2" position={[0, 0.1, 0]} label="GND" />
        <Socket id="uno-GND3" position={[0.2, 0.1, 0]} label="GND" />
        <Socket id="uno-VIN" position={[0.4, 0.1, 0]} label="VIN" />
      </group>
    </group>
  );
}

// ─── Half-Size Breadboard Mock ───
export function Breadboard() {
  // 30 rows, 2 sides (+/-), left and right rails
  // Rows are A-E and F-J

  const rows = 30;
  
  const renderRow = (colName: string, xOffset: number, zOffset: number) => {
    return Array.from({ length: rows }).map((_, r) => (
      <Socket key={`${colName}${r+1}`} id={`bb-${colName}${r+1}`} position={[xOffset, 0.1, -1.45 + r * 0.1]} />
    ));
  };

  const renderRail = (railName: string, xOffset: number) => {
    return Array.from({ length: rows }).map((_, r) => (
      <Socket key={`${railName}-${r+1}`} id={`bb-${railName}-${r+1}`} position={[xOffset, 0.1, -1.45 + r * 0.1]} />
    ));
  };

  return (
    <group position={[1.5, 0, 0]}>
      <Box args={[2, 0.2, 3.2]}>
        <meshStandardMaterial color="#f8fafc" />
      </Box>
      <Html center position={[-1.2, 0.2, 0]} rotation={[0, 0, -Math.PI/2]} className="pointer-events-none">
        <span className="text-[10px] text-slate-300 font-bold tracking-widest opacity-80">BREADBOARD</span>
      </Html>

      {/* Left Power Rails */}
      {renderRail("PWR-left-+", -0.8)}
      {renderRail("GND-left--", -0.7)}
      
      {/* Center Components (A-E) */}
      {renderRow("A", -0.4, 0)}
      {renderRow("B", -0.3, 0)}
      {renderRow("C", -0.2, 0)}
      {renderRow("D", -0.1, 0)}
      {renderRow("E", 0, 0)}
      
      {/* Center Components (F-J) */}
      {renderRow("F", 0.2, 0)}
      {renderRow("G", 0.3, 0)}
      {renderRow("H", 0.4, 0)}
      {renderRow("I", 0.5, 0)}
      {renderRow("J", 0.6, 0)}

      {/* Right Power Rails */}
      {renderRail("GND-right--", 0.8)}
      {renderRail("PWR-right-+", 0.9)}

      {/* Visual Trough */}
      <Box args={[0.1, 0.21, 3]} position={[0.1, 0, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
    </group>
  );
}

// ─── LED Mock ───
export function LEDComponent({ id }: { id: string }) {
  const comp = useArduinoStore(s => s.components[id]);
  if (!comp || comp.type !== "LED") return null;

  // The actual position logic would look up the socket coords.
  // For Sprint 3 demo, we hardcode the visual placement bridging A10 and A11 on the breadboard.
  // In a full sim, we'd look up the global coordinates of the `pins.anode` socket.
  
  const zPos = -1.45 + 9 * 0.1; // Row 10 (0-indexed)
  
  return (
    <group position={[1.5 - 0.2, 0.2, zPos + 0.05]}>
      {/* LED Bulb */}
      <Sphere args={[0.15, 16, 16]} position={[0, 0.3, 0]}>
        <meshStandardMaterial 
          color={comp.isOn ? "#ef4444" : "#7f1d1d"} 
          emissive={comp.isOn ? "#ef4444" : "#000000"} 
          emissiveIntensity={comp.isOn ? 2 : 0} 
        />
      </Sphere>
      
      {/* Legs */}
      <Box args={[0.02, 0.3, 0.02]} position={[-0.1, 0.15, (comp.isReversed ? 0.05 : -0.05)]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[0.02, 0.3, 0.02]} position={[0.1, 0.15, (comp.isReversed ? -0.05 : 0.05)]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>

      {comp.isOn && (
        <Html center position={[0, 0.6, 0]} className="pointer-events-none">
          <span className="text-[10px] text-red-500 font-bold animate-pulse">ON</span>
        </Html>
      )}
    </group>
  );
}

// ─── Resistor Mock ───
export function ResistorComponent({ id }: { id: string }) {
  const comp = useArduinoStore(s => s.components[id]);
  if (!comp || comp.type !== "RESISTOR") return null;

  // Hardcoded visual position spanning B11 and GND-left-11
  const zPos = -1.45 + 10 * 0.1;

  return (
    <group position={[1.5 - 0.5, 0.2, zPos]}>
      {/* Resistor Body */}
      <Box args={[0.3, 0.08, 0.08]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#d4d4d8" />
      </Box>
      {/* Color bands (mock) */}
      <Box args={[0.02, 0.081, 0.081]} position={[-0.1, 0.1, 0]}><meshBasicMaterial color="red" /></Box>
      <Box args={[0.02, 0.081, 0.081]} position={[0, 0.1, 0]}><meshBasicMaterial color="red" /></Box>
      <Box args={[0.02, 0.081, 0.081]} position={[0.1, 0.1, 0]}><meshBasicMaterial color="brown" /></Box>

      {/* Legs */}
      <Box args={[0.2, 0.02, 0.02]} position={[-0.25, 0.1, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[0.2, 0.02, 0.02]} position={[0.25, 0.1, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      
      {/* Drops down into breadboard */}
      <Box args={[0.02, 0.1, 0.02]} position={[-0.35, 0.05, 0]}><meshStandardMaterial color="#94a3b8" /></Box>
      <Box args={[0.02, 0.1, 0.02]} position={[0.35, 0.05, 0]}><meshStandardMaterial color="#94a3b8" /></Box>
    </group>
  );
}
