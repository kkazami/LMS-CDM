"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import * as THREE from "three";
import { Box, Sphere } from "@react-three/drei";

import Workbench3D from "@/features/interactive-activities/shared/components/Workbench3D";
import { useDraggable3D } from "@/features/interactive-activities/shared/hooks/useDraggable3D";
import { useSnapZone } from "@/features/interactive-activities/shared/hooks/useSnapZone";
import { useSnapStore } from "@/features/interactive-activities/shared/stores/snap-store";
import { useActivityStore } from "@/features/interactive-activities/shared/stores/activity-store";
import InteractionHint from "@/features/interactive-activities/shared/components/InteractionHint";
import SubmitBar from "@/features/interactive-activities/shared/components/SubmitBar";

/**
 * 3D Scene Content
 */
function SandboxSceneContent() {
  const { setScore, updateStateCheck } = useActivityStore();
  const getClosestZone = useSnapStore((state) => state.getClosestZone);

  // Box state
  const [boxPosition, setBoxPosition] = useState<THREE.Vector3>(new THREE.Vector3(-3, 0.5, 0));
  const [isSnapped, setIsSnapped] = useState(false);

  // Define a snap socket target
  const targetPosition: [number, number, number] = [3, 0.5, 0];
  const { position: socketPos } = useSnapZone({
    id: "target-socket",
    position: targetPosition,
    radius: 1.5,
  });

  // Make the box draggable
  const { ref: dragRef, isDragging, handlers } = useDraggable3D({
    planeNormal: [0, 1, 0],
    disabled: isSnapped,
    onDragEnd: (finalPosition) => {
      // Check if we dropped near a socket
      const closest = getClosestZone(finalPosition, 1.5);
      
      if (closest && closest.id === "target-socket") {
        // Snap!
        setBoxPosition(closest.position.clone());
        setIsSnapped(true);
        setScore(100);
        updateStateCheck("box_snapped", true);
      } else {
        setBoxPosition(finalPosition.clone());
      }
    },
  });

  // Update visual position of box (useDraggable updates the ref directly while dragging,
  // but we need to resync if we snap programmatically).
  useEffect(() => {
    if (dragRef.current && !isDragging) {
      dragRef.current.position.copy(boxPosition);
    }
  }, [boxPosition, dragRef, isDragging]);

  return (
    <>
      {/* Target Socket Marker */}
      <Sphere args={[0.3, 16, 16]} position={targetPosition}>
        <meshStandardMaterial color="#cbd5e1" wireframe />
      </Sphere>
      
      <InteractionHint 
        position={targetPosition} 
        label="Drag the box here" 
        size={[1.5, 1.5, 1.5]}
        visible={!isSnapped} 
      />

      {/* Draggable Box */}
      <Box 
        ref={dragRef as any}
        args={[1, 1, 1]} 
        position={[-3, 0.5, 0]}
        {...handlers}
      >
        <meshStandardMaterial 
          color={isSnapped ? "#10b981" : (isDragging ? "#f59e0b" : "#3b82f6")} 
        />
      </Box>
    </>
  );
}

/**
 * Sandbox Page — A dev-only route for testing the 3D Engine layer.
 */
export default function SandboxPage() {
  const { startTimer, resetActivity } = useActivityStore();
  const startTimeRef = useRef(new Date().toISOString());
  
  // Dummy data for Sprint 0 Submission API
  // In a real activity, this comes from the route params or session
  const dummyStudentId = "dev-student-123";
  const dummyAssignmentId = "dev-template-123";

  useEffect(() => {
    resetActivity();
    startTimer();
    return () => resetActivity();
  }, [resetActivity, startTimer]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 relative">
      {/* Dev Warning Banner */}
      <div className="absolute top-0 left-0 w-full bg-amber-500 text-white text-xs font-bold text-center py-1 z-20 shadow-md">
        DEV SANDBOX — Sprint 1 Engine Test (Do Not Deploy)
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 w-full h-full">
        <Workbench3D>
          <SandboxSceneContent />
        </Workbench3D>
      </div>

      {/* 2D Overlay UI */}
      <SubmitBar 
        activityType="pc-build" // Dummy type from allowed schema enum
        assignmentId={dummyAssignmentId}
        studentId={dummyStudentId}
        variantSeed="dev-seed"
        startedAt={startTimeRef.current}
        maxScore={100}
      />
    </div>
  );
}
