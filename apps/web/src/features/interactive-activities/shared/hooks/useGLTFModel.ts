/**
 * useGLTFModel — Shared 3D model loading hook for all activity modules.
 *
 * Wraps @react-three/drei's useGLTF with:
 *   - Draco decompression (standard path via CDN or local draco decoder)
 *   - Loading state tracking
 *   - Error boundary integration
 *   - Preloading support
 *
 * Usage (inside a Canvas):
 *   function MyModel() {
 *     const { scene, isLoading } = useGLTFModel("/models/pc-case.glb");
 *     if (!scene) return null;  // Still loading or error — boundary handles display
 *     return <primitive object={scene} />;
 *   }
 *
 * IMPORTANT: The returned scene can be null before the model loads. Never
 * assert it exists — always check first. This is enforced by the return type.
 *
 * Fallback path for low-spec devices (Sprint 9):
 *   Activity modules should provide a 2D diagram fallback when WebGL is
 *   unavailable or the device doesn't meet minimum spec. The useGLTFModel
 *   hook itself doesn't handle this — the parent component should check
 *   WebGL support and render the fallback UI instead of the Canvas.
 */

"use client";

import { useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import type * as THREE from "three";

/**
 * GLTF result type — defined locally to avoid three-stdlib version
 * compatibility issues. Matches the shape returned by drei's useGLTF.
 */
interface GLTFResult {
  scene: THREE.Group;
  scenes: THREE.Group[];
  nodes: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  animations: THREE.AnimationClip[];
  asset: Record<string, unknown>;
}

interface UseGLTFModelReturn {
  /** The loaded scene graph. Null until the model finishes loading. */
  scene: THREE.Group | null;
  /** The full GLTF result including nodes and materials. Null until loaded. */
  gltf: GLTFResult | null;
  /** True while the model is being fetched/decoded. */
  isLoading: boolean;
  /** Error message if loading failed, null otherwise. */
  error: string | null;
}

/**
 * @param path - Path to the .glb/.gltf file, relative to public/ (e.g. "/models/pc-case.glb")
 * @param useDraco - Whether to use Draco decompression (default: true, since all assets should be Draco-compressed)
 */
export function useGLTFModel(
  path: string,
  useDraco: boolean = true
): UseGLTFModelReturn {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useGLTF from drei handles caching and Draco decoder setup.
  // The draco decoder is loaded from the Google CDN by default.
  let gltf: GLTFResult | null = null;

  try {
    // drei's useGLTF accepts a draco path for the decoder.
    // Using the default CDN path for Draco decoder files.
    const result = useGLTF(
      path,
      useDraco ? "https://www.gstatic.com/draco/versioned/decoders/1.5.7/" : undefined
    ) as GLTFResult;
    gltf = result;
  } catch (e) {
    // useGLTF throws during suspense — this catch handles actual load errors
    // that bubble up outside the suspense boundary.
    if (e instanceof Error) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (gltf) {
      setIsLoading(false);
      setError(null);
    }
  }, [gltf]);

  return {
    scene: gltf?.scene ?? null,
    gltf,
    isLoading: !gltf && !error,
    error,
  };
}

/**
 * Preload a GLTF model so it's cached before the component mounts.
 * Call this at module level or in a parent component:
 *   preloadGLTFModel("/models/pc-case.glb");
 */
export function preloadGLTFModel(path: string): void {
  useGLTF.preload(path);
}
