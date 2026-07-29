import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface InteractionHintProps {
  /** The position of the hint in 3D space */
  position: [number, number, number];
  /** The tooltip text to display */
  label?: string;
  /** Size of the glowing highlight area */
  size?: [number, number, number];
  /** Color of the highlight (default: tailwind blue-400 #60a5fa) */
  color?: string;
  /** Whether the hint is visible */
  visible?: boolean;
}

/**
 * InteractionHint — A contextual tooltip and glowing highlight used to guide
 * students to target sockets in "assisted mode".
 */
export default function InteractionHint({
  position,
  label,
  size = [1, 1, 1],
  color = "#60a5fa",
  visible = true,
}: InteractionHintProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!visible || !meshRef.current || !materialRef.current) return;

    // Slowly pulse the opacity and scale
    const time = state.clock.getElapsedTime();
    const pulse = Math.sin(time * 3) * 0.15 + 0.35; // pulses between 0.2 and 0.5

    materialRef.current.opacity = pulse;
    meshRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* 3D Glowing Box Highlight */}
      <mesh ref={meshRef}>
        <boxGeometry args={size} />
        <meshBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          depthWrite={false}
          wireframe
        />
      </mesh>

      {/* Optional HTML Tooltip Label */}
      {label && (
        <Html
          center
          position={[0, size[1] / 2 + 0.5, 0]}
          className="pointer-events-none"
        >
          <div className="bg-blue-600/90 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg backdrop-blur whitespace-nowrap animate-bounce">
            {label}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-blue-600/90"></div>
          </div>
        </Html>
      )}
    </group>
  );
}
