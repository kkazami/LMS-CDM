import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";

// Global store to track which draggable object is currently selected for keyboard controls
interface ActiveDraggableStore {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}
const useActiveDraggable = create<ActiveDraggableStore>((set) => ({
  activeId: null,
  setActiveId: (id) => set({ activeId: id })
}));

export interface UseDraggable3DOptions {
  /** Normal vector for the plane to drag on. Default: [0, 1, 0] (XZ plane/ground) */
  planeNormal?: [number, number, number];
  /** Callback fired when dragging begins */
  onDragStart?: () => void;
  /** Callback fired when dragging ends, passing the final position */
  onDragEnd?: (position: THREE.Vector3) => void;
  /** If true, dragging is disabled */
  disabled?: boolean;
}

/**
 * useDraggable3D — Shared hook to make any 3D mesh draggable via raycasting and keyboard (WASD).
 * Returns a ref and event handlers to spread onto the target mesh.
 */
export function useDraggable3D({
  planeNormal = [0, 1, 0],
  onDragStart,
  onDragEnd,
  disabled = false,
}: UseDraggable3DOptions = {}) {
  const { camera, raycaster, pointer, gl, controls } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const targetRef = useRef<THREE.Group | THREE.Mesh>(null);
  
  const id = useMemo(() => Math.random().toString(36).substring(7), []);
  const activeId = useActiveDraggable((s) => s.activeId);
  const setActiveId = useActiveDraggable((s) => s.setActiveId);
  const isActive = activeId === id && !disabled;

  // The mathematical plane the object will drag along
  const plane = useRef(new THREE.Plane(new THREE.Vector3(...planeNormal).normalize(), 0));
  // The offset between the pointer intersection and the object's origin
  const dragOffset = useRef(new THREE.Vector3());

  // Handle Drag Start (on the mesh)
  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (disabled) return;
      e.stopPropagation();

      // Disable orbit controls while dragging so the camera doesn't rotate
      if (controls) {
        (controls as any).enabled = false;
      }
      
      try {
        (e.nativeEvent.target as Element).setPointerCapture(e.pointerId);
      } catch (err) {}

      const target = targetRef.current;
      if (!target) return;

      // Update the plane to pass through the clicked point
      plane.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(...planeNormal).normalize(),
        e.point
      );

      // Calculate the offset between the object's origin and the click point
      dragOffset.current.copy(target.position).sub(e.point);

      setActiveId(id);
      setIsDragging(true);
      onDragStart?.();
    },
    [disabled, controls, onDragStart, planeNormal, setActiveId, id]
  );

  // Handle Drag End (global)
  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      
      // Re-enable orbit controls
      if (controls) {
        (controls as any).enabled = true;
      }
      
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore if already released
      }

      setIsDragging(false);
      if (targetRef.current) {
        onDragEnd?.(targetRef.current.position);
      }
    },
    [isDragging, controls, onDragEnd]
  );

  // Keyboard controls for fine-tuning placement
  useEffect(() => {
    if (!isActive || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 0.1;
      const target = targetRef.current;
      if (!target) return;

      let moved = false;
      const pos = target.position.clone();
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          pos.z -= step; moved = true; break;
        case 's':
        case 'arrowdown':
          pos.z += step; moved = true; break;
        case 'a':
        case 'arrowleft':
          pos.x -= step; moved = true; break;
        case 'd':
        case 'arrowright':
          pos.x += step; moved = true; break;
        case 'q':
          pos.y += step; moved = true; break;
        case 'e':
          pos.y -= step; moved = true; break;
        case 'enter':
        case ' ':
          e.preventDefault(); // Prevent page scroll
          onDragEnd?.(pos);
          setActiveId(null);
          break;
        case 'escape':
          setActiveId(null);
          break;
      }

      if (moved) {
        target.position.copy(pos);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, disabled, onDragEnd, setActiveId]);

  // We bind pointerup globally because the user might drag the mouse off the object
  // or canvas before releasing.
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointerup", handlePointerUp);
      return () => window.removeEventListener("pointerup", handlePointerUp);
    }
  }, [isDragging, handlePointerUp]);

  // Handle Drag Move (every frame)
  useFrame(() => {
    if (isDragging && targetRef.current) {
      raycaster.setFromCamera(pointer, camera);
      const intersection = new THREE.Vector3();
      
      // If the ray hits the drag plane, update the object position
      if (raycaster.ray.intersectPlane(plane.current, intersection)) {
        targetRef.current.position.copy(intersection.add(dragOffset.current));
      }
    }
  });

  return {
    ref: targetRef,
    isDragging: isDragging || isActive, // Keep it visually "active" for the parent
    handlers: {
      onPointerDown,
      // Change cursor to grab/grabbing automatically
      onPointerOver: () => {
        if (!disabled) document.body.style.cursor = "grab";
      },
      onPointerOut: () => {
        if (!disabled) document.body.style.cursor = "auto";
      },
    },
  };
}
