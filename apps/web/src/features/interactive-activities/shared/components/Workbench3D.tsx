"use client";

import { Suspense, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import GLTFErrorBoundary from "./GLTFErrorBoundary";
import GLTFLoadingSkeleton from "./GLTFLoadingSkeleton";

interface Workbench3DProps {
  children: ReactNode;
  /** Background color of the scene */
  backgroundColor?: string;
  /** Initial camera position [x, y, z] */
  cameraPosition?: [number, number, number];
  /** Field of view */
  fov?: number;
  /** Minimum zoom distance */
  minDistance?: number;
  /** Maximum zoom distance */
  maxDistance?: number;
  /** Show environment lighting (HDRI) */
  environment?: boolean;
  /** Show standard 3-point lighting */
  lights?: boolean;
  /** Show ground plane with contact shadows */
  ground?: boolean;
}

/**
 * Workbench3D — Shared 3D environment wrapper for all interactive activities.
 * Provides a standardized Canvas, camera controls, lighting, and error boundaries.
 */
export default function Workbench3D({
  children,
  backgroundColor = "#f3f4f6", // tailwind gray-100
  cameraPosition = [5, 5, 5],
  fov = 50,
  minDistance = 2,
  maxDistance = 20,
  environment = false,
  lights = true,
  ground = true,
}: Workbench3DProps) {
  return (
    <div className="w-full h-full relative" style={{ minHeight: "500px" }}>
      <GLTFErrorBoundary>
        <Suspense fallback={<GLTFLoadingSkeleton height="100%" />}>
          <Canvas
            shadows
            camera={{ position: cameraPosition, fov }}
            className="w-full h-full rounded-xl bg-gray-50"
            style={{ touchAction: "none" }}
          >
            <color attach="background" args={[backgroundColor]} />

            {/* Orbit Controls for standard panning, rotating, zooming */}
            <OrbitControls
              makeDefault
              minDistance={minDistance}
              maxDistance={maxDistance}
              maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below the ground
            />

            {/* Lighting Setup */}
            {lights && (
              <>
                <ambientLight intensity={0.6} />
                <directionalLight
                  castShadow
                  position={[10, 20, 10]}
                  intensity={1.5}
                  shadow-mapSize={[1024, 1024]}
                  shadow-camera-near={0.5}
                  shadow-camera-far={50}
                  shadow-camera-left={-10}
                  shadow-camera-right={10}
                  shadow-camera-top={10}
                  shadow-camera-bottom={-10}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
              </>
            )}

            {environment && <Environment preset="city" />}

            {/* Ground Plane with Contact Shadows */}
            {ground && (
              <ContactShadows
                position={[0, -0.01, 0]}
                opacity={0.4}
                scale={20}
                blur={2}
                far={10}
              />
            )}

            {/* The actual activity content */}
            {children}
          </Canvas>
        </Suspense>
      </GLTFErrorBoundary>
    </div>
  );
}
