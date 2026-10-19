import { create } from "zustand";
import * as THREE from "three";

export interface SnapZone {
  id: string;
  position: THREE.Vector3;
  radius: number;
}

interface SnapStore {
  zones: Record<string, SnapZone>;
  registerZone: (zone: SnapZone) => void;
  unregisterZone: (id: string) => void;
  getClosestZone: (
    position: THREE.Vector3,
    maxDistance?: number
  ) => SnapZone | null;
}

export const useSnapStore = create<SnapStore>((set, get) => ({
  zones: {},
  registerZone: (zone) =>
    set((state) => ({
      zones: { ...state.zones, [zone.id]: zone },
    })),
  unregisterZone: (id) =>
    set((state) => {
      const newZones = { ...state.zones };
      delete newZones[id];
      return { zones: newZones };
    }),
  getClosestZone: (position, maxDistance = Infinity) => {
    const { zones } = get();
    let closest: SnapZone | null = null;
    let minDistance = maxDistance;

    for (const zone of Object.values(zones)) {
      const distance = position.distanceTo(zone.position);
      if (distance < zone.radius && distance < minDistance) {
        minDistance = distance;
        closest = zone;
      }
    }

    return closest;
  },
}));
