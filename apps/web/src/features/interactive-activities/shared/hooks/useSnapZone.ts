import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useSnapStore } from "../stores/snap-store";

interface UseSnapZoneOptions {
  id: string;
  position: [number, number, number];
  /** Snap radius threshold. Defaults to 1.0 */
  radius?: number;
}

/**
 * useSnapZone — Registers a snap zone socket in the global physics store.
 * Draggable objects will check this store when released to see if they
 * should snap to this socket.
 */
export function useSnapZone({
  id,
  position,
  radius = 1.0,
}: UseSnapZoneOptions) {
  const registerZone = useSnapStore((state) => state.registerZone);
  const unregisterZone = useSnapStore((state) => state.unregisterZone);

  const vecPosition = useRef(new THREE.Vector3(...position));

  useEffect(() => {
    // Keep reference updated if position prop changes
    vecPosition.current.set(...position);

    registerZone({
      id,
      position: vecPosition.current,
      radius,
    });

    return () => unregisterZone(id);
  }, [id, position, radius, registerZone, unregisterZone]);

  return {
    position: vecPosition.current,
  };
}
